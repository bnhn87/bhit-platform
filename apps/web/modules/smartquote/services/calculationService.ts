

import { ParsedProduct, CalculationResults, CalculatedProduct, LabourResults, CrewResults, WasteResults, ProductReference, QuoteDetails, PricingResults, AppConfig } from '../types';

import { catalogueService } from './catalogueService';

const _roundToNearest = (value: number, nearest: number): number => {
    return Math.round(value / nearest) * nearest;
};

// Special calculation functions from configuration
const calculateBassTaperedHours = (baseHours: number, lengthMM: number): number => {
    const uplift = 0.25 + (lengthMM > 2000 ? ((lengthMM - 2000) / 1000) * 0.2 : 0);
    return +(baseHours + uplift).toFixed(2);
};

const calculateGlowIntegratedHours = (frankHours: number): number => {
    return +(frankHours + 0.3).toFixed(2);
};

const calculateLockerCarcassQty = (widthBanks: number[]): number => {
    // qty equals number of carcasses = sum of widths
    return widthBanks.reduce((a, b) => a + b, 0);
};

// Create lookup map for product matching optimization
const createProductLookupMap = (referenceKeys: string[]): Map<string, string> => {
    const map = new Map<string, string>();

    referenceKeys.forEach(key => {
        const cleanedKey = key.toUpperCase().replace(/[\s()-_]/g, '');
        map.set(cleanedKey, key);
    });

    return map;
};

// Cache for product lookup map
let productLookupCache: Map<string, string> | null = null;
let productLookupCacheKeys: string | null = null;

const findBestMatchKey = (productCodeOrDesc: string, referenceKeys: string[]): string | undefined => {
    const lookupCode = productCodeOrDesc.toUpperCase().replace(/[\s()-_]/g, '');
    if (!lookupCode) return undefined;

    // Create or update cache if needed
    const currentKeysHash = referenceKeys.join('|');
    if (!productLookupCache || productLookupCacheKeys !== currentKeysHash) {
        productLookupCache = createProductLookupMap(referenceKeys);
        productLookupCacheKeys = currentKeysHash;
    }

    // Strategy 1: Direct exact match (O(1) lookup)
    const directMatch = productLookupCache.get(lookupCode);
    if (directMatch) return directMatch;

    // Strategy 1.5: Special handling for FLX-#P-####-X format (e.g., FLX-4P-2816-A)
    // Check both the original code and the stripped version
    const upperCode = productCodeOrDesc.toUpperCase();
    const strippedCode = upperCode.replace(/[\s()-_]/g, '');

    // Try to match FLX#P pattern in both versions
    let flxPatternMatch = upperCode.match(/FLX[-_]*(\d+)P/);
    if (!flxPatternMatch && strippedCode.match(/FLX(\d+)P/)) {
        flxPatternMatch = strippedCode.match(/FLX(\d+)P/);
    }

    if (flxPatternMatch) {
        const personCount = flxPatternMatch[1];

        // First try specific size variant (e.g., FLX-COWORK-4P-L2400)
        const sizeMatch = upperCode.match(/L?(\d{4})/);
        if (!sizeMatch && strippedCode) {
            // Try on stripped version too
            const strippedSizeMatch = strippedCode.match(/(\d{4})/);
            if (strippedSizeMatch) {
                const size = strippedSizeMatch[1];
                // Only use if it's a plausible size (2000-5000 range typically)
                if (parseInt(size) >= 1000 && parseInt(size) <= 5000) {
                    const specificKey = `FLX-COWORK-${personCount}P-L${size}`;
                    // Check if this specific variant exists in catalogue
                    for (const key of referenceKeys) {
                        if (key === specificKey) return key;
                    }
                }
            }
        } else if (sizeMatch && personCount !== '1') {
            const size = sizeMatch[1];
            const specificKey = `FLX-COWORK-${personCount}P-L${size}`;
            // Check if this specific variant exists
            for (const key of referenceKeys) {
                if (key === specificKey) return key;
            }
        }

        // Then try generic variants - check all possible formats in catalogue
        const possibleKeys = [
            `FLX ${personCount}P`,
            `${personCount}P FLX`,
            `FLX-${personCount}P`,
            `FLX-COWORK-${personCount}P`
        ];

        for (const possibleKey of possibleKeys) {
            for (const catalogueKey of referenceKeys) {
                if (catalogueKey === possibleKey) {
                    return catalogueKey;
                }
            }
        }
    }

    // Strategy 2: Token-based matching for FLX and other products
    // Split the input into tokens for flexible matching
    const inputTokens = productCodeOrDesc.toUpperCase().split(/[\s()-_]+/).filter(t => t);

    // Special handling for FLX products - they often have format variations like "4P FLX" vs "FLX-COWORK-4P"
    if (inputTokens.some(t => t === 'FLX')) {
        for (const [cleanedKey, originalKey] of productLookupCache.entries()) {
            if (cleanedKey.includes('FLX')) {
                // Check if all meaningful tokens from input exist in the catalogue key
                const keyTokens = originalKey.toUpperCase().split(/[\s()-_]+/).filter(t => t);
                const importantInputTokens = inputTokens.filter(t => t !== 'FLX' || inputTokens.length === 1);

                // Check if all important tokens match (e.g., "4P" in "4P FLX" matches "FLX-COWORK-4P-L2400")
                const allTokensMatch = importantInputTokens.every(token =>
                    keyTokens.some(keyToken => keyToken.includes(token) || token.includes(keyToken))
                );

                if (allTokensMatch) {
                    return originalKey;
                }
            }
        }
    }

    // Strategy 3: Substring match (still needed for partial matches)
    let bestMatchKey = '';
    let longestMatch = 0;

    for (const [cleanedKey, originalKey] of productLookupCache.entries()) {
        // Check both directions: input contains key OR key contains input
        if (cleanedKey && (lookupCode.includes(cleanedKey) || cleanedKey.includes(lookupCode))) {
            if (cleanedKey.length > longestMatch) {
                longestMatch = cleanedKey.length;
                bestMatchKey = originalKey;
            }
        }
    }

    // Strategy 4: Token overlap matching as last resort
    if (!bestMatchKey && inputTokens.length > 0) {
        let bestOverlap = 0;

        for (const [cleanedKey, originalKey] of productLookupCache.entries()) {
            const keyTokens = originalKey.toUpperCase().split(/[\s()-_]+/).filter(t => t);
            const overlap = inputTokens.filter(token =>
                keyTokens.some(keyToken => keyToken.includes(token) || token.includes(keyToken))
            ).length;

            if (overlap > bestOverlap) {
                bestOverlap = overlap;
                bestMatchKey = originalKey;
            }
        }

        // Only return if we have meaningful overlap
        if (bestOverlap >= Math.min(2, inputTokens.length)) {
            return bestMatchKey;
        }
    }

    return bestMatchKey || undefined;
}

// Export function to clear cache when config changes
export const clearProductLookupCache = () => {
    productLookupCache = null;
    productLookupCacheKeys = null;
};

/**
 * Validates a raw product from the AI parser before processing
 * Applies business rules for excluding certain product types
 *
 * @param product - The raw parsed product to validate
 * @returns true if the product should be included, false if it should be excluded
 */
export const validateRawProduct = (product: ParsedProduct): boolean => {
    // The AI is now responsible for identifying products. We just perform a simple sanity check and apply exclusion rules.
    if (!product.productCode || !product.rawDescription) {
        return false;
    }

    // Rule: Exclude certain lines per configuration
    const lowerDesc = product.rawDescription.toLowerCase();
    const lowerCode = product.productCode.toLowerCase();

    // Exclusion keywords from configuration
    const exclusionKeywords = ['tray', 'cable tray', 'access door', 'delivery & installation', 'd&i'];
    if (exclusionKeywords.some(kw => lowerDesc.includes(kw))) {
        // Exception: POW-TRAY is not excluded (it's a power item)
        if (!lowerCode.includes('pow-tray') && !lowerDesc.includes('power tray')) {
            return false;
        }
    }

    // Rule: Exclude "Insert" as a standalone item (unless part of larger product)
    if ((lowerDesc.includes('insert') || lowerDesc.includes('inner shelf')) &&
        !lowerDesc.includes('pedestal') &&
        !lowerCode.includes('pedestal')) {
        return false;
    }

    // Rule: Exclude items marked as "Excluded" in configuration
    if (lowerDesc.includes('clamp') && lowerCode.includes('cage')) {
        return false;
    }

    return true;
};


/**
 * Standardizes the product name for display using the AI-generated clean description
 * This creates a consistent, clear name based on the AI's improved understanding of the document
 * Format: "Line [Line Number] – [Clean Description]"
 *
 * @param product - The parsed product to standardize
 * @returns Standardized product name string
 */
export const standardizeProductName = (product: ParsedProduct): string => {
    if (!product.cleanDescription) {
        // Fallback for safety, though the AI should always provide this field.
        // Fallback for safety, though the AI should always provide this field
        return `Line ${product.lineNumber} – ${product.productCode}`;
    }
    return `Line ${product.lineNumber} – ${product.cleanDescription}`;
};

/**
 * Groups all power-related items (power modules, data modules, etc.) into a single consolidated line item
 * This simplifies quotes by combining similar low-value power accessories
 *
 * @param products - Array of parsed products
 * @returns Object containing regular products and optionally a consolidated power item
 */
export const groupPowerItems = (products: ParsedProduct[]): { groupedItems: ParsedProduct[], powerItemsConsolidated: ParsedProduct | null } => {
    // Updated regex pattern from configuration
    const powerRegex = /(?:power(?:\s*bar|\s*module)?|POW-TRAY|R-POW|P60|SPM|starter\s*lead|connector\s*lead|SPM-B)/i;
    const excludeRegex = /\bcable\s*tray\b/i;

    const powerItems: ParsedProduct[] = [];
    const groupedItems: ParsedProduct[] = [];

    products.forEach(p => {
        const codeAndDesc = `${p.productCode} ${p.rawDescription}`;

        // Check if it matches power pattern but is not excluded
        if (powerRegex.test(codeAndDesc) && !excludeRegex.test(codeAndDesc)) {
            powerItems.push(p);
        } else {
            groupedItems.push(p);
        }
    });

    if (powerItems.length === 0) {
        return { groupedItems, powerItemsConsolidated: null };
    }

    const totalQuantity = powerItems.reduce((sum, item) => sum + item.quantity, 0);
    const firstPowerItem = powerItems[0];

    const powerItemsConsolidated: ParsedProduct = {
        lineNumber: 999, // Place at end of table
        productCode: 'POWER-MODULE',
        rawDescription: 'Combined Power (all modules, trays excluded)',
        cleanDescription: 'Combined Power (all modules, trays excluded)',
        quantity: totalQuantity,
        description: `Combined Power (all modules, trays excluded)`
    };

    return { groupedItems, powerItemsConsolidated };
};

export const resolveProductDetails = async (
    products: ParsedProduct[],
    config: AppConfig,
    sessionLearnedData: Record<string, ProductReference>,
    manuallyAddedData: Record<string, ProductReference>
): Promise<{ resolved: CalculatedProduct[], unresolved: ParsedProduct[] }> => {
    const resolved: CalculatedProduct[] = [];
    const unresolved: ParsedProduct[] = [];

    const productCatalogueKeys = Object.keys(config.productCatalogue);
    const manualDataKeys = Object.keys(manuallyAddedData);

    for (const product of products) {
        let reference: ProductReference | null = null;
        let source: CalculatedProduct['source'] | null = null;
        let matchKey: string | undefined;

        // Normalize the product code once for matching
        const normalizedProductCode = product.productCode.toUpperCase().replace(/[\s()-_]/g, '');

        // First check database catalogue
        const dbLookup = await catalogueService.findProduct(product.productCode);
        if (dbLookup.found && dbLookup.product) {
            reference = {
                installTimeHours: dbLookup.product.installTimeHours,
                wasteVolumeM3: dbLookup.product.wasteVolumeM3,
                isHeavy: false // Database products don't currently track isHeavy
            };
            source = 'catalogue';
        } else {
            // Precedence: manual, session-learned, config catalogue
            matchKey = findBestMatchKey(normalizedProductCode, manualDataKeys);
            if (matchKey) {
                reference = manuallyAddedData[matchKey];
                source = 'user-inputted';
            } else if (sessionLearnedData[normalizedProductCode]) {
                // For session-learned data, keys are normalized. A direct lookup is cleaner and more reliable.
                reference = sessionLearnedData[normalizedProductCode];
                source = 'learned';
            } else {
                // Fallback to the main catalogue with fuzzy matching AND direct normalized key lookup
                matchKey = findBestMatchKey(normalizedProductCode, productCatalogueKeys);
                if (matchKey) {
                    reference = config.productCatalogue[matchKey];
                    source = 'catalogue';
                } else {
                    // Try direct lookup with normalized key (for user-added products)
                    if (config.productCatalogue[normalizedProductCode]) {
                        reference = config.productCatalogue[normalizedProductCode];
                        source = 'catalogue';
                    } else {
                    }
                }
            }
        }
        
        if (reference && source) {
            let timePerUnit = reference.installTimeHours;
            const wastePerUnit = reference.wasteVolumeM3;

            // Apply special edge rules
            const upperCode = product.productCode.toUpperCase();
            const upperDesc = (product.rawDescription || '').toUpperCase();

            // Edge rule: Bass Tapered
            if ((upperCode.includes('BASS') && upperCode.includes('TAPERED')) ||
                (upperDesc.includes('BASS') && upperDesc.includes('TAPERED'))) {
                // Extract length from description if possible
                const lengthMatch = upperDesc.match(/L(\d{3,4})/);
                if (lengthMatch) {
                    const lengthMM = parseInt(lengthMatch[1]);
                    timePerUnit = calculateBassTaperedHours(timePerUnit, lengthMM);
                }
            }

            // Edge rule: Glow Integrated with Frank
            if ((upperCode.includes('GLOW') && upperDesc.includes('INTEGRATED')) ||
                (upperDesc.includes('GLOW') && upperDesc.includes('INTEGRATED'))) {
                // Find Frank base time (1.6 hours default)
                const frankTime = 1.6;
                timePerUnit = calculateGlowIntegratedHours(frankTime);
            }

            // Edge rule: Pedestal (always 0 hours)
            if (upperCode.includes('PEDESTAL') || upperDesc.includes('PEDESTAL')) {
                timePerUnit = 0.0;
            }

            // Edge rule: Enza treated as Credenza (0.4 hours)
            if (upperCode.startsWith('ENZ') || upperCode.includes('ENZA')) {
                timePerUnit = 0.4;
            }

            // Edge rule: Locker banks - qty equals carcasses by width
            if ((upperCode.includes('LOCKER') && upperCode.includes('BANK')) ||
                (upperDesc.includes('LOCKER') && upperDesc.includes('BANK'))) {
                // Quantity handling for lockers is based on width units
                // Time is 0.5 hours per carcass
                timePerUnit = 0.5;
            }

            // Edge rule: Glow Lamp any size singular (0.35 hours)
            if ((upperCode.includes('GLOW') && upperCode.includes('LAMP')) ||
                (upperCode === 'GLOW-20') || upperCode.includes('GLOW-LAMP')) {
                timePerUnit = 0.35;
            }

            resolved.push({
                ...product,
                description: product.description || product.cleanDescription,
                timePerUnit,
                totalTime: product.quantity * timePerUnit,
                wastePerUnit,
                totalWaste: product.quantity * wastePerUnit,
                isHeavy: reference.isHeavy ?? false,
                source: source
            });
        } else {
            unresolved.push(product);
        }
    }

    return { resolved, unresolved };
};

const calculateLabour = (products: CalculatedProduct[], details: QuoteDetails, config: AppConfig): LabourResults => {
    const totalHours = products.reduce((sum, p) => sum + p.totalTime, 0);

    let upliftBufferPercentage = 0;
    if (details.upliftViaStairs) upliftBufferPercentage += config.rules.upliftStairsBufferPercent;
    if (details.extendedUplift) upliftBufferPercentage += config.rules.extendedUpliftBufferPercent;

    const hoursAfterUplift = totalHours * (1 + upliftBufferPercentage / 100);

    // Labour buffer logic from configuration
    let durationBufferPercentage = 25; // Default buffer: 25%

    // Over 16 hours: minimum 10% buffer
    if (hoursAfterUplift > 16) {
        durationBufferPercentage = Math.max(10, durationBufferPercentage);
    }

    // Over 5 days (40 hours): minimum 15% buffer
    if (hoursAfterUplift > 40) {
        durationBufferPercentage = Math.max(15, durationBufferPercentage);
    }

    const bufferedHours = hoursAfterUplift * (1 + durationBufferPercentage / 100);

    // Round to nearest 0.25 hours
    const roundedHours = _roundToNearest(bufferedHours, 0.25);

    const totalDays = roundedHours / config.rules.hoursPerDay;

    return {
        totalHours,
        upliftBufferPercentage,
        hoursAfterUplift,
        durationBufferPercentage,
        bufferedHours: roundedHours,
        totalDays,
    };
};

const calculateCrew = (labour: LabourResults, products: CalculatedProduct[], details: QuoteDetails, config: AppConfig): CrewResults => {
    const isTwoManVanRequiredByDefault = products.some(p => p.isHeavy);
    
    // If user has overridden fitter count, use that, otherwise calculate optimal crew
    let totalFitters: number;
    let totalProjectDays: number;
    
    if (details.overrideFitterCount != null) {
        // User override - use their specified number of fitters
        totalFitters = details.overrideFitterCount;
        totalProjectDays = labour.bufferedHours / (totalFitters * config.rules.hoursPerDay);
    } else {
        // Calculate optimal crew distribution
        const maxFitters = 8; // Maximum fitters (excluding supervisors)
        const hoursPerDay = config.rules.hoursPerDay; // 8 hours per fitter per day
        
        // Calculate how many fitter-days we need in total
        const totalFitterDays = labour.bufferedHours / hoursPerDay;
        
        // Start with minimum days and work up to find optimal crew distribution
        let bestFitters = Math.min(maxFitters, Math.ceil(totalFitterDays));
        let bestDays = Math.ceil(totalFitterDays / bestFitters);
        
        // Try to minimize days first (more efficient), then optimize crew size
        for (let days = 1; days <= Math.ceil(totalFitterDays); days++) {
            const requiredFitters = Math.ceil(totalFitterDays / days);
            
            // Skip if we need more than max fitters
            if (requiredFitters > maxFitters) continue;
            
            // This combination works - check if it's better than current best
            if (days < bestDays || (days === bestDays && requiredFitters <= bestFitters)) {
                bestFitters = requiredFitters;
                bestDays = days;
            }
        }
        
        totalFitters = bestFitters;
        totalProjectDays = bestDays;
    }
    
    // Store the installation days before adding uplift
    const _installationDays = totalProjectDays;
    
    // Add custom extended uplift days if specified
    if (details.customExtendedUpliftDays && details.customExtendedUpliftDays > 0) {
        totalProjectDays += details.customExtendedUpliftDays;
    }
    
    // Van allocation logic
    const vanType = details.overrideVanType ?? (isTwoManVanRequiredByDefault ? 'twoMan' : 'oneMan');
    const vanFitters = vanType === 'twoMan' ? Math.min(totalFitters, 2) : Math.min(totalFitters, 1);
    const onFootFitters = totalFitters - vanFitters;
    const vanCount = vanFitters > 0 ? 1 : 0;
    
    // Supervisor calculation
    const calculatedSupervisorCount = (totalProjectDays > config.rules.supervisorThresholdDays || !!details.manuallyAddSupervisor) ? 1 : 0;
    const supervisorCount = details.overrideSupervisorCount ?? calculatedSupervisorCount;
    
    const specialistCount = details.specialistReworking ? 1 : 0;
    const crewSize = totalFitters + supervisorCount + specialistCount;
    
    // Calculate individual workload metrics
    const productivePeople = totalFitters > 0 ? totalFitters : 1;
    const hourLoadPerPerson = labour.bufferedHours / productivePeople;
    const daysPerFitter = hourLoadPerPerson / config.rules.hoursPerDay;
    
    
    return {
        crewSize,
        vanCount,
        vanFitters,
        onFootFitters,
        supervisorCount,
        specialistCount,
        daysPerFitter,
        totalProjectDays,
        isTwoManVanRequired: vanType === 'twoMan',
        hourLoadPerPerson,
    };
};

const calculateWaste = (products: CalculatedProduct[], details: QuoteDetails, _config: AppConfig): WasteResults => {
    // Simple calculation: total quantity of all products × 0.035
    const totalProductQuantity = products.reduce((sum, p) => sum + p.quantity, 0);
    const calculatedWasteValue = totalProductQuantity * 0.035;
    
    // Use override if provided, otherwise use calculated value
    const finalWasteValue = details.overrideWasteVolumeM3 ?? calculatedWasteValue;
    
    // For display purposes, show the waste value directly (not divided by van capacity)
    const loadsRequired = finalWasteValue;
    const isFlagged = loadsRequired > 1;

    return { 
        totalVolumeM3: finalWasteValue, 
        loadsRequired, 
        isFlagged 
    };
};

const calculatePricing = (crew: CrewResults, details: QuoteDetails, config: AppConfig): PricingResults => {
    const installDays = crew.totalProjectDays - (details.customExtendedUpliftDays || 0);
    const upliftDays = details.customExtendedUpliftDays || 0;
    const totalBillableDays = crew.totalProjectDays;
    
    // Installation period costs
    let vanCost = 0;
    if (crew.vanCount > 0) {
        const rate = crew.isTwoManVanRequired ? config.pricing.twoManVanDayRate : config.pricing.oneManVanDayRate;
        vanCost = rate * installDays;
    }
    
    const installFitterCost = crew.onFootFitters * config.pricing.additionalFitterDayRate * installDays;
    const installSupervisorCost = crew.supervisorCount * config.pricing.supervisorDayRate * installDays;
    
    // Uplift period costs
    let upliftVanCost = 0;
    let upliftFitterCost = 0;
    let upliftSupervisorCost = 0;
    
    if (details.extendedUplift && upliftDays > 0) {
        const upliftFitters = details.customExtendedUpliftFitters ?? Math.min(6, crew.vanFitters + crew.onFootFitters); // Default to 6 fitters max for uplift
        const needsUpliftSupervisor = details.upliftSupervisor ?? false;
        
        // Van for uplift (assume same type as install)
        if (upliftFitters > 0) {
            const rate = crew.isTwoManVanRequired ? config.pricing.twoManVanDayRate : config.pricing.oneManVanDayRate;
            upliftVanCost = rate * upliftDays;
        }
        
        // Additional fitters for uplift (subtract van fitters to avoid double billing)
        const upliftOnFootFitters = Math.max(0, upliftFitters - (crew.isTwoManVanRequired ? 2 : 1));
        upliftFitterCost = upliftOnFootFitters * config.pricing.additionalFitterDayRate * upliftDays;
        
        // Uplift supervisor
        if (needsUpliftSupervisor) {
            upliftSupervisorCost = config.pricing.supervisorDayRate * upliftDays;
        }
    }
    
    const totalVanCost = vanCost + upliftVanCost;
    const totalFitterCost = installFitterCost + upliftFitterCost;
    const totalSupervisorCost = installSupervisorCost + upliftSupervisorCost;
    
    const reworkingCost = details.specialistReworking ? config.pricing.specialistReworkingFlatRate : 0;
    const parkingCost = (details.dailyParkingCharge ?? 75) * totalBillableDays; // Default to £75 per day
    
    // Calculate transport cost from selected vehicles
    const transportCost = Object.entries(details.selectedVehicles || {}).reduce((sum, [vehicleId, quantity]) => {
        const vehicle = config.vehicles[vehicleId];
        return sum + (vehicle ? vehicle.costPerDay * quantity * totalBillableDays : 0);
    }, 0);
    
    const standardCost = totalVanCost + totalFitterCost + totalSupervisorCost + reworkingCost + parkingCost + transportCost;
    
    // Calculate out-of-hours surcharge if applicable
    let outOfHoursSurcharge = 0;
    let outOfHoursMultiplier = 1.0;
    let finalTotalCost = standardCost;
    
    if (details.outOfHoursWorking && details.outOfHoursType && (details.outOfHoursDays ?? 0) > 0) {
        // Get multiplier based on out-of-hours type
        switch (details.outOfHoursType) {
            case 'weekday_evening':
                outOfHoursMultiplier = 1.5; // 150%
                break;
            case 'saturday':
                outOfHoursMultiplier = 2.0; // 200%
                break;
            case 'sunday_bank_holiday':
                outOfHoursMultiplier = 2.25; // 225%
                break;
        }
        
        // Calculate proportion of work that's out-of-hours
        const outOfHoursRatio = Math.min(1, (details.outOfHoursDays || 0) / totalBillableDays);
        
        // Only apply multiplier to labour costs (van, fitters, supervisors) not to parking/transport/reworking
        const labourCosts = totalVanCost + totalFitterCost + totalSupervisorCost;
        const nonLabourCosts = reworkingCost + parkingCost + transportCost;
        
        const outOfHoursLabourCost = labourCosts * outOfHoursRatio * outOfHoursMultiplier;
        const standardLabourCost = labourCosts * (1 - outOfHoursRatio);
        
        outOfHoursSurcharge = (outOfHoursLabourCost + standardLabourCost) - labourCosts;
        finalTotalCost = outOfHoursLabourCost + standardLabourCost + nonLabourCosts;
    }
    
    return {
        totalCost: finalTotalCost,
        vanCost: totalVanCost,
        fitterCost: totalFitterCost,
        supervisorCost: totalSupervisorCost,
        reworkingCost,
        parkingCost,
        transportCost,
        billableDays: totalBillableDays,
        outOfHoursSurcharge: outOfHoursSurcharge > 0 ? outOfHoursSurcharge : undefined,
        outOfHoursMultiplier: outOfHoursMultiplier !== 1.0 ? outOfHoursMultiplier : undefined,
        standardCost: outOfHoursSurcharge > 0 ? standardCost : undefined,
    };
};

const generateNotes = (pricing: PricingResults, details: QuoteDetails): CalculationResults['notes'] => {
    const parkingCharge = details.dailyParkingCharge ?? 75;
    return {
        parking: pricing.parkingCost > 0 ? `Daily charge of £${parkingCharge.toFixed(2)} applied.` : "To be confirmed/arranged by client.",
        mileage: "Mileage to be calculated based on distance from base.",
        ulez: "ULEZ/Congestion charges will be added if applicable.",
        delivery: "Standard delivery to ground floor included. Additional charges may apply for complex logistics."
    };
}


/**
 * Main calculation engine - computes all quote metrics including labour, crew, waste, and pricing
 * This is the core business logic that transforms product data into actionable quote information
 *
 * @param products - Array of calculated products with time and waste data
 * @param details - Quote-specific details (client, address, special requirements)
 * @param config - Application configuration including pricing rates and business rules
 * @returns Complete calculation results with all metrics
 *
 * @example
 * ```typescript
 * const results = calculateAll(products, quoteDetails, appConfig);
 * console.log(results.pricing.totalCost); // Final quote price
 * console.log(results.crew.crewSize); // Required crew size
 * ```
 */
export const calculateAll = (
    products: CalculatedProduct[],
    details: QuoteDetails,
    config: AppConfig
): CalculationResults => {
    const labour = calculateLabour(products, details, config);
    const crew = calculateCrew(labour, products, details, config);
    const waste = calculateWaste(products, details, config);
    const pricing = calculatePricing(crew, details, config);
    const notes = generateNotes(pricing, details);

    return {
        labour,
        crew,
        waste,
        pricing,
        notes,
        detailedProducts: products,
    };
};