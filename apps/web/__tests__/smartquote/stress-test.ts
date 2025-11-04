/**
 * SmartQuote Stress Test Suite
 * Tests edge cases, error conditions, and performance
 */

import {
    parseQuoteContent,
    calculateAll,
    resolveProductDetails,
    standardizeProductName,
    groupPowerItems,
    validateRawProduct
} from '../../modules/smartquote/services/calculationService';
import {
    validateQuoteDetails,
    validateProducts
} from '../../modules/smartquote/services/validationService';
import { hybridStorageService } from '../../modules/smartquote/services/databaseStorageService';
import { ErrorHandler, ErrorCategory, withRetry } from '../../modules/smartquote/services/errorService';
import { getDefaultConfig } from '../../modules/smartquote/services/enhancedConfigService';
import { QuoteDetails, ParsedProduct, CalculatedProduct, SavedQuote } from '../../modules/smartquote/types';

// Test data generators
const generateLargeQuote = (productCount: number): ParsedProduct[] => {
    const products: ParsedProduct[] = [];
    for (let i = 0; i < productCount; i++) {
        products.push({
            lineNumber: i + 1,
            productCode: `TEST-${String(i).padStart(5, '0')}`,
            rawDescription: `Test Product ${i} with very long description that could potentially cause issues with display or processing`,
            cleanDescription: `Test Product ${i}`,
            quantity: Math.floor(Math.random() * 1000) + 1
        });
    }
    return products;
};

const generateMalformedProduct = (): ParsedProduct => ({
    lineNumber: -1, // Invalid line number
    productCode: '', // Empty product code
    rawDescription: null as any, // Null description
    cleanDescription: undefined as any, // Undefined description
    quantity: -100 // Negative quantity
});

const generateEdgeCaseQuoteDetails = (): QuoteDetails => ({
    quoteRef: 'A'.repeat(100), // Very long reference
    client: '', // Empty client
    project: '\\n\\t\\r', // Special characters
    deliveryAddress: 'x'.repeat(1000), // Very long address
    preparedBy: '',
    upliftViaStairs: true,
    extendedUplift: true,
    specialistReworking: true,
    manuallyAddSupervisor: true,
    overrideFitterCount: 9999, // Very high number
    overrideSupervisorCount: -10, // Negative number
    overrideVanType: 'INVALID_VAN' as any,
    overrideWasteVolumeM3: Infinity, // Infinity
    dailyParkingCharge: NaN, // NaN
    customExtendedUpliftDays: 0.5, // Decimal days
    customExtendedUpliftFitters: 0.1, // Decimal fitters
    outOfHoursDays: -365 // Negative days
});

// Test suites
export const stressTests = {
    // 1. Empty/Invalid Input Tests
    async testEmptyInputs() {
        console.log('Testing empty inputs...');
        const results: any[] = [];

        // Empty product array
        try {
            const emptyProducts: ParsedProduct[] = [];
            const config = await getDefaultConfig();
            const resolved = resolveProductDetails(emptyProducts, config, {}, {});
            results.push({ test: 'empty products', passed: resolved.resolved.length === 0 });
        } catch (error: unknown) {
            results.push({ test: 'empty products', error: error.message });
        }

        // Null quote details
        try {
            const errors = validateQuoteDetails(null as any);
            results.push({ test: 'null quote details', errors: errors.length });
        } catch (error: unknown) {
            results.push({ test: 'null quote details', error: error.message });
        }

        // Undefined products
        try {
            const errors = validateProducts(undefined as any);
            results.push({ test: 'undefined products', errors: errors.length });
        } catch (error: unknown) {
            results.push({ test: 'undefined products', error: error.message });
        }

        return results;
    },

    // 2. Malformed Data Tests
    async testMalformedData() {
        console.log('Testing malformed data...');
        const results: any[] = [];

        // Malformed product
        try {
            const malformed = generateMalformedProduct();
            const isValid = validateRawProduct(malformed);
            results.push({ test: 'malformed product validation', passed: !isValid });
        } catch (error: unknown) {
            results.push({ test: 'malformed product', error: error.message });
        }

        // Edge case quote details
        try {
            const edgeCase = generateEdgeCaseQuoteDetails();
            const errors = validateQuoteDetails(edgeCase);
            results.push({ test: 'edge case details', errorCount: errors.length });
        } catch (error: unknown) {
            results.push({ test: 'edge case details', error: error.message });
        }

        // Invalid JSON parsing
        try {
            const invalidJSON = '{"invalid": json"}}}';
            JSON.parse(invalidJSON);
            results.push({ test: 'invalid JSON', passed: false });
        } catch (error: unknown) {
            results.push({ test: 'invalid JSON', passed: true });
        }

        return results;
    },

    // 3. Large Dataset Tests
    async testLargeDatasets() {
        console.log('Testing large datasets...');
        const results: any[] = [];

        // 1000 products
        try {
            const startTime = Date.now();
            const largeQuote = generateLargeQuote(1000);
            const config = await getDefaultConfig();
            const { resolved, unresolved } = resolveProductDetails(largeQuote, config, {}, {});
            const duration = Date.now() - startTime;
            results.push({
                test: '1000 products',
                duration: `${duration}ms`,
                resolved: resolved.length,
                unresolved: unresolved.length
            });
        } catch (error: unknown) {
            results.push({ test: '1000 products', error: error.message });
        }

        // 10000 products (extreme test)
        try {
            const startTime = Date.now();
            const hugeQuote = generateLargeQuote(10000);
            const standardized = hugeQuote.map(p => ({
                ...p,
                description: standardizeProductName(p)
            }));
            const duration = Date.now() - startTime;
            results.push({
                test: '10000 products standardization',
                duration: `${duration}ms`,
                passed: duration < 5000 // Should complete within 5 seconds
            });
        } catch (error: unknown) {
            results.push({ test: '10000 products', error: error.message });
        }

        return results;
    },

    // 4. Database Operation Tests
    async testDatabaseOperations() {
        console.log('Testing database operations...');
        const results: any[] = [];

        // Save with retry
        try {
            const testQuote: SavedQuote = {
                id: `test-${Date.now()}`,
                details: {
                    quoteRef: 'TEST-001',
                    client: 'Test Client',
                    project: 'Test Project',
                    deliveryAddress: 'Test Address',
                    preparedBy: 'Test User',
                    upliftViaStairs: false,
                    extendedUplift: false,
                    specialistReworking: false
                },
                results: {
                    labour: { totalHours: 10, upliftBufferPercentage: 0, hoursAfterUplift: 10, durationBufferPercentage: 10, bufferedHours: 11, totalDays: 1.5 },
                    crew: { crewSize: 2, vanCount: 1, vanFitters: 2, onFootFitters: 0, supervisorCount: 0, specialistCount: 0, daysPerFitter: 1.5, totalProjectDays: 1.5, isTwoManVanRequired: false, hourLoadPerPerson: 5 },
                    waste: { totalVolumeM3: 1, loadsRequired: 1, isFlagged: false },
                    pricing: { totalCost: 1000, vanCost: 500, fitterCost: 400, supervisorCost: 0, reworkingCost: 0, parkingCost: 0, transportCost: 100, billableDays: 1.5 },
                    detailedProducts: [],
                    notes: { parking: '', mileage: '', ulez: '', delivery: '' }
                },
                products: [],
                savedAt: new Date().toISOString(),
                version: 1
            };

            const saveResult = await withRetry(
                () => hybridStorageService.saveQuote(testQuote),
                { maxRetries: 3, delayMs: 100 }
            );
            results.push({ test: 'save with retry', success: saveResult.success });
        } catch (error: unknown) {
            results.push({ test: 'save with retry', error: error.message });
        }

        // Load quotes
        try {
            const quotes = await hybridStorageService.loadQuotes();
            results.push({ test: 'load quotes', count: quotes.length });
        } catch (error: unknown) {
            results.push({ test: 'load quotes', error: error.message });
        }

        // Delete non-existent quote
        try {
            await hybridStorageService.deleteQuote('non-existent-id');
            results.push({ test: 'delete non-existent', passed: true });
        } catch (error: unknown) {
            results.push({ test: 'delete non-existent', error: error.message });
        }

        return results;
    },

    // 5. Concurrent Operations Test
    async testConcurrentOperations() {
        console.log('Testing concurrent operations...');
        const results: any[] = [];

        // Concurrent saves
        try {
            const promises = [];
            for (let i = 0; i < 10; i++) {
                const quote: SavedQuote = {
                    id: `concurrent-${i}-${Date.now()}`,
                    details: {
                        quoteRef: `CONC-${i}`,
                        client: `Client ${i}`,
                        project: `Project ${i}`,
                        deliveryAddress: '',
                        preparedBy: '',
                        upliftViaStairs: false,
                        extendedUplift: false,
                        specialistReworking: false
                    },
                    results: {
                        labour: { totalHours: 0, upliftBufferPercentage: 0, hoursAfterUplift: 0, durationBufferPercentage: 0, bufferedHours: 0, totalDays: 0 },
                        crew: { crewSize: 0, vanCount: 0, vanFitters: 0, onFootFitters: 0, supervisorCount: 0, specialistCount: 0, daysPerFitter: 0, totalProjectDays: 0, isTwoManVanRequired: false, hourLoadPerPerson: 0 },
                        waste: { totalVolumeM3: 0, loadsRequired: 0, isFlagged: false },
                        pricing: { totalCost: 0, vanCost: 0, fitterCost: 0, supervisorCost: 0, reworkingCost: 0, parkingCost: 0, transportCost: 0, billableDays: 0 },
                        detailedProducts: [],
                        notes: { parking: '', mileage: '', ulez: '', delivery: '' }
                    },
                    products: [],
                    savedAt: new Date().toISOString(),
                    version: 1
                };
                promises.push(hybridStorageService.saveQuote(quote));
            }

            const startTime = Date.now();
            const saveResults = await Promise.allSettled(promises);
            const duration = Date.now() - startTime;

            const successful = saveResults.filter(r => r.status === 'fulfilled').length;
            const failed = saveResults.filter(r => r.status === 'rejected').length;

            results.push({
                test: 'concurrent saves',
                successful,
                failed,
                duration: `${duration}ms`
            });
        } catch (error: unknown) {
            results.push({ test: 'concurrent saves', error: error.message });
        }

        return results;
    },

    // 6. Calculation Edge Cases
    async testCalculationEdgeCases() {
        console.log('Testing calculation edge cases...');
        const results: any[] = [];
        const config = await getDefaultConfig();

        // Zero quantities
        try {
            const zeroProducts: CalculatedProduct[] = [{
                lineNumber: 1,
                productCode: 'ZERO-001',
                rawDescription: 'Zero quantity product',
                cleanDescription: 'Zero quantity',
                description: 'Zero quantity',
                quantity: 0,
                timePerUnit: 1,
                totalTime: 0,
                wastePerUnit: 1,
                totalWaste: 0,
                isHeavy: false,
                isManuallyEdited: false,
                source: 'catalogue'
            }];

            const details: QuoteDetails = {
                quoteRef: 'ZERO-TEST',
                client: 'Test',
                project: 'Test',
                deliveryAddress: '',
                preparedBy: '',
                upliftViaStairs: false,
                extendedUplift: false,
                specialistReworking: false
            };

            const result = calculateAll(zeroProducts, details, config);
            results.push({ test: 'zero quantities', totalCost: result.pricing.totalCost });
        } catch (error: unknown) {
            results.push({ test: 'zero quantities', error: error.message });
        }

        // Very large numbers
        try {
            const bigProducts: CalculatedProduct[] = [{
                lineNumber: 1,
                productCode: 'BIG-001',
                rawDescription: 'Big numbers',
                cleanDescription: 'Big',
                description: 'Big',
                quantity: 999999,
                timePerUnit: 999,
                totalTime: 999999 * 999,
                wastePerUnit: 999,
                totalWaste: 999999 * 999,
                isHeavy: true,
                isManuallyEdited: false,
                source: 'catalogue'
            }];

            const details: QuoteDetails = {
                quoteRef: 'BIG-TEST',
                client: 'Test',
                project: 'Test',
                deliveryAddress: '',
                preparedBy: '',
                upliftViaStairs: true,
                extendedUplift: true,
                specialistReworking: true,
                overrideFitterCount: 999,
                overrideSupervisorCount: 999,
                dailyParkingCharge: 99999
            };

            const result = calculateAll(bigProducts, details, config);
            results.push({
                test: 'very large numbers',
                passed: result.pricing.totalCost > 0 && !isNaN(result.pricing.totalCost) && isFinite(result.pricing.totalCost)
            });
        } catch (error: unknown) {
            results.push({ test: 'very large numbers', error: error.message });
        }

        // Mixed valid/invalid products
        try {
            const mixedProducts: any[] = [
                {
                    lineNumber: 1,
                    productCode: 'VALID-001',
                    rawDescription: 'Valid product',
                    cleanDescription: 'Valid',
                    quantity: 10
                },
                {
                    lineNumber: -1, // Invalid
                    productCode: '',
                    rawDescription: null,
                    cleanDescription: undefined,
                    quantity: -10
                },
                {
                    lineNumber: 3,
                    productCode: 'VALID-002',
                    rawDescription: 'Another valid product',
                    cleanDescription: 'Valid 2',
                    quantity: 20
                }
            ];

            const validProducts = mixedProducts.filter(validateRawProduct);
            results.push({
                test: 'mixed valid/invalid',
                totalProducts: mixedProducts.length,
                validProducts: validProducts.length
            });
        } catch (error: unknown) {
            results.push({ test: 'mixed valid/invalid', error: error.message });
        }

        return results;
    },

    // 7. Error Handling Tests
    async testErrorHandling() {
        console.log('Testing error handling...');
        const results: any[] = [];

        // Network error handling
        try {
            const networkError = new Error('fetch failed');
            const handled = ErrorHandler.handle(networkError, ErrorCategory.NETWORK);
            results.push({
                test: 'network error',
                recoverable: handled.recoverable,
                hasRecoveryAction: !!handled.recoveryAction
            });
        } catch (error: unknown) {
            results.push({ test: 'network error', error: error.message });
        }

        // API key error
        try {
            const apiKeyError = new Error('GEMINI_API_KEY environment variable not set');
            const handled = ErrorHandler.handle(apiKeyError, ErrorCategory.API);
            results.push({
                test: 'API key error',
                userMessage: handled.userMessage,
                recoverable: handled.recoverable
            });
        } catch (error: unknown) {
            results.push({ test: 'API key error', error: error.message });
        }

        // Database schema error
        try {
            const schemaError = new Error('column prepared_by does not exist');
            const handled = ErrorHandler.handle(schemaError, ErrorCategory.DATABASE);
            results.push({
                test: 'schema error',
                userMessage: handled.userMessage,
                containsErrorCode: handled.userMessage.includes('DB-SCHEMA')
            });
        } catch (error: unknown) {
            results.push({ test: 'schema error', error: error.message });
        }

        return results;
    },

    // Run all tests
    async runAll() {
        console.log('Starting SmartQuote Stress Tests...');
        const allResults: Record<string, any> = {};

        try {
            allResults.emptyInputs = await this.testEmptyInputs();
            allResults.malformedData = await this.testMalformedData();
            allResults.largeDatasets = await this.testLargeDatasets();
            allResults.databaseOperations = await this.testDatabaseOperations();
            allResults.concurrentOperations = await this.testConcurrentOperations();
            allResults.calculationEdgeCases = await this.testCalculationEdgeCases();
            allResults.errorHandling = await this.testErrorHandling();
        } catch (error: unknown) {
            console.error('Test suite failed:', error);
            allResults.error = error.message;
        }

        console.log('Stress Test Results:', JSON.stringify(allResults, null, 2));
        return allResults;
    }
};

// Export for use in test runners or direct execution
export default stressTests;