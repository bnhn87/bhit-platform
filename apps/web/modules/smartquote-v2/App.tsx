// ========================================
// SmartQuote v2.0 - Main Application Component
// ========================================
// World-class quote management with:
// - Enhanced document parsing with confidence scoring
// - Product learning and suggestions
// - Automatic revision tracking
// - Email automation workflow
// - Image extraction from PDFs

import React, { useState, useEffect } from 'react';

import AnalyticsDashboard from './components/AnalyticsDashboard';
import EmailDraftsPanel from './components/EmailDraftsPanel';
import InitialInput from './components/InitialInput';
import ParseReviewPanel from './components/ParseReviewPanel';
import ProductSuggestionsPanel from './components/ProductSuggestionsPanel';
import QuoteDetailsForm from './components/QuoteDetailsForm';
import ResultsDisplay from './components/ResultsDisplay';
import RevisionHistory from './components/RevisionHistory';
import analyticsService from './services/analyticsService';
import emailAutomationService from './services/emailAutomationService';
import { parseQuoteContentEnhanced } from './services/enhancedGeminiService';
import imageExtractionService from './services/imageExtractionService';
import { productLearningService } from './services/productLearningService';
import revisionTrackingService from './services/revisionTrackingService';
import { EnhancedParseResult, ProductSuggestion } from './types';

// Import components

interface AppState {
    stage: 'initial' | 'parsing' | 'review' | 'results' | 'email_drafts' | 'analytics';
    parseResult: EnhancedParseResult | null;
    quoteDetails: any;
    calculatedProducts: any[];
    results: any;
    quoteId: string | null;
    currentRevision: number;
    productSuggestions: ProductSuggestion[];
    loading: boolean;
    error: string | null;
}

export default function SmartQuoteV2App() {
    const [state, setState] = useState<AppState>({
        stage: 'initial',
        parseResult: null,
        quoteDetails: {},
        calculatedProducts: [],
        results: {},
        quoteId: null,
        currentRevision: 1,
        productSuggestions: [],
        loading: false,
        error: null
    });

    // Handle document upload and parse
    const handleParse = async (content: any[]) => {
        setState(prev => ({ ...prev, loading: true, error: null, stage: 'parsing' }));
        
        try {
            const startTime = Date.now();
            const result = await parseQuoteContentEnhanced(content, {
                maxRetries: 3,
                minConfidence: 0.5,
                includeLowConfidence: true
            });
            const duration = Date.now() - startTime;
            
            // Record analytics
            await analyticsService.recordParseAnalytics(undefined, {
                totalProductsDetected: result.products.length + (result.excludedProducts?.length || 0),
                productsAutoResolved: result.products.length,
                productsManualInput: 0,
                avgConfidenceScore: result.confidenceScore,
                parseDurationMs: duration,
                documentType: 'unknown' // Can be enhanced
            });
            
            // Get product suggestions based on parsed products
            const productCodes = result.products.map(p => p.productCode);
            if (productCodes.length > 0) {
                const suggestions = await productLearningService.getSuggestions(productCodes);
                setState(prev => ({ ...prev, productSuggestions: suggestions }));
            }
            
            setState(prev => ({
                ...prev,
                parseResult: result,
                quoteDetails: result.details,
                stage: 'review',
                loading: false
            }));
            
        } catch (error: unknown) {
            setState(prev => ({
                ...prev,
                error: error instanceof Error ? error.message : 'Failed to parse document',
                loading: false,
                stage: 'initial'
            }));
        }
    };

    // Handle quote finalization
    const handleFinalize = async (details: any, products: any[]) => {
        setState(prev => ({ ...prev, loading: true }));
        
        try {
            // Create quote in database
            // Calculate results using existing calculation service
            // Create initial revision
            // Record product selections for learning
            
            // This would integrate with your existing calculation and storage services
            
            setState(prev => ({
                ...prev,
                quoteDetails: details,
                calculatedProducts: products,
                stage: 'results',
                loading: false
            }));
            
        } catch (error: unknown) {
            setState(prev => ({
                ...prev,
                error: error instanceof Error ? error.message : 'Failed to finalize quote',
                loading: false
            }));
        }
    };

    // Handle quote revision
    const handleRevision = async (changes: string) => {
        if (!state.quoteId) return;
        
        try {
            await revisionTrackingService.createRevision(
                state.quoteId,
                state.quoteDetails,
                state.calculatedProducts,
                state.results,
                changes
            );
            
            setState(prev => ({
                ...prev,
                currentRevision: prev.currentRevision + 1
            }));
            
        } catch (error: unknown) {
            console.error('Failed to create revision:', error);
        }
    };

    // Navigation
    const navigateToStage = (stage: AppState['stage']) => {
        setState(prev => ({ ...prev, stage }));
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <header className="mb-8 text-center">
                    <h1 className="text-5xl font-bold text-white mb-2">
                        SmartQuote <span className="text-purple-400">v2.0</span>
                    </h1>
                    <p className="text-slate-300">
                        World-class quote management with AI-powered intelligence
                    </p>
                    
                    {/* Navigation Tabs */}
                    <nav className="mt-6 flex justify-center space-x-4">
                        <button
                            onClick={() => navigateToStage('initial')}
                            className={`px-4 py-2 rounded-lg transition-all ${
                                state.stage === 'initial'
                                    ? 'bg-purple-600 text-white'
                                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                            }`}
                        >
                            New Quote
                        </button>
                        <button
                            onClick={() => navigateToStage('email_drafts')}
                            className={`px-4 py-2 rounded-lg transition-all ${
                                state.stage === 'email_drafts'
                                    ? 'bg-purple-600 text-white'
                                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                            }`}
                        >
                            Email Drafts
                        </button>
                        <button
                            onClick={() => navigateToStage('analytics')}
                            className={`px-4 py-2 rounded-lg transition-all ${
                                state.stage === 'analytics'
                                    ? 'bg-purple-600 text-white'
                                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                            }`}
                        >
                            Analytics
                        </button>
                    </nav>
                </header>

                {/* Error Display */}
                {state.error && (
                    <div className="mb-6 p-4 bg-red-500/20 border border-red-500 rounded-lg text-white">
                        <strong>Error:</strong> {state.error}
                    </div>
                )}

                {/* Loading Overlay */}
                {state.loading && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                        <div className="bg-slate-800 p-8 rounded-xl shadow-2xl">
                            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-purple-500 mx-auto mb-4"></div>
                            <p className="text-white text-lg">Processing...</p>
                        </div>
                    </div>
                )}

                {/* Main Content */}
                <main className="bg-slate-800/50 backdrop-blur-lg rounded-2xl shadow-2xl p-8">
                    {state.stage === 'initial' && (
                        <InitialInput onParse={handleParse} />
                    )}

                    {state.stage === 'parsing' && (
                        <div className="text-center text-white">
                            <div className="animate-pulse mb-4">
                                <div className="inline-block p-4 bg-purple-600 rounded-full">
                                    <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                                            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                </div>
                            </div>
                            <h2 className="text-2xl font-bold mb-2">Analyzing Document...</h2>
                            <p className="text-slate-300">Using advanced AI to extract quote information</p>
                        </div>
                    )}

                    {state.stage === 'review' && state.parseResult && (
                        <div className="space-y-6">
                            <ParseReviewPanel 
                                parseResult={state.parseResult}
                                onFinalize={handleFinalize}
                            />
                            
                            {state.productSuggestions.length > 0 && (
                                <ProductSuggestionsPanel suggestions={state.productSuggestions} />
                            )}
                        </div>
                    )}

                    {state.stage === 'results' && (
                        <div className="space-y-6">
                            <ResultsDisplay
                                quoteDetails={state.quoteDetails}
                                products={state.calculatedProducts}
                                results={state.results}
                            />
                            
                            {state.quoteId && (
                                <RevisionHistory
                                    quoteId={state.quoteId}
                                    onCreateRevision={handleRevision}
                                />
                            )}
                        </div>
                    )}

                    {state.stage === 'email_drafts' && (
                        <EmailDraftsPanel />
                    )}

                    {state.stage === 'analytics' && (
                        <AnalyticsDashboard />
                    )}
                </main>

                {/* Footer */}
                <footer className="mt-8 text-center text-slate-400 text-sm">
                    <p>SmartQuote v2.0 - Built with world-class engineering</p>
                    <p className="mt-1">
                        Powered by advanced AI • Product learning • Revision tracking • Email automation
                    </p>
                </footer>
            </div>
        </div>
    );
}
