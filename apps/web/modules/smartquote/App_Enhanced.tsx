import React, { useState, useCallback, useEffect } from 'react';
import { PlusCircleIcon, DocumentTextIcon, ClockIcon, CogIcon, ChartBarIcon, HomeIcon } from './components/icons';
import { announceToScreenReader } from './utils/accessibility';

import { LoadingSkeletons } from './components/LoadingSkeletons';
import { SkipLinks } from './components/SkipLinks';
import { SmartQuoteErrorBoundary } from './components/SmartQuoteErrorBoundary';
import { KeyboardShortcutsHelp } from './components/KeyboardShortcutsHelp';

import HomePage from './HomePage';
import QuoteHistory from './QuoteHistory';
import AdminPanel from './components/AdminPanel';
import InitialInput from './components/InitialInput';
import UnknownProductInput from './components/UnknownProductInput';
import QuoteDetailsForm from './components/QuoteDetailsForm';
import ResultsDisplay from './components/ResultsDisplay';
import ManualProductSelector from './ManualProductSelector';
import QuoteComparisonView from './components/QuoteComparisonView';
import { ParseReviewPanel } from './components/ParseReviewPanel';
import { AccessoryReviewPanel } from './components/AccessoryReviewPanel';
import { EnhancedAddressSelector, extractAddressesFromQuote, type Address } from './components/EnhancedAddressSelector';

import { supabase } from '../../lib/supabaseClient';
import { loadConfigSync, loadConfig } from './services/configService';
import { saveQuote, loadSavedQuotes, updateQuote, createQuoteVersion } from './services/storageService';
import { calculateQuote } from './services/calculationService';

// Use enhanced parsing service for better product matching
import { parseQuoteContent } from './services/enhancedGeminiService';
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
        const savedDetails = workingMemory.getQuoteDetails();
        return {
            quoteRef: savedDetails.quoteRef || '',
            client: savedDetails.client || '',
            project: savedDetails.project || 'Rainbow Design',
            deliveryAddress: savedDetails.deliveryAddress || '',
            collectionAddress: savedDetails.collectionAddress || '',
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

    // New state for address selection
    const [detectedAddresses, setDetectedAddresses] = useState<Address[]>([]);
    const [showAddressSelection, setShowAddressSelection] = useState(false);
    const [extractedDetails, setExtractedDetails] = useState<Partial<QuoteDetails>>({});

    const [excludedAccessories, setExcludedAccessories] = useState<ParsedProduct[]>([]);
    const [unresolvedProducts, setUnresolvedProducts] = useState<CalculatedProduct[]>([]);
    const [resolvedProducts, setResolvedProducts] = useState<CalculatedProduct[]>([]);
    const [calculationResults, setCalculationResults] = useState<CalculationResults | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [showSuccessMessage, setShowSuccessMessage] = useState<string | null>(null);
    const [currentQuote, setCurrentQuote] = useState<SavedQuote | null>(null);
    const [showShortcuts, setShowShortcuts] = useState(false);

    const setQuoteDetails = (update: React.SetStateAction<QuoteDetails>) => {
        setQuoteDetailsState(prev => {
            const newDetails = typeof update === 'function' ? update(prev) : update;
            workingMemory.setQuoteDetails(newDetails);
            return newDetails;
        });
    };

    const handleParse = useCallback(async (content: ParseContent) => {
        if (content.length === 0) {
            setError("Please provide text or upload at least one document to parse.");
            setParsingState(AppState.Error);
            return;
        }
        setParsingState(AppState.Loading);
        setError(null);

        try {
            // Step 1: AI extracts data with enhanced product matching
            const { products: rawProductsFromAI, details, excludedProducts } = await parseQuoteContent(content);

            // Step 2: Store extracted details but DON'T auto-fill addresses yet
            setExtractedDetails(details);

            // Extract addresses from the parsed content for selection
            const textContent = content.filter(c => typeof c === 'string').join('\n');
            const addresses = extractAddressesFromQuote(textContent, details.client);

            // If allAddresses was extracted by AI, add those too
            if (details.allAddresses && Array.isArray(details.allAddresses)) {
                details.allAddresses.forEach(addr => {
                    if (!addresses.find(a => a.postcode === addr.postcode)) {
                        addresses.push({
                            type: addr.type as Address['type'],
                            label: addr.type === 'site' ? 'Installation Site' :
                                   addr.type === 'collection' ? 'Collection Point' :
                                   addr.type === 'client' ? details.client || 'Client' : 'Address',
                            fullAddress: addr.address,
                            postcode: addr.address.match(/\b([A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2})\b/i)?.[1]?.toUpperCase() || '',
                            isValid: true
                        });
                    }
                });
            }

            // If we have detected addresses, show selection UI
            if (addresses.length > 0) {
                setDetectedAddresses(addresses);
                setShowAddressSelection(true);
            } else {
                // No addresses detected, just use what was extracted
                setQuoteDetails(prev => ({
                    ...prev,
                    ...details,
                    deliveryAddress: details.deliveryAddress || prev.deliveryAddress,
                    collectionAddress: details.collectionAddress || prev.collectionAddress
                }));
            }

            // Update other quote details (but not addresses if we're showing selection)
            setQuoteDetails(prev => ({
                ...prev,
                client: details.client || prev.client,
                project: details.project || prev.project,
                quoteRef: details.quoteRef || prev.quoteRef
            }));

            // Step 3: Handle excluded accessories if any
            if (excludedProducts && excludedProducts.length > 0) {
                setExcludedAccessories(excludedProducts);
                setParsingState(AppState.AccessoryReview);
            }

            // Step 4: Validate and process products
            const validRawProducts = rawProductsFromAI.filter(validateRawProduct);

            if (validRawProducts.length === 0) {
                throw new Error("No valid product lines were found. Please check the document format.");
            }

            // Process products as before
            const { groupedItems, powerItemsConsolidated } = groupPowerItems(validRawProducts);
            let productsToProcess = [...groupedItems];
            if (powerItemsConsolidated) {
                productsToProcess.push(powerItemsConsolidated);
            }

            const productsWithStandardDescription = productsToProcess.map(p => ({
                ...p,
                description: p.description || `Line ${p.lineNumber} – ${p.cleanDescription || p.rawDescription}`
            }));

            const withTimeData = addInstallTimesFromCatalog(productsWithStandardDescription, appConfig.productCatalogue);
            const { resolved, unresolved } = withTimeData.reduce((acc, product) => {
                if (product.source === 'catalogue' || product.source === 'default') {
                    acc.resolved.push(product);
                } else {
                    acc.unresolved.push(product);
                }
                return acc;
            }, { resolved: [] as CalculatedProduct[], unresolved: [] as CalculatedProduct[] });

            if (unresolved.length > 0) {
                setUnresolvedProducts(unresolved);
                setResolvedProducts(resolved);
                setParsingState(AppState.AwaitingInput);
            } else {
                setResolvedProducts(resolved);
                if (showAddressSelection) {
                    // Wait for address selection before moving to details
                    setParsingState(AppState.AwaitingInput);
                } else {
                    setParsingState(AppState.DetailsEntry);
                }
            }
        } catch (err) {
            console.error('[App] Parse error:', err);
            setError(err instanceof Error ? err.message : 'Failed to parse the document');
            setParsingState(AppState.Error);
        }
    }, [appConfig.productCatalogue, showAddressSelection]);

    // Handle address selection from the selector component
    const handleAddressSelection = useCallback((siteAddress: string, collectionAddress?: string) => {
        setQuoteDetails(prev => ({
            ...prev,
            deliveryAddress: siteAddress,
            collectionAddress: collectionAddress || prev.collectionAddress
        }));
        setShowAddressSelection(false);

        // Move to appropriate next state
        if (unresolvedProducts.length > 0) {
            setParsingState(AppState.AwaitingInput);
        } else {
            setParsingState(AppState.DetailsEntry);
        }
    }, [unresolvedProducts.length]);

    // Rest of the component logic remains the same...
    // [Include all the other functions and logic from the original App.tsx]

    const validateRawProduct = (product: ParsedProduct): boolean => {
        return (
            product.productCode &&
            product.productCode.length > 0 &&
            product.quantity > 0 &&
            product.quantity < 1000
        );
    };

    const groupPowerItems = (products: ParsedProduct[]): { groupedItems: ParsedProduct[], powerItemsConsolidated: ParsedProduct | null } => {
        const powerKeywords = ['power', 'pixel', 'pds', 'data', 'usb', 'module'];
        const powerItems = products.filter(p =>
            powerKeywords.some(keyword =>
                p.productCode.toLowerCase().includes(keyword) ||
                p.rawDescription.toLowerCase().includes(keyword)
            )
        );
        const nonPowerItems = products.filter(p =>
            !powerKeywords.some(keyword =>
                p.productCode.toLowerCase().includes(keyword) ||
                p.rawDescription.toLowerCase().includes(keyword)
            )
        );

        if (powerItems.length > 0) {
            const totalQuantity = powerItems.reduce((sum, item) => sum + item.quantity, 0);
            const consolidatedPowerItem: ParsedProduct = {
                lineNumber: powerItems[0].lineNumber,
                productCode: 'POWER-MODULE',
                rawDescription: 'Consolidated Power/Data Modules',
                cleanDescription: 'Power/Data Modules',
                quantity: totalQuantity
            };
            return { groupedItems: nonPowerItems, powerItemsConsolidated: consolidatedPowerItem };
        }

        return { groupedItems: products, powerItemsConsolidated: null };
    };

    const addInstallTimesFromCatalog = (
        products: ParsedProduct[],
        catalog: Record<string, ProductReference>
    ): CalculatedProduct[] => {
        return products.map(product => {
            const catalogEntry = catalog[product.productCode];

            if (catalogEntry) {
                return {
                    ...product,
                    timePerUnit: catalogEntry.installTimeHours,
                    totalTime: catalogEntry.installTimeHours * product.quantity,
                    wastePerUnit: catalogEntry.wasteVolumeM3,
                    totalWaste: catalogEntry.wasteVolumeM3 * product.quantity,
                    isHeavy: catalogEntry.isHeavy,
                    source: 'catalogue' as const
                };
            } else {
                return {
                    ...product,
                    timePerUnit: 0,
                    totalTime: 0,
                    wastePerUnit: appConfig.rules.defaultWasteVolumeM3,
                    totalWaste: appConfig.rules.defaultWasteVolumeM3 * product.quantity,
                    isHeavy: false,
                    source: 'user-inputted' as const
                };
            }
        });
    };

    const renderParsingContent = () => {
        switch (parsingState) {
            case AppState.Loading:
                return <LoadingSkeletons />;

            case AppState.AccessoryReview:
                if (excludedAccessories.length > 0) {
                    return (
                        <AccessoryReviewPanel
                            excludedItems={excludedAccessories}
                            onIncludeItems={(items) => {
                                const additionalProducts = items.map(item => ({
                                    ...item,
                                    timePerUnit: 0.25,
                                    totalTime: 0.25 * item.quantity,
                                    wastePerUnit: appConfig.rules.defaultWasteVolumeM3,
                                    totalWaste: appConfig.rules.defaultWasteVolumeM3 * item.quantity,
                                    isHeavy: false,
                                    source: 'user-inputted' as const
                                }));
                                setResolvedProducts(prev => [...prev, ...additionalProducts]);
                                setExcludedAccessories([]);
                                if (unresolvedProducts.length > 0) {
                                    setParsingState(AppState.AwaitingInput);
                                } else {
                                    setParsingState(AppState.DetailsEntry);
                                }
                            }}
                            onSkip={() => {
                                setExcludedAccessories([]);
                                if (unresolvedProducts.length > 0) {
                                    setParsingState(AppState.AwaitingInput);
                                } else {
                                    setParsingState(AppState.DetailsEntry);
                                }
                            }}
                        />
                    );
                }
                return null;

            case AppState.AwaitingInput:
                // Show address selection if needed
                if (showAddressSelection && detectedAddresses.length > 0) {
                    return (
                        <div style={{ padding: 20, maxWidth: 800, margin: '0 auto' }}>
                            <h2 style={{ marginBottom: 20 }}>Select Addresses</h2>
                            <EnhancedAddressSelector
                                detectedAddresses={detectedAddresses}
                                selectedSiteAddress={quoteDetails.deliveryAddress}
                                selectedCollectionAddress={quoteDetails.collectionAddress}
                                onSiteAddressSelect={(address) => {
                                    setQuoteDetails(prev => ({ ...prev, deliveryAddress: address }));
                                }}
                                onCollectionAddressSelect={(address) => {
                                    setQuoteDetails(prev => ({ ...prev, collectionAddress: address || '' }));
                                }}
                                clientName={quoteDetails.client}
                                clientEmail={extractedDetails.clientEmail}
                            />
                            <button
                                onClick={() => handleAddressSelection(quoteDetails.deliveryAddress, quoteDetails.collectionAddress)}
                                style={{
                                    ...getDashboardButtonStyle('primary'),
                                    marginTop: 20
                                }}
                                disabled={!quoteDetails.deliveryAddress}
                            >
                                Continue
                            </button>
                        </div>
                    );
                }

                // Show unresolved products input
                if (unresolvedProducts.length > 0) {
                    return (
                        <UnknownProductInput
                            products={unresolvedProducts}
                            onSubmit={(updatedProducts) => {
                                setResolvedProducts(prev => [...prev, ...updatedProducts]);
                                setUnresolvedProducts([]);
                                setParsingState(AppState.DetailsEntry);
                            }}
                        />
                    );
                }
                return null;

            case AppState.DetailsEntry:
                return (
                    <QuoteDetailsForm
                        details={quoteDetails}
                        resolvedProducts={resolvedProducts}
                        config={appConfig}
                        onDetailsChange={setQuoteDetails}
                        onSubmit={handleQuoteCalculation}
                        onBack={handleBackFromDetails}
                    />
                );

            case AppState.Success:
                if (calculationResults && resolvedProducts.length > 0) {
                    return (
                        <ResultsDisplay
                            results={calculationResults}
                            details={quoteDetails}
                            products={resolvedProducts}
                            config={appConfig}
                            onBackToDetails={handleBackToDetails}
                            onBackToHome={() => {
                                resetApp();
                                setView('home');
                            }}
                            onSaveSuccess={(savedQuote) => {
                                setCurrentQuote(savedQuote);
                                displaySuccessMessage('Quote saved successfully!');
                            }}
                        />
                    );
                }
                return null;

            case AppState.Error:
                return (
                    <div style={{ padding: 20, textAlign: 'center' }}>
                        <h2 style={{ color: '#e74c3c' }}>Error</h2>
                        <p>{error}</p>
                        <button
                            onClick={resetApp}
                            style={getDashboardButtonStyle('secondary')}
                        >
                            Try Again
                        </button>
                    </div>
                );

            default:
                return <InitialInput onParse={handleParse} />;
        }
    };

    const handleQuoteCalculation = () => {
        const detailsErrors = validateQuoteDetails(quoteDetails);
        const productErrors = validateProducts(resolvedProducts);

        if (detailsErrors.length > 0 || productErrors.length > 0) {
            setError(formatValidationErrors([...detailsErrors, ...productErrors]));
            return;
        }

        const results = calculateQuote(quoteDetails, resolvedProducts, appConfig);
        setCalculationResults(results);
        setParsingState(AppState.Success);
        workingMemory.setCalculationResults(results);
        workingMemory.setProducts(resolvedProducts);
    };

    const handleBackFromDetails = () => {
        if (unresolvedProducts.length > 0) {
            setParsingState(AppState.AwaitingInput);
        } else {
            setParsingState(AppState.Idle);
        }
    };

    const handleBackToDetails = () => {
        setParsingState(AppState.DetailsEntry);
    };

    const handleManualQuoteSubmit = (details: QuoteDetails, products: CalculatedProduct[]) => {
        setQuoteDetails(details);
        setResolvedProducts(products);
        setUnresolvedProducts([]);
        const results = calculateQuote(details, products, appConfig);
        setCalculationResults(results);
        setParsingState(AppState.Success);
        setView('parsing');
    };

    const handleViewQuote = (quote: SavedQuote) => {
        setQuoteDetails(quote.details);
        setResolvedProducts(quote.products);
        setCalculationResults(quote.results);
        setCurrentQuote(quote);
        setParsingState(AppState.Success);
        setView('parsing');
    };

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
            collectionAddress: '',
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
        setDetectedAddresses([]);
        setShowAddressSelection(false);
        setExtractedDetails({});
        setUnresolvedProducts([]);
        setResolvedProducts([]);
        setError(null);
        setCurrentQuote(null);
    };

    // Load configs and setup keyboard shortcuts...
    // [Include all other useEffects and render logic]

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
                />;
            case 'history':
                return <QuoteHistory
                    onViewQuote={handleViewQuote}
                    onCompare={() => setView('comparison')}
                />;
            case 'results':
                return renderParsingContent();
            case 'admin':
                return <AdminPanel config={appConfig} onUpdate={setAppConfig} />;
            case 'comparison':
                return <QuoteComparisonView onBack={() => setView('history')} />;
            default:
                return <HomePage onSelectView={setView} />;
        }
    };

    // Rest of the component...
    return (
        <SmartQuoteErrorBoundary>
            <SkipLinks />
            <div style={{
                ...getResponsiveContainerStyles(),
                minHeight: '100vh',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                padding: responsiveSpacing(20)
            }}>
                {renderContent()}
                {showSuccessMessage && (
                    <div style={{
                        position: 'fixed',
                        bottom: 20,
                        right: 20,
                        background: '#27ae60',
                        color: 'white',
                        padding: '15px 20px',
                        borderRadius: 8,
                        boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                        zIndex: 1000
                    }}>
                        {showSuccessMessage}
                    </div>
                )}
                {showShortcuts && <KeyboardShortcutsHelp onClose={() => setShowShortcuts(false)} />}
            </div>
        </SmartQuoteErrorBoundary>
    );
};

export default App;