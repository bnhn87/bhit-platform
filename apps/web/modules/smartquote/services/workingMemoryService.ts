/**
 * Working Memory Service for SmartQuote
 *
 * Provides persistent storage for user's working data including:
 * - Product time edits
 * - Quote details
 * - Custom configurations
 * - Recent parsing results
 *
 * This prevents users from having to re-enter data repeatedly
 */

import { QuoteDetails, CalculatedProduct, AppConfig, ParsedProduct } from '../types';

const MEMORY_KEYS = {
    CURRENT_QUOTE_DETAILS: 'smartquote_current_quote_details',
    PRODUCT_TIME_OVERRIDES: 'smartquote_product_time_overrides',
    RECENT_PARSING_RESULTS: 'smartquote_recent_parsing_results',
    CUSTOM_CONFIG_OVERRIDES: 'smartquote_custom_config',
    LAST_USED_SETTINGS: 'smartquote_last_settings',
    WORKING_SESSION: 'smartquote_working_session',
    LEARNED_PRODUCTS: 'smartquote_learned_products'
} as const;

export interface WorkingSession {
    id: string;
    startedAt: string;
    lastUpdatedAt: string;
    quoteDetails: Partial<QuoteDetails>;
    productTimeOverrides: Record<string, number>; // productCode -> timePerUnit
    customPricing?: {
        fitterDayRate?: number;
        supervisorDayRate?: number;
        vanDayRate?: number;
        parkingDaily?: number;
    };
    notes?: {
        internal?: string;
        client?: string;
    };
}

export interface ProductTimeOverride {
    productCode: string;
    timePerUnit: number;
    wastePerUnit?: number;
    isHeavy?: boolean;
    updatedAt: string;
    source: 'manual' | 'learned';
}

class WorkingMemoryService {
    private memoryCache: Map<string, any> = new Map();

    constructor() {
        // Initialize cache from localStorage on creation
        this.loadAllFromStorage();
    }

    private loadAllFromStorage(): void {
        if (typeof window === 'undefined') return;

        Object.values(MEMORY_KEYS).forEach(key => {
            try {
                const stored = localStorage.getItem(key);
                if (stored) {
                    this.memoryCache.set(key, JSON.parse(stored));
                }
            } catch (error) {
                console.warn(`Failed to load ${key} from storage:`, error);
            }
        });
    }

    private saveToStorage(key: string, value: any): void {
        if (typeof window === 'undefined') return;

        try {
            localStorage.setItem(key, JSON.stringify(value));
            this.memoryCache.set(key, value);
        } catch (error) {
            console.error(`Failed to save ${key} to storage:`, error);
        }
    }

    private getFromStorage<T>(key: string): T | null {
        if (typeof window === 'undefined') return null;

        // Check cache first
        if (this.memoryCache.has(key)) {
            return this.memoryCache.get(key) as T;
        }

        // Fallback to localStorage
        try {
            const stored = localStorage.getItem(key);
            if (stored) {
                const parsed = JSON.parse(stored);
                this.memoryCache.set(key, parsed);
                return parsed as T;
            }
        } catch (error) {
            console.warn(`Failed to get ${key} from storage:`, error);
        }

        return null;
    }

    // Quote Details Memory
    saveQuoteDetails(details: Partial<QuoteDetails>): void {
        const existing = this.getQuoteDetails();
        const updated = { ...existing, ...details };
        this.saveToStorage(MEMORY_KEYS.CURRENT_QUOTE_DETAILS, updated);
    }

    getQuoteDetails(): Partial<QuoteDetails> {
        return this.getFromStorage<Partial<QuoteDetails>>(MEMORY_KEYS.CURRENT_QUOTE_DETAILS) || {};
    }

    clearQuoteDetails(): void {
        this.memoryCache.delete(MEMORY_KEYS.CURRENT_QUOTE_DETAILS);
        if (typeof window !== 'undefined') {
            localStorage.removeItem(MEMORY_KEYS.CURRENT_QUOTE_DETAILS);
        }
    }

    // Product Time Overrides
    saveProductTimeOverride(productCode: string, timePerUnit: number, additionalData?: {
        wastePerUnit?: number;
        isHeavy?: boolean;
    }): void {
        const overrides = this.getProductTimeOverrides();
        overrides[productCode] = {
            productCode,
            timePerUnit,
            ...additionalData,
            updatedAt: new Date().toISOString(),
            source: 'manual'
        };
        this.saveToStorage(MEMORY_KEYS.PRODUCT_TIME_OVERRIDES, overrides);
    }

    getProductTimeOverrides(): Record<string, ProductTimeOverride> {
        return this.getFromStorage<Record<string, ProductTimeOverride>>(MEMORY_KEYS.PRODUCT_TIME_OVERRIDES) || {};
    }

    getProductTimeOverride(productCode: string): ProductTimeOverride | null {
        const overrides = this.getProductTimeOverrides();
        return overrides[productCode] || null;
    }

    clearProductTimeOverrides(): void {
        this.memoryCache.delete(MEMORY_KEYS.PRODUCT_TIME_OVERRIDES);
        if (typeof window !== 'undefined') {
            localStorage.removeItem(MEMORY_KEYS.PRODUCT_TIME_OVERRIDES);
        }
    }

    // Recent Parsing Results
    saveRecentParsingResults(products: ParsedProduct[]): void {
        const recent = {
            products,
            savedAt: new Date().toISOString()
        };
        this.saveToStorage(MEMORY_KEYS.RECENT_PARSING_RESULTS, recent);
    }

    getRecentParsingResults(): { products: ParsedProduct[], savedAt: string } | null {
        return this.getFromStorage(MEMORY_KEYS.RECENT_PARSING_RESULTS);
    }

    // Working Session Management
    startNewSession(): string {
        const sessionId = `session_${Date.now()}`;
        const session: WorkingSession = {
            id: sessionId,
            startedAt: new Date().toISOString(),
            lastUpdatedAt: new Date().toISOString(),
            quoteDetails: {},
            productTimeOverrides: {}
        };
        this.saveToStorage(MEMORY_KEYS.WORKING_SESSION, session);
        return sessionId;
    }

    getCurrentSession(): WorkingSession | null {
        const session = this.getFromStorage<WorkingSession>(MEMORY_KEYS.WORKING_SESSION);

        // Check if session is still valid (less than 24 hours old)
        if (session) {
            const hoursSinceUpdate = (Date.now() - new Date(session.lastUpdatedAt).getTime()) / (1000 * 60 * 60);
            if (hoursSinceUpdate > 24) {
                // Session expired, start new one
                this.startNewSession();
                return null;
            }
        }

        return session;
    }

    updateSession(updates: Partial<WorkingSession>): void {
        const session = this.getCurrentSession() || {
            id: this.startNewSession(),
            startedAt: new Date().toISOString(),
            lastUpdatedAt: new Date().toISOString(),
            quoteDetails: {},
            productTimeOverrides: {}
        };

        const updated: WorkingSession = {
            ...session,
            ...updates,
            lastUpdatedAt: new Date().toISOString()
        };

        this.saveToStorage(MEMORY_KEYS.WORKING_SESSION, updated);
    }

    // Apply working memory to products
    applyMemoryToProducts(products: CalculatedProduct[]): CalculatedProduct[] {
        const overrides = this.getProductTimeOverrides();

        return products.map(product => {
            const override = overrides[product.productCode];
            if (override) {
                return {
                    ...product,
                    timePerUnit: override.timePerUnit,
                    totalTime: product.quantity * override.timePerUnit,
                    wastePerUnit: override.wastePerUnit !== undefined ? override.wastePerUnit : product.wastePerUnit,
                    isHeavy: override.isHeavy !== undefined ? override.isHeavy : product.isHeavy,
                    isManuallyEdited: true,
                    source: 'user-inputted' as const
                };
            }
            return product;
        });
    }

    // Apply memory to quote details
    applyMemoryToQuoteDetails(details: QuoteDetails): QuoteDetails {
        const savedDetails = this.getQuoteDetails();
        return {
            ...details,
            ...savedDetails
        };
    }

    // Custom Config Overrides
    saveCustomConfig(config: Partial<AppConfig>): void {
        const existing = this.getCustomConfig();
        const updated = { ...existing, ...config };
        this.saveToStorage(MEMORY_KEYS.CUSTOM_CONFIG_OVERRIDES, updated);
    }

    getCustomConfig(): Partial<AppConfig> {
        return this.getFromStorage<Partial<AppConfig>>(MEMORY_KEYS.CUSTOM_CONFIG_OVERRIDES) || {};
    }

    applyMemoryToConfig(config: AppConfig): AppConfig {
        const customConfig = this.getCustomConfig();
        return {
            ...config,
            ...customConfig,
            productCatalogue: {
                ...config.productCatalogue,
                ...(customConfig.productCatalogue || {})
            }
        };
    }

    // Learned Products (permanent storage)
    saveLearnedProduct(productCode: string, timeData: {
        timePerUnit: number;
        wastePerUnit?: number;
        isHeavy?: boolean;
    }): void {
        const learned = this.getLearnedProducts();
        learned[productCode] = {
            ...timeData,
            learnedAt: new Date().toISOString(),
            usageCount: (learned[productCode]?.usageCount || 0) + 1
        };
        this.saveToStorage(MEMORY_KEYS.LEARNED_PRODUCTS, learned);

        // Also save to overrides for immediate use
        this.saveProductTimeOverride(productCode, timeData.timePerUnit, {
            wastePerUnit: timeData.wastePerUnit,
            isHeavy: timeData.isHeavy
        });
    }

    getLearnedProducts(): Record<string, any> {
        return this.getFromStorage(MEMORY_KEYS.LEARNED_PRODUCTS) || {};
    }

    // Clear all memory
    clearAll(): void {
        Object.values(MEMORY_KEYS).forEach(key => {
            this.memoryCache.delete(key);
            if (typeof window !== 'undefined') {
                localStorage.removeItem(key);
            }
        });
    }

    // Export/Import for backup
    exportMemory(): string {
        const memoryData: Record<string, any> = {};
        Object.entries(MEMORY_KEYS).forEach(([name, key]) => {
            memoryData[name] = this.getFromStorage(key);
        });
        return JSON.stringify(memoryData, null, 2);
    }

    importMemory(jsonData: string): boolean {
        try {
            const memoryData = JSON.parse(jsonData);
            Object.entries(MEMORY_KEYS).forEach(([name, key]) => {
                if (memoryData[name]) {
                    this.saveToStorage(key, memoryData[name]);
                }
            });
            return true;
        } catch (error) {
            console.error('Failed to import memory:', error);
            return false;
        }
    }

    // Get memory statistics
    getMemoryStats(): {
        sessionAge: string;
        productOverrides: number;
        learnedProducts: number;
        lastActivity: string;
    } {
        const session = this.getCurrentSession();
        const overrides = this.getProductTimeOverrides();
        const learned = this.getLearnedProducts();

        return {
            sessionAge: session ?
                `${Math.round((Date.now() - new Date(session.startedAt).getTime()) / (1000 * 60))} minutes` :
                'No active session',
            productOverrides: Object.keys(overrides).length,
            learnedProducts: Object.keys(learned).length,
            lastActivity: session?.lastUpdatedAt || 'Never'
        };
    }
}

// Create singleton instance
const workingMemory = new WorkingMemoryService();

// Export singleton
export default workingMemory;