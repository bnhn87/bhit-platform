// ============================================================================
// SmartQuote v3 - Main Application
// ============================================================================
// Enterprise quote management combining v1 + v2 + new features

import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabaseClient';
import {
    Quote,
    QuoteStatus,
    QuoteDetails,
    CalculatedProduct,
    CalculationResults,
    AppView,
} from './types';

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

            if (unresolved.length > 0) {
                setError(`${unresolved.length} products need manual input`);
                // TODO: Show manual input dialog
            }

            setProducts(resolved);
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
                        products: resolved,
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

                if (!createError && newQuote) {
                    setCurrentQuote(newQuote as Quote);
                }
            }

            setView('results' as any);
            showSuccess('Quote parsed successfully!');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to parse quote');
        } finally {
            setLoading(false);
        }
    };

    const handleCalculate = (details: QuoteDetails, productsList: CalculatedProduct[]) => {
        try {
            const calculatedResults = calculateAll(productsList, details, appConfig);
            setResults(calculatedResults);
            setQuoteDetails(details);
            setProducts(productsList);

            // Update quote in database
            if (currentQuote) {
                supabase
                    .from('smartquote_v3_quotes')
                    .update({
                        quote_details: details,
                        products: productsList,
                        results: calculatedResults,
                        total_amount: calculatedResults.pricing.totalCost,
                    })
                    .eq('id', currentQuote.id)
                    .then(() => {
                        setCurrentQuote({
                            ...currentQuote,
                            quoteDetails: details,
                            products: productsList,
                            results: calculatedResults,
                            totalAmount: calculatedResults.pricing.totalCost,
                        });
                    });
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to calculate quote');
        }
    };

    const handleRequestApproval = async () => {
        if (!currentQuote) return;

        setLoading(true);
        try {
            // Check auto-approval first
            const autoApproval = await approvalWorkflowService.checkAutoApproval(currentQuote.id);

            if (autoApproval.autoApprove) {
                showSuccess(`Auto-approved: ${autoApproval.reason}`);
                await statusTrackingService.updateStatus(currentQuote.id, QuoteStatus.APPROVED_INTERNAL);
            } else {
                // Request manual approval
                await approvalWorkflowService.requestApproval(
                    currentQuote.id,
                    [], // TODO: Get approver list
                    'Please review this quote'
                );
                await statusTrackingService.updateStatus(currentQuote.id, QuoteStatus.PENDING_INTERNAL);
                showSuccess('Approval requested!');
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

    const handleExportPdf = () => {
        if (!currentQuote || !results) return;
        generatePdf(quoteDetails, results);
        showSuccess('PDF exported!');
    };

    const handleExportXlsx = () => {
        if (!currentQuote || !results) return;
        generateXlsx(quoteDetails, products, results);
        showSuccess('Excel exported!');
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
                    <div className="bg-white rounded-2xl shadow-2xl p-8">
                        <InitialInput onParse={handleParse} />
                    </div>
                )}

                {view === ('results' as any) && currentQuote && results && (
                    <div className="space-y-6">
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
                            <div className="flex flex-wrap gap-3">
                                <button
                                    onClick={handleRequestApproval}
                                    disabled={
                                        loading ||
                                        currentQuote.status !== QuoteStatus.DRAFT
                                    }
                                    className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:opacity-50"
                                >
                                    Request Approval
                                </button>
                                <button
                                    onClick={handleConvertToJob}
                                    disabled={
                                        loading ||
                                        currentQuote.status !== QuoteStatus.WON
                                    }
                                    className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:opacity-50"
                                >
                                    Convert to Job
                                </button>
                                <button
                                    onClick={handleExportPdf}
                                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                                >
                                    Export PDF
                                </button>
                                <button
                                    onClick={handleExportXlsx}
                                    className="bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                                >
                                    Export Excel
                                </button>
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
