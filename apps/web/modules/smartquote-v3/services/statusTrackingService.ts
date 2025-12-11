// ============================================================================
// SmartQuote v3 - Status Tracking Service
// ============================================================================

import { supabase } from '../../../lib/supabaseClient';
import { QuoteStatus, Quote } from '../types';

import { notificationService } from './notificationService';

class StatusTrackingService {
    /**
     * Valid status transitions
     */
    private readonly validTransitions: Record<QuoteStatus, QuoteStatus[]> = {
        [QuoteStatus.DRAFT]: [
            QuoteStatus.PENDING_INTERNAL,
            QuoteStatus.CANCELLED,
        ],
        [QuoteStatus.PENDING_INTERNAL]: [
            QuoteStatus.APPROVED_INTERNAL,
            QuoteStatus.DRAFT, // Rejected, back to draft
            QuoteStatus.CANCELLED,
        ],
        [QuoteStatus.APPROVED_INTERNAL]: [
            QuoteStatus.PENDING_CLIENT,
            QuoteStatus.SENT,
            QuoteStatus.DRAFT, // If needs changes
            QuoteStatus.CANCELLED,
        ],
        [QuoteStatus.PENDING_CLIENT]: [
            QuoteStatus.SENT,
            QuoteStatus.NEGOTIATING,
            QuoteStatus.DRAFT,
            QuoteStatus.CANCELLED,
        ],
        [QuoteStatus.SENT]: [
            QuoteStatus.NEGOTIATING,
            QuoteStatus.WON,
            QuoteStatus.LOST,
            QuoteStatus.EXPIRED,
            QuoteStatus.CANCELLED,
        ],
        [QuoteStatus.NEGOTIATING]: [
            QuoteStatus.SENT,
            QuoteStatus.WON,
            QuoteStatus.LOST,
            QuoteStatus.CANCELLED,
        ],
        [QuoteStatus.WON]: [],
        [QuoteStatus.LOST]: [],
        [QuoteStatus.EXPIRED]: [
            QuoteStatus.DRAFT, // Can revive
        ],
        [QuoteStatus.CANCELLED]: [],
    };

    /**
     * Update quote status
     */
    async updateStatus(
        quoteId: string,
        newStatus: QuoteStatus,
        notes?: string
    ): Promise<{ success: boolean; error?: string }> {
        try {
            const { data: user } = await supabase.auth.getUser();
            const userId = user?.user?.id;

            if (!userId) {
                return { success: false, error: 'User not authenticated' };
            }

            // Get current quote
            const { data: quote, error: quoteError } = await supabase
                .from('smartquote_v3_quotes')
                .select('*')
                .eq('id', quoteId)
                .single();

            if (quoteError || !quote) {
                return { success: false, error: 'Quote not found' };
            }

            const currentStatus = quote.status as QuoteStatus;

            // Validate transition
            if (!this.canTransitionTo(currentStatus, newStatus)) {
                return {
                    success: false,
                    error: `Cannot transition from ${currentStatus} to ${newStatus}`,
                };
            }

            // Update quote status
            const { error: updateError } = await supabase
                .from('smartquote_v3_quotes')
                .update({
                    status: newStatus,
                    status_updated_at: new Date().toISOString(),
                    status_updated_by: userId,
                })
                .eq('id', quoteId);

            if (updateError) throw updateError;

            // Record analytics event
            await supabase.from('smartquote_v3_analytics_events').insert({
                event_type: 'status_change',
                quote_id: quoteId,
                user_id: userId,
                event_data: {
                    old_status: currentStatus,
                    new_status: newStatus,
                    notes,
                },
            });

            // Send notification if status changed by someone else
            if (quote.created_by && quote.created_by !== userId) {
                await notificationService.sendStatusChange(
                    quoteId,
                    quote.created_by,
                    currentStatus,
                    newStatus
                );
            }

            return { success: true };
        } catch (error) {
            console.error('Failed to update status:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to update status',
            };
        }
    }

    /**
     * Check if status transition is valid
     */
    canTransitionTo(currentStatus: QuoteStatus, newStatus: QuoteStatus): boolean {
        const allowedTransitions = this.validTransitions[currentStatus];
        return allowedTransitions.includes(newStatus);
    }

    /**
     * Get allowed transitions for current status
     */
    getAllowedTransitions(currentStatus: QuoteStatus): QuoteStatus[] {
        return this.validTransitions[currentStatus] || [];
    }

    /**
     * Mark quote as won
     */
    async markAsWon(
        quoteId: string,
        wonAmount?: number
    ): Promise<{ success: boolean; error?: string }> {
        try {
            const { data: user } = await supabase.auth.getUser();
            const userId = user?.user?.id;

            const { data: quote } = await supabase
                .from('smartquote_v3_quotes')
                .select('total_amount, created_by')
                .eq('id', quoteId)
                .single();

            if (!quote) {
                return { success: false, error: 'Quote not found' };
            }

            const { error: updateError } = await supabase
                .from('smartquote_v3_quotes')
                .update({
                    status: QuoteStatus.WON,
                    outcome: 'won',
                    outcome_date: new Date().toISOString(),
                    won_amount: wonAmount || quote.total_amount,
                    status_updated_at: new Date().toISOString(),
                    status_updated_by: userId,
                })
                .eq('id', quoteId);

            if (updateError) throw updateError;

            // Send win notification
            if (quote.created_by) {
                await notificationService.sendQuoteWon(
                    quoteId,
                    quote.created_by,
                    wonAmount || quote.total_amount
                );
            }

            // Record analytics
            await supabase.from('smartquote_v3_analytics_events').insert({
                event_type: 'quote_won',
                quote_id: quoteId,
                user_id: userId,
                event_data: {
                    won_amount: wonAmount || quote.total_amount,
                },
            });

            return { success: true };
        } catch (error) {
            console.error('Failed to mark as won:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to mark as won',
            };
        }
    }

    /**
     * Mark quote as lost
     */
    async markAsLost(
        quoteId: string,
        reason?: string,
        reasonCategory?: string
    ): Promise<{ success: boolean; error?: string }> {
        try {
            const { data: user } = await supabase.auth.getUser();
            const userId = user?.user?.id;

            const { data: quote } = await supabase
                .from('smartquote_v3_quotes')
                .select('created_by')
                .eq('id', quoteId)
                .single();

            if (!quote) {
                return { success: false, error: 'Quote not found' };
            }

            const { error: updateError } = await supabase
                .from('smartquote_v3_quotes')
                .update({
                    status: QuoteStatus.LOST,
                    outcome: 'lost',
                    outcome_date: new Date().toISOString(),
                    lost_reason: reason,
                    lost_reason_category: reasonCategory,
                    status_updated_at: new Date().toISOString(),
                    status_updated_by: userId,
                })
                .eq('id', quoteId);

            if (updateError) throw updateError;

            // Send lost notification
            if (quote.created_by) {
                await notificationService.sendQuoteLost(
                    quoteId,
                    quote.created_by,
                    reason
                );
            }

            // Record analytics
            await supabase.from('smartquote_v3_analytics_events').insert({
                event_type: 'quote_lost',
                quote_id: quoteId,
                user_id: userId,
                event_data: {
                    reason,
                    reason_category: reasonCategory,
                },
            });

            return { success: true };
        } catch (error) {
            console.error('Failed to mark as lost:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to mark as lost',
            };
        }
    }

    /**
     * Get status history for a quote
     */
    async getStatusHistory(quoteId: string): Promise<any[]> {
        try {
            const { data, error } = await supabase
                .from('smartquote_v3_analytics_events')
                .select('*')
                .eq('quote_id', quoteId)
                .eq('event_type', 'status_change')
                .order('created_at', { ascending: false });

            if (error) throw error;

            return data || [];
        } catch (error) {
            console.error('Failed to get status history:', error);
            return [];
        }
    }

    /**
     * Get quotes by status
     */
    async getQuotesByStatus(status: QuoteStatus, limit: number = 50): Promise<Quote[]> {
        try {
            const { data, error } = await supabase
                .from('smartquote_v3_quotes')
                .select('*')
                .eq('status', status)
                .is('deleted_at', null)
                .order('created_at', { ascending: false })
                .limit(limit);

            if (error) throw error;

            return data as Quote[];
        } catch (error) {
            console.error('Failed to get quotes by status:', error);
            return [];
        }
    }

    /**
     * Get quote pipeline (counts by status)
     */
    async getQuotePipeline(): Promise<Record<QuoteStatus, number>> {
        try {
            const { data, error } = await supabase
                .from('smartquote_v3_quotes')
                .select('status')
                .is('deleted_at', null);

            if (error) throw error;

            // Count by status
            const pipeline: Record<string, number> = {};

            for (const status of Object.values(QuoteStatus)) {
                pipeline[status] = 0;
            }

            data.forEach((quote) => {
                if (quote.status) {
                    pipeline[quote.status] = (pipeline[quote.status] || 0) + 1;
                }
            });

            return pipeline as Record<QuoteStatus, number>;
        } catch (error) {
            console.error('Failed to get quote pipeline:', error);
            return {} as Record<QuoteStatus, number>;
        }
    }

    /**
     * Get expiring quotes (within X days)
     */
    async getExpiringQuotes(daysUntilExpiry: number = 7): Promise<Quote[]> {
        try {
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + daysUntilExpiry);

            const { data, error } = await supabase
                .from('smartquote_v3_quotes')
                .select('*')
                .in('status', [QuoteStatus.SENT, QuoteStatus.NEGOTIATING])
                .not('expires_at', 'is', null)
                .lte('expires_at', futureDate.toISOString())
                .is('deleted_at', null);

            if (error) throw error;

            return data as Quote[];
        } catch (error) {
            console.error('Failed to get expiring quotes:', error);
            return [];
        }
    }
}

export const statusTrackingService = new StatusTrackingService();
