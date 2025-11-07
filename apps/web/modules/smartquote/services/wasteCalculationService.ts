/**
 * Waste Calculation Service
 * Calculates realistic waste volumes based on product characteristics
 */

import { ProductReference } from '../types';

/**
 * Calculate waste volume based on product characteristics
 * Uses a more realistic model based on:
 * - Product size/weight (heavier items = more packaging)
 * - Installation time (longer install = more complex = more waste)
 * - Product type (from code patterns)
 */
export function calculateWasteVolume(
    productCode: string,
    installTimeHours: number,
    isHeavy: boolean
): number {
    const code = productCode.toUpperCase();

    // Base waste calculation factors
    const BASE_WASTE_M3 = 0.02; // 20 liters base
    const TIME_FACTOR = 0.015; // 15 liters per hour of install time
    const HEAVY_MULTIPLIER = 1.5; // Heavy items have 50% more packaging

    // Product-specific waste profiles
    const productWasteProfiles: Record<string, number> = {
        // Large workstations (more packaging, more components)
        'FLX-8P': 0.120,
        'FLX-COWORK-8P': 0.120,
        'FLX-6P': 0.095,
        'FLX-COWORK-6P': 0.095,
        'FLX-4P': 0.075,
        'FLX-COWORK-4P': 0.075,

        // Single workstations
        'FLX-SINGLE': 0.035,
        'FLX-ESSENTIALS': 0.040,

        // Large tables
        'WORKAROUND-MEETING-L5200': 0.100,
        'WORKAROUND-MEETING-L4000': 0.085,
        'WORKAROUND-MEETING-L3600': 0.080,
        'WORKAROUND-MEETING-L2800': 0.070,
        'WORKAROUND-MEETING-L2000': 0.060,

        // Round tables (less packaging due to shape)
        'WORKAROUND-CIRCULAR': 0.045,
        'CAFE-ROUND': 0.025,

        // Storage units
        'CREDENZA': 0.050,
        'LOCKER': 0.045,
        'PEDESTAL': 0.030,

        // Seating
        'JUST A CHAIR': 0.015, // Minimal packaging
        'CAGE-SOFA': 0.055, // More packaging for upholstered items

        // Heavy items
        'BASS-RECT': 0.085,
        'BASS-PILL': 0.090,
        'ROLLER': 0.100,

        // Small items
        'PLANTER': 0.010,
        'SNAKEY RISER': 0.005,
        'POWER-MODULE': 0.008,
    };

    // Check for exact match in profiles
    for (const [pattern, wasteVolume] of Object.entries(productWasteProfiles)) {
        if (code.includes(pattern.replace('-', '')) || code === pattern) {
            return wasteVolume;
        }
    }

    // Pattern-based detection if no exact match
    if (code.includes('8P') || code.includes('EIGHT')) {
        return 0.120; // 8-person = 120 liters
    }
    if (code.includes('6P') || code.includes('SIX')) {
        return 0.095; // 6-person = 95 liters
    }
    if (code.includes('4P') || code.includes('FOUR')) {
        return 0.075; // 4-person = 75 liters
    }
    if (code.includes('SINGLE') || code.includes('1P')) {
        return 0.035; // Single = 35 liters
    }

    // Size-based estimation from dimensions in code
    const sizeMatch = code.match(/L(\d{4})|(\d{4})MM|D(\d{4})/);
    if (sizeMatch) {
        const size = parseInt(sizeMatch[1] || sizeMatch[2] || sizeMatch[3]);
        if (size >= 4000) return 0.100; // Very large
        if (size >= 3000) return 0.080; // Large
        if (size >= 2000) return 0.060; // Medium-large
        if (size >= 1500) return 0.045; // Medium
        if (size >= 1000) return 0.030; // Small-medium
        return 0.020; // Small
    }

    // Type-based defaults
    if (code.includes('SOFA') || code.includes('SEATING')) {
        return 0.055; // Upholstered items
    }
    if (code.includes('CHAIR')) {
        return 0.015; // Chairs have minimal packaging
    }
    if (code.includes('TABLE') || code.includes('DESK')) {
        return isHeavy ? 0.065 : 0.045;
    }
    if (code.includes('STORAGE') || code.includes('CABINET')) {
        return 0.050;
    }
    if (code.includes('SCREEN') || code.includes('DIVIDER')) {
        return 0.040;
    }
    if (code.includes('POWER') || code.includes('CABLE') || code.includes('MODULE')) {
        return 0.008; // Electrical items have minimal waste
    }

    // Calculate based on install time and weight if no pattern matches
    let calculatedWaste = BASE_WASTE_M3 + (installTimeHours * TIME_FACTOR);

    if (isHeavy) {
        calculatedWaste *= HEAVY_MULTIPLIER;
    }

    // Cap at reasonable maximum
    return Math.min(calculatedWaste, 0.150);
}

/**
 * Update a product reference with calculated waste volume
 */
export function enhanceProductWithWaste(
    productCode: string,
    existingRef: ProductReference
): ProductReference {
    return {
        ...existingRef,
        wasteVolumeM3: calculateWasteVolume(
            productCode,
            existingRef.installTimeHours,
            existingRef.isHeavy ?? false
        )
    };
}

/**
 * Batch update product catalogue with realistic waste volumes
 */
export function updateCatalogueWasteVolumes(
    catalogue: Record<string, ProductReference>
): Record<string, ProductReference> {
    const updated: Record<string, ProductReference> = {};

    for (const [code, ref] of Object.entries(catalogue)) {
        updated[code] = enhanceProductWithWaste(code, ref);
    }

    return updated;
}

/**
 * Get waste volume description for UI display
 */
export function getWasteDescription(volumeM3: number): string {
    const liters = volumeM3 * 1000;

    if (liters < 10) return 'Minimal';
    if (liters < 25) return 'Small';
    if (liters < 50) return 'Medium';
    if (liters < 75) return 'Large';
    if (liters < 100) return 'Very Large';
    return 'Extra Large';
}

/**
 * Calculate total waste for a job
 */
export function calculateTotalWaste(products: Array<{ wastePerUnit: number; quantity: number }>): {
    totalVolumeM3: number;
    skipLoadsRequired: number;
    description: string;
} {
    const totalVolumeM3 = products.reduce((sum, p) => sum + (p.wastePerUnit * p.quantity), 0);

    // Standard 8-yard skip holds about 6.1m³
    const SKIP_CAPACITY_M3 = 6.1;
    const skipLoadsRequired = Math.ceil(totalVolumeM3 / SKIP_CAPACITY_M3);

    let description = '';
    if (totalVolumeM3 < 1) {
        description = 'Can be disposed in standard bins';
    } else if (totalVolumeM3 < 3) {
        description = 'Will need a small skip or multiple van trips';
    } else if (totalVolumeM3 < 6) {
        description = 'Will need a standard 8-yard skip';
    } else {
        description = `Will need ${skipLoadsRequired} skip loads or a larger skip`;
    }

    return {
        totalVolumeM3,
        skipLoadsRequired,
        description
    };
}