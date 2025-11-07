// ========================================
// SmartQuote v2.0 - Analytics Service
// ========================================

import { supabase } from '../../../lib/supabaseClient';
import { ParseAnalytics } from '../types';

class AnalyticsService {
    
    async recordParseAnalytics(
        quoteId: string | undefined,
        metrics: Partial<ParseAnalytics>
    ): Promise<void> {
        try {
            await supabase
                .from('smartquote_v2_parse_analytics')
                .insert({
                    quote_id: quoteId,
                    ...metrics
                });
        } catch (error: unknown) {
            console.error('Failed to record analytics:', error);
        }
    }

    async getAverageConfidence(): Promise<number> {
        try {
            const { data } = await supabase
                .from('smartquote_v2_parse_analytics')
                .select('avg_confidence_score');
            
            if (!data || data.length === 0) return 0;
            
            const avg = data.reduce((sum, item) => 
                sum + (item.avg_confidence_score || 0), 0) / data.length;
            return Math.round(avg * 100);
        } catch (error: unknown) {
            return 0;
        }
    }
}

export default new AnalyticsService();
