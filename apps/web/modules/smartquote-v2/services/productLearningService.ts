// ========================================
// SmartQuote v2.0 - Product Learning Service
// ========================================
// Features:
// - Track product selection patterns
// - Detect frequently paired products
// - Learn from time adjustments
// - Provide intelligent suggestions

import { supabase } from '../../../lib/supabaseClient';
import {
    ProductSelection,
    ProductSuggestion,
    ProductTimeAdjustment,
    LearnedProductTime,
    ProductLearningService as IProductLearningService
} from '../types';

class ProductLearningService implements IProductLearningService {
    
    // Record a product selection
    async recordSelection(
        quoteId: string,
        productCode: string,
        quantity: number,
        selectedWith: string[]
    ): Promise<void> {
        try {
            // Insert selection record
            await supabase
                .from('smartquote_v2_product_selections')
                .insert({
                    quote_id: quoteId,
                    product_code: productCode,
                    quantity,
                    selected_with: selectedWith,
                    user_id: (await supabase.auth.getUser()).data.user?.id
                });
            
            // Update co-occurrence data
            await this.updateCoOccurrence(productCode, selectedWith);
            
        } catch (error) {
            console.error('Failed to record product selection:', error);
        }
    }
    
    // Update co-occurrence counts
    private async updateCoOccurrence(
        productCode: string,
        selectedWith: string[]
    ): Promise<void> {
        if (selectedWith.length === 0) return;
        
        try {
            // Call database function to update similarities
            await supabase
                .rpc('smartquote_v2_update_product_cooccurrence', {
                    product_codes: [productCode, ...selectedWith]
                });
        } catch (error) {
            console.error('Failed to update co-occurrence:', error);
        }
    }
    
    // Get product suggestions based on current selection
    async getSuggestions(productCodes: string[]): Promise<ProductSuggestion[]> {
        try {
            const { data, error } = await supabase
                .rpc('smartquote_v2_get_product_suggestions', {
                    input_product_codes: productCodes
                });
            
            if (error) throw error;
            
            return (data || []).map((item: any) => ({
                productCode: item.product_code,
                productName: item.product_name,
                similarityScore: item.similarity_score,
                coOccurrenceCount: item.co_occurrence_count,
                reason: 'frequently_paired' as const
            }));
            
        } catch (error) {
            console.error('Failed to get suggestions:', error);
            return [];
        }
    }
    
    // Record a time adjustment for learning
    async recordTimeAdjustment(
        productCode: string,
        originalTime: number,
        adjustedTime: number,
        context?: any
    ): Promise<void> {
        try {
            const adjustmentFactor = adjustedTime / originalTime;
            
            await supabase
                .from('smartquote_v2_product_time_adjustments')
                .insert({
                    product_code: productCode,
                    original_time: originalTime,
                    adjusted_time: adjustedTime,
                    adjustment_factor: adjustmentFactor,
                    context: context || {},
                    created_by: (await supabase.auth.getUser()).data.user?.id
                });
            
            // Trigger recalculation of learned times
            await this.recalculateLearnedTimes(productCode);
            
        } catch (error) {
            console.error('Failed to record time adjustment:', error);
        }
    }
    
    // Recalculate learned times based on adjustments
    private async recalculateLearnedTimes(productCode: string): Promise<void> {
        try {
            // Get all adjustments for this product
            const { data: adjustments } = await supabase
                .from('smartquote_v2_product_time_adjustments')
                .select('adjusted_time')
                .eq('product_code', productCode)
                .order('created_at', { ascending: false })
                .limit(50); // Use last 50 adjustments
            
            if (!adjustments || adjustments.length === 0) return;
            
            const times = adjustments.map(a => a.adjusted_time);
            const avg = times.reduce((sum, t) => sum + t, 0) / times.length;
            const sortedTimes = [...times].sort((a, b) => a - b);
            const median = sortedTimes[Math.floor(sortedTimes.length / 2)];
            
            // Calculate standard deviation
            const variance = times.reduce((sum, t) => sum + Math.pow(t - avg, 2), 0) / times.length;
            const stdDev = Math.sqrt(variance);
            
            // Calculate confidence (higher sample size and lower std dev = higher confidence)
            const sampleConfidence = Math.min(times.length / 50, 1); // Max at 50 samples
            const consistencyConfidence = Math.max(1 - (stdDev / avg), 0); // Lower variance = higher confidence
            const confidence = (sampleConfidence * 0.6 + consistencyConfidence * 0.4);
            
            // Upsert learned time
            await supabase
                .from('smartquote_v2_product_learned_times')
                .upsert({
                    product_code: productCode,
                    avg_time_hours: avg,
                    median_time_hours: median,
                    std_dev: stdDev,
                    sample_count: times.length,
                    confidence_level: confidence,
                    last_updated: new Date().toISOString()
                });
            
        } catch (error) {
            console.error('Failed to recalculate learned times:', error);
        }
    }
    
    // Get learned time for a product
    async getLearnedTime(productCode: string): Promise<LearnedProductTime | null> {
        try {
            const { data, error } = await supabase
                .from('smartquote_v2_product_learned_times')
                .select('*')
                .eq('product_code', productCode)
                .single();
            
            if (error || !data) return null;
            
            return {
                productCode: data.product_code,
                avgTimeHours: data.avg_time_hours,
                medianTimeHours: data.median_time_hours,
                stdDev: data.std_dev,
                sampleCount: data.sample_count,
                confidenceLevel: data.confidence_level,
                lastUpdated: data.last_updated
            };
            
        } catch (error) {
            console.error('Failed to get learned time:', error);
            return null;
        }
    }
    
    // Get all learned times above a confidence threshold
    async getHighConfidenceLearnedTimes(minConfidence: number = 0.7): Promise<LearnedProductTime[]> {
        try {
            const { data, error } = await supabase
                .from('smartquote_v2_product_learned_times')
                .select('*')
                .gte('confidence_level', minConfidence)
                .order('confidence_level', { ascending: false });
            
            if (error || !data) return [];
            
            return data.map((item: any) => ({
                productCode: item.product_code,
                avgTimeHours: item.avg_time_hours,
                medianTimeHours: item.median_time_hours,
                stdDev: item.std_dev,
                sampleCount: item.sample_count,
                confidenceLevel: item.confidence_level,
                lastUpdated: item.last_updated
            }));
            
        } catch (error) {
            console.error('Failed to get high confidence times:', error);
            return [];
        }
    }
}

export const productLearningService = new ProductLearningService();
