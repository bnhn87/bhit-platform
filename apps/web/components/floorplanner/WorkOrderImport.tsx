/**
 * Work Order Add Component
 * Allows adding work orders from SmartQuote or other sources to auto-populate furniture
 */

import React, { useState, useCallback } from 'react';

import { theme } from '../../lib/theme';

import { SMART_QUOTE_FURNITURE as _SMART_QUOTE_FURNITURE, getFurnitureByProductCode } from './SmartQuoteFurniture';
import { JobFloorPlan as _JobFloorPlan, PlacedFurniture } from './types';

interface Props {
  onImportComplete: (furniture: PlacedFurniture[], summary: string) => void;
  onClose: () => void;
}

interface WorkOrderItem {
  productCode: string;
  quantity: number;
  description: string;
  room?: string;
}

export default function WorkOrderImport({ onImportComplete, onClose }: Props) {
  const [importText, setImportText] = useState('');
  const [parsedItems, setParsedItems] = useState<WorkOrderItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [_pdfText, _setPdfText] = useState<string>('');

  // Sample work order format for demonstration
  const sampleWorkOrder = `CHR001,2,Executive Chair,Office
DSK001,1,Executive Desk,Office
TBL001,1,Meeting Table,Meeting Room
CHR002,4,Task Chair,Meeting Room
CAB001,2,Filing Cabinet,Office

# Alternative formats also supported:
2x CHR003 - Lounge Chair
3 Executive Chairs
SOF001 Waiting Sofa
1 Reception Desk
SHF001`;

  const parseWorkOrderText = useCallback((text: string): WorkOrderItem[] => {
    const lines = text.trim().split('\n').filter(line => line.trim());
    const items: WorkOrderItem[] = [];

    for (const line of lines) {
      // Try CSV format: productCode,quantity,description,room
      const csvMatch = line.split(',');
      if (csvMatch.length >= 3) {
        const productCode = csvMatch[0].trim();
        const quantity = parseInt(csvMatch[1].trim()) || 1;
        const description = csvMatch[2].trim();
        const room = csvMatch[3]?.trim() || 'main';
        
        if (productCode && quantity > 0) {
          items.push({ productCode, quantity, description, room });
        }
        continue;
      }

      // Try simple format: "2x CHR001 - Executive Chair"
      const simpleMatch = line.match(/(\d+)\s*[x×]\s*([A-Z0-9]+)(?:\s*-\s*(.+))?/i);
      if (simpleMatch) {
        const quantity = parseInt(simpleMatch[1]) || 1;
        const productCode = simpleMatch[2].trim();
        const description = simpleMatch[3]?.trim() || productCode;
        
        items.push({ productCode, quantity, description, room: 'main' });
        continue;
      }

      // Try product code line format: "CHR001 Executive Chair"
      const productMatch = line.match(/^([A-Z0-9]+)\s+(.+)/i);
      if (productMatch) {
        const productCode = productMatch[1].trim();
        const description = productMatch[2].trim();
        
        items.push({ productCode, quantity: 1, description, room: 'main' });
        continue;
      }

      // Try quantity + description format: "2 Executive Chairs"
      const descMatch = line.match(/(\d+)\s+(.+)/i);
      if (descMatch) {
        const quantity = parseInt(descMatch[1]) || 1;
        const description = descMatch[2].trim();
        
        // Try to extract product code from description
        const codeInDesc = description.match(/([A-Z0-9]{3,})/i);
        const productCode = codeInDesc ? codeInDesc[1] : 'UNKNOWN';
        
        items.push({ productCode, quantity, description, room: 'main' });
        continue;
      }
    }

    return items;
  }, []);

  const handleTextParse = () => {
    setIsProcessing(true);
    
    setTimeout(() => {
      const items = parseWorkOrderText(importText);
      setParsedItems(items);
      setIsProcessing(false);
    }, 500);
  };

  const handleFileUpload = async (file: File) => {
    setSelectedFile(file);
    setIsProcessing(true);

    try {
      if (file.type === 'application/pdf') {
        // Process PDF with client-side extraction + AI
        
        // Extract content from PDF using client-side processing (like SmartQuote)
        const pdfContent = await extractPdfContent(file);
        
        // Send the extracted content to AI for parsing
        const response = await fetch('/api/extract-pdf-text', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ 
            content: [pdfContent],
            filename: file.name 
          })
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        
        if (result.success && result.items?.length > 0) {
          // Convert AI-parsed items to our format
          const workOrderItems: WorkOrderItem[] = result.items.map((item: { productCode?: string; quantity?: number; description?: string; rawDescription?: string; room?: string }) => ({
            productCode: item.productCode || 'UNKNOWN',
            quantity: item.quantity || 1,
            description: item.description || item.rawDescription || 'Unknown Item',
            room: item.room || 'main'
          }));
          
          setParsedItems(workOrderItems);
          setImportText(result.extractedText || `AI processed ${workOrderItems.length} items from PDF`);
          
          alert(`🎉 AI Processing Complete!\n\n📄 File: ${file.name}\n🔍 Found: ${workOrderItems.length} work order items\n📊 File size: ${Math.round(file.size/1024)} KB\n\n✅ Ready to import furniture items!`);
        } else if (result.success) {
          // PDF processed but no items found
          setImportText(result.extractedText || 'PDF processed but no work order items detected');
          setParsedItems([]);
          
          alert(`⚠️ PDF Processed Successfully\n\n📄 File: ${file.name}\n🔍 No work order items detected\n\n💡 The AI extracted text but couldn't identify furniture items.\nYou can manually edit the text below and parse again.`);
        } else {
          throw new Error(result.message || 'Failed to process PDF');
        }
      } else {
        // Handle text files (.txt, .csv)
        const text = await file.text();
        
        if (text.trim()) {
          setImportText(text);
          
          // Auto-parse text files
          const items = parseWorkOrderText(text);
          setParsedItems(items);
          
          if (items.length > 0) {
            alert(`File "${file.name}" processed successfully!\nFound ${items.length} work order items.`);
          } else {
            alert(`File "${file.name}" uploaded but no work order items were found.\nPlease check the format and try again.`);
          }
        } else {
          alert('The uploaded file appears to be empty. Please check your file and try again.');
        }
      }
    } catch (err) {
      // File processing error handled silently
      
      // Provide specific error messages
      if (err instanceof Error) {
        if (err.message.includes('PDF parsing library')) {
          alert(`📚 PDF Library Issue\n\n❌ ${err.message}\n\n🔄 Please refresh the page and try again, or copy-paste text manually.`);
        } else if (err.message.includes('AI service')) {
          alert(`🤖 AI Service Issue\n\n❌ ${err.message}\n\n💡 Fallback: You can copy-paste text from your PDF manually.`);
        } else if (err.message.includes('quota') || err.message.includes('limit')) {
          alert(`⏱️ AI Service Busy\n\n${err.message}\n\n🔄 Please try again in a few minutes or copy-paste text manually.`);
        } else {
          alert(`❌ Processing Failed\n\nFile: ${file.name}\nError: ${err.message}\n\n💡 You can copy-paste the text content manually as a fallback.`);
        }
      } else {
        alert(`Failed to process file "${file.name}".\nUnknown error occurred.\n\nPlease try copy-pasting the text manually.`);
      }
      
      // Don't reset the selected file so user can see what failed
      setParsedItems([]);
      setImportText('');
    } finally {
      setIsProcessing(false);
    }
  };

  // Client-side PDF content extraction (adapted from SmartQuote)
  const extractPdfContent = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (event) => {
        if (!event.target?.result || (event.target.result as ArrayBuffer).byteLength === 0) {
          return reject(new Error(`Could not read PDF file because it is empty: ${file.name}`));
        }

        const pdfjs = (window as { pdfjsLib?: {
          GlobalWorkerOptions: { workerSrc: string };
          getDocument: (src: { data: Uint8Array }) => { promise: Promise<{ numPages: number; getPage: (num: number) => Promise<{ getTextContent: () => Promise<{ items: Array<{ str: string }> }> }>; destroy: () => void }> };
        } }).pdfjsLib;
        if (!pdfjs) {
          return reject(new Error("PDF parsing library (pdf.js) is not available. Please refresh the page and try again."));
        }
        pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

        const pdfData = new Uint8Array(event.target.result as ArrayBuffer);
        let pdf = null;

        try {
          pdf = await pdfjs.getDocument({ data: pdfData }).promise;

          // Extract text from all pages
          let extractedText = '';
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const items = textContent.items as { str: string; transform: number[]; height?: number }[];
            
            if (items.length > 0) {
              // Sort by position for better text flow
              items.sort((a, b) => {
                if (a.transform[5] > b.transform[5]) return -1; // Y position (top to bottom)
                if (a.transform[5] < b.transform[5]) return 1;
                if (a.transform[4] < b.transform[4]) return -1; // X position (left to right)
                if (a.transform[4] > b.transform[4]) return 1;
                return 0;
              });
              
              // Group into lines based on Y position
              const lines: string[] = [];
              let currentLineItems: { str: string; transform: number[]; height?: number }[] = [items[0]];
              let lastY = items[0].transform[5];
              let lastHeight = items[0].height || 10;

              for (let j = 1; j < items.length; j++) {
                const item = items[j];
                if (Math.abs(item.transform[5] - lastY) > (lastHeight / 2)) {
                  lines.push(currentLineItems.sort((a, b) => a.transform[4] - b.transform[4]).map(i => i.str).join(' '));
                  currentLineItems = [item];
                } else {
                  currentLineItems.push(item);
                }
                lastY = item.transform[5];
                lastHeight = item.height || 10;
              }
              lines.push(currentLineItems.sort((a, b) => a.transform[4] - b.transform[4]).map(i => i.str).join(' '));
              
              extractedText += lines.join('\n') + '\n\n';
            }
          }

          if (extractedText.trim()) {
            resolve(`PDF Document (Work Order for ${file.name}):\n${extractedText}`);
          } else {
            reject(new Error("No text content could be extracted from the PDF."));
          }
        } catch (error: unknown) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          reject(new Error(`Failed to parse PDF "${file.name}". Error: ${errorMessage}`));
        } finally {
          if (pdf) {
            pdf.destroy();
          }
        }
      };
      reader.onerror = () => reject(new Error(`FileReader failed to read ${file.name}.`));
      reader.readAsArrayBuffer(file);
    });
  };

  const generateFurnitureFromItems = (): PlacedFurniture[] => {
    const furniture: PlacedFurniture[] = [];
    let xOffset = 100;
    let yOffset = 100;

    parsedItems.forEach(item => {
      const productData = getFurnitureByProductCode(item.productCode);
      
      for (let i = 0; i < item.quantity; i++) {
        const furnitureItem: PlacedFurniture = {
          id: `import_${item.productCode}_${i}_${Date.now()}`,
          name: productData?.name || item.description,
          productCode: item.productCode,
          width_cm: productData?.width_cm || 60,
          depth_cm: productData?.depth_cm || 60,
          x: xOffset,
          y: yOffset,
          rotation: 0,
          roomZone: item.room || 'main',
          color: productData?.color || theme.colors.accent,
          installOrder: furniture.length + 1
        };

        furniture.push(furnitureItem);

        // Arrange items in a grid
        xOffset += (productData?.width_cm || 60) * 2 + 20;
        if (xOffset > 600) {
          xOffset = 100;
          yOffset += (productData?.depth_cm || 60) * 2 + 20;
        }
      }
    });

    return furniture;
  };

  const handleImport = () => {
    const furniture = generateFurnitureFromItems();
    const summary = `Imported ${furniture.length} furniture items from ${parsedItems.length} work order line items`;
    onImportComplete(furniture, summary);
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: 20
    }}>
      <div style={{
        width: '100%',
        maxWidth: 800,
        maxHeight: '90vh',
        overflow: 'auto',
        background: theme.colors.panel,
        border: `1px solid ${theme.colors.border}`,
        borderRadius: 12,
        padding: 24
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 20
        }}>
          <h2 style={{ margin: 0, color: theme.colors.text }}>
            Add Work Order
          </h2>
          <button
            onClick={onClose}
            style={{
              padding: '8px 12px',
              borderRadius: 6,
              border: `1px solid ${theme.colors.border}`,
              background: 'transparent',
              color: theme.colors.textSubtle,
              cursor: 'pointer'
            }}
          >
            ✕ Close
          </button>
        </div>

        {/* Instructions */}
        <div style={{
          padding: 12,
          background: theme.colors.panelAlt,
          borderRadius: 6,
          marginBottom: 16
        }}>
          <h4 style={{ margin: '0 0 8px 0', color: theme.colors.text }}>
            Supported Formats:
          </h4>
          <div style={{ fontSize: 12, color: theme.colors.textSubtle }}>
            • CSV: <code>ProductCode,Quantity,Description,Room</code><br/>
            • Simple: <code>2x CHR001 - Executive Chair</code><br/>
            • Product codes: <code>CHR001</code>, <code>DSK001</code>, etc.<br/>
            • PDF: AI-powered automatic extraction<br/>
            • Quantity format: <code>2 Executive Chairs</code>
          </div>
        </div>

        {/* PDF Upload Status */}
        {selectedFile?.type === 'application/pdf' && (
          <div style={{
            padding: 12,
            background: parsedItems.length > 0 ? theme.colors.accentAlt + '20' : theme.colors.accent + '20',
            border: `1px solid ${parsedItems.length > 0 ? theme.colors.accentAlt : theme.colors.accent}`,
            borderRadius: 6,
            marginBottom: 16
          }}>
            <h4 style={{ margin: '0 0 8px 0', color: parsedItems.length > 0 ? theme.colors.accentAlt : theme.colors.accent }}>
              {parsedItems.length > 0 ? '🎉 AI Processing Complete' : '🤖 AI Processing PDF'}: {selectedFile.name}
            </h4>
            <div style={{ fontSize: 12, color: theme.colors.text }}>
              <strong>File size:</strong> {Math.round(selectedFile.size / 1024)} KB
              {parsedItems.length > 0 ? (
                <>
                  <br/><strong>AI Results:</strong> <span style={{ color: theme.colors.accentAlt }}>Found {parsedItems.length} work order items</span>
                  <br/><strong>Status:</strong> <span style={{ color: theme.colors.accentAlt }}>Ready to import!</span>
                </>
              ) : (
                <>
                  <br/><strong>Processing:</strong> Using AI to extract and parse work order data
                  <br/><strong>Status:</strong> {isProcessing ? 'Processing with AI...' : 'Processed - check results below'}
                </>
              )}
              <br/>
              <br/><strong>AI extracts:</strong>
              <br/>• Product codes and quantities
              <br/>• Item descriptions and categories  
              <br/>• Room assignments and specifications
              <br/>• Pricing and technical details
            </div>
          </div>
        )}

        {/* File Upload Status */}
        {selectedFile && selectedFile.type !== 'application/pdf' && (
          <div style={{
            padding: 12,
            background: theme.colors.accentAlt + '20',
            border: `1px solid ${theme.colors.accentAlt}`,
            borderRadius: 6,
            marginBottom: 16
          }}>
            <h4 style={{ margin: '0 0 8px 0', color: theme.colors.accentAlt }}>
              ✅ File Uploaded: {selectedFile.name}
            </h4>
            <div style={{ fontSize: 12, color: theme.colors.text }}>
              <strong>Type:</strong> {selectedFile.type || 'text file'} | <strong>Size:</strong> {Math.round(selectedFile.size / 1024)} KB
              {parsedItems.length > 0 ? (
                <><br/><strong>Status:</strong> <span style={{ color: theme.colors.accentAlt }}>Processed successfully - {parsedItems.length} items found</span></>
              ) : (
                <><br/><strong>Status:</strong> <span style={{ color: theme.colors.warn }}>No items found - check format</span></>
              )}
            </div>
          </div>
        )}

        {/* File Upload */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <label style={{
              display: 'inline-block',
              padding: '8px 16px',
              borderRadius: 6,
              border: `1px solid ${theme.colors.accent}`,
              background: theme.colors.accent,
              color: 'white',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: 12
            }}>
              📁 Upload File (CSV, TXT, PDF)
              <input
                type="file"
                accept=".csv,.txt,.pdf"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handleFileUpload(file);
                  }
                  e.currentTarget.value = ''; // Reset for re-upload
                }}
              />
            </label>
            
            <button
              onClick={() => setImportText(sampleWorkOrder)}
              style={{
                padding: '8px 16px',
                borderRadius: 6,
                border: `1px solid ${theme.colors.border}`,
                background: theme.colors.panel,
                color: theme.colors.text,
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: 12
              }}
            >
              📋 Load Sample
            </button>
            
            {selectedFile && (
              <button
                onClick={() => {
                  setSelectedFile(null);
                  setImportText('');
                  setParsedItems([]);
                }}
                style={{
                  padding: '8px 16px',
                  borderRadius: 6,
                  border: `1px solid ${theme.colors.danger}`,
                  background: 'transparent',
                  color: theme.colors.danger,
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: 12
                }}
              >
                🗑️ Clear
              </button>
            )}
          </div>
          
          {isProcessing && (
            <div style={{
              padding: 8,
              background: theme.colors.accent + '20',
              border: `1px solid ${theme.colors.accent}`,
              borderRadius: 4,
              fontSize: 12,
              color: theme.colors.accent,
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}>
              {selectedFile?.type === 'application/pdf' ? '🤖 Processing PDF with AI...' : '⏳ Processing file...'}
            </div>
          )}
        </div>

        {/* Text Input */}
        <div style={{ marginBottom: 16 }}>
          <label style={{
            display: 'block',
            marginBottom: 8,
            color: theme.colors.text,
            fontWeight: 600
          }}>
            Work Order Data:
            {selectedFile?.type === 'application/pdf' && parsedItems.length > 0 && (
              <span style={{ 
                marginLeft: 8, 
                fontSize: 12, 
                color: theme.colors.accentAlt, 
                fontWeight: 'normal' 
              }}>
                (AI-extracted content)
              </span>
            )}
            {selectedFile?.type === 'application/pdf' && parsedItems.length === 0 && !isProcessing && (
              <span style={{ 
                marginLeft: 8, 
                fontSize: 12, 
                color: theme.colors.textSubtle, 
                fontWeight: 'normal' 
              }}>
                (Fallback: paste text manually if AI processing failed)
              </span>
            )}
          </label>
          <textarea
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            placeholder={selectedFile?.type === 'application/pdf' 
              ? parsedItems.length > 0
                ? `AI has extracted the content from "${selectedFile.name}". You can edit or add items here if needed.`
                : `Fallback: paste content from "${selectedFile.name}" here if AI processing failed...\n\nExample formats:\nCHR001,2,Executive Chair,Office\n2x DSK001 - Executive Desk\nTBL001 Meeting Table\n3 Task Chairs`
              : "Paste your work order data here...\n\nSupported formats:\nCHR001,2,Executive Chair,Office\n2x CHR001 - Executive Chair\nCHR001 Executive Chair\n2 Executive Chairs"
            }
            style={{
              width: '100%',
              height: selectedFile?.type === 'application/pdf' ? 150 : 120,
              padding: 12,
              borderRadius: 6,
              border: `1px solid ${
                selectedFile?.type === 'application/pdf' && !importText.trim()
                  ? theme.colors.accentAlt
                  : theme.colors.border
              }`,
              background: selectedFile?.type === 'application/pdf' && !importText.trim()
                ? theme.colors.accentAlt + '10'
                : theme.colors.panelAlt,
              color: theme.colors.text,
              fontSize: 12,
              fontFamily: 'monospace',
              resize: 'vertical'
            }}
          />
          {selectedFile?.type === 'application/pdf' && !importText.trim() && parsedItems.length === 0 && !isProcessing && (
            <div style={{
              fontSize: 11,
              color: theme.colors.textSubtle,
              marginTop: 4,
              fontStyle: 'italic'
            }}>
              ⬆️ AI processing didn&apos;t find items. Copy text from your PDF and paste it above to continue manually
            </div>
          )}
        </div>

        {/* Parse Button */}
        <div style={{ marginBottom: 16 }}>
          <button
            onClick={handleTextParse}
            disabled={!importText.trim() || isProcessing}
            style={{
              padding: '8px 16px',
              borderRadius: 6,
              border: `1px solid ${theme.colors.accent}`,
              background: theme.colors.accent,
              color: 'white',
              cursor: !importText.trim() || isProcessing ? 'not-allowed' : 'pointer',
              fontWeight: 600,
              opacity: !importText.trim() || isProcessing ? 0.6 : 1
            }}
          >
            {isProcessing ? 
              (selectedFile?.type === 'application/pdf' ? '⏳ AI Processing...' : '⏳ Processing...') : 
              (selectedFile?.type === 'application/pdf' && parsedItems.length > 0 ? '🔄 Re-parse Text' : '🔍 Parse Work Order')
            }
          </button>
        </div>

        {/* Parsed Results */}
        {parsedItems.length > 0 && (
          <div style={{
            marginBottom: 16,
            padding: 12,
            background: theme.colors.panelAlt,
            borderRadius: 6,
            border: `1px solid ${theme.colors.border}`
          }}>
            <h4 style={{ margin: '0 0 12px 0', color: theme.colors.text }}>
              Parsed Items ({parsedItems.length}):
            </h4>
            
            <div style={{ display: 'grid', gap: 8, maxHeight: 200, overflow: 'auto' }}>
              {parsedItems.map((item, index) => {
                const productData = getFurnitureByProductCode(item.productCode);
                const isKnownProduct = !!productData;
                
                return (
                  <div
                    key={index}
                    style={{
                      padding: 8,
                      background: theme.colors.panel,
                      borderRadius: 4,
                      border: `1px solid ${isKnownProduct ? theme.colors.accentAlt : theme.colors.warn}`,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, color: theme.colors.text }}>
                        {item.quantity}x {item.productCode} - {item.description}
                      </div>
                      <div style={{ fontSize: 12, color: theme.colors.textSubtle }}>
                        Room: {item.room} • {isKnownProduct ? 'Known Product' : 'Unknown Product (will use defaults)'}
                      </div>
                    </div>
                    
                    <div style={{
                      padding: '2px 6px',
                      borderRadius: 4,
                      background: isKnownProduct ? theme.colors.accentAlt : theme.colors.warn,
                      color: 'white',
                      fontSize: 10,
                      fontWeight: 600
                    }}>
                      {isKnownProduct ? '✓' : '?'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Import Button */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingTop: 16,
          borderTop: `1px solid ${theme.colors.border}`
        }}>
          <div style={{ fontSize: 12, color: theme.colors.textSubtle }}>
            {parsedItems.length > 0 && 
              `${parsedItems.reduce((sum, item) => sum + item.quantity, 0)} total furniture items will be imported`
            }
          </div>
          
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={onClose}
              style={{
                padding: '8px 16px',
                borderRadius: 6,
                border: `1px solid ${theme.colors.border}`,
                background: 'transparent',
                color: theme.colors.text,
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
            
            <button
              onClick={handleImport}
              disabled={!parsedItems.length}
              style={{
                padding: '8px 16px',
                borderRadius: 6,
                border: `1px solid ${theme.colors.accentAlt}`,
                background: theme.colors.accentAlt,
                color: 'white',
                cursor: parsedItems.length ? 'pointer' : 'not-allowed',
                fontWeight: 600,
                opacity: parsedItems.length ? 1 : 0.6
              }}
            >
              🚀 Import {parsedItems.reduce((sum, item) => sum + item.quantity, 0)} Items
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}