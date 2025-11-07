// ============================================================================
// SmartQuote v3 - Collaboration Service
// ============================================================================

import { supabase } from '../../../lib/supabaseClient';
import { Comment, CommentType, CommentAttachment, CommentContext } from '../types';
import { notificationService } from './notificationService';

class CollaborationService {
    /**
     * Add a comment to a quote
     */
    async addComment(
        quoteId: string,
        commentText: string,
        options: {
            isInternal?: boolean;
            commentType?: CommentType;
            mentionedUserIds?: string[];
            attachments?: CommentAttachment[];
            context?: CommentContext;
            parentCommentId?: string;
        } = {}
    ): Promise<{ success: boolean; data?: Comment; error?: string }> {
        try {
            const { data: user } = await supabase.auth.getUser();
            const userId = user?.user?.id;

            if (!userId) {
                return { success: false, error: 'User not authenticated' };
            }

            // Determine thread root
            let threadRootId = options.parentCommentId;
            if (options.parentCommentId) {
                const { data: parentComment } = await supabase
                    .from('smartquote_v3_comments')
                    .select('thread_root_id')
                    .eq('id', options.parentCommentId)
                    .single();

                threadRootId = parentComment?.thread_root_id || options.parentCommentId;
            }

            // Insert comment
            const { data, error } = await supabase
                .from('smartquote_v3_comments')
                .insert({
                    quote_id: quoteId,
                    comment_text: commentText,
                    is_internal: options.isInternal ?? true,
                    comment_type: options.commentType || CommentType.GENERAL,
                    mentioned_user_ids: options.mentionedUserIds || [],
                    attachments: options.attachments || [],
                    context: options.context || {},
                    parent_comment_id: options.parentCommentId,
                    thread_root_id: threadRootId,
                    created_by: userId,
                })
                .select()
                .single();

            if (error) throw error;

            // Send notifications to mentioned users
            if (options.mentionedUserIds && options.mentionedUserIds.length > 0) {
                // Get user name for notification
                const { data: userData } = await supabase.auth.getUser();
                const authorName = userData?.user?.email || 'Someone';

                for (const mentionedUserId of options.mentionedUserIds) {
                    if (mentionedUserId !== userId) {
                        await notificationService.sendMention(
                            quoteId,
                            data.id,
                            mentionedUserId,
                            commentText,
                            authorName
                        );
                    }
                }
            }

            return { success: true, data: data as Comment };
        } catch (error) {
            console.error('Failed to add comment:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to add comment',
            };
        }
    }

    /**
     * Reply to a comment
     */
    async replyToComment(
        commentId: string,
        replyText: string,
        mentionedUserIds?: string[]
    ): Promise<{ success: boolean; data?: Comment; error?: string }> {
        try {
            // Get parent comment to get quote ID
            const { data: parentComment, error: parentError } = await supabase
                .from('smartquote_v3_comments')
                .select('quote_id')
                .eq('id', commentId)
                .single();

            if (parentError || !parentComment) {
                return { success: false, error: 'Parent comment not found' };
            }

            return await this.addComment(parentComment.quote_id, replyText, {
                parentCommentId: commentId,
                mentionedUserIds,
            });
        } catch (error) {
            console.error('Failed to reply to comment:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to reply to comment',
            };
        }
    }

    /**
     * Get comments for a quote
     */
    async getComments(
        quoteId: string,
        includeInternal: boolean = true
    ): Promise<Comment[]> {
        try {
            let query = supabase
                .from('smartquote_v3_comments')
                .select('*')
                .eq('quote_id', quoteId)
                .is('deleted_at', null)
                .order('created_at', { ascending: true });

            if (!includeInternal) {
                query = query.eq('is_internal', false);
            }

            const { data, error } = await query;

            if (error) throw error;

            return data as Comment[];
        } catch (error) {
            console.error('Failed to get comments:', error);
            return [];
        }
    }

    /**
     * Get comment thread
     */
    async getThread(threadRootId: string): Promise<Comment[]> {
        try {
            const { data, error } = await supabase
                .from('smartquote_v3_comments')
                .select('*')
                .eq('thread_root_id', threadRootId)
                .is('deleted_at', null)
                .order('created_at', { ascending: true });

            if (error) throw error;

            return data as Comment[];
        } catch (error) {
            console.error('Failed to get thread:', error);
            return [];
        }
    }

    /**
     * Edit a comment
     */
    async editComment(
        commentId: string,
        newText: string
    ): Promise<{ success: boolean; error?: string }> {
        try {
            const { data: user } = await supabase.auth.getUser();
            const userId = user?.user?.id;

            // Get current comment
            const { data: comment, error: fetchError } = await supabase
                .from('smartquote_v3_comments')
                .select('*')
                .eq('id', commentId)
                .single();

            if (fetchError || !comment) {
                return { success: false, error: 'Comment not found' };
            }

            // Check ownership
            if (comment.created_by !== userId) {
                return { success: false, error: 'You can only edit your own comments' };
            }

            // Update comment
            const { error: updateError } = await supabase
                .from('smartquote_v3_comments')
                .update({
                    comment_text: newText,
                    edited: true,
                    edited_at: new Date().toISOString(),
                    original_text: comment.comment_text,
                })
                .eq('id', commentId);

            if (updateError) throw updateError;

            return { success: true };
        } catch (error) {
            console.error('Failed to edit comment:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to edit comment',
            };
        }
    }

    /**
     * Delete a comment (soft delete)
     */
    async deleteComment(commentId: string): Promise<{ success: boolean; error?: string }> {
        try {
            const { data: user } = await supabase.auth.getUser();
            const userId = user?.user?.id;

            // Get current comment
            const { data: comment, error: fetchError } = await supabase
                .from('smartquote_v3_comments')
                .select('created_by')
                .eq('id', commentId)
                .single();

            if (fetchError || !comment) {
                return { success: false, error: 'Comment not found' };
            }

            // Check ownership
            if (comment.created_by !== userId) {
                return { success: false, error: 'You can only delete your own comments' };
            }

            // Soft delete
            const { error: deleteError } = await supabase
                .from('smartquote_v3_comments')
                .update({
                    deleted_at: new Date().toISOString(),
                })
                .eq('id', commentId);

            if (deleteError) throw deleteError;

            return { success: true };
        } catch (error) {
            console.error('Failed to delete comment:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to delete comment',
            };
        }
    }

    /**
     * Resolve a comment
     */
    async resolveComment(commentId: string): Promise<{ success: boolean; error?: string }> {
        try {
            const { data: user } = await supabase.auth.getUser();
            const userId = user?.user?.id;

            const { error } = await supabase
                .from('smartquote_v3_comments')
                .update({
                    is_resolved: true,
                    resolved_by: userId,
                    resolved_at: new Date().toISOString(),
                })
                .eq('id', commentId);

            if (error) throw error;

            return { success: true };
        } catch (error) {
            console.error('Failed to resolve comment:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to resolve comment',
            };
        }
    }

    /**
     * Unresolve a comment
     */
    async unresolveComment(commentId: string): Promise<{ success: boolean; error?: string }> {
        try {
            const { error } = await supabase
                .from('smartquote_v3_comments')
                .update({
                    is_resolved: false,
                    resolved_by: null,
                    resolved_at: null,
                })
                .eq('id', commentId);

            if (error) throw error;

            return { success: true };
        } catch (error) {
            console.error('Failed to unresolve comment:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to unresolve comment',
            };
        }
    }

    /**
     * Add reaction to comment
     */
    async addReaction(
        commentId: string,
        emoji: string
    ): Promise<{ success: boolean; error?: string }> {
        try {
            const { data: user } = await supabase.auth.getUser();
            const userId = user?.user?.id;

            if (!userId) {
                return { success: false, error: 'User not authenticated' };
            }

            // Get current reactions
            const { data: comment, error: fetchError } = await supabase
                .from('smartquote_v3_comments')
                .select('reactions')
                .eq('id', commentId)
                .single();

            if (fetchError || !comment) {
                return { success: false, error: 'Comment not found' };
            }

            const reactions = comment.reactions || {};

            // Add user to this emoji's array
            if (!reactions[emoji]) {
                reactions[emoji] = [];
            }

            if (!reactions[emoji].includes(userId)) {
                reactions[emoji].push(userId);
            }

            // Update comment
            const { error: updateError } = await supabase
                .from('smartquote_v3_comments')
                .update({ reactions })
                .eq('id', commentId);

            if (updateError) throw updateError;

            return { success: true };
        } catch (error) {
            console.error('Failed to add reaction:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to add reaction',
            };
        }
    }

    /**
     * Remove reaction from comment
     */
    async removeReaction(
        commentId: string,
        emoji: string
    ): Promise<{ success: boolean; error?: string }> {
        try {
            const { data: user } = await supabase.auth.getUser();
            const userId = user?.user?.id;

            if (!userId) {
                return { success: false, error: 'User not authenticated' };
            }

            // Get current reactions
            const { data: comment, error: fetchError } = await supabase
                .from('smartquote_v3_comments')
                .select('reactions')
                .eq('id', commentId)
                .single();

            if (fetchError || !comment) {
                return { success: false, error: 'Comment not found' };
            }

            const reactions = comment.reactions || {};

            // Remove user from this emoji's array
            if (reactions[emoji]) {
                reactions[emoji] = reactions[emoji].filter((id: string) => id !== userId);

                // Remove emoji key if no users left
                if (reactions[emoji].length === 0) {
                    delete reactions[emoji];
                }
            }

            // Update comment
            const { error: updateError } = await supabase
                .from('smartquote_v3_comments')
                .update({ reactions })
                .eq('id', commentId);

            if (updateError) throw updateError;

            return { success: true };
        } catch (error) {
            console.error('Failed to remove reaction:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to remove reaction',
            };
        }
    }

    /**
     * Get unresolved comments count for a quote
     */
    async getUnresolvedCount(quoteId: string): Promise<number> {
        try {
            const { count, error } = await supabase
                .from('smartquote_v3_comments')
                .select('*', { count: 'exact', head: true })
                .eq('quote_id', quoteId)
                .eq('is_resolved', false)
                .is('deleted_at', null);

            if (error) throw error;

            return count || 0;
        } catch (error) {
            console.error('Failed to get unresolved count:', error);
            return 0;
        }
    }
}

export const collaborationService = new CollaborationService();
