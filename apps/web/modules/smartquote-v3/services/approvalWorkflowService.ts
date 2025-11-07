// ============================================================================
// SmartQuote v3 - Approval Workflow Service
// ============================================================================

import { supabase } from '../../../lib/supabaseClient';
import {
    Quote,
    ApprovalHistory,
    ApprovalAction,
    ApprovalRule,
    QuoteStatus,
    ChangeRequest,
} from '../types';
import { notificationService } from './notificationService';
import { statusTrackingService } from './statusTrackingService';

class ApprovalWorkflowService {
    /**
     * Request approval for a quote
     */
    async requestApproval(
        quoteId: string,
        approverIds: string[],
        notes?: string
    ): Promise<{ success: boolean; error?: string }> {
        try {
            // Update quote status
            const { error: quoteError } = await supabase
                .from('smartquote_v3_quotes')
                .update({
                    status: QuoteStatus.PENDING_INTERNAL,
                    status_updated_at: new Date().toISOString(),
                })
                .eq('id', quoteId);

            if (quoteError) throw quoteError;

            // Create approval history record
            const { data: user } = await supabase.auth.getUser();
            const userId = user?.user?.id;

            await supabase.from('smartquote_v3_approval_history').insert({
                quote_id: quoteId,
                action: 'requested_changes',
                previous_status: QuoteStatus.DRAFT,
                new_status: QuoteStatus.PENDING_INTERNAL,
                notes,
                performed_by: userId,
            });

            // Send notifications to approvers
            for (const approverId of approverIds) {
                await notificationService.sendApprovalRequest(quoteId, approverId, notes);
            }

            return { success: true };
        } catch (error) {
            console.error('Failed to request approval:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to request approval',
            };
        }
    }

    /**
     * Approve a quote
     */
    async approve(
        quoteId: string,
        notes?: string,
        conditions?: string
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

            const previousStatus = quote.status;
            const newStatus = QuoteStatus.APPROVED_INTERNAL;

            // Update quote
            const { error: updateError } = await supabase
                .from('smartquote_v3_quotes')
                .update({
                    status: newStatus,
                    approved_by: userId,
                    approved_at: new Date().toISOString(),
                    approval_notes: notes,
                    approval_conditions: conditions,
                    status_updated_at: new Date().toISOString(),
                    status_updated_by: userId,
                })
                .eq('id', quoteId);

            if (updateError) throw updateError;

            // Create approval history
            await supabase.from('smartquote_v3_approval_history').insert({
                quote_id: quoteId,
                action: conditions ? ApprovalAction.CONDITIONAL_APPROVAL : ApprovalAction.APPROVED,
                previous_status: previousStatus,
                new_status: newStatus,
                notes,
                conditions,
                performed_by: userId,
            });

            // Notify quote creator
            if (quote.created_by && quote.created_by !== userId) {
                await notificationService.sendApprovalApproved(quoteId, quote.created_by, notes);
            }

            return { success: true };
        } catch (error) {
            console.error('Failed to approve quote:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to approve quote',
            };
        }
    }

    /**
     * Reject a quote
     */
    async reject(
        quoteId: string,
        reason: string
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

            const previousStatus = quote.status;

            // Update quote back to draft
            const { error: updateError } = await supabase
                .from('smartquote_v3_quotes')
                .update({
                    status: QuoteStatus.DRAFT,
                    status_updated_at: new Date().toISOString(),
                    status_updated_by: userId,
                })
                .eq('id', quoteId);

            if (updateError) throw updateError;

            // Create approval history
            await supabase.from('smartquote_v3_approval_history').insert({
                quote_id: quoteId,
                action: ApprovalAction.REJECTED,
                previous_status: previousStatus,
                new_status: QuoteStatus.DRAFT,
                notes: reason,
                performed_by: userId,
            });

            // Notify quote creator
            if (quote.created_by && quote.created_by !== userId) {
                await notificationService.sendApprovalRejected(quoteId, quote.created_by, reason);
            }

            return { success: true };
        } catch (error) {
            console.error('Failed to reject quote:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to reject quote',
            };
        }
    }

    /**
     * Request changes to a quote
     */
    async requestChanges(
        quoteId: string,
        changes: ChangeRequest[],
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

            const previousStatus = quote.status;

            // Update quote back to draft
            const { error: updateError } = await supabase
                .from('smartquote_v3_quotes')
                .update({
                    status: QuoteStatus.DRAFT,
                    status_updated_at: new Date().toISOString(),
                    status_updated_by: userId,
                })
                .eq('id', quoteId);

            if (updateError) throw updateError;

            // Create approval history with change requests
            await supabase.from('smartquote_v3_approval_history').insert({
                quote_id: quoteId,
                action: ApprovalAction.REQUESTED_CHANGES,
                previous_status: previousStatus,
                new_status: QuoteStatus.DRAFT,
                notes,
                changes_requested: changes,
                performed_by: userId,
            });

            // Notify quote creator
            if (quote.created_by && quote.created_by !== userId) {
                await notificationService.sendChangeRequested(quoteId, quote.created_by, changes, notes);
            }

            return { success: true };
        } catch (error) {
            console.error('Failed to request changes:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to request changes',
            };
        }
    }

    /**
     * Check if quote qualifies for auto-approval
     */
    async checkAutoApproval(quoteId: string): Promise<{
        autoApprove: boolean;
        rule?: ApprovalRule;
        reason?: string;
    }> {
        try {
            // Get quote
            const { data: quote, error: quoteError } = await supabase
                .from('smartquote_v3_quotes')
                .select('total_amount, created_by')
                .eq('id', quoteId)
                .single();

            if (quoteError || !quote) {
                return { autoApprove: false, reason: 'Quote not found' };
            }

            // Get active approval rules
            const { data: rules, error: rulesError } = await supabase
                .from('smartquote_v3_approval_rules')
                .select('*')
                .eq('is_active', true)
                .order('priority', { ascending: true });

            if (rulesError || !rules) {
                return { autoApprove: false, reason: 'Failed to load approval rules' };
            }

            // Check each rule
            for (const rule of rules) {
                // Check amount threshold
                if (rule.auto_approve_under_amount && quote.total_amount < rule.auto_approve_under_amount) {
                    // Auto-approve
                    await this.approve(
                        quoteId,
                        `Auto-approved under ${rule.name} (amount: £${quote.total_amount} < £${rule.auto_approve_under_amount})`
                    );

                    return {
                        autoApprove: true,
                        rule,
                        reason: `Amount under threshold (£${rule.auto_approve_under_amount})`,
                    };
                }
            }

            return { autoApprove: false, reason: 'No auto-approval rules matched' };
        } catch (error) {
            console.error('Failed to check auto-approval:', error);
            return {
                autoApprove: false,
                reason: error instanceof Error ? error.message : 'Failed to check auto-approval',
            };
        }
    }

    /**
     * Get approval history for a quote
     */
    async getApprovalHistory(quoteId: string): Promise<ApprovalHistory[]> {
        try {
            const { data, error } = await supabase
                .from('smartquote_v3_approval_history')
                .select('*')
                .eq('quote_id', quoteId)
                .order('performed_at', { ascending: false });

            if (error) throw error;

            return data as ApprovalHistory[];
        } catch (error) {
            console.error('Failed to get approval history:', error);
            return [];
        }
    }

    /**
     * Get pending approvals for a user
     */
    async getPendingApprovals(userId: string): Promise<Quote[]> {
        try {
            // Get quotes pending approval
            const { data, error } = await supabase
                .from('smartquote_v3_quotes')
                .select('*')
                .in('status', [QuoteStatus.PENDING_INTERNAL, QuoteStatus.PENDING_CLIENT])
                .eq('requires_approval', true)
                .is('deleted_at', null)
                .order('created_at', { ascending: false });

            if (error) throw error;

            // TODO: Filter by user permissions/roles
            // For now, return all pending approvals

            return data as Quote[];
        } catch (error) {
            console.error('Failed to get pending approvals:', error);
            return [];
        }
    }

    /**
     * Get approval rules
     */
    async getApprovalRules(): Promise<ApprovalRule[]> {
        try {
            const { data, error } = await supabase
                .from('smartquote_v3_approval_rules')
                .select('*')
                .eq('is_active', true)
                .order('priority', { ascending: true });

            if (error) throw error;

            return data as ApprovalRule[];
        } catch (error) {
            console.error('Failed to get approval rules:', error);
            return [];
        }
    }

    /**
     * Create or update approval rule
     */
    async saveApprovalRule(rule: Partial<ApprovalRule>): Promise<{ success: boolean; data?: ApprovalRule; error?: string }> {
        try {
            const { data: user } = await supabase.auth.getUser();
            const userId = user?.user?.id;

            if (rule.id) {
                // Update existing
                const { data, error } = await supabase
                    .from('smartquote_v3_approval_rules')
                    .update(rule)
                    .eq('id', rule.id)
                    .select()
                    .single();

                if (error) throw error;
                return { success: true, data: data as ApprovalRule };
            } else {
                // Create new
                const { data, error } = await supabase
                    .from('smartquote_v3_approval_rules')
                    .insert({ ...rule, created_by: userId })
                    .select()
                    .single();

                if (error) throw error;
                return { success: true, data: data as ApprovalRule };
            }
        } catch (error) {
            console.error('Failed to save approval rule:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to save approval rule',
            };
        }
    }
}

export const approvalWorkflowService = new ApprovalWorkflowService();
