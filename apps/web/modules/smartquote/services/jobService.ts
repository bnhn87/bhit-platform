import { createJob, JobResult } from '../../../lib/jobs';
import { supabase } from '../../../lib/supabaseClient';
import { JobPayload, Job } from '../../../lib/types';
import { SavedQuote } from '../types';

export interface CreateJobOptions {
    userId: string;
    accountId: string;
    customTitle?: string;
    customReference?: string;
}

export interface JobCreationResult extends JobResult<Job> {
    validation?: {
        missingFields?: string[];
        warnings?: string[];
    };
}

/**
 * Validates quote data before creating a job
 * @param quote - The quote to validate
 * @returns Validation result with any issues found
 */
const validateQuoteForJob = (quote: SavedQuote): { isValid: boolean; missingFields: string[]; warnings: string[] } => {
    const missingFields: string[] = [];
    const warnings: string[] = [];

    // Check required fields
    if (!quote.details.client?.trim()) {
        missingFields.push('Client name');
    }

    if (!quote.details.project?.trim()) {
        missingFields.push('Project name');
    }

    if (!quote.details.deliveryAddress?.trim()) {
        warnings.push('Delivery address is missing');
    }

    if (!quote.results?.detailedProducts || quote.results.detailedProducts.length === 0) {
        missingFields.push('Products');
    }

    if (!quote.results?.pricing?.totalCost || quote.results.pricing.totalCost <= 0) {
        warnings.push('Total cost is zero or invalid');
    }

    return {
        isValid: missingFields.length === 0,
        missingFields,
        warnings
    };
};

/**
 * Creates a job from a SmartQuote quote
 * @param quote - The saved quote to convert to a job
 * @param options - Creation options including user and account IDs
 * @returns Result with created job or error details
 */
export const createJobFromQuote = async (
    quote: SavedQuote,
    options: CreateJobOptions
): Promise<JobCreationResult> => {
    try {
        // Validate options
        if (!options.userId) {
            return {
                success: false,
                error: 'User ID is required to create a job'
            };
        }

        if (!options.accountId) {
            return {
                success: false,
                error: 'Account ID is required to create a job'
            };
        }

        // Validate quote data
        const validation = validateQuoteForJob(quote);

        if (!validation.isValid) {
            return {
                success: false,
                error: `Cannot create job: ${validation.missingFields.join(', ')} required`,
                validation: {
                    missingFields: validation.missingFields,
                    warnings: validation.warnings
                }
            };
        }

        // Build job payload from quote
        const jobTitle = options.customTitle ||
                        `${quote.details.client} - ${quote.details.project}`.substring(0, 200);

        const jobReference = options.customReference ||
                           quote.details.quoteRef ||
                           `Q-${quote.id.substring(0, 8)}`;

        const jobPayload: JobPayload = {
            title: jobTitle,
            client_name: quote.details.client || null,
            reference: jobReference,
            status: 'planned',
            location_x: null, // Could be populated from deliveryAddress geocoding in future
            location_y: null,
            created_by: options.userId,
            account_id: options.accountId
        };

        // Create the job
        const result = await createJob(jobPayload);

        if (!result.success || !result.data) {
            return {
                ...result,
                validation: {
                    missingFields: validation.missingFields,
                    warnings: validation.warnings
                }
            };
        }

        // After job creation, optionally save quote metadata to job
        // This could include saving the quote data as JSON in a job_metadata field
        // For now, we'll just return the created job

        if (validation.warnings.length > 0) {
            return {
                ...result,
                validation: {
                    warnings: validation.warnings
                }
            };
        }

        return result;

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to create job from quote';
        return {
            success: false,
            error: errorMessage,
            details: error
        };
    }
};

/**
 * Gets the current user's ID and account ID
 * @returns User and account IDs or null if not authenticated
 */
export const getCurrentUserContext = async (): Promise<CreateJobOptions | null> => {
    try {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session?.user) {
            return null;
        }

        const userId = session.user.id;
        const accountId = session.user.user_metadata?.account_id;

        if (!accountId) {
            console.warn('User is missing account_id in metadata');
            return null;
        }

        return {
            userId,
            accountId
        };

    } catch (error) {
        console.error('Failed to get user context:', error);
        return null;
    }
};

/**
 * Helper to create a job from quote with auto-detected user context
 * @param quote - The saved quote to convert to a job
 * @param customOptions - Optional custom title or reference
 * @returns Result with created job or error details
 */
export const createJobFromQuoteAuto = async (
    quote: SavedQuote,
    customOptions?: { customTitle?: string; customReference?: string }
): Promise<JobCreationResult> => {
    const userContext = await getCurrentUserContext();

    if (!userContext) {
        return {
            success: false,
            error: 'You must be logged in to create a job'
        };
    }

    return createJobFromQuote(quote, {
        ...userContext,
        ...customOptions
    });
};
