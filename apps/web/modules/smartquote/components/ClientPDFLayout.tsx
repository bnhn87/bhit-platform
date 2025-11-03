import React from 'react';

import { QuoteDetails, CalculationResults, CalculatedProduct } from '../types';

import { BHILogo } from './icons';

interface ClientPDFLayoutProps {
    quoteDetails: QuoteDetails;
    results: CalculationResults;
}

export const ClientPDFLayout: React.FC<ClientPDFLayoutProps> = ({ quoteDetails, results }) => {
    const { crew, waste, pricing, labour } = results;

    // Sort products with power at end
    const sortedProducts = [...(results.detailedProducts || [])].sort((a, b) => {
        if (a.lineNumber === 999) return 1;
        if (b.lineNumber === 999) return -1;
        return a.lineNumber - b.lineNumber;
    });

    return (
        // This component is hidden and used only for generating the PDF
        <div id="pdf-layout" className="fixed -left-[9999px] top-0 w-[8.5in] h-[11in] bg-white font-sans text-black">
            <div className="relative w-full h-full flex flex-col p-12">
                {/* Header with gradient accent */}
                <div className="relative">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 via-blue-500 to-blue-400"></div>
                    <div className="flex justify-between items-start pt-4 pb-6">
                        <div>
                            <h1 className="text-4xl font-bold text-gray-900 mb-2">Installation Quote</h1>
                            <div className="flex items-center gap-4">
                                <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 text-sm font-semibold rounded-full">
                                    {quoteDetails.quoteRef || 'DRAFT'}
                                </span>
                                <span className="text-sm text-gray-500">
                                    {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                                </span>
                            </div>
                        </div>
                        <div className="text-right">
                            <BHILogo className="h-14 w-auto mb-2 text-black" />
                            <p className="text-sm font-semibold text-gray-900">BH Installation & Transport Ltd</p>
                            <p className="text-xs text-gray-600">Logistics & Installation Specialists</p>
                        </div>
                    </div>
                </div>

                {/* Client & Project Details */}
                <div className="bg-gray-50 rounded-lg p-6 mb-6 border border-gray-200">
                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <h3 className="text-xs uppercase font-bold text-gray-500 tracking-wider mb-2">Client Details</h3>
                            <p className="text-lg font-semibold text-gray-900">{quoteDetails.client || 'Valued Client'}</p>
                            <p className="text-sm text-gray-700 mt-1">{quoteDetails.project}</p>
                        </div>
                        <div className="text-right">
                            <h3 className="text-xs uppercase font-bold text-gray-500 tracking-wider mb-2">Delivery Location</h3>
                            <p className="text-sm text-gray-700 leading-relaxed">{quoteDetails.deliveryAddress}</p>
                        </div>
                    </div>
                </div>

                {/* Quote Summary with highlighted total */}
                <div className="bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-lg p-6 mb-6 shadow-lg">
                    <div className="flex justify-between items-start">
                        <div>
                            <h2 className="text-sm uppercase font-bold opacity-90 tracking-wider mb-1">Total Quote Value</h2>
                            <p className="text-4xl font-bold">£{pricing.totalCost.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                            <p className="text-sm opacity-80 mt-2">Billed for {pricing.billableDays.toFixed(1)} days</p>
                        </div>
                        <div className="text-right">
                            <div className="bg-white/20 backdrop-blur-sm rounded-lg px-4 py-3">
                                <p className="text-xs font-semibold uppercase opacity-90 mb-1">Team Size</p>
                                <p className="text-2xl font-bold">{crew.crewSize}</p>
                                <p className="text-xs opacity-80">person{crew.crewSize > 1 ? 's' : ''}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Service Details Grid */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                        <h4 className="text-xs uppercase font-bold text-gray-500 tracking-wider mb-2">Duration</h4>
                        <p className="text-xl font-bold text-gray-900">{(labour.bufferedHours / 8).toFixed(1)} days</p>
                        <p className="text-xs text-gray-600">{labour.bufferedHours.toFixed(1)} total hours</p>
                    </div>
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                        <h4 className="text-xs uppercase font-bold text-gray-500 tracking-wider mb-2">Transport</h4>
                        <p className="text-xl font-bold text-gray-900">{crew.isTwoManVanRequired ? '2-Man' : '1-Man'} Van</p>
                        <p className="text-xs text-gray-600">{crew.vanCount} vehicle{crew.vanCount > 1 ? 's' : ''}</p>
                    </div>
                    <div className="bg-white border border-gray-200 rounded-lg p-4">
                        <h4 className="text-xs uppercase font-bold text-gray-500 tracking-wider mb-2">Waste Removal</h4>
                        <p className="text-xl font-bold text-gray-900">{waste.loadsRequired > 0 ? `${waste.loadsRequired.toFixed(1)} loads` : 'Minimal'}</p>
                        <p className="text-xs text-gray-600">{waste.totalVolumeM3.toFixed(2)}m³ total</p>
                    </div>
                </div>

                {/* Service Inclusions */}
                {(quoteDetails.upliftViaStairs || quoteDetails.extendedUplift || quoteDetails.specialistReworking) && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                        <h4 className="text-xs uppercase font-bold text-blue-700 tracking-wider mb-3">Service Inclusions</h4>
                        <div className="flex flex-wrap gap-2">
                            {quoteDetails.upliftViaStairs && (
                                <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
                                    ✓ Stairs Uplift
                                </span>
                            )}
                            {quoteDetails.extendedUplift && (
                                <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
                                    ✓ Extended Uplift
                                </span>
                            )}
                            {quoteDetails.specialistReworking && (
                                <span className="inline-block px-3 py-1 bg-purple-100 text-purple-700 text-xs font-semibold rounded-full">
                                    ✓ Specialist Rework
                                </span>
                            )}
                        </div>
                    </div>
                )}

                {/* Product Schedule (Compact) */}
                <div className="flex-grow">
                    <h3 className="text-xs uppercase font-bold text-gray-500 tracking-wider mb-3">Product Schedule</h3>
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                        <table className="w-full text-xs">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-3 py-2 text-left font-semibold text-gray-700">Line</th>
                                    <th className="px-3 py-2 text-left font-semibold text-gray-700">Product Code</th>
                                    <th className="px-3 py-2 text-left font-semibold text-gray-700">Description</th>
                                    <th className="px-3 py-2 text-center font-semibold text-gray-700">Qty</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {sortedProducts.slice(0, 15).map((item: CalculatedProduct) => (
                                    <tr key={item.lineNumber} className="hover:bg-gray-50">
                                        <td className="px-3 py-2 text-gray-600">
                                            {item.lineNumber === 999 ? 'END' : `${item.lineNumber}`}
                                        </td>
                                        <td className="px-3 py-2 font-mono text-gray-700">{item.productCode}</td>
                                        <td className="px-3 py-2 text-gray-700 truncate max-w-xs">
                                            {item.cleanDescription || item.description}
                                        </td>
                                        <td className="px-3 py-2 text-center font-semibold text-gray-900">{item.quantity}</td>
                                    </tr>
                                ))}
                            </tbody>
                            {sortedProducts.length > 15 && (
                                <tfoot>
                                    <tr>
                                        <td colSpan={4} className="px-3 py-2 text-center text-gray-500 bg-gray-50">
                                            ... and {sortedProducts.length - 15} more items
                                        </td>
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                    </div>
                </div>

                {/* Terms & Footer */}
                <div className="mt-6 pt-4 border-t border-gray-200">
                    <div className="grid grid-cols-2 gap-6">
                        <div>
                            <h4 className="text-xs uppercase font-bold text-gray-500 tracking-wider mb-2">Terms & Conditions</h4>
                            <p className="text-xs text-gray-600 leading-relaxed">
                                This quote is valid for 30 days. Installation times are estimates based on standard working conditions.
                                Additional charges may apply for out-of-hours work or unforeseen site conditions.
                            </p>
                        </div>
                        <div className="text-right">
                            <h4 className="text-xs uppercase font-bold text-gray-500 tracking-wider mb-2">Prepared By</h4>
                            <p className="text-sm font-semibold text-gray-900">{quoteDetails.preparedBy || 'BHIT Team'}</p>
                            <p className="text-xs text-gray-600 mt-1">
                                BH Installation & Transport Ltd<br />
                                © {new Date().getFullYear()} All rights reserved
                            </p>
                        </div>
                    </div>
                </div>

                {/* Watermark Logo */}
                <div className="absolute bottom-12 left-12 opacity-5">
                    <BHILogo className="h-48 w-auto text-gray-400" />
                </div>
            </div>
        </div>
    );
};