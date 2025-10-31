// ========================================
// SmartQuote v2.0 - Initial Input Component
// ========================================
// Handles document upload and quote initiation

import React, { useState, useRef } from 'react';

interface InitialInputProps {
    onParse: (content: any[]) => void;
}

export default function InitialInput({ onParse }: InitialInputProps) {
    const [files, setFiles] = useState<File[]>([]);
    const [textInput, setTextInput] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFiles(Array.from(e.target.files));
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        if (e.dataTransfer.files) {
            setFiles(Array.from(e.dataTransfer.files));
        }
    };

    const handleSubmit = async () => {
        const content: any[] = [];
        
        // Add text input if provided
        if (textInput.trim()) {
            content.push(textInput.trim());
        }
        
        // Process files
        for (const file of files) {
            const reader = new FileReader();
            const fileData = await new Promise<string>((resolve) => {
                reader.onload = () => resolve(reader.result as string);
                reader.readAsDataURL(file);
            });
            
            content.push({
                mimeType: file.type,
                data: fileData.split(',')[1] // Remove data URL prefix
            });
        }
        
        if (content.length > 0) {
            onParse(content);
        }
    };

    return (
        <div className="space-y-6">
            <div className="text-center mb-8">
                <h2 className="text-3xl font-bold text-white mb-2">Create New Quote</h2>
                <p className="text-slate-300">Upload documents or paste quote details</p>
            </div>

            {/* File Upload Area */}
            <div
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                className="border-2 border-dashed border-purple-500/50 rounded-xl p-12 text-center hover:border-purple-500 transition-colors cursor-pointer bg-slate-700/30"
                onClick={() => fileInputRef.current?.click()}
            >
                <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".pdf,.xlsx,.xls,.docx,.jpg,.png"
                    onChange={handleFileSelect}
                    className="hidden"
                />
                
                <div className="mx-auto w-16 h-16 mb-4 text-purple-400">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                </div>
                
                <p className="text-white font-semibold mb-2">
                    {files.length > 0 ? `${files.length} file(s) selected` : 'Drop files here or click to upload'}
                </p>
                <p className="text-slate-400 text-sm">
                    Supports PDF, Excel, Word, and images
                </p>
                
                {files.length > 0 && (
                    <div className="mt-4 space-y-2">
                        {files.map((file, i) => (
                            <div key={i} className="flex items-center justify-between bg-slate-800 px-4 py-2 rounded-lg">
                                <span className="text-white text-sm">{file.name}</span>
                                <span className="text-slate-400 text-xs">{(file.size / 1024).toFixed(1)} KB</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Text Input */}
            <div>
                <label className="block text-white font-semibold mb-2">Or paste quote details</label>
                <textarea
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    placeholder="Paste quote details here..."
                    className="w-full h-32 bg-slate-700 text-white rounded-lg p-4 focus:ring-2 focus:ring-purple-500 outline-none"
                />
            </div>

            {/* Submit Button */}
            <button
                onClick={handleSubmit}
                disabled={files.length === 0 && !textInput.trim()}
                className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl transition-all transform hover:scale-105 shadow-lg"
            >
                Parse Quote
            </button>
        </div>
    );
}
