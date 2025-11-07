// ============================================================================
// SmartQuote v3 - Notification Service
// ============================================================================

import { supabase } from '../../../lib/supabaseClient';
import {
    Notification,
    NotificationType,
    NotificationPriority,
    ChangeRequest,
} from '../types';

class NotificationService {
    /**
     * Send approval request notification
     */
    async sendApprovalRequest(
        quoteId: string,
        approverId: string,
        notes?: string
    ): Promise<void> {
        try {
            // Get quote details
            const { data: quote } = await supabase
                .from('smartquote_v3_quotes')
                .select('quote_ref, client_name, total_amount')
                .eq('id', quoteId)
                .single();

            if (!quote) return;

            await this.createNotification({
                userId: approverId,
                type: NotificationType.APPROVAL_REQUEST,
                title: `Approval requested: ${quote.quote_ref}`,
                message: `${quote.client_name} - £${quote.total_amount.toLocaleString()}${notes ? `\n${notes}` : ''}`,
                quoteId,
                actionUrl: `/smartquote-v3/${quoteId}`,
                actionLabel: 'Review Quote',
                priority: NotificationPriority.HIGH,
            });
        } catch (error) {
            console.error('Failed to send approval request notification:', error);
        }
    }

    /**
     * Send approval approved notification
     */
    async sendApprovalApproved(
        quoteId: string,
        userId: string,
        notes?: string
    ): Promise<void> {
        try {
            const { data: quote } = await supabase
                .from('smartquote_v3_quotes')
                .select('quote_ref')
                .eq('id', quoteId)
                .single();

            if (!quote) return;

            await this.createNotification({
                userId,
                type: NotificationType.APPROVAL_APPROVED,
                title: `Quote approved: ${quote.quote_ref}`,
                message: notes || 'Your quote has been approved',
                quoteId,
                actionUrl: `/smartquote-v3/${quoteId}`,
                priority: NotificationPriority.NORMAL,
            });
        } catch (error) {
            console.error('Failed to send approval approved notification:', error);
        }
    }

    /**
     * Send approval rejected notification
     */
    async sendApprovalRejected(
        quoteId: string,
        userId: string,
        reason: string
    ): Promise<void> {
        try {
            const { data: quote } = await supabase
                .from('smartquote_v3_quotes')
                .select('quote_ref')
                .eq('id', quoteId)
                .single();

            if (!quote) return;

            await this.createNotification({
                userId,
                type: NotificationType.APPROVAL_REJECTED,
                title: `Quote rejected: ${quote.quote_ref}`,
                message: reason,
                quoteId,
                actionUrl: `/smartquote-v3/${quoteId}`,
                priority: NotificationPriority.HIGH,
            });
        } catch (error) {
            console.error('Failed to send approval rejected notification:', error);
        }
    }

    /**
     * Send change requested notification
     */
    async sendChangeRequested(
        quoteId: string,
        userId: string,
        changes: ChangeRequest[],
        notes?: string
    ): Promise<void> {
        try {
            const { data: quote } = await supabase
                .from('smartquote_v3_quotes')
                .select('quote_ref')
                .eq('id', quoteId)
                .single();

            if (!quote) return;

            const changeCount = changes.length;
            const message = `${changeCount} change${changeCount > 1 ? 's' : ''} requested${notes ? `\n${notes}` : ''}`;

            await this.createNotification({
                userId,
                type: NotificationType.CHANGE_REQUESTED,
                title: `Changes requested: ${quote.quote_ref}`,
                message,
                quoteId,
                actionUrl: `/smartquote-v3/${quoteId}`,
                priority: NotificationPriority.HIGH,
            });
        } catch (error) {
            console.error('Failed to send change requested notification:', error);
        }
    }

    /**
     * Send comment mention notification
     */
    async sendMention(
        quoteId: string,
        commentId: string,
        mentionedUserId: string,
        commentText: string,
        authorName: string
    ): Promise<void> {
        try {
            const { data: quote } = await supabase
                .from('smartquote_v3_quotes')
                .select('quote_ref')
                .eq('id', quoteId)
                .single();

            if (!quote) return;

            await this.createNotification({
                userId: mentionedUserId,
                type: NotificationType.COMMENT_MENTION,
                title: `${authorName} mentioned you`,
                message: commentText.substring(0, 200),
                quoteId,
                commentId,
                actionUrl: `/smartquote-v3/${quoteId}#comment-${commentId}`,
                priority: NotificationPriority.NORMAL,
            });
        } catch (error) {
            console.error('Failed to send mention notification:', error);
        }
    }

    /**
     * Send status change notification
     */
    async sendStatusChange(
        quoteId: string,
        userId: string,
        oldStatus: string,
        newStatus: string
    ): Promise<void> {
        try {
            const { data: quote } = await supabase
                .from('smartquote_v3_quotes')
                .select('quote_ref')
                .eq('id', quoteId)
                .single();

            if (!quote) return;

            await this.createNotification({
                userId,
                type: NotificationType.STATUS_CHANGE,
                title: `Status updated: ${quote.quote_ref}`,
                message: `Changed from ${oldStatus} to ${newStatus}`,
                quoteId,
                actionUrl: `/smartquote-v3/${quoteId}`,
                priority: NotificationPriority.NORMAL,
            });
        } catch (error) {
            console.error('Failed to send status change notification:', error);
        }
    }

    /**
     * Send quote viewed notification (client viewed)
     */
    async sendQuoteViewed(
        quoteId: string,
        userId: string,
        clientEmail: string
    ): Promise<void> {
        try {
            const { data: quote } = await supabase
                .from('smartquote_v3_quotes')
                .select('quote_ref')
                .eq('id', quoteId)
                .single();

            if (!quote) return;

            await this.createNotification({
                userId,
                type: NotificationType.QUOTE_VIEWED,
                title: `Client viewed: ${quote.quote_ref}`,
                message: `${clientEmail} has viewed the quote`,
                quoteId,
                actionUrl: `/smartquote-v3/${quoteId}`,
                priority: NotificationPriority.NORMAL,
            });
        } catch (error) {
            console.error('Failed to send quote viewed notification:', error);
        }
    }

    /**
     * Send quote won notification
     */
    async sendQuoteWon(
        quoteId: string,
        userId: string,
        wonAmount: number
    ): Promise<void> {
        try {
            const { data: quote } = await supabase
                .from('smartquote_v3_quotes')
                .select('quote_ref')
                .eq('id', quoteId)
                .single();

            if (!quote) return;

            await this.createNotification({
                userId,
                type: NotificationType.QUOTE_WON,
                title: `🎉 Quote won: ${quote.quote_ref}`,
                message: `Congratulations! £${wonAmount.toLocaleString()} secured`,
                quoteId,
                actionUrl: `/smartquote-v3/${quoteId}`,
                priority: NotificationPriority.HIGH,
            });
        } catch (error) {
            console.error('Failed to send quote won notification:', error);
        }
    }

    /**
     * Send quote lost notification
     */
    async sendQuoteLost(
        quoteId: string,
        userId: string,
        reason?: string
    ): Promise<void> {
        try {
            const { data: quote } = await supabase
                .from('smartquote_v3_quotes')
                .select('quote_ref')
                .eq('id', quoteId)
                .single();

            if (!quote) return;

            await this.createNotification({
                userId,
                type: NotificationType.QUOTE_LOST,
                title: `Quote lost: ${quote.quote_ref}`,
                message: reason || 'Quote was not won',
                quoteId,
                actionUrl: `/smartquote-v3/${quoteId}`,
                priority: NotificationPriority.NORMAL,
            });
        } catch (error) {
            console.error('Failed to send quote lost notification:', error);
        }
    }

    /**
     * Create a notification
     */
    private async createNotification(notification: {
        userId: string;
        type: NotificationType;
        title: string;
        message?: string;
        quoteId?: string;
        commentId?: string;
        approvalId?: string;
        actionUrl?: string;
        actionLabel?: string;
        priority?: NotificationPriority;
    }): Promise<void> {
        try {
            await supabase.from('smartquote_v3_notifications').insert({
                user_id: notification.userId,
                type: notification.type,
                title: notification.title,
                message: notification.message,
                quote_id: notification.quoteId,
                comment_id: notification.commentId,
                approval_id: notification.approvalId,
                action_url: notification.actionUrl,
                action_label: notification.actionLabel,
                priority: notification.priority || NotificationPriority.NORMAL,
            });

            // TODO: Send push notification via Firebase/APNS
            // TODO: Send email via Resend/SendGrid
            // TODO: Send SMS via Twilio (optional)

        } catch (error) {
            console.error('Failed to create notification:', error);
        }
    }

    /**
     * Get notifications for a user
     */
    async getUserNotifications(
        userId: string,
        unreadOnly: boolean = false
    ): Promise<Notification[]> {
        try {
            let query = supabase
                .from('smartquote_v3_notifications')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(50);

            if (unreadOnly) {
                query = query.eq('read', false);
            }

            const { data, error } = await query;

            if (error) throw error;

            return data as Notification[];
        } catch (error) {
            console.error('Failed to get user notifications:', error);
            return [];
        }
    }

    /**
     * Mark notification as read
     */
    async markAsRead(notificationId: string): Promise<void> {
        try {
            await supabase
                .from('smartquote_v3_notifications')
                .update({
                    read: true,
                    read_at: new Date().toISOString(),
                })
                .eq('id', notificationId);
        } catch (error) {
            console.error('Failed to mark notification as read:', error);
        }
    }

    /**
     * Mark all notifications as read for a user
     */
    async markAllAsRead(userId: string): Promise<void> {
        try {
            await supabase
                .from('smartquote_v3_notifications')
                .update({
                    read: true,
                    read_at: new Date().toISOString(),
                })
                .eq('user_id', userId)
                .eq('read', false);
        } catch (error) {
            console.error('Failed to mark all notifications as read:', error);
        }
    }

    /**
     * Get unread count for a user
     */
    async getUnreadCount(userId: string): Promise<number> {
        try {
            const { count, error } = await supabase
                .from('smartquote_v3_notifications')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', userId)
                .eq('read', false);

            if (error) throw error;

            return count || 0;
        } catch (error) {
            console.error('Failed to get unread count:', error);
            return 0;
        }
    }

    /**
     * Delete notification
     */
    async deleteNotification(notificationId: string): Promise<void> {
        try {
            await supabase
                .from('smartquote_v3_notifications')
                .delete()
                .eq('id', notificationId);
        } catch (error) {
            console.error('Failed to delete notification:', error);
        }
    }

    /**
     * Delete old read notifications (cleanup)
     */
    async deleteOldNotifications(daysOld: number = 30): Promise<void> {
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - daysOld);

            await supabase
                .from('smartquote_v3_notifications')
                .delete()
                .eq('read', true)
                .lt('created_at', cutoffDate.toISOString());
        } catch (error) {
            console.error('Failed to delete old notifications:', error);
        }
    }
}

export const notificationService = new NotificationService();
