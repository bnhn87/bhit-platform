// Template Editor - Visual Document Markup Tool
// Allows users to draw bounding boxes on sample documents to train AI extraction

import React, { useState, useEffect, useRef } from 'react';
import { Upload, Save, X, Trash2, Plus, Check, Eye, FileText, Tag } from 'lucide-react';
import Layout from '../components/Layout';
import MarkupCanvas, { BoundingBox } from '../components/MarkupCanvas';
import {
  createTemplate,
  saveTemplateFields,
  uploadTemplateSample,
  fetchTemplates,
  deleteTemplate,
  type DocumentTemplate,
} from '../lib/templateService';
import { fetchSuppliers, type Supplier } from '../lib/invoiceDbService';
import { theme } from '../lib/theme';
import { getDashboardButtonStyle, getDashboardCardStyle } from '../modules/smartquote/utils/dashboardStyles';

export default function TemplateEditor() {
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [activeTemplate, setActiveTemplate] = useState<DocumentTemplate | null>(null);
  const [boxes, setBoxes] = useState<BoundingBox[]>([]);
  const [selectedBox, setSelectedBox] = useState<BoundingBox | null>(null);
  const [mode, setMode] = useState<'draw' | 'select' | 'view'>('draw');
  const [documentImage, setDocumentImage] = useState<HTMLImageElement | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // New template form
  const [templateName, setTemplateName] = useState('');
  const [templateType, setTemplateType] = useState<'invoice' | 'pod' | 'quote' | 'receipt' | 'timesheet' | 'custom'>('invoice');
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('');
  const [isGeneric, setIsGeneric] = useState(false);
  const [description, setDescription] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load templates and suppliers
  useEffect(() => {
    loadTemplates();
    loadSuppliers();
  }, []);

  const loadTemplates = async () => {
    try {
      const data = await fetchTemplates({ is_active: true });
      setTemplates(data);
    } catch (err) {
      console.error('Error loading templates:', err);
    }
  };

  const loadSuppliers = async () => {
    try {
      const data = await fetchSuppliers();
      setSuppliers(data);
    } catch (err) {
      console.error('Error loading suppliers:', err);
    }
  };

  // Handle file upload
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFile(file);

    // Load image for display
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        setDocumentImage(img);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Save template
  const handleSaveTemplate = async () => {
    if (!templateName.trim()) {
      setError('Template name is required');
      return;
    }

    if (!uploadedFile) {
      setError('Please upload a sample document');
      return;
    }

    if (boxes.length === 0) {
      setError('Please mark at least one field on the document');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Upload sample file
      const filePath = await uploadTemplateSample(uploadedFile, templateName);

      // Create template
      const template = await createTemplate({
        name: templateName,
        description: description || undefined,
        document_type: templateType,
        supplier_id: selectedSupplierId || undefined,
        is_generic: isGeneric,
        page_count: 1,
        sample_file_path: filePath,
        is_active: true,
      } as any);

      // Save fields
      await saveTemplateFields(
        template.id,
        boxes.map((box, index) => ({
          field_name: box.field_name || `field_${index}`,
          field_label: box.field_label,
          page_number: 1,
          x: Math.round(box.x),
          y: Math.round(box.y),
          width: Math.round(box.width),
          height: Math.round(box.height),
          confidence_level: box.confidence_level,
          priority: box.priority,
          notes: box.notes,
        }))
      );

      alert(`Template "${templateName}" saved successfully!`);

      // Reset form
      setActiveTemplate(template);
      setTemplates([template, ...templates]);
      resetForm();
    } catch (err) {
      console.error('Error saving template:', err);
      setError('Failed to save template. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Reset form
  const resetForm = () => {
    setTemplateName('');
    setDescription('');
    setTemplateType('invoice');
    setSelectedSupplierId('');
    setIsGeneric(false);
    setBoxes([]);
    setSelectedBox(null);
    setDocumentImage(null);
    setUploadedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Update selected box properties
  const handleUpdateBox = (updates: Partial<BoundingBox>) => {
    if (!selectedBox) return;

    const updatedBoxes = boxes.map(box =>
      box.id === selectedBox.id ? { ...box, ...updates } : box
    );
    setBoxes(updatedBoxes);
    setSelectedBox({ ...selectedBox, ...updates });
  };

  // Delete selected box
  const handleDeleteBox = () => {
    if (!selectedBox) return;

    setBoxes(boxes.filter(box => box.id !== selectedBox.id));
    setSelectedBox(null);
  };

  // Field type options
  const fieldTypes = {
    invoice: [
      { value: 'invoice_number', label: 'Invoice Number' },
      { value: 'invoice_date', label: 'Invoice Date' },
      { value: 'due_date', label: 'Due Date' },
      { value: 'supplier_name', label: 'Supplier Name' },
      { value: 'supplier_address', label: 'Supplier Address' },
      { value: 'net_amount', label: 'Net Amount' },
      { value: 'vat_amount', label: 'VAT Amount' },
      { value: 'gross_amount', label: 'Gross Amount' },
      { value: 'description', label: 'Description' },
      { value: 'payment_terms', label: 'Payment Terms' },
      { value: 'po_number', label: 'PO Number' },
      { value: 'job_reference', label: 'Job Reference' },
    ],
    pod: [
      { value: 'delivery_date', label: 'Delivery Date' },
      { value: 'delivery_time', label: 'Delivery Time' },
      { value: 'recipient_name', label: 'Recipient Name' },
      { value: 'delivery_address', label: 'Delivery Address' },
      { value: 'signature', label: 'Signature Box' },
      { value: 'driver_name', label: 'Driver Name' },
      { value: 'vehicle_reg', label: 'Vehicle Registration' },
      { value: 'notes', label: 'Notes/Comments' },
      { value: 'photo_indicator', label: 'Photo Evidence' },
      { value: 'item_count', label: 'Number of Items' },
      { value: 'condition', label: 'Condition on Delivery' },
    ],
    quote: [
      { value: 'quote_number', label: 'Quote Number' },
      { value: 'quote_date', label: 'Quote Date' },
      { value: 'valid_until', label: 'Valid Until' },
      { value: 'customer_name', label: 'Customer Name' },
      { value: 'total_amount', label: 'Quote Total' },
      { value: 'description', label: 'Description' },
    ],
    default: [
      { value: 'custom', label: 'Custom Field' },
    ],
  };

  const availableFields = fieldTypes[templateType] || fieldTypes.default;

  return (
    <Layout>
      <div style={{
        maxWidth: '1600px',
        margin: '0 auto',
        padding: '2rem',
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '2rem',
        }}>
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: theme.colors.text }}>
              Visual Document Markup Tool
            </h1>
            <p style={{ color: theme.colors.textSubtle, marginTop: '0.5rem' }}>
              Train AI by marking fields on sample documents (invoices, PODs, quotes, etc.)
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: '2rem' }}>
          {/* Left: Canvas */}
          <div>
            <div style={{
              ...getDashboardCardStyle(),
              padding: '1.5rem',
            }}>
              <div style={{ marginBottom: '1rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    ...getDashboardButtonStyle('primary'),
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                  }}
                >
                  <Upload size={18} />
                  Upload Sample Document
                </button>

                <div style={{ display: 'flex', gap: '0.5rem', marginLeft: 'auto' }}>
                  <button
                    onClick={() => setMode('draw')}
                    style={{
                      ...getDashboardButtonStyle(mode === 'draw' ? 'primary' : 'secondary'),
                      padding: '0.5rem 1rem',
                    }}
                  >
                    Draw
                  </button>
                  <button
                    onClick={() => setMode('select')}
                    style={{
                      ...getDashboardButtonStyle(mode === 'select' ? 'primary' : 'secondary'),
                      padding: '0.5rem 1rem',
                    }}
                  >
                    Select
                  </button>
                </div>
              </div>

              {documentImage ? (
                <MarkupCanvas
                  documentImage={documentImage}
                  boxes={boxes}
                  onBoxesChange={setBoxes}
                  onBoxSelect={setSelectedBox}
                  mode={mode}
                  width={900}
                  height={1200}
                />
              ) : (
                <div style={{
                  width: '900px',
                  height: '600px',
                  border: `2px dashed ${theme.colors.border}`,
                  borderRadius: theme.radii.md,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: theme.colors.textSubtle,
                }}>
                  <FileText size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                  <p style={{ fontSize: '1.125rem', fontWeight: 500 }}>
                    Upload a sample document to get started
                  </p>
                  <p style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
                    Supported: Images, PDFs
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Right: Properties Panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Template Info */}
            <div style={{ ...getDashboardCardStyle(), padding: '1.5rem' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem', color: theme.colors.text }}>
                Template Properties
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: theme.colors.textSubtle }}>
                    Template Name *
                  </label>
                  <input
                    type="text"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder="e.g., ABC Motors Invoice Template"
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      background: theme.colors.panel,
                      border: `1px solid ${theme.colors.border}`,
                      borderRadius: theme.radii.sm,
                      color: theme.colors.text,
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: theme.colors.textSubtle }}>
                    Document Type *
                  </label>
                  <select
                    value={templateType}
                    onChange={(e) => setTemplateType(e.target.value as any)}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      background: theme.colors.panel,
                      border: `1px solid ${theme.colors.border}`,
                      borderRadius: theme.radii.sm,
                      color: theme.colors.text,
                    }}
                  >
                    <option value="invoice">Invoice</option>
                    <option value="pod">Proof of Delivery (POD)</option>
                    <option value="quote">Quote</option>
                    <option value="receipt">Receipt</option>
                    <option value="timesheet">Timesheet</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: theme.colors.textSubtle }}>
                    Supplier (Optional)
                  </label>
                  <select
                    value={selectedSupplierId}
                    onChange={(e) => setSelectedSupplierId(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      background: theme.colors.panel,
                      border: `1px solid ${theme.colors.border}`,
                      borderRadius: theme.radii.sm,
                      color: theme.colors.text,
                    }}
                  >
                    <option value="">None (Generic Template)</option>
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={isGeneric}
                      onChange={(e) => setIsGeneric(e.target.checked)}
                    />
                    <span style={{ fontSize: '0.875rem', color: theme.colors.text }}>
                      Generic Template (works for all suppliers)
                    </span>
                  </label>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: theme.colors.textSubtle }}>
                    Description
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Optional notes about this template..."
                    rows={3}
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      background: theme.colors.panel,
                      border: `1px solid ${theme.colors.border}`,
                      borderRadius: theme.radii.sm,
                      color: theme.colors.text,
                      resize: 'vertical',
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Field Properties */}
            {selectedBox && (
              <div style={{ ...getDashboardCardStyle(), padding: '1.5rem' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem', color: theme.colors.text }}>
                  Field Properties
                </h3>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: theme.colors.textSubtle }}>
                      Field Type
                    </label>
                    <select
                      value={selectedBox.field_name}
                      onChange={(e) => {
                        const field = availableFields.find(f => f.value === e.target.value);
                        handleUpdateBox({
                          field_name: e.target.value,
                          field_label: field?.label || e.target.value,
                        });
                      }}
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        background: theme.colors.panel,
                        border: `1px solid ${theme.colors.border}`,
                        borderRadius: theme.radii.sm,
                        color: theme.colors.text,
                      }}
                    >
                      <option value="">Select field type...</option>
                      {availableFields.map(f => (
                        <option key={f.value} value={f.value}>{f.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: theme.colors.textSubtle }}>
                      Confidence Level
                    </label>
                    <select
                      value={selectedBox.confidence_level}
                      onChange={(e) => handleUpdateBox({ confidence_level: e.target.value as any })}
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        background: theme.colors.panel,
                        border: `1px solid ${theme.colors.border}`,
                        borderRadius: theme.radii.sm,
                        color: theme.colors.text,
                      }}
                    >
                      <option value="always">Always (100%) - Field always here</option>
                      <option value="usually">Usually (80%) - Field usually here</option>
                      <option value="sometimes">Sometimes (50%) - Field occasionally here</option>
                      <option value="fallback">Fallback (20%) - Check if not found elsewhere</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', color: theme.colors.textSubtle }}>
                      Notes
                    </label>
                    <textarea
                      value={selectedBox.notes || ''}
                      onChange={(e) => handleUpdateBox({ notes: e.target.value })}
                      placeholder="Optional notes..."
                      rows={2}
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        background: theme.colors.panel,
                        border: `1px solid ${theme.colors.border}`,
                        borderRadius: theme.radii.sm,
                        color: theme.colors.text,
                        resize: 'vertical',
                      }}
                    />
                  </div>

                  <button
                    onClick={handleDeleteBox}
                    style={{
                      ...getDashboardButtonStyle('danger'),
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      justifyContent: 'center',
                    }}
                  >
                    <Trash2 size={16} />
                    Delete Box
                  </button>
                </div>
              </div>
            )}

            {/* Fields Summary */}
            <div style={{ ...getDashboardCardStyle(), padding: '1.5rem' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem', color: theme.colors.text }}>
                Marked Fields ({boxes.length})
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {boxes.map((box, index) => (
                  <div
                    key={box.id}
                    onClick={() => setSelectedBox(box)}
                    style={{
                      padding: '0.75rem',
                      background: box.id === selectedBox?.id ? `${theme.colors.accent}20` : theme.colors.panel,
                      border: `1px solid ${box.id === selectedBox?.id ? theme.colors.accent : theme.colors.border}`,
                      borderRadius: theme.radii.sm,
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: theme.colors.text, fontSize: '0.875rem' }}>
                        {box.field_label || 'Unlabeled'}
                      </span>
                      <span style={{
                        fontSize: '0.75rem',
                        padding: '0.125rem 0.5rem',
                        borderRadius: theme.radii.sm,
                        background: `${theme.colors.accent}20`,
                        color: theme.colors.accent,
                      }}>
                        {box.confidence_level}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                onClick={handleSaveTemplate}
                disabled={isLoading || !templateName || boxes.length === 0}
                style={{
                  ...getDashboardButtonStyle('primary'),
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  opacity: (!templateName || boxes.length === 0) ? 0.5 : 1,
                }}
              >
                <Save size={18} />
                {isLoading ? 'Saving...' : 'Save Template'}
              </button>

              <button
                onClick={resetForm}
                style={{
                  ...getDashboardButtonStyle('secondary'),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                }}
              >
                <X size={18} />
                Reset
              </button>
            </div>

            {error && (
              <div style={{
                padding: '1rem',
                background: `${theme.colors.danger}20`,
                border: `1px solid ${theme.colors.danger}`,
                borderRadius: theme.radii.sm,
                color: theme.colors.danger,
                fontSize: '0.875rem',
              }}>
                {error}
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
