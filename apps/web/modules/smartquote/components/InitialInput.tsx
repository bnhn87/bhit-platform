
import React, { useState } from 'react';

import { theme } from '../../../lib/theme';
import { ParseContent } from '../types';
import { getDashboardCardStyle, getDashboardButtonStyle, getDashboardTypographyStyle, getDashboardInputStyle, spacing } from '../utils/dashboardStyles';
import { getIconProps } from '../utils/iconSizing';

import { CameraIcon, FileTextIcon, FilePdfIcon, FileWordIcon, XCircleIcon } from './icons';

interface InitialInputProps {
    onParse: (content: ParseContent) => void;
}

const fileToGenerativePart = async (file: File): Promise<string | { mimeType: string; data: string }> => {
    // For images
    if (file.type.startsWith('image/')) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                if (typeof reader.result !== 'string' || !reader.result) {
                    return reject(new Error("Failed to read image file."));
                }
                const base64Data = reader.result.split(',')[1];
                resolve({ mimeType: file.type, data: base64Data });
            };
            reader.onerror = (err) => reject(new Error(`FileReader error for ${file.name}: ${err}`));
            reader.readAsDataURL(file);
        });
    }

    // For PDFs
    if (file.type === 'application/pdf') {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (event) => {
                if (!event.target?.result || (event.target.result as ArrayBuffer).byteLength === 0) {
                    return reject(new Error(`Could not read PDF file because it is empty: ${file.name}`));
                }

                const pdfjs = window.pdfjsLib;
                if (!pdfjs) {
                    return reject(new Error("PDF parsing library (pdf.js) is not available."));
                }
                pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

                const pdfData = new Uint8Array(event.target.result as ArrayBuffer);
                let pdf = null;

                try {
                    pdf = await pdfjs.getDocument({ data: pdfData }).promise;

                    // --- Attempt 1: Structured, Layout-Aware Parse ---
                    let structuredText = '';
                    let totalLinesGenerated = 0;
                    for (let i = 1; i <= pdf.numPages; i++) {
                        const page = await pdf.getPage(i);
                        const textContent = await page.getTextContent();
                        const items = textContent.items as Array<{ transform: number[]; str: string; height?: number }>;
                        if (items.length === 0) continue;

                        items.sort((a, b) => {
                            if (a.transform[5] > b.transform[5]) return -1;
                            if (a.transform[5] < b.transform[5]) return 1;
                            if (a.transform[4] < b.transform[4]) return -1;
                            if (a.transform[4] > b.transform[4]) return 1;
                            return 0;
                        });
                        
                        const lines: string[] = [];
                        if (items.length > 0) {
                            let currentLineItems: Array<{ transform: number[]; str: string; height?: number }> = [items[0]];
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
                        }
                        totalLinesGenerated += lines.length;
                        structuredText += lines.join('\n') + '\n\n';
                    }

                    if (structuredText.trim() && totalLinesGenerated > pdf.numPages) {
                        return resolve(`PDF Document (Layout-Aware Parse for ${file.name}):\n${structuredText}`);
                    }

                    // --- Attempt 2: Fallback Full Text Analysis ---
                    let rawText = '';
                    for (let i = 1; i <= pdf.numPages; i++) {
                        const page = await pdf.getPage(i);
                        const textContent = await page.getTextContent();
                        rawText += (textContent.items as Array<{ str: string }>).map((item) => item.str).join(' ') + '\n\n';
                    }

                    if (rawText.trim()) {
                        return resolve(`PDF Document (Full Text Analysis for ${file.name}):\n${rawText}`);
                    }

                    reject(new Error("Both parsing methods yielded no text content from the PDF."));
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    reject(new Error(`Failed to parse PDF "${file.name}". Error: ${errorMessage}`));
                } finally {
                    if (pdf && pdf.destroy) {
                        pdf.destroy();
                    }
                }
            };
            reader.onerror = () => reject(new Error(`FileReader failed to read ${file.name}.`));
            reader.readAsArrayBuffer(file);
        });
    }

    // For DOCX
    if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
         return new Promise((resolve, reject) => {
            const mammothLib = (window as { mammoth?: { extractRawText: (options: { arrayBuffer: ArrayBuffer }) => Promise<{ value: string }> } }).mammoth;
            if (!mammothLib) {
                return reject(new Error("Word document parsing library (mammoth.js) is not available. Please check your network connection or refresh the page."));
            }
            const reader = new FileReader();
            reader.onload = (event) => {
                if (!event.target?.result) {
                    return reject(new Error(`Could not read Word file: ${file.name}`));
                }
                mammothLib.extractRawText({ arrayBuffer: event.target.result as ArrayBuffer })
                    .then((result: { value: string }) => {
                        resolve(`Word Document (${file.name}):\n${result.value}`);
                    })
                    .catch((err: unknown) => {
                        console.error(`Error parsing DOCX ${file.name}:`, err);
                        const errorMessage = err instanceof Error ? err.message : String(err);
                        reject(new Error(`Failed to parse Word file "${file.name}". Error: ${errorMessage}`));
                    });
            };
            reader.onerror = (err) => reject(new Error(`FileReader error for ${file.name}: ${err}`));
            reader.readAsArrayBuffer(file);
        });
    }
    
    // Reject unsupported .doc files
    if (file.type === 'application/msword') {
        return Promise.reject(new Error(`Unsupported file type: .doc files are not supported. Please save as .docx.`));
    }

    // For plain text
    if (file.type === 'text/plain') {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                if (typeof reader.result !== 'string') return reject(new Error("Failed to read file as text."));
                resolve(`Text Document (${file.name}):\n${reader.result}`);
            };
            reader.onerror = (err) => reject(new Error(`FileReader error for ${file.name}: ${err}`));
            reader.readAsText(file);
        });
    }

    // Reject other unsupported file types
    return Promise.reject(new Error(`Unsupported file type: "${file.type || 'unknown'}" for file "${file.name}".`));
};

const FileItem: React.FC<{file: File, onRemove: () => void}> = ({ file, onRemove }) => {
    let icon;
    if (file.type.startsWith('image/')) icon = <CameraIcon {...getIconProps('file', { color: theme.colors.textSubtle })} />;
    else if (file.type === 'application/pdf') icon = <FilePdfIcon {...getIconProps('file', { color: '#dc2626' })} />;
    else if (file.type.includes('word')) icon = <FileWordIcon {...getIconProps('file', { color: '#2563eb' })} />;
    else icon = <FileTextIcon {...getIconProps('file', { color: theme.colors.textSubtle })} />;
    
    return (
        <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: theme.colors.panelAlt,
            padding: 8,
            borderRadius: theme.radii.md,
            border: `1px solid ${theme.colors.border}`
        }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, overflow: "hidden" }}>
                {icon}
                <span style={{ fontSize: 14, color: theme.colors.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{file.name}</span>
            </div>
            <button onClick={onRemove} style={{ color: theme.colors.textSubtle, background: "none", border: "none", cursor: "pointer", padding: 4 }}
                onMouseOver={(e) => e.currentTarget.style.color = theme.colors.danger}
                onMouseOut={(e) => e.currentTarget.style.color = theme.colors.textSubtle}>
                <XCircleIcon {...getIconProps('button')} />
            </button>
        </div>
    )
}

export const InitialInput: React.FC<InitialInputProps> = ({ onParse }) => {
    const [quoteText, setQuoteText] = useState('');
    const [files, setFiles] = useState<File[]>([]);
    const [error, setError] = useState<string | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setError(null);
            const newFiles = Array.from(e.target.files);
            const validFiles = newFiles.filter(file => {
                 if (file.size > 4 * 1024 * 1024) { // 4MB limit for Gemini
                    setError(`File "${file.name}" is too large (max 4MB).`);
                    return false;
                }
                return true;
            });
            setFiles(prev => [...prev, ...validFiles]);
            // Reset the input value to allow re-uploading the same file
            e.target.value = '';
        }
    };
    
    const removeFile = (indexToRemove: number) => {
        setFiles(prev => prev.filter((_, index) => index !== indexToRemove));
    }

    const handleParseClick = async () => {
        if (files.length === 0 && !quoteText.trim()) {
            setError('Please paste text or upload a document to parse.');
            return;
        }
        setError(null);

        try {
            const contentPromises: Promise<string | { mimeType: string; data: string }>[] = [];

            if (quoteText.trim()) {
                contentPromises.push(Promise.resolve(`Pasted Text:\n${quoteText}`));
            }
            
            files.forEach(file => {
                contentPromises.push(fileToGenerativePart(file));
            });
            
            const content = await Promise.all(contentPromises);
            onParse(content);
        } catch (err) {
             const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred while processing files.';
             setError(errorMessage);
             console.error(err);
        }
    };

    return (
        <div style={{
            ...getDashboardCardStyle('standard'),
            gap: '24px'
        }}>
             <div style={{ textAlign: "center", ...spacing.element }}>
                <h2 style={{
                    ...getDashboardTypographyStyle('sectionHeader'),
                    ...spacing.micro
                }}>Start a New Quote</h2>
                <p style={{
                    ...getDashboardTypographyStyle('bodyText'),
                    color: theme.colors.textSubtle,
                    margin: 0
                }}>Paste text, or upload one or more documents (PDF, Word, Image).</p>
            </div>
            
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 24, alignItems: "start" }}>
                 <div>
                    <h3 style={{
                        ...getDashboardTypographyStyle('cardTitle'),
                        ...spacing.small
                    }}>1. Paste Quote Text</h3>
                    <textarea
                        rows={12}
                        style={{
                            ...getDashboardInputStyle(),
                            display: "block",
                            width: "100%",
                            fontFamily: "inherit",
                            resize: "vertical",
                            minHeight: '200px'
                        }}
                        placeholder="Paste text from a quote here..."
                        value={quoteText}
                        onChange={(e) => setQuoteText(e.target.value)}
                    />
                </div>

                <div>
                     <h3 style={{
                        ...getDashboardTypographyStyle('cardTitle'),
                        ...spacing.small
                    }}>2. Upload Documents</h3>
                     <label htmlFor="file-upload" style={{
                        width: "100%",
                        cursor: "pointer",
                        background: theme.colors.panelAlt,
                        border: `2px dashed ${theme.colors.border}`,
                        borderRadius: theme.radii.lg,
                        padding: 24,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        transition: "all 0.2s ease"
                     }}
                     onMouseOver={(e) => {
                        e.currentTarget.style.background = theme.colors.muted;
                        e.currentTarget.style.borderColor = theme.colors.accent;
                     }}
                     onMouseOut={(e) => {
                        e.currentTarget.style.background = theme.colors.panelAlt;
                        e.currentTarget.style.borderColor = theme.colors.border;
                     }}>
                        <FileTextIcon {...getIconProps('hero', { color: theme.colors.textSubtle })} />
                        <span style={{ marginTop: 8, display: "block", fontSize: 14, fontWeight: 500, color: theme.colors.text }}>Click to upload documents</span>
                        <span style={{ display: "block", fontSize: 12, color: theme.colors.textSubtle }}>PDF, DOCX, Images, TXT (max 4MB each)</span>
                    </label>
                    <input id="file-upload" name="file-upload" type="file" 
                        accept="image/*,application/pdf,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain" 
                        style={{ position: "absolute", width: 1, height: 1, padding: 0, margin: -1, overflow: "hidden", clip: "rect(0,0,0,0)", whiteSpace: "nowrap", border: 0 }}
                        multiple
                        onChange={handleFileChange} />
                    
                    {files.length > 0 && (
                        <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 8 }}>
                             <h4 style={{
                                ...getDashboardTypographyStyle('labelText'),
                                margin: 0
                            }}>Selected files:</h4>
                            {files.map((file, index) => (
                                <FileItem key={`${file.name}-${index}`} file={file} onRemove={() => removeFile(index)} />
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {error && <p style={{ fontSize: 14, color: theme.colors.danger, textAlign: "center", fontWeight: 500, margin: 0 }}>{error}</p>}
            
            <button
                onClick={handleParseClick}
                style={{
                    ...getDashboardButtonStyle('primary', {
                        backgroundColor: theme.colors.accent,
                        color: 'white'
                    }),
                    width: "100%",
                    fontSize: '16px',
                    transition: "all 0.3s ease"
                }}
                onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = theme.colors.accentAlt;
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 0 14px 3px rgba(0, 170, 255, 0.35)';
                }}
                onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = theme.colors.accent;
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                }}
            >
                <FileTextIcon {...getIconProps('button', { marginRight: 8 })} />
                <span style={getDashboardTypographyStyle('buttonText')}>Parse Quote Content</span>
            </button>
        </div>
    );
};
