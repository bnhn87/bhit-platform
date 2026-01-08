

import React, { useState, useCallback, useEffect } from 'react';

import { supabase } from '../../lib/supabaseClient';
import { theme } from '../../lib/theme';


import { AdminPanel } from './components/AdminPanel';
import { ClientPDFLayout } from './components/ClientPDFLayout';
import { ExportControls } from './components/ExportControls';
import { BHILogo, LoadingSpinnerIcon, CheckCircleIcon, HomeIcon } from './components/icons';
import { InitialInput } from './components/InitialInput';
import { KeyboardShortcutsHelp } from './components/KeyboardShortcutsHelp';
import { QuoteComparisonView } from './components/QuoteComparisonView';
import { QuoteDetailsForm } from './components/QuoteDetailsForm';
import { ResultsDisplay } from './components/ResultsDisplay';
import { SkipLinks } from './components/SkipLinks';
import { SmartQuoteErrorBoundary } from './components/SmartQuoteErrorBoundary';
import { UnknownProductInput } from './components/UnknownProductInput';
import { HomePage } from './HomePage';
import { useScreenReaderAnnounce } from './hooks/useAccessibility';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useBreakpoint, useIsMobile, useIsTouchDevice } from './hooks/useResponsive';
import { useUndoRedo } from './hooks/useUndoRedo';
import { ManualProductSelector } from './ManualProductSelector';
import { QuoteHistory } from './QuoteHistory';
import { resolveProductDetails, calculateAll, standardizeProductName, groupPowerItems, validateRawProduct } from './services/calculationService';
import { hybridStorageService } from './services/databaseStorageService';
import { loadConfig, saveConfig, loadConfigSync, saveLearnedProduct, getDefaultConfig } from './services/enhancedConfigService';
import { ErrorHandler, ErrorCategory, withRetry } from './services/errorService';
import { generatePdf, generateXlsx } from './services/exportService';
import { parseQuoteContent } from './services/geminiService';
import { validateQuoteDetails, validateProducts, formatValidationErrors } from './services/validationService';
import workingMemory from './services/workingMemoryService';
import { AppState, QuoteDetails, ParsedProduct, CalculationResults, ProductReference, CalculatedProduct, ParseContent, SavedQuote, AppConfig } from './types';
import { getDashboardButtonStyle, getDashboardTypographyStyle, spacing as _spacing } from './utils/dashboardStyles';
import { getIconProps } from './utils/iconSizing';
import { getResponsiveContainerStyles, getTouchFriendlyStyles, responsiveSpacing } from './utils/responsive';



type AppView = 'home' | 'parsing' | 'manual' | 'history' | 'results' | 'admin' | 'comparison';

const App: React.FC = () => {
    const [view, setView] = useState<AppView>('home');
    const [appConfig, setAppConfig] = useState<AppConfig>(loadConfigSync());
    const [parsingState, setParsingState] = useState<AppState>(AppState.Idle);
    const [quoteDetails, setQuoteDetailsState] = useState<QuoteDetails>(() => {
        // Load from working memory on initialization
        const savedDetails = workingMemory.getQuoteDetails();
        return {
            quoteRef: savedDetails.quoteRef || '',
            client: savedDetails.client || '',
            project: savedDetails.project || 'Rainbow Design',
            deliveryAddress: savedDetails.deliveryAddress || '',
            preparedBy: savedDetails.preparedBy || appConfig.rules.preparedByOptions[0],
            upliftViaStairs: savedDetails.upliftViaStairs || false,
            extendedUplift: savedDetails.extendedUplift || false,
            specialistReworking: savedDetails.specialistReworking || false,
            manuallyAddSupervisor: savedDetails.manuallyAddSupervisor || false,
            overrideFitterCount: savedDetails.overrideFitterCount || null,
            overrideSupervisorCount: savedDetails.overrideSupervisorCount || null,
            overrideVanType: savedDetails.overrideVanType || null,
            overrideWasteVolumeM3: savedDetails.overrideWasteVolumeM3 || null,
            dailyParkingCharge: savedDetails.dailyParkingCharge || null,
        };
    });

    // Wrapper for setQuoteDetails that also saves to working memory
    const setQuoteDetails = (details: QuoteDetails | ((prev: QuoteDetails) => QuoteDetails)) => {
        setQuoteDetailsState((prev) => {
            const newDetails = typeof details === 'function' ? details(prev) : details;
            workingMemory.saveQuoteDetails(newDetails);
            return newDetails;
        });
    };

    const [unresolvedProducts, setUnresolvedProducts] = useState<ParsedProduct[]>([]);
    const [resolvedProducts, setResolvedProducts] = useState<CalculatedProduct[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [showSuccessMessage, setShowSuccessMessage] = useState<string | null>(null);
    const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);

    const [currentQuote, setCurrentQuote] = useState<{ details: QuoteDetails, products: CalculatedProduct[], results: CalculationResults } | null>(null);
    const [savedQuotes, setSavedQuotes] = useState<SavedQuote[]>([]);

    // Screen reader announcements
    const announceToScreenReader = useScreenReaderAnnounce();

    // Responsive hooks
    const breakpoint = useBreakpoint();
    const isMobile = useIsMobile();
    const isTouchDevice = useIsTouchDevice();

    // Undo/Redo for product changes
    const {
        state: undoableProducts,
        setState: setUndoableProducts,
        undo,
        redo,
        canUndo,
        canRedo
    } = useUndoRedo<CalculatedProduct[]>([], 50);

    // Keyboard shortcuts
    useKeyboardShortcuts([
        {
            key: 'z',
            ctrlKey: true,
            callback: () => {
                if (view === 'results' && canUndo) {
                    undo();
                    displaySuccessMessage('Undo: Product changes reverted');
                }
            },
            description: 'Undo product changes',
            enabled: view === 'results' && canUndo
        },
        {
            key: 'y',
            ctrlKey: true,
            callback: () => {
                if (view === 'results' && canRedo) {
                    redo();
                    displaySuccessMessage('Redo: Product changes reapplied');
                }
            },
            description: 'Redo product changes',
            enabled: view === 'results' && canRedo
        },
        {
            key: 'z',
            ctrlKey: true,
            shiftKey: true,
            callback: () => {
                if (view === 'results' && canRedo) {
                    redo();
                    displaySuccessMessage('Redo: Product changes reapplied');
                }
            },
            description: 'Redo product changes (alternative)',
            enabled: view === 'results' && canRedo
        },
        {
            key: 's',
            ctrlKey: true,
            callback: async () => {
                if (view === 'results' && currentQuote) {
                    await handleSaveQuote();
                }
            },
            description: 'Save quote',
            enabled: view === 'results' && !!currentQuote
        },
        {
            key: '?',
            callback: () => setShowShortcutsHelp(true),
            description: 'Show keyboard shortcuts',
            enabled: true
        },
        {
            key: 'Escape',
            callback: () => {
                if (showShortcutsHelp) {
                    setShowShortcutsHelp(false);
                }
            },
            description: 'Close modals',
            enabled: showShortcutsHelp
        }
    ]);

    // Sync undo/redo state with currentQuote products (only when undoableProducts changes)
    useEffect(() => {
        if (currentQuote && undoableProducts.length > 0) {
            setCurrentQuote(prev => {
                if (!prev) return null;
                // Only update if products actually changed to avoid infinite loops
                if (JSON.stringify(prev.products) === JSON.stringify(undoableProducts)) {
                    return prev;
                }
                return {
                    ...prev,
                    products: undoableProducts
                };
            });
        }
    }, [undoableProducts]);

    // Initialize undo/redo only when switching to a new quote (not on recalculations)
    useEffect(() => {
        if (view === 'results' && currentQuote?.products) {
            // Only initialize if the undo stack is empty or products are completely different
            if (undoableProducts.length === 0 ||
                currentQuote.products.length !== undoableProducts.length ||
                currentQuote.products[0]?.lineNumber !== undoableProducts[0]?.lineNumber) {
                setUndoableProducts(currentQuote.products);
            }
        }
    }, [view, currentQuote?.products?.length]);

    // Load vehicle costs from org_settings
    useEffect(() => {
        (async () => {
            try {
                const { data, error } = await supabase.from("org_settings").select("*").eq("id", 1).single();
                if (!error && data) {
                    const orgSettings = data as any;

                    // Update appConfig with vehicle costs from org_settings
                    const updatedConfig = { ...appConfig };

                    // Check if day_rates exist in org_settings and update the pricing
                    if (orgSettings.day_rates) {
                        // Map common vehicle types to pricing fields
                        if (orgSettings.day_rates['small-van'] !== undefined) {
                            updatedConfig.pricing.oneManVanDayRate = orgSettings.day_rates['small-van'];
                        }
                        if (orgSettings.day_rates['large-van'] !== undefined) {
                            updatedConfig.pricing.twoManVanDayRate = orgSettings.day_rates['large-van'];
                        }

                        // Also update vehicle definitions if they exist
                        if (updatedConfig.vehicles) {
                            if (updatedConfig.vehicles['small-van'] && orgSettings.day_rates['small-van'] !== undefined) {
                                updatedConfig.vehicles['small-van'].costPerDay = orgSettings.day_rates['small-van'];
                            }
                            if (updatedConfig.vehicles['large-van'] && orgSettings.day_rates['large-van'] !== undefined) {
                                updatedConfig.vehicles['large-van'].costPerDay = orgSettings.day_rates['large-van'];
                            }
                            if (updatedConfig.vehicles['luton-van'] && orgSettings.day_rates['luton-van'] !== undefined) {
                                updatedConfig.vehicles['luton-van'].costPerDay = orgSettings.day_rates['luton-van'];
                            }
                            if (updatedConfig.vehicles['75t-lorry'] && orgSettings.day_rates['75t-lorry'] !== undefined) {
                                updatedConfig.vehicles['75t-lorry'].costPerDay = orgSettings.day_rates['75t-lorry'];
                            }
                        }

                        setAppConfig(updatedConfig);
                    }
                }
            } catch (error: unknown) {
                console.error('[App] Failed to load org_settings for vehicle costs:', error);
            }
        })();
    }, []); // Only run once on mount

    // Removed destructive useEffect that was resetting preparedBy field
    // The preparedBy field should only be set:
    // 1. On initial load from saved data
    // 2. When user explicitly changes it
    // 3. When resetting the app

    const displaySuccessMessage = (message: string) => {
        setShowSuccessMessage(message);
        announceToScreenReader(message, 'polite');
        setTimeout(() => setShowSuccessMessage(null), 3000);
    };

    const resetApp = () => {
        setView('home');
        setParsingState(AppState.Idle);
        setQuoteDetails({
            quoteRef: '',
            client: '',
            project: 'Rainbow Design',
            deliveryAddress: '',
            preparedBy: appConfig.rules.preparedByOptions[0],
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
        setUnresolvedProducts([]);
        setResolvedProducts([]);
        setError(null);
        setCurrentQuote(null);
    };

    // Load database-driven config on mount
    useEffect(() => {
        const loadDatabaseConfig = async () => {
            try {
                const databaseConfig = await loadConfig();
                setAppConfig(databaseConfig);
            } catch {
                // Failed to load database config, using fallback
            }
        };
        loadDatabaseConfig();
    }, []);

    // Load saved quotes when needed
    useEffect(() => {
        const loadSavedQuotes = async () => {
            if (view === 'history' || view === 'comparison') {
                try {
                    const quotes = await hybridStorageService.loadQuotes();
                    setSavedQuotes(quotes);
                } catch (error: unknown) {
                    console.error('Failed to load saved quotes:', error);
                    setSavedQuotes([]);
                }
            }
        };
        loadSavedQuotes();
    }, [view]);

    const handleParse = useCallback(async (content: ParseContent) => {
        if (content.length === 0) {
            setError("Please provide text or upload at least one document to parse.");
            setParsingState(AppState.Error);
            return;
        }
        setParsingState(AppState.Loading);
        setError(null);

        try {
            // Step 1: AI extracts RAW data, including the new `cleanDescription`.
            const { products: rawProductsFromAI, details: extractedDetails } = await parseQuoteContent(content);

            // Step 2: Validate raw data.
            const validRawProducts = rawProductsFromAI.filter(validateRawProduct);

            if (validRawProducts.length === 0) {
                throw new Error("No valid product lines were found. Check if items have product codes and are not on the exclusion list.");
            }

            // Extract addresses for the selector
            const parsedAddresses: string[] = [];
            if ((extractedDetails as any).deliveryAddress) {
                parsedAddresses.push((extractedDetails as any).deliveryAddress);
            }
            if ((extractedDetails as any).collectionAddress) {
                parsedAddresses.push((extractedDetails as any).collectionAddress);
            }
            // Add any additional addresses from allAddresses if available
            if ((extractedDetails as any).allAddresses) {
                for (const addr of (extractedDetails as any).allAddresses) {
                    if (addr.address && !parsedAddresses.includes(addr.address)) {
                        parsedAddresses.push(addr.address);
                    }
                }
            }

            setQuoteDetails(prev => ({ ...prev, ...extractedDetails, parsedAddresses }));

            // Step 3: Group power items FIRST.
            const { groupedItems, powerItemsConsolidated } = groupPowerItems(validRawProducts);

            let productsToProcess = [...groupedItems];
            if (powerItemsConsolidated) {
                productsToProcess.push(powerItemsConsolidated);
            }

            // Step 4: Standardize descriptions for all items (including the consolidated one).
            const productsWithStandardDescription = productsToProcess.map(p => ({
                ...p,
                description: standardizeProductName(p)
            }));

            // Step 5: Resolve all products against the catalogue.
            const { resolved, unresolved } = await resolveProductDetails(productsWithStandardDescription, appConfig, {}, {});

            setResolvedProducts(resolved);

            if (unresolved.length > 0) {
                setUnresolvedProducts(unresolved);
                setParsingState(AppState.AwaitingInput);
            } else {
                setParsingState(AppState.DetailsEntry);
            }
        } catch (err) {
            const smartError = ErrorHandler.handle(err, ErrorCategory.PARSING, 'document parsing');
            setError(smartError.userMessage);
            setParsingState(AppState.Error);

            // Clear product state on error
            setUnresolvedProducts([]);
            setResolvedProducts([]);
            setCurrentQuote(null);
        }
    }, [appConfig]);

    const handleUnknownProductsSubmit = useCallback(async (newProductData: Record<string, ProductReference>) => {

        // Save new product times directly to the persistent catalogue
        const updatedConfig = {
            ...appConfig,
            productCatalogue: {
                ...appConfig.productCatalogue,
                ...newProductData
            }
        };

        // Update the config and persist it
        saveConfig(updatedConfig);
        setAppConfig(updatedConfig);

        displaySuccessMessage(`Added ${Object.keys(newProductData).length} product(s) to catalogue permanently.`);

        // Resolve products using the updated catalogue
        const { resolved: newlyResolved, unresolved: stillUnresolved } = await resolveProductDetails(
            unresolvedProducts,
            updatedConfig,  // Use updated config with new products
            {},             // No session data needed - products now in catalogue
            {}              // No manually edited data at this stage
        );

        if (stillUnresolved.length > 0) {
            setError("Could not resolve all products. Please check your input and ensure all details are correct.");
            setUnresolvedProducts(stillUnresolved);
            // We stay on the AwaitingInput screen
            return;
        }

        const allProducts = [...resolvedProducts, ...newlyResolved].sort((a, b) => a.lineNumber - b.lineNumber);

        setResolvedProducts(allProducts);
        setUnresolvedProducts([]);
        setParsingState(AppState.DetailsEntry);
    }, [unresolvedProducts, resolvedProducts, appConfig]);

    const calculateAndShowResults = (details: QuoteDetails, products: CalculatedProduct[]) => {
        try {
            // Apply working memory to products (preserves manual time edits)
            const productsWithMemory = workingMemory.applyMemoryToProducts(products);
            const results = calculateAll(productsWithMemory, details, appConfig);
            setCurrentQuote({ details, products: productsWithMemory, results });
            setView('results');
        } catch (err) {
            const smartError = ErrorHandler.handle(err, ErrorCategory.CALCULATION, 'quote calculation');
            setError(smartError.userMessage);
            setParsingState(AppState.Error);
            setView('parsing');
        }
    }

    const handleProceedToCalculate = (details: QuoteDetails) => {
        // Validate quote details
        const detailErrors = validateQuoteDetails(details);
        if (detailErrors.length > 0) {
            setError(formatValidationErrors(detailErrors));
            return;
        }

        // Validate products
        const productErrors = validateProducts(resolvedProducts);
        if (productErrors.length > 0) {
            setError(formatValidationErrors(productErrors));
            return;
        }

        calculateAndShowResults(details, resolvedProducts);
    };

    const handleProductsChange = useCallback((newProducts: CalculatedProduct[]) => {
        // Save manually edited products to working memory
        newProducts.forEach(product => {
            if (product.isManuallyEdited) {
                workingMemory.saveProductTimeOverride(product.productCode, product.timePerUnit, {
                    wastePerUnit: product.wastePerUnit,
                    isHeavy: product.isHeavy
                });
            }
        });

        // Use undo/redo state for tracking changes
        setUndoableProducts(newProducts);

        // Update current quote if it exists
        if (currentQuote) {
            const results = calculateAll(newProducts, currentQuote.details, appConfig);
            setCurrentQuote({ ...currentQuote, products: newProducts, results });
        }
    }, [setUndoableProducts, currentQuote, appConfig]);

    const handleManualQuoteSubmit = (products: CalculatedProduct[], details: QuoteDetails) => {
        calculateAndShowResults(details, products);
    };

    const handleViewQuote = (savedQuote: SavedQuote) => {
        setCurrentQuote({
            details: savedQuote.details,
            products: savedQuote.products,
            results: savedQuote.results
        });
        setView('results');
    };

    const handleSaveLearnedProduct = async (productToSave: CalculatedProduct) => {
        const { productCode, timePerUnit, isHeavy, wastePerUnit } = productToSave;

        const newReference: ProductReference = {
            installTimeHours: timePerUnit,
            isHeavy: isHeavy,
            wasteVolumeM3: wastePerUnit,
        };

        try {
            // Save to database with retry
            await withRetry(
                () => saveLearnedProduct(productCode, newReference),
                {
                    maxRetries: 3,
                    delayMs: 1000,
                    onRetry: (attempt, error) => {
                    }
                }
            );

            // Update local config
            const newCatalogue = {
                ...appConfig.productCatalogue,
                [productCode]: newReference
            };

            handleConfigChange({ ...appConfig, productCatalogue: newCatalogue });

            setCurrentQuote(prev => {
                if (!prev) return null;
                const newProducts = prev.products.map(p => {
                    if (p.lineNumber === productToSave.lineNumber) {
                        return { ...p, isManuallyEdited: false, source: 'catalogue' as const };
                    }
                    return p;
                });
                return { ...prev, products: newProducts };
            });

            displaySuccessMessage(`Time for "${productCode}" saved to database and catalogue!`);
        } catch (error: unknown) {
            // Still update local config as fallback
            const smartError = ErrorHandler.handle(error, ErrorCategory.DATABASE, 'save learned product');
            const newCatalogue = {
                ...appConfig.productCatalogue,
                [productCode]: newReference
            };
            handleConfigChange({ ...appConfig, productCatalogue: newCatalogue });
            displaySuccessMessage(`Time for "${productCode}" saved to local catalogue (database was unavailable)`);
            console.warn(smartError.userMessage);
        }
    };

    const handleConfigChange = (newConfig: AppConfig) => {
        saveConfig(newConfig);
        setAppConfig(newConfig);
        displaySuccessMessage("Settings saved successfully!");
    };

    const handleResetConfig = async () => {
        if (window.confirm("Are you sure you want to reset all settings to their defaults? This action cannot be undone.")) {
            const defaultConfig = await getDefaultConfig();
            saveConfig(defaultConfig);
            setAppConfig(defaultConfig);
            displaySuccessMessage("All settings have been reset to default.");
        }
    };

    useEffect(() => {
        if (view === 'results' && currentQuote) {
            const newResults = calculateAll(currentQuote.products, currentQuote.details, appConfig);
            if (JSON.stringify(newResults) !== JSON.stringify(currentQuote.results)) {
                setCurrentQuote(prev => prev ? { ...prev, results: newResults } : null);
            }
        }
    }, [currentQuote, view, appConfig]);


    const handleExportPdf = () => {
        if (!currentQuote) return;
        generatePdf(currentQuote.details, currentQuote.results);
    };

    const handleExportXlsx = () => {
        if (!currentQuote) return;
        generateXlsx(currentQuote.details, currentQuote.products, currentQuote.results);
    };

    const handleSaveQuote = async () => {
        if (!currentQuote) return;
        const newSavedQuote: SavedQuote = {
            id: currentQuote.details.quoteRef || `quote-${Date.now()}`,
            details: currentQuote.details,
            products: currentQuote.products,
            results: currentQuote.results,
            savedAt: new Date().toISOString(),
            version: 1,
        };

        try {
            const result = await withRetry(
                () => hybridStorageService.saveQuote(newSavedQuote),
                {
                    maxRetries: 3,
                    delayMs: 1000,
                    onRetry: (attempt, error) => {
                    }
                }
            );

            if (!result.success) {
                const smartError = ErrorHandler.handle(new Error("Save operation failed"), ErrorCategory.DATABASE, 'quote save');
                setError(smartError.userMessage);
            } else if (result.usedFallback) {
                displaySuccessMessage("Quote saved locally (database unavailable). It will sync when connection is restored.");
            } else {
                displaySuccessMessage("Quote saved successfully!");
            }
        } catch (error: unknown) {
            const smartError = ErrorHandler.handle(error, ErrorCategory.DATABASE, 'quote save');
            setError(smartError.userMessage);
        }
    };

    const handleCreateJob = async () => {
        if (!currentQuote) {
            setError('No quote data available to create job');
            return;
        }

        try {
            const jobTitle = `${currentQuote.details.client} - ${currentQuote.details.project}`;

            const requestBody = {
                quoteData: {
                    results: currentQuote.results,
                    products: currentQuote.products,
                    details: currentQuote.details
                },
                jobDetails: {
                    title: jobTitle,
                    startDate: null
                }
            };

            const response = await fetch('/api/quotes/convert-to-job', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody)
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to create job');
            }

            displaySuccessMessage(`Job "${jobTitle}" created successfully! Job ID: ${result.jobId}`);

            // Optionally redirect to the job page
            window.open(`/job/${result.jobId}`, '_blank');

        } catch (error: unknown) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to create job';
            setError(`Job creation failed: ${errorMessage}`);
        }
    };

    const renderParsingContent = () => {
        switch (parsingState) {
            case AppState.Loading:
                return (
                    <div className="flex flex-col items-center justify-center text-center h-96">
                        <LoadingSpinnerIcon {...getIconProps('loadingLarge', { color: theme.colors.accent })} />
                        <h2 className="mt-4 text-xl font-semibold text-[var(--accent)]">Processing...</h2>
                        <p className="mt-1 text-[var(--muted)]">The AI is analyzing your documents. This may take a moment.</p>
                    </div>
                );
            case AppState.AwaitingInput:
                return <UnknownProductInput products={unresolvedProducts} onSubmit={handleUnknownProductsSubmit} config={appConfig} />
            case AppState.DetailsEntry:
                return (
                    <div className="space-y-6">
                        <QuoteDetailsForm
                            details={quoteDetails}
                            onDetailsChange={setQuoteDetails}
                            onSubmit={() => handleProceedToCalculate(quoteDetails)}
                            submitButtonText="Calculate Quote & Proceed"
                            config={appConfig}
                        />
                        <div className="bg-[var(--panel)] rounded-lg shadow-[var(--shadow)] border border-[var(--border)] overflow-hidden mt-6 backdrop-blur-md">
                            <div className="p-4 border-b border-[var(--border)]">
                                <h3 className="text-lg font-semibold text-[var(--text)]">Parsed & Standardized Items ({resolvedProducts.length})</h3>
                                <p className="text-sm text-[var(--muted)]">Verify items below before calculating.</p>
                            </div>
                            <div className="overflow-x-auto max-h-96">
                                <table className="min-w-full divide-y divide-[var(--border)]">
                                    <thead className="bg-[var(--panel-2)] sticky top-0">
                                        <tr>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-[var(--muted)] uppercase tracking-wider">Line</th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-[var(--muted)] uppercase tracking-wider">Qty</th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-[var(--muted)] uppercase tracking-wider">Code</th>
                                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-[var(--muted)] uppercase tracking-wider">Standardized Description</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-transparent divide-y divide-[var(--border)]">
                                        {resolvedProducts.map((item) => (
                                            <tr key={`${item.lineNumber}-${item.productCode}`} className="hover:bg-[var(--panel-2)] transition-colors">
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--muted)]">{item.lineNumber}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-[var(--text)]">{item.quantity}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-[var(--text)] opacity-80">{item.productCode}</td>
                                                <td className="px-6 py-4 text-sm text-[var(--text)]">{item.description}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                );
            case AppState.Error:
                return (
                    <div className="bg-[rgba(239,68,68,0.1)] rounded-lg shadow-[var(--shadow)] p-8 text-center border border-[var(--bad)] h-full flex flex-col justify-center">
                        <h2 className="text-2xl font-semibold text-[var(--bad)]">An Error Occurred</h2>
                        <p className="mt-2 text-[var(--text)] opacity-80">{error || 'Could not process the quote. Please try again.'}</p>
                        <button onClick={resetApp} className="mt-4 mx-auto inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-[var(--bad)] rounded-md hover:bg-red-700 shadow-lg">
                            Start Over
                        </button>
                    </div>
                );
            case AppState.Idle:
            default:
                return <InitialInput onParse={handleParse} />;
        }
    }

    const renderContent = () => {
        switch (view) {
            case 'home':
                return <HomePage onSelectView={setView} />;
            case 'parsing':
                return renderParsingContent();
            case 'manual':
                return <ManualProductSelector
                    config={appConfig}
                    onSubmit={handleManualQuoteSubmit}
                />
            case 'history':
                return <QuoteHistory
                    onViewQuote={handleViewQuote}
                    onCompare={() => setView('comparison')}
                />;

            case 'comparison':
                return (
                    <QuoteComparisonView
                        quotes={savedQuotes}
                        onClose={() => setView('history')}
                        onLoadQuote={handleViewQuote}
                    />
                );
            case 'admin':
                return <AdminPanel config={appConfig} onSave={handleConfigChange} onReset={handleResetConfig} />;
            case 'results':
                if (!currentQuote) return <div className="text-center p-8">No quote data to display. Please start a new quote.</div>
                return (
                    <>
                        {/* Undo/Redo Toolbar */}
                        {(canUndo || canRedo) && (
                            <div
                                role="toolbar"
                                aria-label="Undo and redo actions"
                                aria-controls="main-content"
                                style={{
                                    position: 'fixed',
                                    bottom: isMobile ? 16 : 24,
                                    left: isMobile ? 16 : '50%',
                                    right: isMobile ? 16 : 'auto',
                                    transform: isMobile ? 'none' : 'translateX(-50%)',
                                    background: theme.colors.panel,
                                    border: `1px solid ${theme.colors.border}`,
                                    borderRadius: theme.radii.lg,
                                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
                                    padding: isMobile ? '6px 10px' : '8px 12px',
                                    display: 'flex',
                                    gap: isMobile ? 6 : 8,
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    zIndex: 100
                                }}
                            >
                                <button
                                    onClick={() => {
                                        undo();
                                        displaySuccessMessage('Undo: Product changes reverted');
                                    }}
                                    disabled={!canUndo}
                                    aria-label="Undo last product change (Control+Z)"
                                    aria-disabled={!canUndo}
                                    style={{
                                        ...getTouchFriendlyStyles(isTouchDevice),
                                        padding: isMobile ? '10px 12px' : '8px 12px',
                                        fontSize: isMobile ? 13 : 14,
                                        fontWeight: 500,
                                        color: canUndo ? theme.colors.text : theme.colors.textSubtle,
                                        background: canUndo ? theme.colors.panelAlt : theme.colors.muted,
                                        border: `1px solid ${theme.colors.border}`,
                                        borderRadius: theme.radii.md,
                                        cursor: canUndo ? 'pointer' : 'not-allowed',
                                        transition: 'all 0.2s ease',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: isMobile ? 4 : 6,
                                        flex: isMobile ? 1 : 'auto'
                                    }}
                                    title="Undo (Ctrl+Z)"
                                >
                                    ↶ {isMobile ? '' : 'Undo'}
                                    {!isMobile && <kbd style={{
                                        padding: '2px 6px',
                                        background: theme.colors.muted,
                                        border: `1px solid ${theme.colors.border}`,
                                        borderRadius: theme.radii.sm,
                                        fontSize: 11,
                                        fontFamily: 'monospace'
                                    }}>Ctrl+Z</kbd>}
                                </button>
                                <button
                                    onClick={() => {
                                        redo();
                                        displaySuccessMessage('Redo: Product changes reapplied');
                                    }}
                                    disabled={!canRedo}
                                    aria-label="Redo last undone change (Control+Y)"
                                    aria-disabled={!canRedo}
                                    style={{
                                        ...getTouchFriendlyStyles(isTouchDevice),
                                        padding: isMobile ? '10px 12px' : '8px 12px',
                                        fontSize: isMobile ? 13 : 14,
                                        fontWeight: 500,
                                        color: canRedo ? theme.colors.text : theme.colors.textSubtle,
                                        background: canRedo ? theme.colors.panelAlt : theme.colors.muted,
                                        border: `1px solid ${theme.colors.border}`,
                                        borderRadius: theme.radii.md,
                                        cursor: canRedo ? 'pointer' : 'not-allowed',
                                        transition: 'all 0.2s ease',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: isMobile ? 4 : 6,
                                        flex: isMobile ? 1 : 'auto'
                                    }}
                                    title="Redo (Ctrl+Y)"
                                >
                                    ↷ {isMobile ? '' : 'Redo'}
                                    {!isMobile && <kbd style={{
                                        padding: '2px 6px',
                                        background: theme.colors.muted,
                                        border: `1px solid ${theme.colors.border}`,
                                        borderRadius: theme.radii.sm,
                                        fontSize: 11,
                                        fontFamily: 'monospace'
                                    }}>Ctrl+Y</kbd>}
                                </button>
                            </div>
                        )}

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            <div className="lg:col-span-1 space-y-6">
                                <QuoteDetailsForm
                                    details={currentQuote.details}
                                    onDetailsChange={(newDetails) => {
                                        // Recalculate everything with new details
                                        const updatedResults = calculateAll(currentQuote.products, newDetails, appConfig);

                                        // Create a new quote object to ensure React detects the change
                                        const updatedQuote = {
                                            ...currentQuote,
                                            details: newDetails,
                                            results: updatedResults
                                        };

                                        // Update state with new quote
                                        setCurrentQuote(updatedQuote);

                                        // Save to working memory
                                        workingMemory.saveQuoteDetails(newDetails);
                                        // Products are already saved as part of the quote
                                    }}
                                    config={appConfig}
                                />
                            </div>
                            <div className="lg:col-span-2 space-y-6">
                                <ResultsDisplay
                                    products={currentQuote.products}
                                    results={currentQuote.results}
                                    quoteDetails={currentQuote.details}
                                    config={appConfig}
                                    onDetailsChange={(newDetails) => {
                                        // Recalculate everything with new details
                                        const updatedResults = calculateAll(currentQuote.products, newDetails, appConfig);

                                        // Create a new quote object to ensure React detects the change
                                        const updatedQuote = {
                                            ...currentQuote,
                                            details: newDetails,
                                            results: updatedResults
                                        };

                                        // Update state with new quote
                                        setCurrentQuote(updatedQuote);

                                        // Save to working memory
                                        workingMemory.saveQuoteDetails(newDetails);
                                        // Products are already saved as part of the quote
                                    }}
                                    onProductsChange={handleProductsChange}
                                    onSaveLearnedProduct={handleSaveLearnedProduct}
                                />
                                <ExportControls onExportPdf={handleExportPdf} onExportXlsx={handleExportXlsx} onSaveQuote={handleSaveQuote} onCreateJob={handleCreateJob} />
                            </div>
                        </div>
                    </>
                );
            default:
                return <div>Invalid application state.</div>
        }
    }

    const keyboardShortcuts = [
        {
            key: 'z',
            ctrlKey: true,
            description: 'Undo product changes',
            enabled: view === 'results' && canUndo,
            callback: () => { }
        },
        {
            key: 'y',
            ctrlKey: true,
            description: 'Redo product changes',
            enabled: view === 'results' && canRedo,
            callback: () => { }
        },
        {
            key: 'z',
            ctrlKey: true,
            shiftKey: true,
            description: 'Redo product changes',
            enabled: view === 'results' && canRedo,
            callback: () => { }
        },
        {
            key: 's',
            ctrlKey: true,
            description: 'Save quote',
            enabled: view === 'results' && !!currentQuote,
            callback: () => { }
        },
        {
            key: '?',
            description: 'Show keyboard shortcuts',
            enabled: true,
            callback: () => { }
        },
        {
            key: 'Escape',
            description: 'Close modals',
            enabled: true,
            callback: () => { }
        }
    ];

    return (
        <SmartQuoteErrorBoundary onReset={resetApp}>
            <SkipLinks />
            <div style={{
                minHeight: "100vh",
                background: theme.colors.bg,
                color: theme.colors.text,
                fontFamily: "var(--font-body, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial)"
            }}>
                <header
                    id="main-navigation"
                    role="banner"
                    aria-label="Main site header"
                    tabIndex={-1}
                    style={{
                        backgroundColor: theme.colors.bg,
                        borderBottom: `1px solid ${theme.colors.border}`,
                        position: "sticky",
                        top: 0,
                        zIndex: 20
                    }}
                >
                    <div style={{
                        ...getResponsiveContainerStyles(breakpoint)
                    }}>
                        <div style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            padding: isMobile ? "12px 0" : "16px 0",
                            flexWrap: isMobile ? "wrap" as const : "nowrap" as const,
                            gap: isMobile ? '12px' : '0'
                        }}>
                            <div style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 16
                            }}>
                                <BHILogo {...getIconProps('brandLarge', { color: theme.colors.text })} />
                            </div>
                            <nav aria-label="Main navigation" style={{ display: 'flex', gap: isMobile ? 8 : 12, alignItems: 'center', flexWrap: 'wrap' }}>
                                <button
                                    onClick={() => setShowShortcutsHelp(true)}
                                    aria-label="Show keyboard shortcuts (Press question mark)"
                                    style={{
                                        ...getTouchFriendlyStyles(isTouchDevice),
                                        padding: isMobile ? '10px 12px' : '8px 12px',
                                        fontSize: isMobile ? 16 : 14,
                                        fontWeight: 500,
                                        color: theme.colors.text,
                                        background: 'transparent',
                                        border: `1px solid ${theme.colors.border}`,
                                        borderRadius: theme.radii.md,
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease'
                                    }}
                                    title="Keyboard Shortcuts (Press ?)"
                                >
                                    ⌨️
                                </button>
                                {view !== 'home' && (
                                    <button
                                        onClick={resetApp}
                                        aria-label="Return to home page"
                                        style={{
                                            ...getDashboardButtonStyle('primary', {
                                                backgroundColor: theme.colors.accent,
                                                color: 'white'
                                            }),
                                            ...getTouchFriendlyStyles(isTouchDevice),
                                            padding: isMobile ? '10px 16px' : undefined,
                                            fontSize: isMobile ? 16 : undefined,
                                            transition: "all 0.3s ease"
                                        }}
                                        onMouseOver={(e) => {
                                            if (!isTouchDevice) {
                                                e.currentTarget.style.backgroundColor = theme.colors.accentAlt;
                                                e.currentTarget.style.transform = 'translateY(-1px)';
                                                e.currentTarget.style.boxShadow = '0 0 14px 3px rgba(0, 170, 255, 0.35)';
                                            }
                                        }}
                                        onMouseOut={(e) => {
                                            if (!isTouchDevice) {
                                                e.currentTarget.style.backgroundColor = theme.colors.accent;
                                                e.currentTarget.style.transform = 'translateY(0)';
                                                e.currentTarget.style.boxShadow = 'none';
                                            }
                                        }}
                                    >
                                        <HomeIcon {...getIconProps('navigation', { marginRight: isMobile ? 4 : 8 })} />
                                        {!isMobile && <span style={getDashboardTypographyStyle('buttonText')}>Home</span>}
                                    </button>
                                )}
                            </nav>
                        </div>
                    </div>
                </header>

                {showSuccessMessage && (
                    <div
                        role="status"
                        aria-live="polite"
                        aria-atomic="true"
                        style={{
                            position: "fixed",
                            top: isMobile ? 70 : 80,
                            right: isMobile ? 16 : 32,
                            left: isMobile ? 16 : 'auto',
                            background: theme.colors.accentAlt,
                            border: `1px solid ${theme.colors.border}`,
                            color: theme.colors.text,
                            padding: isMobile ? "10px 12px" : "12px 16px",
                            borderRadius: theme.radii.md,
                            boxShadow: theme.shadow,
                            zIndex: 50,
                            display: "flex",
                            alignItems: "center",
                            fontSize: isMobile ? 14 : 16
                        }}
                    >
                        <CheckCircleIcon {...getIconProps('status', { marginRight: isMobile ? 8 : 12 })} />
                        <span style={{ fontWeight: 500 }}>{showSuccessMessage}</span>
                    </div>
                )}

                <main
                    id="main-content"
                    role="main"
                    aria-label="Main content"
                    tabIndex={-1}
                    style={{
                        ...getResponsiveContainerStyles(breakpoint),
                        padding: responsiveSpacing[breakpoint].padding
                    }}
                >
                    <div style={{ maxWidth: "100%" }}>
                        {renderContent()}
                    </div>
                </main>

                {view === 'results' && currentQuote && <ClientPDFLayout quoteDetails={currentQuote.details} results={currentQuote.results} />}

                {showShortcutsHelp && (
                    <KeyboardShortcutsHelp
                        shortcuts={keyboardShortcuts}
                        onClose={() => setShowShortcutsHelp(false)}
                    />
                )}
            </div>
        </SmartQuoteErrorBoundary>
    );
};

export default App;
