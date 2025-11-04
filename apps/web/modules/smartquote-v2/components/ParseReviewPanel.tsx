// ========================================
// SmartQuote v2.0 - Parse Review Panel
// ========================================
// Review parsed products with confidence indicators

import React, { useState } from 'react';

import { EnhancedParseResult } from '../types';

interface ParseReviewPanelProps {
    parseResult: EnhancedParseResult;
    onFinalize: (details: any, products: any[]) => void;
}

export default function ParseReviewPanel({ parseResult, onFinalize }: ParseReviewPanelProps) {
    const [products, setProducts] = useState(parseResult.products);
    const [details, setDetails] = useState(parseResult.details);

    const handleFinalize = () => {
        onFinalize(details, products);
    };

    const getConfidenceColor = (confidence: number) => {
        if (confidence >= 0.9) return 'bg-green-500';
        if (confidence >= 0.7) return 'bg-blue-500';
        if (confidence >= 0.5) return 'bg-yellow-500';
        return 'bg-red-500';
    };

    const getConfidenceLabel = (confidence: number) => {
        if (confidence >= 0.9) return 'Excellent';
        if (confidence >= 0.7) return 'Good';
        if (confidence >= 0.5) return 'Fair';
        return 'Low';
    };

    return (
        <div className="space-y-6">
            {/* Header with Confidence Score */}
            <div className="bg-slate-700 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-bold text-white">Review Parsed Quote</h2>
                    <div className="flex items-center space-x-2">
                        <span className="text-slate-300">Overall Confidence:</span>
                        <div className="flex items-center space-x-2">
                            <div className={`h-3 w-24 bg-slate-600 rounded-full overflow-hidden`}>
                                <div 
                                    className={`h-full ${getConfidenceColor(parseResult.confidenceScore)} transition-all`}
                                    style={{ width: `${parseResult.confidenceScore * 100}%` }}
                                />
                            </div>
                            <span className="text-white font-bold">
                                {(parseResult.confidenceScore * 100).toFixed(0)}%
                            </span>
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${
                                parseResult.confidenceScore >= 0.7 ? 'bg-green-500/20 text-green-300' : 'bg-yellow-500/20 text-yellow-300'
                            }`}>
                                {getConfidenceLabel(parseResult.confidenceScore)}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Warnings */}
                {parseResult.warnings && parseResult.warnings.length > 0 && (
                    <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                        <h3 className="text-yellow-300 font-semibold mb-2 flex items-center">
                            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            Parsing Warnings
                        </h3>
                        <ul className="list-disc list-inside text-yellow-200 text-sm space-y-1">
                            {parseResult.warnings.map((warning, i) => (
                                <li key={i}>{warning}</li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>

            {/* Quote Details */}
            <div className="bg-slate-700 rounded-xl p-6">
                <h3 className="text-xl font-bold text-white mb-4">Quote Details</h3>
                <div className="grid grid-cols-3 gap-4">
                    <div>
                        <label className="block text-slate-300 text-sm mb-2">Client</label>
                        <input
                            type="text"
                            value={details.client || ''}
                            onChange={(e) => setDetails({ ...details, client: e.target.value })}
                            className="w-full bg-slate-600 text-white rounded-lg px-4 py-2 focus:ring-2 focus:ring-purple-500 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-slate-300 text-sm mb-2">Project</label>
                        <input
                            type="text"
                            value={details.project || ''}
                            onChange={(e) => setDetails({ ...details, project: e.target.value })}
                            className="w-full bg-slate-600 text-white rounded-lg px-4 py-2 focus:ring-2 focus:ring-purple-500 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-slate-300 text-sm mb-2">Reference</label>
                        <input
                            type="text"
                            value={details.quoteRef || ''}
                            onChange={(e) => setDetails({ ...details, quoteRef: e.target.value })}
                            className="w-full bg-slate-600 text-white rounded-lg px-4 py-2 focus:ring-2 focus:ring-purple-500 outline-none"
                        />
                    </div>
                </div>
            </div>

            {/* Products Table */}
            <div className="bg-slate-700 rounded-xl p-6">
                <h3 className="text-xl font-bold text-white mb-4">
                    Products ({products.length})
                </h3>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                    {products.map((product, index) => (
                        <div key={index} className="bg-slate-600 rounded-lg p-4 border-l-4 border-purple-500">
                            <div className="flex items-start justify-between mb-2">
                                <div className="flex-1">
                                    <div className="flex items-center space-x-2 mb-1">
                                        <span className="text-purple-300 font-mono font-bold">{product.productCode}</span>
                                        <span className="text-white font-semibold">x {product.quantity}</span>
                                        <div className="flex items-center">
                                            <div className={`h-2 w-16 ${getConfidenceColor(product.confidence)} rounded-full`} />
                                            <span className="text-xs text-slate-300 ml-2">
                                                {(product.confidence * 100).toFixed(0)}%
                                            </span>
                                        </div>
                                    </div>
                                    <p className="text-slate-300 text-sm">{product.cleanDescription}</p>
                                </div>
                            </div>
                            
                            {product.confidence < 0.7 && (
                                <div className="mt-2 text-xs text-yellow-300 bg-yellow-500/10 px-2 py-1 rounded">
                                    ⚠️ Low confidence - please verify
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Excluded Products */}
            {parseResult.excludedProducts && parseResult.excludedProducts.length > 0 && (
                <div className="bg-slate-700 rounded-xl p-6 border border-red-500/30">
                    <h3 className="text-xl font-bold text-red-300 mb-4">
                        Excluded Products ({parseResult.excludedProducts.length})
                    </h3>
                    <p className="text-slate-300 text-sm mb-4">
                        These products were excluded due to low confidence. Review and add manually if needed.
                    </p>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                        {parseResult.excludedProducts.map((product: any, index: number) => (
                            <div key={index} className="bg-slate-800 rounded p-3 text-sm">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <span className="text-red-300 font-mono">{product.productCode}</span>
                                        <span className="text-slate-400 ml-2">x {product.quantity}</span>
                                    </div>
                                    <button
                                        onClick={() => setProducts([...products, product])}
                                        className="text-xs bg-green-600 hover:bg-green-700 px-3 py-1 rounded text-white"
                                    >
                                        Include
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Parse Metadata */}
            <div className="bg-slate-700/50 rounded-lg p-4 text-sm text-slate-300">
                <div className="flex items-center justify-between">
                    <div>Parsed in {parseResult.parseMetadata.duration}ms</div>
                    <div>Model: {parseResult.parseMetadata.model}</div>
                    <div>Retries: {parseResult.parseMetadata.retryCount}</div>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-4">
                <button
                    onClick={handleFinalize}
                    className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 rounded-xl transition-all transform hover:scale-105 shadow-lg"
                >
                    Finalize Quote
                </button>
                <button
                    onClick={() => window.location.reload()}
                    className="px-6 py-4 bg-slate-600 hover:bg-slate-500 text-white font-bold rounded-xl transition-all"
                >
                    Start Over
                </button>
            </div>
        </div>
    );
}
