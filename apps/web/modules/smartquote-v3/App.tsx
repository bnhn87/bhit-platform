// ============================================================================
// SmartQuote v3 - Main Application
// ============================================================================
// Enterprise quote management combining v1 + v2 + new features

import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import {
    Quote,
    QuoteStatus,
    AppView,
} from './types';

// Import calculation types from v1 (since we're using v1's calculateAll service)
import type {
    QuoteDetails,
    CalculatedProduct,
    CalculationResults,
} from '../smartquote/types';

// Import v1 components (reuse what works)
import { InitialInput } from '../smartquote/components/InitialInput';
import { QuoteDetailsForm } from '../smartquote/components/QuoteDetailsForm';
import { ResultsDisplay } from '../smartquote/components/ResultsDisplay';
import { ExportControls } from '../smartquote/components/ExportControls';
import { HomePage } from '../smartquote/HomePage';

// Import v1 services
import { calculateAll } from '../smartquote/services/calculationService';
import { resolveProductDetails } from '../smartquote/services/calculationService';
import { loadConfigSync } from '../smartquote/services/enhancedConfigService';
import { generatePdf, generateXlsx } from '../smartquote/services/exportService';

// Import v3 components
import { ApprovalPanel } from './components/ApprovalPanel';
import { NotificationCenter } from './components/NotificationCenter';

// Import v3 services
import { hybridParsingService } from './services/hybridParsingService';
import { approvalWorkflowService } from './services/approvalWorkflowService';
import { statusTrackingService } from './services/statusTrackingService';
import { jobIntegrationService } from './services/jobIntegrationService';

export default function SmartQuoteV3App() {
    const [view, setView] = useState<AppView>('home' as any);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const [currentQuote, setCurrentQuote] = useState<Quote | null>(null);
    const [quoteDetails, setQuoteDetails] = useState<QuoteDetails>({
        quoteRef: '',
        client: '',
        project: 'Rainbow Design',
        deliveryAddress: '',
        preparedBy: 'Ben Hone',
        upliftViaStairs: false,
        extendedUplift: false,
        specialistReworking: false,
        manuallyAddSupervisor: false,
        overrideFitterCount: null,
        overrideSupervisorCount: null,
        overrideVanType: null,
        overrideWasteVolumeM3: null,
        dailyParkingCharge: null,
    });
    const [products, setProducts] = useState<CalculatedProduct[]>([]);
    const [results, setResults] = useState<CalculationResults | null>(null);
    const [appConfig] = useState(loadConfigSync());

    const [pendingApprovals, setPendingApprovals] = useState<Quote[]>([]);

    useEffect(() => {
        loadPendingApprovals();
    }, []);

    const loadPendingApprovals = async () => {
        const { data: user } = await supabase.auth.getUser();
        if (user?.user?.id) {
            const quotes = await approvalWorkflowService.getPendingApprovals(user.user.id);
            setPendingApprovals(quotes);
        }
    };

    const showSuccess = (message: string) => {
        setSuccess(message);
        setTimeout(() => setSuccess(null), 3000);
    };

    const handleParse = async (content: any) => {
        // Validation
        if (!content || (Array.isArray(content) && content.length === 0)) {
            setError('Please provide quote content to parse');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            // Use hybrid parsing (combines v1 + v2)
            const parseResult = await hybridParsingService.parseQuote(content, {
                fast: false, // Use accurate mode
                minConfidence: 70,
            });

            // Resolve products against catalogue
            const { resolved, unresolved } = await resolveProductDetails(
                parseResult.products,
                appConfig,
                {},
                {}
            );

            // Include all products - resolved and unresolved
            // Unresolved products will use default values from config
            const allProducts = [...resolved, ...unresolved.map(p => ({
                ...p,
                description: p.cleanDescription || p.rawDescription,
                timePerUnit: appConfig.rules.defaultWasteVolumeM3,
                totalTime: p.quantity * appConfig.rules.defaultWasteVolumeM3,
                wastePerUnit: appConfig.rules.defaultWasteVolumeM3,
                totalWaste: p.quantity * appConfig.rules.defaultWasteVolumeM3,
                isHeavy: false,
                source: 'default' as const,
            }))];

            if (unresolved.length > 0) {
                showSuccess(`Parsed ${resolved.length} products. ${unresolved.length} using default values - review and adjust.`);
            }

            setProducts(allProducts);
            setQuoteDetails((prev) => ({ ...prev, ...parseResult.details }));

            // Create quote in database
            const { data: user } = await supabase.auth.getUser();
            const userId = user?.user?.id;

            if (userId) {
                const { data: newQuote, error: createError } = await supabase
                    .from('smartquote_v3_quotes')
                    .insert({
                        quote_ref: parseResult.details.quoteRef || `Q-${Date.now()}`,
                        client_name: parseResult.details.client || 'Unknown',
                        project_name: parseResult.details.project,
                        quote_details: parseResult.details,
                        products: allProducts,
                        results: {},
                        total_amount: 0,
                        status: QuoteStatus.DRAFT,
                        parse_confidence_score: parseResult.confidenceScore,
                        parse_method: parseResult.method,
                        parse_warnings: parseResult.warnings,
                        created_by: userId,
                    })
                    .select()
                    .single();

                if (createError) {
                    console.error('Failed to save quote to database:', createError);
                    setError('Quote parsed but failed to save to database. You can still calculate and export.');
                } else if (newQuote) {
                    setCurrentQuote(newQuote as Quote);
                    showSuccess('Quote parsed and saved successfully!');
                }
            } else {
                setError('Not authenticated. Quote parsed but not saved.');
            }

            setView('results' as any);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to parse quote');
        } finally {
            setLoading(false);
        }
    };

    const handleCalculate = async (details: QuoteDetails, productsList: CalculatedProduct[]) => {
        try {
            const calculatedResults = calculateAll(productsList, details, appConfig);
            setResults(calculatedResults);
            setQuoteDetails(details);
            setProducts(productsList);

            // Update quote in database
            if (currentQuote) {
                const { data, error: updateError } = await supabase
                    .from('smartquote_v3_quotes')
                    .update({
                        quote_details: details,
                        products: productsList,
                        results: calculatedResults,
                        total_amount: calculatedResults.pricing.totalCost,
                    })
                    .eq('id', currentQuote.id)
                    .select()
                    .single();

                if (updateError) {
                    console.error('Failed to update quote in database:', updateError);
                    setError('Calculation succeeded but failed to save to database');
                } else if (data) {
                    setCurrentQuote({
                        ...currentQuote,
                        quoteDetails: details,
                        products: productsList,
                        results: calculatedResults,
                        totalAmount: calculatedResults.pricing.totalCost,
                    });
                    showSuccess('Quote recalculated successfully!');
                }
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to calculate quote');
        }
    };

    const handleRequestApproval = async () => {
        if (!currentQuote) return;

        // Validation checks
        if (!currentQuote.totalAmount || currentQuote.totalAmount <= 0) {
            setError('Cannot request approval: Quote total is £0. Please calculate the quote first.');
            return;
        }

        if (!products || products.length === 0) {
            setError('Cannot request approval: No products in quote.');
            return;
        }

        if (!quoteDetails.client || !quoteDetails.project) {
            setError('Cannot request approval: Missing client or project information.');
            return;
        }

        setLoading(true);
        try {
            // Check auto-approval first
            const autoApproval = await approvalWorkflowService.checkAutoApproval(currentQuote.id);

            if (autoApproval.autoApprove) {
                showSuccess(`Auto-approved: ${autoApproval.reason}`);
                await statusTrackingService.updateStatus(currentQuote.id, QuoteStatus.APPROVED_INTERNAL);
            } else {
                // Get applicable approval rules based on quote amount
                const rules = await approvalWorkflowService.getApprovalRules();
                const quoteAmount = currentQuote.totalAmount || 0;

                // Find matching rule
                const matchingRule = rules.find(
                    rule =>
                        (!rule.minAmount || quoteAmount >= rule.minAmount) &&
                        (!rule.maxAmount || quoteAmount <= rule.maxAmount)
                );

                const approverIds = matchingRule?.requiredApproverUserIds || [];

                if (approverIds.length === 0) {
                    setError('No approvers found for this quote amount. Please configure approval rules or contact your manager.');
                    return;
                }

                // Request manual approval
                await approvalWorkflowService.requestApproval(
                    currentQuote.id,
                    approverIds,
                    `Please review quote ${currentQuote.quoteRef} for £${quoteAmount.toLocaleString()}`
                );
                await statusTrackingService.updateStatus(currentQuote.id, QuoteStatus.PENDING_INTERNAL);
                showSuccess(`Approval requested from ${approverIds.length} approver(s)!`);
            }

            await loadPendingApprovals();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to request approval');
        } finally {
            setLoading(false);
        }
    };

    const handleConvertToJob = async () => {
        if (!currentQuote) return;

        // Validation checks
        if (currentQuote.status !== QuoteStatus.WON) {
            setError(`Cannot convert to job: Quote must be WON (current status: ${currentQuote.status})`);
            return;
        }

        if (!currentQuote.totalAmount || currentQuote.totalAmount <= 0) {
            setError('Cannot convert to job: Quote total is £0.');
            return;
        }

        if (!products || products.length === 0) {
            setError('Cannot convert to job: No products in quote.');
            return;
        }

        if (currentQuote.convertedToJobId) {
            setError(`This quote has already been converted to job ${currentQuote.convertedToJobId}`);
            return;
        }

        setLoading(true);
        try {
            const result = await jobIntegrationService.convertToJob(currentQuote.id);

            if (result.success && result.jobId) {
                showSuccess(`Job created successfully! ID: ${result.jobId}`);
                window.open(`/job/${result.jobId}`, '_blank');
            } else {
                setError(result.error || 'Failed to create job');
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to convert to job');
        } finally {
            setLoading(false);
        }
    };

    const handleExportPdf = async () => {
        if (!currentQuote || !results) {
            setError('No quote data to export');
            return;
        }

        try {
            await generatePdf(quoteDetails, results);
            showSuccess('PDF exported successfully!');

            // Log export action
            const { data: user } = await supabase.auth.getUser();
            if (user?.user?.id) {
                await supabase.from('smartquote_v3_audit_trail').insert({
                    quote_id: currentQuote.id,
                    action: 'exported_pdf',
                    performed_by: user.user.id,
                    details: `Exported quote ${currentQuote.quoteRef} as PDF`,
                });
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to export PDF');
        }
    };

    const handleExportXlsx = async () => {
        if (!currentQuote || !results) {
            setError('No quote data to export');
            return;
        }

        try {
            await generateXlsx(quoteDetails, products, results);
            showSuccess('Excel exported successfully!');

            // Log export action
            const { data: user } = await supabase.auth.getUser();
            if (user?.user?.id) {
                await supabase.from('smartquote_v3_audit_trail').insert({
                    quote_id: currentQuote.id,
                    action: 'exported_xlsx',
                    performed_by: user.user.id,
                    details: `Exported quote ${currentQuote.quoteRef} as Excel`,
                });
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to export Excel');
        }
    };

    const resetApp = () => {
        setView('home' as any);
        setCurrentQuote(null);
        setProducts([]);
        setResults(null);
        setError(null);
        setQuoteDetails({
            quoteRef: '',
            client: '',
            project: 'Rainbow Design',
            deliveryAddress: '',
            preparedBy: 'Ben Hone',
            upliftViaStairs: false,
            extendedUplift: false,
            specialistReworking: false,
            manuallyAddSupervisor: false,
            overrideFitterCount: null,
            overrideSupervisorCount: null,
            overrideVanType: null,
            overrideWasteVolumeM3: null,
            dailyParkingCharge: null,
        });
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
            {/* Header */}
            <header className="bg-slate-800/50 backdrop-blur-lg border-b border-slate-700 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            {view !== ('home' as any) && (
                                <button
                                    onClick={resetApp}
                                    className="text-slate-400 hover:text-white transition-colors"
                                >
                                    <svg
                                        className="w-6 h-6"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M10 19l-7-7m0 0l7-7m-7 7h18"
                                        />
                                    </svg>
                                </button>
                            )}
                            <div>
                                <h1 className="text-2xl font-bold text-white">
                                    SmartQuote <span className="text-purple-400">v3.0</span>
                                </h1>
                                <p className="text-slate-400 text-sm">
                                    Enterprise Quote Management
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center space-x-4">
                            {pendingApprovals.length > 0 && (
                                <div className="px-3 py-1 bg-amber-500/20 text-amber-300 text-sm font-medium rounded-full">
                                    {pendingApprovals.length} Pending Approval
                                    {pendingApprovals.length > 1 ? 's' : ''}
                                </div>
                            )}
                            <NotificationCenter />
                        </div>
                    </div>
                </div>
            </header>

            {/* Success/Error Messages */}
            {success && (
                <div className="fixed top-20 right-6 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-slide-in">
                    ✓ {success}
                </div>
            )}
            {error && (
                <div className="fixed top-20 right-6 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-slide-in">
                    ✕ {error}
                </div>
            )}

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-6 py-8">
                {view === ('home' as any) && <HomePage onSelectView={setView} />}

                {view === ('parsing' as any) && (
                    <div className="space-y-6">
                        {/* Help Banner */}
                        <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-xl p-6">
                            <div className="flex items-start gap-4">
                                <div className="flex-shrink-0">
                                    <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                        How to Parse a Quote
                                    </h3>
                                    <ul className="space-y-2 text-sm text-gray-700">
                                        <li className="flex items-center gap-2">
                                            <span className="text-blue-600">•</span>
                                            <span><strong>Upload a file:</strong> PDF, Excel, or image of your quote</span>
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <span className="text-blue-600">•</span>
                                            <span><strong>Or paste text:</strong> Copy and paste quote details directly</span>
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <span className="text-blue-600">•</span>
                                            <span><strong>AI will extract:</strong> Products, quantities, client info, and project details</span>
                                        </li>
                                        <li className="flex items-center gap-2">
                                            <span className="text-blue-600">•</span>
                                            <span><strong>Review & edit:</strong> Check extracted data before calculating costs</span>
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </div>

                        {/* Parsing Form */}
                        <div className="bg-white rounded-2xl shadow-2xl p-8">
                            <InitialInput onParse={handleParse} />
                        </div>
                    </div>
                )}

                {view === ('results' as any) && currentQuote && results && (
                    <div className="space-y-6">
                        {/* Results Help Banner */}
                        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6">
                            <div className="flex items-start gap-4">
                                <div className="flex-shrink-0">
                                    <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                        Quote Calculated Successfully!
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-700">
                                        <div>
                                            <p className="font-medium mb-1">Next Steps:</p>
                                            <ul className="space-y-1">
                                                <li>• Review and adjust quote details if needed</li>
                                                <li>• Request approval from manager</li>
                                                <li>• Export PDF/Excel to send to client</li>
                                            </ul>
                                        </div>
                                        <div>
                                            <p className="font-medium mb-1">After Quote is Won:</p>
                                            <ul className="space-y-1">
                                                <li>• Mark quote as WON in status</li>
                                                <li>• Click "Convert to Job" to create job</li>
                                                <li>• Job will inherit all quote details</li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Approval Section */}
                        {currentQuote.status === QuoteStatus.PENDING_INTERNAL && (
                            <ApprovalPanel
                                quote={currentQuote}
                                onApproved={async () => {
                                    await loadPendingApprovals();
                                    showSuccess('Quote approved!');
                                }}
                                onRejected={async () => {
                                    await loadPendingApprovals();
                                    showSuccess('Quote rejected');
                                }}
                            />
                        )}

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {/* Quote Details */}
                            <div className="lg:col-span-1">
                                <QuoteDetailsForm
                                    details={quoteDetails}
                                    onDetailsChange={setQuoteDetails}
                                    onSubmit={() => handleCalculate(quoteDetails, products)}
                                    config={appConfig}
                                    submitButtonText="Recalculate"
                                />
                            </div>

                            {/* Results */}
                            <div className="lg:col-span-2">
                                <ResultsDisplay
                                    products={products}
                                    results={results}
                                    quoteDetails={quoteDetails}
                                    config={appConfig}
                                    onDetailsChange={setQuoteDetails}
                                    onProductsChange={setProducts}
                                    onSaveLearnedProduct={async () => {}}
                                />
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="bg-white rounded-lg shadow-lg p-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-3">
                                Quote Actions
                            </h3>

                            {/* Status indicator */}
                            <div className="mb-4 p-3 bg-slate-50 rounded-lg">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-600">Current Status:</span>
                                    <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                                        {currentQuote.status.replace('_', ' ').toUpperCase()}
                                    </span>
                                </div>
                            </div>

                            <div className="space-y-3">
                                {/* Approval Button */}
                                <div className="relative group">
                                    <button
                                        onClick={handleRequestApproval}
                                        disabled={
                                            loading ||
                                            currentQuote.status !== QuoteStatus.DRAFT
                                        }
                                        className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                        title={currentQuote.status !== QuoteStatus.DRAFT ? 'Only DRAFT quotes can request approval' : 'Request approval for this quote'}
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        Request Approval
                                    </button>
                                    {currentQuote.status !== QuoteStatus.DRAFT && (
                                        <div className="absolute left-0 right-0 mt-1 p-2 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                            Only DRAFT quotes can request approval (current: {currentQuote.status})
                                        </div>
                                    )}
                                </div>

                                {/* Convert to Job Button */}
                                <div className="relative group">
                                    <button
                                        onClick={handleConvertToJob}
                                        disabled={
                                            loading ||
                                            currentQuote.status !== QuoteStatus.WON
                                        }
                                        className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                        title={currentQuote.status !== QuoteStatus.WON ? 'Only WON quotes can be converted to jobs' : 'Convert this quote to a job'}
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                        </svg>
                                        Convert to Job
                                    </button>
                                    {currentQuote.status !== QuoteStatus.WON && (
                                        <div className="absolute left-0 right-0 mt-1 p-2 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                                            Only WON quotes can be converted to jobs (current: {currentQuote.status})
                                        </div>
                                    )}
                                </div>

                                {/* Export Buttons */}
                                <div className="flex gap-3">
                                    <button
                                        onClick={handleExportPdf}
                                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
                                        title="Export quote as PDF for client"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                        </svg>
                                        Export PDF
                                    </button>
                                    <button
                                        onClick={handleExportXlsx}
                                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
                                        title="Export quote as Excel spreadsheet"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                        Export Excel
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* Loading Overlay */}
            {loading && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white p-8 rounded-2xl shadow-2xl">
                        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-purple-600 mx-auto mb-4"></div>
                        <p className="text-gray-700 text-lg font-semibold">Processing...</p>
                    </div>
                </div>
            )}
        </div>
    );
}
