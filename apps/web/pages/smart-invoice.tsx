import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  Upload,
  FileText,
  Search,
  Filter,
  Download,
  Eye,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  Trash2,
  FileSpreadsheet,
  Brain,
  Sparkles,
  CheckCircle
} from 'lucide-react';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';
import Layout from '../components/Layout';
import { theme } from '../lib/theme';
import { getDashboardCardStyle, getDashboardButtonStyle, getDashboardTypographyStyle } from '../modules/smartquote/utils/dashboardStyles';
import { processInvoiceWithAI } from '../lib/invoiceAiService';
import {
  fetchInvoices,
  createInvoiceFromExtraction,
  updateInvoice,
  deleteInvoice,
  uploadInvoiceFile,
  subscribeToInvoices,
  type Invoice
} from '../lib/invoiceDbService';

// Types for invoice data structure
interface InvoiceData {
  id: string;
  uploadedAt: Date;
  fileName: string;
  fileUrl?: string;

  // Extracted/Manual Fields matching Excel columns
  date: string | null;
  invoiceNumber: string | null;
  supplier: string | null;
  description: string | null;
  category: 'Vehicle' | 'Labour' | 'Materials' | 'Other' | null;
  vehicleReg: string | null;
  jobReference: string | null;
  netAmount: number | null;
  vatAmount: number | null;
  grossAmount: number | null;
  paymentStatus: 'Pending' | 'Paid' | 'Overdue' | null;
  paymentMethod: string | null;
  notes: string | null;

  // AI extraction metadata
  aiConfidence: number;
  extractionStatus: 'pending' | 'processing' | 'complete' | 'failed';
  extractedFields: Record<string, any>;
  manuallyEdited: boolean;
}

interface EditingCell {
  rowId: string;
  field: keyof InvoiceData;
  value: any;
}

export default function SmartInvoice() {
  const [invoices, setInvoices] = useState<InvoiceData[]>([]);
  const [selectedInvoices, setSelectedInvoices] = useState<Set<string>>(new Set());
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<keyof InvoiceData>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load invoices from database on mount
  useEffect(() => {
    loadInvoices();
  }, []);

  // Subscribe to real-time updates
  useEffect(() => {
    const unsubscribe = subscribeToInvoices((payload) => {
      console.log('Real-time invoice update:', payload);
      loadInvoices();
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Load invoices from database
  const loadInvoices = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const dbInvoices = await fetchInvoices();

      // Map database invoices to component format
      const mappedInvoices: InvoiceData[] = dbInvoices.map((inv: Invoice) => ({
        id: inv.id,
        uploadedAt: new Date(inv.created_at),
        fileName: inv.file_path ? inv.file_path.split('/').pop() || 'Unknown' : 'Unknown',
        fileUrl: inv.file_path,
        date: inv.invoice_date,
        invoiceNumber: inv.invoice_number,
        supplier: inv.supplier_name,
        description: inv.description || null,
        category: inv.category,
        vehicleReg: inv.vehicle_reg || null,
        jobReference: inv.job_reference || null,
        netAmount: inv.net_amount ? parseFloat(inv.net_amount.toString()) : null,
        vatAmount: inv.vat_amount ? parseFloat(inv.vat_amount.toString()) : null,
        grossAmount: inv.gross_amount ? parseFloat(inv.gross_amount.toString()) : null,
        paymentStatus: (inv.status === 'paid' ? 'Paid' : inv.status === 'pending' ? 'Pending' : 'Overdue') as 'Pending' | 'Paid' | 'Overdue',
        paymentMethod: null,
        notes: inv.notes || null,
        aiConfidence: inv.confidence_score ? parseFloat(inv.confidence_score.toString()) : 0,
        extractionStatus: 'complete' as const,
        extractedFields: {},
        manuallyEdited: false,
      }));

      setInvoices(mappedInvoices);
    } catch (err) {
      console.error('Error loading invoices:', err);

      // Provide specific error messages
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';

      if (errorMessage.includes('relation "invoices" does not exist') ||
          errorMessage.includes('relation "public.invoices" does not exist')) {
        setError('Database tables not set up. Please run SETUP_SMARTINVOICE.sql in Supabase SQL Editor.');
      } else if (errorMessage.includes('organization')) {
        setError('Organization not configured. Please run SETUP_SMARTINVOICE.sql in Supabase SQL Editor.');
      } else {
        setError(`Failed to load invoices: ${errorMessage}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Column definitions for spreadsheet
  const columns = [
    { key: 'date', label: 'Date', width: '120px', type: 'date' },
    { key: 'invoiceNumber', label: 'Invoice #', width: '120px', type: 'text' },
    { key: 'supplier', label: 'Supplier', width: '180px', type: 'text' },
    { key: 'description', label: 'Description', width: '250px', type: 'text' },
    { key: 'category', label: 'Category', width: '100px', type: 'select' },
    { key: 'vehicleReg', label: 'Vehicle', width: '100px', type: 'text' },
    { key: 'jobReference', label: 'Job Ref', width: '100px', type: 'text' },
    { key: 'netAmount', label: 'Net (£)', width: '100px', type: 'number' },
    { key: 'vatAmount', label: 'VAT (£)', width: '100px', type: 'number' },
    { key: 'grossAmount', label: 'Gross (£)', width: '110px', type: 'number' },
    { key: 'paymentStatus', label: 'Status', width: '100px', type: 'select' },
    { key: 'notes', label: 'Notes', width: '200px', type: 'text' },
  ];

  // Handle file upload
  const handleFileUpload = useCallback(async (files: FileList) => {
    setIsProcessing(true);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const invoiceId = `inv_${Date.now()}_${i}`;

      setUploadProgress(prev => ({ ...prev, [invoiceId]: 10 }));

      try {
        // Process with AI
        setUploadProgress(prev => ({ ...prev, [invoiceId]: 30 }));
        const result = await processInvoiceWithAI(file);

        if (!result.success || !result.data) {
          console.error('AI processing failed:', result.error);
          continue;
        }

        setUploadProgress(prev => ({ ...prev, [invoiceId]: 60 }));

        // Upload file to storage
        let filePath: string | undefined;
        try {
          filePath = await uploadInvoiceFile(file, result.data.invoiceNumber || 'PENDING');
        } catch (uploadError) {
          console.error('File upload failed:', uploadError);
          // Continue without file path
        }

        setUploadProgress(prev => ({ ...prev, [invoiceId]: 80 }));

        // Save to database
        await createInvoiceFromExtraction(result.data, filePath);

        setUploadProgress(prev => ({ ...prev, [invoiceId]: 100 }));
      } catch (error) {
        console.error('Error processing invoice:', error);
        setError(`Failed to process ${file.name}`);
      }
    }

    // Reload invoices from database
    await loadInvoices();

    setIsProcessing(false);
    setTimeout(() => setUploadProgress({}), 2000);
  }, []);

  // Export to Excel
  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(
      invoices.map(inv => ({
        Date: inv.date,
        'Invoice #': inv.invoiceNumber,
        Supplier: inv.supplier,
        Description: inv.description,
        Category: inv.category,
        Vehicle: inv.vehicleReg,
        'Job Ref': inv.jobReference,
        'Net (£)': inv.netAmount,
        'VAT (£)': inv.vatAmount,
        'Gross (£)': inv.grossAmount,
        Status: inv.paymentStatus,
        Notes: inv.notes,
      }))
    );

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Invoices');
    XLSX.writeFile(wb, `BHIT_Invoices_${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  };

  // Handle cell edit
  const handleCellEdit = async (rowId: string, field: keyof InvoiceData, value: any) => {
    // Update local state immediately for responsive UI
    setInvoices(prev => prev.map(inv => {
      if (inv.id === rowId) {
        const updated = { ...inv, [field]: value, manuallyEdited: true };

        if (field === 'netAmount' && typeof value === 'number') {
          updated.vatAmount = value * 0.2;
          updated.grossAmount = value + updated.vatAmount;
        }

        return updated;
      }
      return inv;
    }));
    setEditingCell(null);

    // Map field names to database columns
    const fieldMapping: Record<string, string> = {
      date: 'invoice_date',
      invoiceNumber: 'invoice_number',
      supplier: 'supplier_name',
      vehicleReg: 'vehicle_reg',
      jobReference: 'job_reference',
      netAmount: 'net_amount',
      vatAmount: 'vat_amount',
      grossAmount: 'gross_amount',
      paymentStatus: 'status',
    };

    const dbField = fieldMapping[field] || field;
    const updates: Record<string, any> = { [dbField]: value };

    // Calculate VAT and gross if net amount changed
    if (field === 'netAmount' && typeof value === 'number') {
      updates.vat_amount = value * 0.2;
      updates.gross_amount = value + updates.vat_amount;
    }

    // Map payment status to database status
    if (field === 'paymentStatus') {
      updates.status = value === 'Paid' ? 'paid' : 'pending';
    }

    // Save to database
    try {
      await updateInvoice(rowId, updates as any);
    } catch (error) {
      console.error('Error updating invoice:', error);
      setError('Failed to save changes');
      // Reload from database to revert
      loadInvoices();
    }
  };

  // Handle delete
  const handleDelete = async (invoiceId: string) => {
    if (!confirm('Are you sure you want to delete this invoice?')) {
      return;
    }

    try {
      await deleteInvoice(invoiceId);
      setInvoices(prev => prev.filter(inv => inv.id !== invoiceId));
    } catch (error) {
      console.error('Error deleting invoice:', error);
      setError('Failed to delete invoice');
    }
  };

  // Filter and search
  const filteredInvoices = invoices
    .filter(inv => filterCategory === 'all' || inv.category === filterCategory)
    .filter(inv => {
      if (!searchTerm) return true;
      const search = searchTerm.toLowerCase();
      return (
        inv.supplier?.toLowerCase().includes(search) ||
        inv.description?.toLowerCase().includes(search) ||
        inv.invoiceNumber?.toLowerCase().includes(search) ||
        inv.vehicleReg?.toLowerCase().includes(search) ||
        inv.jobReference?.toLowerCase().includes(search)
      );
    })
    .sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];

      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      if (sortDirection === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

  // Calculate totals
  const totals = filteredInvoices.reduce((acc, inv) => ({
    net: acc.net + (inv.netAmount || 0),
    vat: acc.vat + (inv.vatAmount || 0),
    gross: acc.gross + (inv.grossAmount || 0),
  }), { net: 0, vat: 0, gross: 0 });

  return (
    <Layout>
      <div style={{ background: theme.colors.background, minHeight: '100vh', color: theme.colors.text }}>
        {/* Error notification */}
        {error && (
          <div style={{
            position: 'fixed',
            top: '1rem',
            right: '1rem',
            left: '1rem',
            background: theme.colors.danger,
            color: 'white',
            padding: '1.5rem',
            borderRadius: theme.radii.md,
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            zIndex: 1001,
            maxWidth: '600px',
            margin: '0 auto'
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
              <AlertCircle size={24} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '0.5rem' }}>
                  Setup Required
                </div>
                <div style={{ marginBottom: '1rem', lineHeight: 1.5 }}>
                  {error}
                </div>
                <div style={{ fontSize: '0.875rem', opacity: 0.9, lineHeight: 1.4 }}>
                  📝 <strong>Next steps:</strong><br/>
                  1. Open Supabase Dashboard → SQL Editor<br/>
                  2. Run the file: <code style={{ background: 'rgba(0,0,0,0.3)', padding: '2px 6px', borderRadius: '3px' }}>SETUP_SMARTINVOICE.sql</code><br/>
                  3. Refresh this page
                </div>
              </div>
              <button
                onClick={() => setError(null)}
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  border: 'none',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '1.5rem',
                  padding: '0.25rem 0.5rem',
                  lineHeight: 1,
                  borderRadius: '4px',
                  flexShrink: 0
                }}
              >×</button>
            </div>
          </div>
        )}

        {/* Loading indicator */}
        {isLoading && (
          <div style={{
            position: 'fixed',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            ...getDashboardCardStyle('standard'),
            padding: '2rem',
            textAlign: 'center',
            zIndex: 1000
          }}>
            <Loader2 style={{ animation: 'spin 1s linear infinite', color: theme.colors.accent, margin: '0 auto' }} size={48} />
            <p style={{ color: theme.colors.textSubtle, marginTop: '1rem' }}>Loading invoices...</p>
          </div>
        )}

        {/* Header */}
        <div style={{
          background: `linear-gradient(135deg, ${theme.colors.panel}, ${theme.colors.panelAlt})`,
          borderBottom: `1px solid ${theme.colors.border}`,
          padding: '1.5rem'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <FileSpreadsheet style={{ color: theme.colors.accent, width: 32, height: 32 }} />
              <div>
                <h1 style={{
                  ...getDashboardTypographyStyle('sectionHeader'),
                  fontSize: '1.75rem',
                  fontWeight: 700,
                  margin: 0,
                  background: `linear-gradient(135deg, ${theme.colors.accent} 0%, ${theme.colors.accentAlt} 100%)`,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent'
                }}>SmartInvoice</h1>
                <p style={{
                  color: theme.colors.textSubtle,
                  fontSize: '0.875rem',
                  margin: '0.25rem 0 0 0'
                }}>AI-Powered Subcontractor Invoice Management</p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button style={{
                ...getDashboardButtonStyle('secondary'),
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <Filter size={18} />
                Filters
              </button>
              <button
                onClick={exportToExcel}
                style={{
                  ...getDashboardButtonStyle('secondary'),
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                <Download size={18} />
                Export
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                style={{
                  ...getDashboardButtonStyle('primary'),
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                <Upload size={18} />
                Upload Invoices
              </button>
            </div>
          </div>

          {/* Stats Bar */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
            {[
              { label: 'Total Invoices', value: invoices.length },
              { label: 'Total Net', value: `£${totals.net.toFixed(2)}` },
              { label: 'Total VAT', value: `£${totals.vat.toFixed(2)}` },
              { label: 'Total Gross', value: `£${totals.gross.toFixed(2)}` },
            ].map((stat, idx) => (
              <div key={idx} style={{
                ...getDashboardCardStyle('standard'),
                textAlign: 'center',
                padding: '1rem'
              }}>
                <div style={{
                  fontSize: '1.5rem',
                  fontWeight: 700,
                  color: theme.colors.accent
                }}>{stat.value}</div>
                <div style={{
                  fontSize: '0.75rem',
                  color: theme.colors.textSubtle,
                  textTransform: 'uppercase',
                  marginTop: '0.25rem'
                }}>{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Toolbar */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '1rem 1.5rem',
          background: theme.colors.panelAlt,
          borderBottom: `1px solid ${theme.colors.border}`
        }}>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: theme.colors.panel,
              border: `1px solid ${theme.colors.border}`,
              borderRadius: theme.radii.md,
              padding: '0.5rem 1rem',
              minWidth: '300px'
            }}>
              <Search size={18} color={theme.colors.textSubtle} />
              <input
                type="text"
                placeholder="Search invoices..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: theme.colors.text,
                  outline: 'none',
                  width: '100%'
                }}
              />
            </div>

            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              style={{
                background: theme.colors.panel,
                border: `1px solid ${theme.colors.border}`,
                borderRadius: theme.radii.md,
                padding: '0.5rem 1rem',
                color: theme.colors.text
              }}
            >
              <option value="all">All Categories</option>
              <option value="Vehicle">Vehicle</option>
              <option value="Labour">Labour</option>
              <option value="Materials">Materials</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            {selectedInvoices.size > 0 && (
              <span style={{ color: theme.colors.accent, fontWeight: 500 }}>
                {selectedInvoices.size} selected
              </span>
            )}
          </div>
        </div>

        {/* Spreadsheet Grid */}
        <div style={{ position: 'relative', overflowX: 'auto', minHeight: '400px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{
              background: theme.colors.panelAlt,
              position: 'sticky',
              top: 0,
              zIndex: 10
            }}>
              <tr>
                <th style={{
                  padding: '0.75rem',
                  textAlign: 'center',
                  fontWeight: 600,
                  color: theme.colors.textSubtle,
                  borderBottom: `2px solid ${theme.colors.border}`,
                  width: '40px'
                }}>
                  <input
                    type="checkbox"
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedInvoices(new Set(filteredInvoices.map(i => i.id)));
                      } else {
                        setSelectedInvoices(new Set());
                      }
                    }}
                    checked={selectedInvoices.size === filteredInvoices.length && filteredInvoices.length > 0}
                  />
                </th>
                <th style={{
                  padding: '0.75rem',
                  textAlign: 'center',
                  fontWeight: 600,
                  color: theme.colors.textSubtle,
                  borderBottom: `2px solid ${theme.colors.border}`,
                  width: '50px'
                }}>AI</th>
                {columns.map(col => (
                  <th
                    key={col.key}
                    style={{
                      width: col.width,
                      padding: '0.75rem',
                      textAlign: 'left',
                      fontWeight: 600,
                      color: theme.colors.textSubtle,
                      borderBottom: `2px solid ${theme.colors.border}`,
                      whiteSpace: 'nowrap',
                      cursor: 'pointer',
                      userSelect: 'none'
                    }}
                    onClick={() => {
                      if (sortField === col.key) {
                        setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
                      } else {
                        setSortField(col.key as keyof InvoiceData);
                        setSortDirection('desc');
                      }
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      {col.label}
                      {sortField === col.key && (
                        sortDirection === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
                      )}
                    </div>
                  </th>
                ))}
                <th style={{
                  padding: '0.75rem',
                  borderBottom: `2px solid ${theme.colors.border}`,
                  width: '100px'
                }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.map(invoice => (
                <tr key={invoice.id} style={{
                  borderBottom: `1px solid ${theme.colors.border}`,
                  background: selectedInvoices.has(invoice.id) ? `${theme.colors.accent}15` : 'transparent',
                  transition: 'background 0.2s'
                }}>
                  <td style={{ padding: '0.625rem 0.75rem', textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={selectedInvoices.has(invoice.id)}
                      onChange={(e) => {
                        const newSelected = new Set(selectedInvoices);
                        if (e.target.checked) {
                          newSelected.add(invoice.id);
                        } else {
                          newSelected.delete(invoice.id);
                        }
                        setSelectedInvoices(newSelected);
                      }}
                    />
                  </td>
                  <td style={{ padding: '0.625rem 0.75rem', textAlign: 'center' }}>
                    {invoice.extractionStatus === 'processing' && (
                      <Loader2 style={{ animation: 'spin 1s linear infinite' }} size={16} />
                    )}
                    {invoice.extractionStatus === 'complete' && (
                      <div title={`AI Confidence: ${invoice.aiConfidence?.toFixed(0)}%`}>
                        {invoice.aiConfidence > 80 ? (
                          <Sparkles style={{ color: theme.colors.accentAlt }} size={16} />
                        ) : invoice.aiConfidence > 50 ? (
                          <Brain style={{ color: theme.colors.warn }} size={16} />
                        ) : (
                          <AlertCircle style={{ color: theme.colors.warn }} size={16} />
                        )}
                      </div>
                    )}
                    {invoice.extractionStatus === 'failed' && (
                      <AlertCircle style={{ color: theme.colors.danger }} size={16} />
                    )}
                  </td>
                  {columns.map(col => {
                    const isEditing = editingCell?.rowId === invoice.id && editingCell?.field === col.key;
                    const value = invoice[col.key as keyof InvoiceData];

                    return (
                      <td
                        key={col.key}
                        style={{
                          padding: '0.625rem 0.75rem',
                          color: theme.colors.text,
                          cursor: 'pointer',
                          position: 'relative'
                        }}
                        onClick={() => {
                          if (!isEditing) {
                            setEditingCell({
                              rowId: invoice.id,
                              field: col.key as keyof InvoiceData,
                              value: value
                            });
                          }
                        }}
                      >
                        {isEditing ? (
                          <div>
                            {col.type === 'select' ? (
                              <select
                                autoFocus
                                value={editingCell.value || ''}
                                onChange={(e) => setEditingCell({ ...editingCell, value: e.target.value })}
                                onBlur={() => handleCellEdit(invoice.id, col.key as keyof InvoiceData, editingCell.value)}
                                style={{
                                  width: '100%',
                                  background: theme.colors.panel,
                                  border: `2px solid ${theme.colors.accent}`,
                                  borderRadius: theme.radii.sm,
                                  padding: '0.25rem 0.5rem',
                                  color: theme.colors.text,
                                  outline: 'none'
                                }}
                              >
                                {col.key === 'category' && (
                                  <>
                                    <option value="">Select...</option>
                                    <option value="Vehicle">Vehicle</option>
                                    <option value="Labour">Labour</option>
                                    <option value="Materials">Materials</option>
                                    <option value="Other">Other</option>
                                  </>
                                )}
                                {col.key === 'paymentStatus' && (
                                  <>
                                    <option value="Pending">Pending</option>
                                    <option value="Paid">Paid</option>
                                    <option value="Overdue">Overdue</option>
                                  </>
                                )}
                              </select>
                            ) : (
                              <input
                                type={col.type === 'number' ? 'number' : col.type === 'date' ? 'date' : 'text'}
                                autoFocus
                                value={editingCell.value || ''}
                                onChange={(e) => setEditingCell({
                                  ...editingCell,
                                  value: col.type === 'number' ? parseFloat(e.target.value) : e.target.value
                                })}
                                onBlur={() => handleCellEdit(invoice.id, col.key as keyof InvoiceData, editingCell.value)}
                                style={{
                                  width: '100%',
                                  background: theme.colors.panel,
                                  border: `2px solid ${theme.colors.accent}`,
                                  borderRadius: theme.radii.sm,
                                  padding: '0.25rem 0.5rem',
                                  color: theme.colors.text,
                                  outline: 'none'
                                }}
                              />
                            )}
                          </div>
                        ) : (
                          <div style={{ minHeight: '1.5rem' }}>
                            {col.type === 'number' && value !== null ?
                              `£${(value as number).toFixed(2)}` :
                              col.type === 'date' && value ?
                              format(new Date(value as string), 'dd/MM/yyyy') :
                              (value as string) || '-'
                            }
                          </div>
                        )}
                        {invoice.manuallyEdited && col.key !== 'date' && (
                          <div style={{
                            position: 'absolute',
                            top: 0,
                            right: 0,
                            width: 0,
                            height: 0,
                            borderTop: `8px solid ${theme.colors.accentAlt}`,
                            borderLeft: '8px solid transparent'
                          }} />
                        )}
                      </td>
                    );
                  })}
                  <td style={{ padding: '0.625rem 0.75rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button
                        title="View Original"
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: theme.colors.textSubtle,
                          cursor: 'pointer',
                          padding: '0.25rem',
                          borderRadius: theme.radii.sm,
                          transition: 'all 0.2s'
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.color = theme.colors.accent;
                          e.currentTarget.style.background = `${theme.colors.accent}10`;
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.color = theme.colors.textSubtle;
                          e.currentTarget.style.background = 'transparent';
                        }}
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        title="Delete"
                        onClick={() => handleDelete(invoice.id)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: theme.colors.textSubtle,
                          cursor: 'pointer',
                          padding: '0.25rem',
                          borderRadius: theme.radii.sm,
                          transition: 'all 0.2s'
                        }}
                        onMouseOver={(e) => {
                          e.currentTarget.style.color = theme.colors.danger;
                          e.currentTarget.style.background = `${theme.colors.danger}10`;
                        }}
                        onMouseOut={(e) => {
                          e.currentTarget.style.color = theme.colors.textSubtle;
                          e.currentTarget.style.background = 'transparent';
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredInvoices.length === 0 && (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '4rem 2rem',
              color: theme.colors.textSubtle
            }}>
              <FileText size={48} />
              <h3 style={{ margin: '1rem 0 0.5rem', fontSize: '1.25rem' }}>No invoices found</h3>
              <p>Upload invoices or adjust your filters</p>
            </div>
          )}
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.png,.jpg,.jpeg"
          onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
          style={{ display: 'none' }}
        />

        {/* Upload overlay */}
        {isProcessing && (
          <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}>
            <div style={{
              ...getDashboardCardStyle('standard'),
              padding: '2rem',
              textAlign: 'center',
              minWidth: '400px'
            }}>
              <Brain style={{ animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite', color: theme.colors.accent }} size={48} />
              <h3 style={{ color: theme.colors.accent, margin: '1rem 0' }}>Processing Invoices with AI</h3>
              <p style={{ color: theme.colors.textSubtle }}>Extracting data from your documents...</p>
              <div style={{ marginTop: '1.5rem' }}>
                {Object.entries(uploadProgress).map(([id, progress]) => (
                  <div key={id} style={{
                    height: '4px',
                    background: theme.colors.muted,
                    borderRadius: '2px',
                    overflow: 'hidden',
                    marginBottom: '0.5rem'
                  }}>
                    <div style={{
                      height: '100%',
                      width: `${progress}%`,
                      background: `linear-gradient(90deg, ${theme.colors.accent} 0%, ${theme.colors.accentAlt} 100%)`,
                      transition: 'width 0.3s'
                    }} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
