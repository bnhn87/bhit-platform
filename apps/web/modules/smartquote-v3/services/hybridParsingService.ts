// ============================================================================
// SmartQuote v3 - Hybrid Parsing Service
// ============================================================================
// Combines v1 (fast single-pass) + v2 (accurate multi-pass) approaches

import { ParseContent, ParsedProduct, QuoteDetails, EnhancedParseResult } from '../types';

// Import v1 parser
import { parseQuoteContent as parseV1 } from '../../smartquote/services/geminiService';

// Import v2 parser
import { parseQuoteContentEnhanced as parseV2 } from '../../smartquote-v2/services/enhancedGeminiService';

interface HybridParseOptions {
    // Performance mode
    fast?: boolean; // If true, use v1 only
    accurate?: boolean; // If true, use v2 only
    timeout?: number; // Max time in ms

    // Quality thresholds
    minConfidence?: number; // Min confidence to accept
    maxRetries?: number; // Max v2 retries

    // Caching
    useCache?: boolean;
}

interface HybridParseResult extends EnhancedParseResult {
    method: 'v1_fast' | 'v2_accurate' | 'v2_fallback_v1';
    cacheDuration?: number;
}

class HybridParsingService {
    private parseCache = new Map<string, { result: HybridParseResult; timestamp: number }>();
    private readonly CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

    /**
     * Parse quote using hybrid approach
     */
    async parseQuote(
        content: ParseContent,
        options: HybridParseOptions = {}
    ): Promise<HybridParseResult> {
        const startTime = Date.now();

        // Check cache
        if (options.useCache !== false) {
            const cached = this.checkCache(content);
            if (cached) {
                return {
                    ...cached.result,
                    cacheDuration: Date.now() - cached.timestamp,
                };
            }
        }

        try {
            // Fast mode: v1 only
            if (options.fast) {
                return await this.parseWithV1(content, startTime);
            }

            // Accurate mode: v2 only
            if (options.accurate) {
                return await this.parseWithV2(content, options, startTime);
            }

            // Hybrid mode (default): Try v2, fallback to v1 if timeout/error
            return await this.parseHybrid(content, options, startTime);
        } catch (error) {
            console.error('Hybrid parsing failed:', error);

            // Final fallback: v1
            return await this.parseWithV1(content, startTime);
        }
    }

    /**
     * Parse with v1 (fast single-pass)
     */
    private async parseWithV1(content: ParseContent, startTime: number): Promise<HybridParseResult> {
        try {
            const result = await parseV1(content);

            const enhancedResult: HybridParseResult = {
                products: result.products.map((p) => ({
                    ...p,
                    confidence: 75, // v1 doesn't have confidence, assume 75%
                })),
                details: result.details,
                confidenceScore: 75,
                warnings: ['Parsed with v1 (fast mode) - confidence scores estimated'],
                parseMethod: 'v1_fast',
                attempts: 1,
                durationMs: Date.now() - startTime,
                method: 'v1_fast',
            };

            // Cache result
            this.cacheResult(content, enhancedResult);

            return enhancedResult;
        } catch (error) {
            throw new Error(`V1 parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Parse with v2 (accurate multi-pass)
     */
    private async parseWithV2(
        content: ParseContent,
        options: HybridParseOptions,
        startTime: number
    ): Promise<HybridParseResult> {
        try {
            const result = await parseV2(content, {
                maxRetries: options.maxRetries || 3,
                minConfidence: options.minConfidence || 0.5,
                includeLowConfidence: true,
            });

            const enhancedResult: HybridParseResult = {
                ...result,
                durationMs: Date.now() - startTime,
                method: 'v2_accurate',
            };

            // Cache result
            this.cacheResult(content, enhancedResult);

            return enhancedResult;
        } catch (error) {
            throw new Error(`V2 parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Hybrid approach: Try v2 with timeout, fallback to v1
     */
    private async parseHybrid(
        content: ParseContent,
        options: HybridParseOptions,
        startTime: number
    ): Promise<HybridParseResult> {
        const timeout = options.timeout || 10000; // 10 seconds default

        try {
            // Try v2 with timeout
            const v2Result = await Promise.race([
                this.parseWithV2(content, options, startTime),
                new Promise<never>((_, reject) =>
                    setTimeout(() => reject(new Error('V2 parsing timeout')), timeout)
                ),
            ]);

            // Check if result meets quality threshold
            const minConfidence = options.minConfidence || 70;
            if (v2Result.confidenceScore >= minConfidence) {
                return v2Result;
            }

            // Low confidence - fallback to v1
            console.warn(
                `V2 confidence too low (${v2Result.confidenceScore}%), falling back to v1`
            );

            const v1Result = await this.parseWithV1(content, startTime);

            // Merge results: use v2 data but add v1 warning
            return {
                ...v2Result,
                warnings: [
                    ...(v2Result.warnings || []),
                    `V2 confidence low (${v2Result.confidenceScore}%), verified with v1`,
                ],
                method: 'v2_fallback_v1',
            };
        } catch (error) {
            // V2 failed or timed out - use v1
            console.warn('V2 parsing failed/timeout, using v1:', error);

            const v1Result = await this.parseWithV1(content, startTime);

            return {
                ...v1Result,
                warnings: [
                    ...(v1Result.warnings || []),
                    `V2 parsing unavailable, used v1 fallback: ${error instanceof Error ? error.message : 'Unknown error'}`,
                ],
                method: 'v2_fallback_v1',
            };
        }
    }

    /**
     * Check cache for existing parse
     */
    private checkCache(content: ParseContent): { result: HybridParseResult; timestamp: number } | null {
        const hash = this.hashContent(content);
        const cached = this.parseCache.get(hash);

        if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
            return cached;
        }

        // Expired or missing
        if (cached) {
            this.parseCache.delete(hash);
        }

        return null;
    }

    /**
     * Cache parse result
     */
    private cacheResult(content: ParseContent, result: HybridParseResult): void {
        const hash = this.hashContent(content);

        // Limit cache size to 100 entries (LRU)
        if (this.parseCache.size >= 100) {
            const firstKey = this.parseCache.keys().next().value;
            this.parseCache.delete(firstKey);
        }

        this.parseCache.set(hash, {
            result,
            timestamp: Date.now(),
        });
    }

    /**
     * Hash content for caching
     */
    private hashContent(content: ParseContent): string {
        const str = JSON.stringify(content);
        let hash = 0;

        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = (hash << 5) - hash + char;
            hash = hash & hash; // Convert to 32bit integer
        }

        return hash.toString(36);
    }

    /**
     * Clear cache
     */
    clearCache(): void {
        this.parseCache.clear();
    }

    /**
     * Get cache stats
     */
    getCacheStats(): {
        size: number;
        maxSize: number;
        hitRate?: number;
    } {
        return {
            size: this.parseCache.size,
            maxSize: 100,
        };
    }
}

export const hybridParsingService = new HybridParsingService();
