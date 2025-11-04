// ========================================
// SmartQuote v2.0 - Product Suggestions Panel
// ========================================

import React from 'react';

import { ProductSuggestion } from '../types';

interface ProductSuggestionsPanelProps {
    suggestions: ProductSuggestion[];
    onAdd?: (productCode: string) => void;
}

export default function ProductSuggestionsPanel({ 
    suggestions,
    onAdd 
}: ProductSuggestionsPanelProps) {
    
    if (suggestions.length === 0) return null;

    return (
        <div className="bg-blue-900/20 border border-blue-500/30 rounded-xl p-6">
            <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center mr-3">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                </div>
                <div>
                    <h3 className="text-xl font-bold text-blue-200">AI-Powered Suggestions</h3>
                    <p className="text-blue-300 text-sm">Products frequently used together</p>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
                {suggestions.map((suggestion, index) => (
                    <div key={index} className="bg-slate-800/50 rounded-lg p-4 hover:bg-slate-700/50 transition-all cursor-pointer group">
                        <div className="flex items-start justify-between">
                            <div className="flex-1">
                                <div className="font-semibold text-white mb-1">{suggestion.productName}</div>
                                <div className="text-blue-300 text-xs font-mono mb-2">{suggestion.productCode}</div>
                                <div className="flex items-center space-x-2 text-xs">
                                    <span className="bg-blue-500/20 text-blue-300 px-2 py-1 rounded">
                                        {(suggestion.similarityScore * 100).toFixed(0)}% match
                                    </span>
                                    <span className="text-slate-400">
                                        Used {suggestion.coOccurrenceCount}x together
                                    </span>
                                </div>
                            </div>
                            {onAdd && (
                                <button
                                    onClick={() => onAdd(suggestion.productCode)}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm font-medium"
                                >
                                    Add
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
