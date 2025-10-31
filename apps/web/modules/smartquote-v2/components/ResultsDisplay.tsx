// ========================================
// SmartQuote v2.0 - Results Display Component
// ========================================

import React, { useState } from 'react';

interface ResultsDisplayProps {
    quoteDetails: any;
    products: any[];
    results: any;
    onExport?: (format: 'pdf' | 'xlsx') => void;
    onCreateJob?: () => void;
}

export default function ResultsDisplay({ 
    quoteDetails, 
    products, 
    results,
    onExport,
    onCreateJob
}: ResultsDisplayProps) {
    
    return (
        <div className="space-y-6">
            {/* Header with Actions */}
            <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl p-6 shadow-2xl">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-3xl font-bold text-white mb-2">
                            Quote Complete
                        </h2>
                        <p className="text-purple-100">
                            {quoteDetails.client} • {quoteDetails.project}
                        </p>
                    </div>
                    <div className="flex space-x-3">
                        <button
                            onClick={() => onExport?.('pdf')}
                            className="bg-white text-purple-600 px-6 py-3 rounded-lg font-bold hover:bg-purple-50 transition-all flex items-center space-x-2"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                    d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                            </svg>
                            <span>Export PDF</span>
                        </button>
                        <button
                            onClick={() => onExport?.('xlsx')}
                            className="bg-white text-purple-600 px-6 py-3 rounded-lg font-bold hover:bg-purple-50 transition-all flex items-center space-x-2"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                    d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <span>Export Excel</span>
                        </button>
                        <button
                            onClick={onCreateJob}
                            className="bg-green-500 text-white px-6 py-3 rounded-lg font-bold hover:bg-green-600 transition-all flex items-center space-x-2"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                            </svg>
                            <span>Create Job</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-4 gap-4">
                <div className="bg-slate-700 rounded-xl p-6">
                    <div className="text-slate-400 text-sm mb-1">Products</div>
                    <div className="text-3xl font-bold text-white">{products.length}</div>
                </div>
                <div className="bg-slate-700 rounded-xl p-6">
                    <div className="text-slate-400 text-sm mb-1">Total Value</div>
                    <div className="text-3xl font-bold text-green-400">
                        £{(results.totalPrice || 0).toLocaleString()}
                    </div>
                </div>
                <div className="bg-slate-700 rounded-xl p-6">
                    <div className="text-slate-400 text-sm mb-1">Labour Days</div>
                    <div className="text-3xl font-bold text-blue-400">
                        {(results.labourDays || 0).toFixed(1)}
                    </div>
                </div>
                <div className="bg-slate-700 rounded-xl p-6">
                    <div className="text-slate-400 text-sm mb-1">Crew Size</div>
                    <div className="text-3xl font-bold text-purple-400">
                        {results.crewSize || 0}
                    </div>
                </div>
            </div>

            {/* Products List */}
            <div className="bg-slate-700 rounded-xl p-6">
                <h3 className="text-xl font-bold text-white mb-4">Products</h3>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                    {products.map((product, index) => (
                        <div key={index} className="bg-slate-600 rounded-lg p-4 flex items-center justify-between">
                            <div>
                                <div className="font-semibold text-white">{product.description}</div>
                                <div className="text-slate-400 text-sm">Code: {product.productCode}</div>
                            </div>
                            <div className="text-right">
                                <div className="text-white font-bold">x {product.quantity}</div>
                                <div className="text-green-400 text-sm">£{(product.price || 0).toFixed(2)}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
