// ========================================
// SmartQuote v2.0 - Revision Tracking Service
// ========================================
// Features:
// - Automatic "Rev 1", "Rev 2", "Rev 3" numbering
// - Complete change history with snapshots
// - Diff calculation between revisions
// - Audit trail for all actions

import { supabase } from '../../../lib/supabaseClient';
import {
    QuoteRevision,
    AuditLogEntry,
    QuoteWithRevisions,
    RevisionTrackingService as IRevisionTrackingService
} from '../types';

class RevisionTrackingService implements IRevisionTrackingService {
    
    // Create a new revision
    async createRevision(
        quoteId: string,
        details: any,
        products: any[],
        results: any,
        changesSummary?: string
    ): Promise<QuoteRevision> {
        try {
            // Get current revision number
            const { data: quote } = await supabase
                .from('smartquote_v2_quotes')
                .select('current_revision, quote_ref')
                .eq('id', quoteId)
                .single();
            
            const newRevisionNumber = (quote?.current_revision || 0) + 1;
            const userId = (await supabase.auth.getUser()).data.user?.id;
            
            // Create revision snapshot
            const { data: revision, error } = await supabase
                .from('smartquote_v2_quote_revisions')
                .insert({
                    quote_id: quoteId,
                    revision_number: newRevisionNumber,
                    details: JSON.stringify(details),
                    products: JSON.stringify(products),
                    results: JSON.stringify(results),
                    changes_summary: changesSummary,
                    created_by: userId
                })
                .select()
                .single();
            
            if (error) throw error;
            
            // Update quote with new revision number and reference
            const newReference = `${quote?.quote_ref.replace(/\s*Rev\s*\d+$/i, '')} Rev ${newRevisionNumber}`;
            
            await supabase
                .from('smartquote_v2_quotes')
                .update({
                    current_revision: newRevisionNumber,
                    quote_ref: newReference
                })
                .eq('id', quoteId);
            
            // Log the revision creation
            await this.logAction(
                quoteId,
                'updated',
                `Created revision ${newRevisionNumber}${changesSummary ? ': ' + changesSummary : ''}`
            );

            return revision;
        } catch (error) {
            console.error('Error creating revision:', error);
            throw error;
        }
    }

    // Log an action to the audit trail
    async logAction(
        quoteId: string,
        action: string,
        details?: string
    ): Promise<void> {
        try {
            const userId = (await supabase.auth.getUser()).data.user?.id;

            await supabase
                .from('smartquote_v2_audit_log')
                .insert({
                    quote_id: quoteId,
                    user_id: userId,
                    action,
                    details
                });
        } catch (error) {
            console.error('Error logging action:', error);
            // Don't throw - logging failure shouldn't break the main operation
        }
    }

    // Get revision history for a quote
    async getRevisions(quoteId: string): Promise<QuoteRevision[]> {
        try {
            const { data, error } = await supabase
                .from('smartquote_v2_quote_revisions')
                .select('*')
                .eq('quote_id', quoteId)
                .order('revision_number', { ascending: false });

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error fetching revisions:', error);
            return [];
        }
    }

    // Get audit log for a quote
    async getAuditLog(quoteId: string): Promise<AuditLogEntry[]> {
        try {
            const { data, error } = await supabase
                .from('smartquote_v2_audit_log')
                .select('*')
                .eq('quote_id', quoteId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error fetching audit log:', error);
            return [];
        }
    }

    // Get revision history for a quote - alias for getRevisions
    async getRevisionHistory(quoteId: string): Promise<QuoteRevision[]> {
        return this.getRevisions(quoteId);
    }

    // Compare two revisions and return differences
    async compareRevisions(rev1Id: string, rev2Id: string): Promise<any> {
        try {
            const { data: revisions, error } = await supabase
                .from('smartquote_v2_quote_revisions')
                .select('*')
                .in('id', [rev1Id, rev2Id]);

            if (error) throw error;
            if (!revisions || revisions.length !== 2) {
                throw new Error('Could not find both revisions');
            }

            const [rev1, rev2] = revisions.sort((a, b) =>
                a.revision_number - b.revision_number
            );

            // Parse JSON fields
            const rev1Data = {
                details: JSON.parse(rev1.details),
                products: JSON.parse(rev1.products),
                results: JSON.parse(rev1.results)
            };

            const rev2Data = {
                details: JSON.parse(rev2.details),
                products: JSON.parse(rev2.products),
                results: JSON.parse(rev2.results)
            };

            // Calculate differences
            const diff = {
                revisionNumbers: {
                    from: rev1.revision_number,
                    to: rev2.revision_number
                },
                changes: {
                    details: this.diffObjects(rev1Data.details, rev2Data.details),
                    products: this.diffArrays(rev1Data.products, rev2Data.products),
                    results: this.diffObjects(rev1Data.results, rev2Data.results)
                },
                summary: rev2.changes_summary || 'No summary available'
            };

            return diff;
        } catch (error) {
            console.error('Error comparing revisions:', error);
            throw error;
        }
    }

    // Helper method to compare objects
    private diffObjects(obj1: any, obj2: any): any {
        const changes: any = {};
        const allKeys = new Set([...Object.keys(obj1 || {}), ...Object.keys(obj2 || {})]);

        for (const key of allKeys) {
            if (JSON.stringify(obj1?.[key]) !== JSON.stringify(obj2?.[key])) {
                changes[key] = {
                    from: obj1?.[key],
                    to: obj2?.[key]
                };
            }
        }

        return Object.keys(changes).length > 0 ? changes : null;
    }

    // Helper method to compare arrays
    private diffArrays(arr1: any[], arr2: any[]): any {
        return {
            added: arr2.filter((item2: any) =>
                !arr1.some((item1: any) =>
                    JSON.stringify(item1) === JSON.stringify(item2)
                )
            ),
            removed: arr1.filter((item1: any) =>
                !arr2.some((item2: any) =>
                    JSON.stringify(item1) === JSON.stringify(item2)
                )
            ),
            countChange: {
                from: arr1.length,
                to: arr2.length
            }
        };
    }
}

export default new RevisionTrackingService();
