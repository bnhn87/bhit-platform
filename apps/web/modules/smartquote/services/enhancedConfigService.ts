import { AppConfig, ProductReference } from '../types';

import { hybridProductService } from './databaseProductService';
import { getDefaultConfig as getFullConfig } from './configService';

const CONFIG_STORAGE_KEY = 'bhit_smartquote_config';

// Helper function to create product reference with heuristics
const _createProductReference = (name: string, timeMinutes: number): ProductReference => {
    const lowerName = name.toLowerCase();
    const installTimeHours = parseFloat((timeMinutes / 60).toFixed(2));
    const wasteVolumeM3 = 0.035; // Standard default
    const isHeavy = installTimeHours > 0.75 || ['sofa', 'co-work', 'duo', 'large'].some(term => lowerName.includes(term));
    return {
        installTimeHours,
        wasteVolumeM3,
        isHeavy
    };
};

// Default static product references (fallback only)
const FALLBACK_PRODUCT_REFERENCE_SHEET: Record<string, ProductReference> = {
    'T9b': { installTimeHours: 0.42, wasteVolumeM3: 0.035, isHeavy: false },
    'D1': { installTimeHours: 0.33, wasteVolumeM3: 0.035, isHeavy: false },
    'D2a': { installTimeHours: 0.50, wasteVolumeM3: 0.035, isHeavy: true },
    'WK-S1': { installTimeHours: 0.25, wasteVolumeM3: 0.035, isHeavy: false },
    'CH-01': { installTimeHours: 0.17, wasteVolumeM3: 0.035, isHeavy: false },
    'CH-05': { installTimeHours: 0.20, wasteVolumeM3: 0.035, isHeavy: false },
    'SOFA-3': { installTimeHours: 0.75, wasteVolumeM3: 0.035, isHeavy: true },
    'ST-P1': { installTimeHours: 0.58, wasteVolumeM3: 0.035, isHeavy: false },
    'ST-L2': { installTimeHours: 1.00, wasteVolumeM3: 0.035, isHeavy: true },
    'DEFAULT': { installTimeHours: 0.33, wasteVolumeM3: 0.035, isHeavy: false },
};

// Default vehicle configurations
const DEFAULT_VEHICLES = {
    'luton-van': {
        id: 'luton-van',
        name: 'Luton Van',
        costPerDay: 120,
        euroPalletCapacity: 8,
        standardPalletCapacity: 6,
        isActive: true
    },
    'transit-van': {
        id: 'transit-van',
        name: 'Transit Van',
        costPerDay: 85,
        euroPalletCapacity: 4,
        standardPalletCapacity: 3,
        isActive: true
    },
    'sprinter-van': {
        id: 'sprinter-van',
        name: 'Sprinter Van',
        costPerDay: 95,
        euroPalletCapacity: 6,
        standardPalletCapacity: 4,
        isActive: true
    }
};

// Get default configuration with full product catalogue
export const getDefaultConfig = async (): Promise<AppConfig> => {
    // Get the full catalogue from configService
    const fullConfig = getFullConfig();
    // Try to load additional products from database, but fallback to full catalogue
    const productCatalogue = await hybridProductService.loadProductCatalogue().catch(() => fullConfig.productCatalogue);

    return {
        pricing: {
            oneManVanDayRate: 280,
            twoManVanDayRate: 420,
            additionalFitterDayRate: 160,
            supervisorDayRate: 240,
            specialistReworkingFlatRate: 80,
        },
        laborCosts: {
            oneManVanCostToCompany: 180,
            twoManVanCostToCompany: 290,
            additionalFitterCostToCompany: 140,
            supervisorCostToCompany: 190,
            specialistReworkingCostToCompany: 70,
            useHourlyRate: false,
            hourlyRateMultiplier: 0.15,
        },
        rules: {
            hoursPerDay: 7,
            vanCapacityM3: 2.5,
            upliftStairsBufferPercent: 15,
            extendedUpliftBufferPercent: 25,
            defaultWasteVolumeM3: 0.035,
            supervisorThresholdDays: 5,
            preparedByOptions: ['John Smith', 'Sarah Johnson', 'Mike Wilson', 'Emma Brown'],
        },
        productCatalogue,
        vehicles: DEFAULT_VEHICLES,
    };
};

// Load configuration with async product catalogue loading
export const loadConfig = async (): Promise<AppConfig> => {
    try {
        // First load the base config from localStorage
        if (typeof window === 'undefined') {
            return await getDefaultConfig();
        }
        const storedConfig = localStorage.getItem(CONFIG_STORAGE_KEY);
        let baseConfig = await getDefaultConfig();

        if (storedConfig) {
            const parsedConfig = JSON.parse(storedConfig);

            // Validate and merge stored config (excluding productCatalogue which comes from database)
            if (parsedConfig.pricing && parsedConfig.rules) {
                baseConfig = {
                    pricing: { ...baseConfig.pricing, ...parsedConfig.pricing },
                    laborCosts: { ...baseConfig.laborCosts, ...parsedConfig.laborCosts },
                    rules: { ...baseConfig.rules, ...parsedConfig.rules },
                    vehicles: { ...baseConfig.vehicles, ...parsedConfig.vehicles },
                    productCatalogue: baseConfig.productCatalogue // Always use database-loaded catalogue
                };
            }
        }

        return baseConfig;

    } catch {
        // Failed to load enhanced config. Using default config.
        return await getDefaultConfig();
    }
};

// Save configuration (excluding productCatalogue which is managed by database)
export const saveConfig = (config: AppConfig) => {
    try {
        if (typeof window === 'undefined') {
            return; // Skip saving during SSR
        }
        // Save everything except productCatalogue to localStorage
        const configToSave = {
            pricing: config.pricing,
            laborCosts: config.laborCosts,
            rules: config.rules,
            vehicles: config.vehicles
            // productCatalogue is handled by database service
        };

        localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(configToSave));
    } catch {
        // Failed to save enhanced config to localStorage
    }
};

// Save a learned product to the database
export const saveLearnedProduct = async (productCode: string, reference: ProductReference): Promise<void> => {
    await hybridProductService.saveProduct(productCode, reference);
};

// Get a specific product by code from database first
export const getProductByCode = async (productCode: string): Promise<ProductReference | null> => {
    return await hybridProductService.getProduct(productCode);
};

// Search products in the database
export const searchProducts = async (searchTerm: string) => {
    return await hybridProductService.searchProducts(searchTerm);
};

// Synchronous version for backward compatibility (uses full catalogue from configService)
export const loadConfigSync = (): AppConfig => {
    try {
        // Get the full catalogue from configService
        const fullConfig = getFullConfig();

        if (typeof window === 'undefined') {
            // Return default config for SSR with full catalogue
            return {
                pricing: {
                    oneManVanDayRate: 280,
                    twoManVanDayRate: 420,
                    additionalFitterDayRate: 160,
                    supervisorDayRate: 240,
                    specialistReworkingFlatRate: 80,
                },
                laborCosts: {
                    oneManVanCostToCompany: 180,
                    twoManVanCostToCompany: 290,
                    additionalFitterCostToCompany: 90,
                    supervisorCostToCompany: 140,
                    specialistReworkingCostToCompany: 70,
                    useHourlyRate: false,
                    hourlyRateMultiplier: 0.15,
                },
                rules: {
                    hoursPerDay: 7,
                    vanCapacityM3: 2.5,
                    upliftStairsBufferPercent: 15,
                    extendedUpliftBufferPercent: 25,
                    defaultWasteVolumeM3: 0.035,
                    supervisorThresholdDays: 5,
                    preparedByOptions: ['John Smith', 'Sarah Johnson', 'Mike Wilson', 'Emma Brown'],
                },
                productCatalogue: fullConfig.productCatalogue, // Use full catalogue
                vehicles: fullConfig.vehicles
            };
        }
        const storedConfig = localStorage.getItem(CONFIG_STORAGE_KEY);

        const defaultConfig = {
            pricing: {
                oneManVanDayRate: 280,
                twoManVanDayRate: 420,
                additionalFitterDayRate: 160,
                supervisorDayRate: 240,
                specialistReworkingFlatRate: 80,
            },
            laborCosts: {
                oneManVanCostToCompany: 180,
                twoManVanCostToCompany: 290,
                additionalFitterCostToCompany: 140,
                supervisorCostToCompany: 190,
                specialistReworkingCostToCompany: 70,
                useHourlyRate: false,
                hourlyRateMultiplier: 0.15,
            },
            rules: {
                hoursPerDay: 7,
                vanCapacityM3: 2.5,
                upliftStairsBufferPercent: 15,
                extendedUpliftBufferPercent: 25,
                defaultWasteVolumeM3: 0.035,
                supervisorThresholdDays: 5,
                preparedByOptions: ['John Smith', 'Sarah Johnson', 'Mike Wilson', 'Emma Brown'],
            },
            productCatalogue: fullConfig.productCatalogue, // Use full catalogue
            vehicles: fullConfig.vehicles,
        };

        if (storedConfig) {
            const parsedConfig = JSON.parse(storedConfig);
            if (parsedConfig.pricing && parsedConfig.rules) {
                return {
                    pricing: { ...defaultConfig.pricing, ...parsedConfig.pricing },
                    laborCosts: { ...defaultConfig.laborCosts, ...parsedConfig.laborCosts },
                    rules: { ...defaultConfig.rules, ...parsedConfig.rules },
                    vehicles: { ...defaultConfig.vehicles, ...parsedConfig.vehicles },
                    productCatalogue: fullConfig.productCatalogue // Use full catalogue
                };
            }
        }

        return defaultConfig;

    } catch {
        // Failed to load config synchronously. Using default config
        return {
            pricing: {
                oneManVanDayRate: 280,
                twoManVanDayRate: 420,
                additionalFitterDayRate: 160,
                supervisorDayRate: 240,
                specialistReworkingFlatRate: 80,
            },
            laborCosts: {
                oneManVanCostToCompany: 180,
                twoManVanCostToCompany: 290,
                additionalFitterCostToCompany: 140,
                supervisorCostToCompany: 190,
                specialistReworkingCostToCompany: 70,
                useHourlyRate: false,
                hourlyRateMultiplier: 0.15,
            },
            rules: {
                hoursPerDay: 7,
                vanCapacityM3: 2.5,
                upliftStairsBufferPercent: 15,
                extendedUpliftBufferPercent: 25,
                defaultWasteVolumeM3: 0.035,
                supervisorThresholdDays: 5,
                preparedByOptions: ['John Smith', 'Sarah Johnson', 'Mike Wilson', 'Emma Brown'],
            },
            productCatalogue: FALLBACK_PRODUCT_REFERENCE_SHEET,
            vehicles: DEFAULT_VEHICLES,
        };
    }
};