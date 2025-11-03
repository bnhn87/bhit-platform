// Product Catalogue Service with Database Integration
import { createClient } from '@supabase/supabase-js';

interface ProductReference {
    id?: string;
    canonicalName: string;
    canonicalCode: string;
    installTimeHours: number;
    wasteVolumeM3: number;
    aliases?: string[];
    dimensionsFormat?: 'rect' | 'round';
    dimensions?: {
        l?: number;
        w?: number;
        h?: number;
        d?: number;
    };
}

interface CatalogueLookupResult {
    found: boolean;
    product?: ProductReference;
    matchedBy?: 'exact' | 'alias' | 'fuzzy';
    confidence?: number;
}

export class CatalogueService {
    private supabase: any;
    private cache: Map<string, ProductReference> = new Map();
    private lastCacheRefresh: Date = new Date(0);
    private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

    constructor() {
        // Initialize Supabase client
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        if (supabaseUrl && supabaseAnonKey) {
            this.supabase = createClient(supabaseUrl, supabaseAnonKey);
            this.refreshCache(); // Initial cache load
        }
    }

    // Normalize product code for matching
    private normalizeCode(code: string): string {
        return code.toUpperCase().replace(/[\s\-_()]+/g, '');
    }

    // Refresh the cache from database
    private async refreshCache(): Promise<void> {
        if (!this.supabase) return;

        try {
            const now = new Date();
            if (now.getTime() - this.lastCacheRefresh.getTime() < this.CACHE_TTL_MS) {
                return; // Cache is still fresh
            }

            const { data: products, error } = await this.supabase
                .from('product_catalogue_view')
                .select('*');

            if (error) {
                console.error('Failed to refresh catalogue cache:', error);
                return;
            }

            // Clear and rebuild cache
            this.cache.clear();

            products?.forEach((product: any) => {
                const ref: ProductReference = {
                    id: product.id,
                    canonicalName: product.canonical_name,
                    canonicalCode: product.canonical_code,
                    installTimeHours: product.install_time_hours,
                    wasteVolumeM3: product.waste_volume_m3,
                    aliases: product.aliases || [],
                    dimensionsFormat: product.dimensions_format,
                    dimensions: {
                        l: product.dimension_l,
                        w: product.dimension_w,
                        h: product.dimension_h,
                        d: product.dimension_d
                    }
                };

                // Add to cache with normalized canonical code
                this.cache.set(this.normalizeCode(product.canonical_code), ref);

                // Also add all aliases to cache
                product.aliases?.forEach((alias: string) => {
                    this.cache.set(this.normalizeCode(alias), ref);
                });
            });

            this.lastCacheRefresh = now;
            console.log(`Catalogue cache refreshed with ${this.cache.size} entries`);
        } catch (error) {
            console.error('Error refreshing catalogue cache:', error);
        }
    }

    // Main lookup function
    async findProduct(productCode: string): Promise<CatalogueLookupResult> {
        // Ensure cache is fresh
        await this.refreshCache();

        const normalized = this.normalizeCode(productCode);

        // 1. Try exact match from cache
        const exactMatch = this.cache.get(normalized);
        if (exactMatch) {
            return {
                found: true,
                product: exactMatch,
                matchedBy: 'exact',
                confidence: 1.0
            };
        }

        // 2. Try special patterns (like FLX-4P-2816-A)
        const flxMatch = this.matchFLXPattern(productCode);
        if (flxMatch) {
            return flxMatch;
        }

        // 3. Try fuzzy matching
        const fuzzyMatch = this.fuzzyMatch(productCode);
        if (fuzzyMatch) {
            return fuzzyMatch;
        }

        // 4. If we have a database connection, try a database search
        if (this.supabase) {
            const dbMatch = await this.databaseSearch(productCode);
            if (dbMatch) {
                return dbMatch;
            }
        }

        return { found: false };
    }

    // Special pattern matching for FLX products
    private matchFLXPattern(productCode: string): CatalogueLookupResult | null {
        const upperCode = productCode.toUpperCase();

        // Match FLX-#P-####-X format
        const flxPattern = /FLX[-_]*(\d+)P/;
        const match = upperCode.match(flxPattern);

        if (match) {
            const personCount = match[1];

            // Try various formats that might be in the catalogue
            const possibleKeys = [
                `FLX ${personCount}P`,
                `FLX-${personCount}P`,
                `${personCount}P FLX`,
                `FLX${personCount}P`
            ];

            for (const key of possibleKeys) {
                const normalized = this.normalizeCode(key);
                const product = this.cache.get(normalized);
                if (product) {
                    return {
                        found: true,
                        product,
                        matchedBy: 'alias',
                        confidence: 0.95
                    };
                }
            }
        }

        return null;
    }

    // Fuzzy matching for similar products
    private fuzzyMatch(productCode: string): CatalogueLookupResult | null {
        const normalized = this.normalizeCode(productCode);
        let bestMatch: ProductReference | null = null;
        let bestScore = 0;

        for (const [key, product] of this.cache.entries()) {
            // Calculate similarity score
            const score = this.calculateSimilarity(normalized, key);
            if (score > bestScore && score > 0.7) { // 70% similarity threshold
                bestScore = score;
                bestMatch = product;
            }
        }

        if (bestMatch) {
            return {
                found: true,
                product: bestMatch,
                matchedBy: 'fuzzy',
                confidence: bestScore
            };
        }

        return null;
    }

    // Calculate string similarity (simple Levenshtein-based)
    private calculateSimilarity(str1: string, str2: string): number {
        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;

        if (longer.length === 0) {
            return 1.0;
        }

        const editDistance = this.levenshteinDistance(longer, shorter);
        return (longer.length - editDistance) / longer.length;
    }

    // Levenshtein distance calculation
    private levenshteinDistance(str1: string, str2: string): number {
        const matrix: number[][] = [];

        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }

        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }

        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1, // substitution
                        matrix[i][j - 1] + 1,     // insertion
                        matrix[i - 1][j] + 1      // deletion
                    );
                }
            }
        }

        return matrix[str2.length][str1.length];
    }

    // Database search as fallback
    private async databaseSearch(productCode: string): Promise<CatalogueLookupResult | null> {
        if (!this.supabase) return null;

        try {
            // Use the database function for matching
            const { data, error } = await this.supabase
                .rpc('find_product_match', { search_code: productCode });

            if (error || !data) {
                return null;
            }

            // Fetch the full product details
            const { data: product, error: fetchError } = await this.supabase
                .from('product_catalogue_items')
                .select('*')
                .eq('id', data)
                .single();

            if (fetchError || !product) {
                return null;
            }

            const ref: ProductReference = {
                id: product.id,
                canonicalName: product.canonical_name,
                canonicalCode: product.canonical_code,
                installTimeHours: product.install_time_hours,
                wasteVolumeM3: product.waste_volume_m3
            };

            // Add to cache for future lookups
            this.cache.set(this.normalizeCode(productCode), ref);

            return {
                found: true,
                product: ref,
                matchedBy: 'fuzzy',
                confidence: 0.8
            };
        } catch (error) {
            console.error('Database search error:', error);
            return null;
        }
    }

    // Save a new product or update existing
    async saveProduct(
        productCode: string,
        productName: string,
        installTimeHours: number,
        wasteVolumeM3: number = 0.035,
        aliases: string[] = []
    ): Promise<boolean> {
        if (!this.supabase) {
            console.warn('No database connection for saving products');
            return false;
        }

        try {
            // First check if product exists
            const normalized = this.normalizeCode(productCode);
            const existing = this.cache.get(normalized);

            if (existing && existing.id) {
                // Update existing product
                const { error: updateError } = await this.supabase
                    .from('product_catalogue_items')
                    .update({
                        install_time_hours: installTimeHours,
                        waste_volume_m3: wasteVolumeM3,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', existing.id)
                    .eq('locked', false); // Only update if not locked

                if (updateError) {
                    console.error('Failed to update product:', updateError);
                    return false;
                }

                // Add any new aliases
                if (aliases.length > 0) {
                    await this.addAliases(existing.id, aliases);
                }
            } else {
                // Create new product
                const { data: newProduct, error: insertError } = await this.supabase
                    .from('product_catalogue_items')
                    .insert({
                        canonical_code: productCode,
                        canonical_name: productName,
                        install_time_hours: installTimeHours,
                        waste_volume_m3: wasteVolumeM3,
                        source: 'manual'
                    })
                    .select()
                    .single();

                if (insertError) {
                    console.error('Failed to create product:', insertError);
                    return false;
                }

                // Add aliases for new product
                if (aliases.length > 0 && newProduct) {
                    await this.addAliases(newProduct.id, aliases);
                }
            }

            // Refresh cache after update
            await this.refreshCache();
            return true;
        } catch (error) {
            console.error('Error saving product:', error);
            return false;
        }
    }

    // Add aliases to a product
    private async addAliases(productId: string, aliases: string[]): Promise<void> {
        if (!this.supabase) return;

        const aliasInserts = aliases.map(alias => ({
            product_id: productId,
            alias_code: alias,
            alias_type: 'code'
        }));

        const { error } = await this.supabase
            .from('product_aliases')
            .insert(aliasInserts);

        if (error && error.code !== '23505') { // Ignore duplicate key errors
            console.error('Error adding aliases:', error);
        }
    }

    // Attach an existing product code as an alias to another product
    async attachAlias(aliasCode: string, targetProductId: string): Promise<boolean> {
        if (!this.supabase) return false;

        try {
            const { error } = await this.supabase
                .from('product_aliases')
                .insert({
                    product_id: targetProductId,
                    alias_code: aliasCode,
                    alias_type: 'code'
                });

            if (error && error.code !== '23505') { // Ignore if already exists
                console.error('Failed to attach alias:', error);
                return false;
            }

            // Refresh cache
            await this.refreshCache();
            return true;
        } catch (error) {
            console.error('Error attaching alias:', error);
            return false;
        }
    }

    // Get all products for display
    async getAllProducts(): Promise<ProductReference[]> {
        await this.refreshCache();

        // Return unique products (not duplicates from aliases)
        const uniqueProducts = new Map<string, ProductReference>();

        for (const product of this.cache.values()) {
            if (!uniqueProducts.has(product.canonicalCode)) {
                uniqueProducts.set(product.canonicalCode, product);
            }
        }

        return Array.from(uniqueProducts.values());
    }
}

// Export singleton instance
export const catalogueService = new CatalogueService();