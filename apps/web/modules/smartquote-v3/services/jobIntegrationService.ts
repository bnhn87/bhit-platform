// ============================================================================
// SmartQuote v3 - Job Integration Service
// ============================================================================
// Convert quotes to jobs in the main system

import { supabase } from '../../../lib/supabaseClient';
import { Quote, QuoteStatus } from '../types';

interface JobCreationResult {
    success: boolean;
    jobId?: string;
    error?: string;
}

class JobIntegrationService {
    /**
     * Convert quote to job
     */
    async convertToJob(
        quoteId: string,
        options?: {
            customTitle?: string;
            customReference?: string;
            startDate?: string;
        }
    ): Promise<JobCreationResult> {
        try {
            const { data: user } = await supabase.auth.getUser();
            const userId = user?.user?.id;
            const accountId = user?.user?.user_metadata?.account_id;

            if (!userId || !accountId) {
                return { success: false, error: 'User not authenticated' };
            }

            // Get quote
            const { data: quote, error: quoteError } = await supabase
                .from('smartquote_v3_quotes')
                .select('*')
                .eq('id', quoteId)
                .single();

            if (quoteError || !quote) {
                return { success: false, error: 'Quote not found' };
            }

            // Validate quote can be converted
            if (quote.converted_to_job_id) {
                return {
                    success: false,
                    error: `Quote already converted to job ${quote.converted_to_job_id}`,
                };
            }

            if (quote.status !== QuoteStatus.WON && quote.status !== QuoteStatus.APPROVED_INTERNAL) {
                return {
                    success: false,
                    error: 'Quote must be Won or Approved before converting to job',
                };
            }

            // Create job payload
            const jobTitle = options?.customTitle ||
                `${quote.client_name} - ${quote.project_name || 'Project'}`.substring(0, 200);

            const jobReference = options?.customReference ||
                quote.quote_ref ||
                `Q-${quoteId.substring(0, 8)}`;

            // Call the API endpoint to create job
            const response = await fetch('/api/quotes/convert-to-job', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    quoteData: {
                        results: quote.results,
                        products: quote.products,
                        details: quote.quote_details,
                    },
                    jobDetails: {
                        title: jobTitle,
                        startDate: options?.startDate || null,
                    },
                }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || 'Failed to create job');
            }

            // Update quote with job reference
            await supabase
                .from('smartquote_v3_quotes')
                .update({
                    converted_to_job_id: result.jobId,
                    converted_to_job_at: new Date().toISOString(),
                })
                .eq('id', quoteId);

            // Record analytics event
            await supabase.from('smartquote_v3_analytics_events').insert({
                event_type: 'quote_converted_to_job',
                quote_id: quoteId,
                user_id: userId,
                event_data: {
                    job_id: result.jobId,
                    job_title: jobTitle,
                },
            });

            return {
                success: true,
                jobId: result.jobId,
            };
        } catch (error) {
            console.error('Failed to convert quote to job:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to convert to job',
            };
        }
    }

    /**
     * Check if quote can be converted to job
     */
    async canConvertToJob(quoteId: string): Promise<{
        canConvert: boolean;
        reason?: string;
    }> {
        try {
            const { data: quote, error } = await supabase
                .from('smartquote_v3_quotes')
                .select('status, converted_to_job_id')
                .eq('id', quoteId)
                .single();

            if (error || !quote) {
                return { canConvert: false, reason: 'Quote not found' };
            }

            if (quote.converted_to_job_id) {
                return {
                    canConvert: false,
                    reason: `Already converted to job ${quote.converted_to_job_id}`,
                };
            }

            const validStatuses = [QuoteStatus.WON, QuoteStatus.APPROVED_INTERNAL];
            if (!validStatuses.includes(quote.status as QuoteStatus)) {
                return {
                    canConvert: false,
                    reason: 'Quote must be Won or Approved before converting',
                };
            }

            return { canConvert: true };
        } catch (error) {
            return {
                canConvert: false,
                reason: error instanceof Error ? error.message : 'Error checking conversion eligibility',
            };
        }
    }

    /**
     * Get job details for a converted quote
     */
    async getJobDetails(quoteId: string): Promise<any | null> {
        try {
            const { data: quote } = await supabase
                .from('smartquote_v3_quotes')
                .select('converted_to_job_id')
                .eq('id', quoteId)
                .single();

            if (!quote?.converted_to_job_id) {
                return null;
            }

            const { data: job } = await supabase
                .from('jobs')
                .select('*')
                .eq('id', quote.converted_to_job_id)
                .single();

            return job;
        } catch (error) {
            console.error('Failed to get job details:', error);
            return null;
        }
    }
}

export const jobIntegrationService = new JobIntegrationService();
