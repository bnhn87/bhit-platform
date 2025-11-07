// ========================================
// SmartQuote v2.0 - Email Automation Service
// ========================================
// Features:
// - Process incoming quote emails
// - Create draft quotes for human review
// - Track email workflow
// - Approve/reject draft quotes

import { supabase } from '../../../lib/supabaseClient';
import {
    QuoteEmail,
    QuoteDraft,
    EmailAutomationService as IEmailAutomationService,
    EnhancedParseResult
} from '../types';

import { parseQuoteContentEnhanced } from './enhancedGeminiService';

class EmailAutomationService implements IEmailAutomationService {
    
    // Process an incoming email and create a draft quote
    async processIncomingEmail(email: QuoteEmail): Promise<QuoteDraft> {
        try {
            // Record the email
            const { data: emailRecord, error: emailError } = await supabase
                .from('smartquote_v2_quote_emails')
                .insert({
                    from_email: email.fromEmail,
                    subject: email.subject,
                    body: email.body,
                    raw_email: email.rawEmail,
                    attachments: email.attachments,
                    received_at: email.receivedAt,
                    status: 'processing'
                })
                .select()
                .single();

            if (emailError) throw emailError;

            try {
                // Parse attachments and body content
                const parseContent: any[] = [];
                
                // Add email body as text if substantial
                if (email.body && email.body.length > 50) {
                    parseContent.push(email.body);
                }
                
                // Add attachments
                if (email.attachments && email.attachments.length > 0) {
                    for (const attachment of email.attachments) {
                        if (attachment.data) {
                            parseContent.push({
                                mimeType: attachment.mimeType,
                                data: attachment.data
                            });
                        }
                    }
                }
                
                if (parseContent.length === 0) {
                    throw new Error('No content to parse in email');
                }
                
                // Parse with enhanced Gemini service
                const parseResult: EnhancedParseResult = await parseQuoteContentEnhanced(
                    parseContent,
                    {
                        maxRetries: 3,
                        minConfidence: 0.5,
                        includeLowConfidence: true
                    }
                );
                
                // Create draft quote
                const draft = await this.createDraft(
                    emailRecord.id,
                    parseResult,
                    parseResult.confidenceScore
                );
                
                // Update email status
                await supabase
                    .from('smartquote_v2_quote_emails')
                    .update({
                        status: 'completed',
                        processed_at: new Date().toISOString()
                    })
                    .eq('id', emailRecord.id);
                
                return draft;
                
            } catch (parseError) {
                // Update email with error
                await supabase
                    .from('smartquote_v2_quote_emails')
                    .update({
                        status: 'failed',
                        error_message: parseError instanceof Error ? parseError.message : 'Unknown error',
                        processed_at: new Date().toISOString()
                    })
                    .eq('id', emailRecord.id);
                
                throw parseError;
            }
            
        } catch (error: unknown) {
            console.error('Error processing email:', error);
            throw error;
        }
    }
    
    // Create a draft quote from parsed email data
    async createDraft(
        emailId: string,
        parsedData: EnhancedParseResult,
        confidenceScore: number
    ): Promise<QuoteDraft> {
        try {
            // Analyze for attention flags
            const attentionFlags: string[] = [];
            const aiNotes: string[] = [];
            
            // Check overall confidence
            if (confidenceScore < 0.7) {
                attentionFlags.push('low_overall_confidence');
                aiNotes.push(`Overall parsing confidence is ${(confidenceScore * 100).toFixed(0)}% - please review carefully`);
            }
            
            // Check for low confidence products
            if (parsedData.excludedProducts && parsedData.excludedProducts.length > 0) {
                attentionFlags.push('low_confidence_products');
                aiNotes.push(`${parsedData.excludedProducts.length} products excluded due to low confidence`);
            }
            
            // Check for warnings from parser
            if (parsedData.warnings && parsedData.warnings.length > 0) {
                attentionFlags.push('parser_warnings');
                aiNotes.push(...parsedData.warnings);
            }
            
            // Check for missing quote details
            if (!parsedData.details.client || !parsedData.details.project) {
                attentionFlags.push('missing_details');
                aiNotes.push('Client or project information missing - please add manually');
            }
            
            // Check for very high or low quantities
            const unusualQty = parsedData.products.filter((p: any) => p.quantity > 100 || p.quantity === 0);
            if (unusualQty.length > 0) {
                attentionFlags.push('unusual_quantities');
                aiNotes.push(`${unusualQty.length} products have unusual quantities (0 or >100)`);
            }
            
            const requiresAttention = attentionFlags.length > 0;
            
            // Insert draft
            const { data: draft, error } = await supabase
                .from('smartquote_v2_quote_drafts')
                .insert({
                    email_id: emailId,
                    parsed_data: parsedData,
                    confidence_score: confidenceScore,
                    ai_notes: aiNotes,
                    requires_attention: requiresAttention,
                    attention_flags: attentionFlags,
                    status: 'pending_review'
                })
                .select()
                .single();
            
            if (error) throw error;
            
            return draft;
            
        } catch (error: unknown) {
            console.error('Error creating draft:', error);
            throw error;
        }
    }
    
    // Approve a draft and create actual quote
    async approveDraft(draftId: string, reviewNotes?: string): Promise<string> {
        try {
            const userId = (await supabase.auth.getUser()).data.user?.id;
            
            // Get draft
            const { data: draft, error: draftError } = await supabase
                .from('smartquote_v2_quote_drafts')
                .select('*, smartquote_v2_quote_emails(*)')
                .eq('id', draftId)
                .single();
            
            if (draftError || !draft) throw new Error('Draft not found');
            
            const parsedData = draft.parsed_data as EnhancedParseResult;
            
            // Generate quote reference
            const quoteRef = await this.generateQuoteReference(
                parsedData.details.client,
                parsedData.details.project
            );
            
            // Create quote
            const { data: quote, error: quoteError } = await supabase
                .from('smartquote_v2_quotes')
                .insert({
                    quote_ref: quoteRef,
                    client: parsedData.details.client || 'Unknown Client',
                    project: parsedData.details.project || 'Quote from Email',
                    status: 'draft',
                    created_by: userId,
                    current_revision: 1
                })
                .select()
                .single();
            
            if (quoteError) throw quoteError;
            
            // Create initial revision with parsed data
            await supabase
                .from('smartquote_v2_quote_revisions')
                .insert({
                    quote_id: quote.id,
                    revision_number: 1,
                    details: parsedData.details,
                    products: parsedData.products,
                    results: {}, // Will be calculated on frontend
                    changes_summary: 'Initial quote created from email',
                    created_by: userId
                });
            
            // Update draft status
            await supabase
                .from('smartquote_v2_quote_drafts')
                .update({
                    status: 'approved',
                    reviewed_by: userId,
                    reviewed_at: new Date().toISOString(),
                    review_notes: reviewNotes
                })
                .eq('id', draftId);
            
            // Update email with quote link
            await supabase
                .from('smartquote_v2_quote_emails')
                .update({
                    quote_id: quote.id
                })
                .eq('id', draft.email_id);
            
            // Log action
            await supabase
                .from('smartquote_v2_audit_log')
                .insert({
                    quote_id: quote.id,
                    action: 'created',
                    details: 'Quote created from email draft',
                    user_id: userId
                });
            
            return quote.id;
            
        } catch (error: unknown) {
            console.error('Error approving draft:', error);
            throw error;
        }
    }
    
    // Reject a draft
    async rejectDraft(draftId: string, reason: string): Promise<void> {
        try {
            const userId = (await supabase.auth.getUser()).data.user?.id;
            
            await supabase
                .from('smartquote_v2_quote_drafts')
                .update({
                    status: 'rejected',
                    reviewed_by: userId,
                    reviewed_at: new Date().toISOString(),
                    review_notes: reason
                })
                .eq('id', draftId);
                
        } catch (error: unknown) {
            console.error('Error rejecting draft:', error);
            throw error;
        }
    }
    
    // Get pending drafts for review
    async getPendingDrafts(): Promise<QuoteDraft[]> {
        try {
            const { data, error } = await supabase
                .from('smartquote_v2_quote_drafts')
                .select(`
                    *,
                    email:smartquote_v2_quote_emails(*)
                `)
                .eq('status', 'pending_review')
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            return data || [];
            
        } catch (error: unknown) {
            console.error('Error fetching pending drafts:', error);
            return [];
        }
    }
    
    // Helper: Generate quote reference
    private async generateQuoteReference(client?: string, project?: string): Promise<string> {
        const prefix = 'SQ';
        const date = new Date();
        const year = date.getFullYear().toString().slice(-2);
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        
        // Get count for this month
        const { count } = await supabase
            .from('smartquote_v2_quotes')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', `${date.getFullYear()}-${month}-01`)
            .lt('created_at', `${date.getFullYear()}-${month === '12' ? '13' : (parseInt(month) + 1).toString().padStart(2, '0')}-01`);
        
        const sequence = ((count || 0) + 1).toString().padStart(4, '0');
        
        return `${prefix}${year}${month}-${sequence}`;
    }
}

export const emailAutomationService = new EmailAutomationService();
export default emailAutomationService;
