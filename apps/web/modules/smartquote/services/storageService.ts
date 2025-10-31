
import { SavedQuote, QuoteVersion, QuoteAuditEntry } from '../types';

const SAVED_QUOTES_KEY = 'bhit_saved_quotes';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export interface SaveResult {
    success: boolean;
    status: SaveStatus;
    error?: string;
    conflictResolved?: boolean;
}

/**
 * Loads all saved quotes from local storage.
 * @returns An array of saved quotes.
 */
export const loadQuotes = (): SavedQuote[] => {
    try {
        const storedData = localStorage.getItem(SAVED_QUOTES_KEY);
        if (storedData) {
            const parsed = JSON.parse(storedData);
            if (Array.isArray(parsed)) {
                return parsed.sort((a,b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());
            }
        }
    } catch {
        // Failed to load quotes from local storage
    }
    return [];
};

/**
 * Attempt to save with retry logic
 * @param quoteToSave - The quote object to save
 * @param attempt - Current attempt number
 * @returns SaveResult with success status and details
 */
const attemptSave = async (quoteToSave: SavedQuote, attempt: number): Promise<SaveResult> => {
    try {
        const existingQuotes = loadQuotes();

        // Check for conflicts (same ID with newer savedAt timestamp)
        const existingQuote = existingQuotes.find(q => q.id === quoteToSave.id);
        const hasConflict = existingQuote &&
                          new Date(existingQuote.savedAt).getTime() > new Date(quoteToSave.savedAt).getTime();

        if (hasConflict && attempt === 1) {
            // On first attempt with conflict, merge and use newer timestamp
            quoteToSave.savedAt = new Date().toISOString();
        }

        // Remove existing quote with same ID to prevent duplicates
        const filteredQuotes = existingQuotes.filter(q => q.id !== quoteToSave.id);
        const updatedQuotes = [quoteToSave, ...filteredQuotes];

        localStorage.setItem(SAVED_QUOTES_KEY, JSON.stringify(updatedQuotes));

        // Verify save was successful
        const verification = localStorage.getItem(SAVED_QUOTES_KEY);
        if (!verification) {
            throw new Error('Save verification failed');
        }

        return {
            success: true,
            status: 'saved',
            conflictResolved: hasConflict
        };

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        // Check if it's a quota exceeded error
        if (errorMessage.includes('quota') || errorMessage.includes('QuotaExceededError')) {
            return {
                success: false,
                status: 'error',
                error: 'Storage quota exceeded. Please delete old quotes.'
            };
        }

        throw error; // Re-throw for retry logic
    }
};

/**
 * Saves a quote to local storage with retry logic and conflict resolution
 * @param quoteToSave - The quote object to save
 * @param maxRetries - Maximum number of retry attempts (default: 3)
 * @returns SaveResult with success status and details
 */
export const saveQuoteWithRetry = async (quoteToSave: SavedQuote, maxRetries: number = 3): Promise<SaveResult> => {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const result = await attemptSave(quoteToSave, attempt);
            return result;

        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));

            if (attempt < maxRetries) {
                // Wait before retry with exponential backoff
                await new Promise(resolve => setTimeout(resolve, 100 * attempt));
                continue;
            }
        }
    }

    // All attempts failed
    return {
        success: false,
        status: 'error',
        error: lastError?.message || 'Failed to save quote after multiple attempts'
    };
};

/**
 * Saves a quote to local storage (legacy method, no retry)
 * @param quoteToSave - The quote object to save.
 */
export const saveQuote = (quoteToSave: SavedQuote) => {
    try {
        const existingQuotes = loadQuotes();
        // Remove existing quote with same ID to prevent duplicates
        const filteredQuotes = existingQuotes.filter(q => q.id !== quoteToSave.id);
        const updatedQuotes = [quoteToSave, ...filteredQuotes];
        localStorage.setItem(SAVED_QUOTES_KEY, JSON.stringify(updatedQuotes));
    } catch {
        // Failed to save quote to local storage
    }
};

/**
 * Creates a new version entry from current quote data
 * @param quote - The quote to create a version from
 * @param userId - Optional user ID who is saving
 * @param changesSummary - Optional description of changes
 * @returns QuoteVersion object
 */
export const createQuoteVersion = (
    quote: SavedQuote,
    userId?: string,
    changesSummary?: string
): QuoteVersion => {
    return {
        version: quote.version || 1,
        savedAt: new Date().toISOString(),
        savedBy: userId,
        details: JSON.parse(JSON.stringify(quote.details)), // Deep copy
        results: JSON.parse(JSON.stringify(quote.results)), // Deep copy
        products: JSON.parse(JSON.stringify(quote.products)), // Deep copy
        changesSummary
    };
};

/**
 * Adds an audit entry to a quote
 * @param quote - The quote to add audit entry to
 * @param action - The action being performed
 * @param userId - Optional user ID
 * @param userName - Optional user name
 * @param details - Optional additional details
 * @returns Updated quote with new audit entry
 */
export const addAuditEntry = (
    quote: SavedQuote,
    action: QuoteAuditEntry['action'],
    userId?: string,
    userName?: string,
    details?: string
): SavedQuote => {
    const entry: QuoteAuditEntry = {
        timestamp: new Date().toISOString(),
        action,
        userId,
        userName,
        details,
        version: quote.version
    };

    return {
        ...quote,
        auditTrail: [...(quote.auditTrail || []), entry]
    };
};

/**
 * Saves a new version of a quote with versioning support
 * @param quoteToSave - The quote to save
 * @param userId - Optional user ID
 * @param changesSummary - Optional description of changes
 * @returns SaveResult with success status
 */
export const saveQuoteVersion = async (
    quoteToSave: SavedQuote,
    userId?: string,
    changesSummary?: string
): Promise<SaveResult> => {
    try {
        const existingQuotes = loadQuotes();
        const existingQuote = existingQuotes.find(q => q.id === quoteToSave.id);

        let updatedQuote = { ...quoteToSave };

        if (existingQuote) {
            // Create version from existing quote before updating
            const newVersion = createQuoteVersion(existingQuote, userId, changesSummary);

            // Initialize or update version history
            updatedQuote.versions = [...(existingQuote.versions || []), newVersion];
            updatedQuote.version = (existingQuote.version || 1) + 1;

            // Preserve existing audit trail
            updatedQuote.auditTrail = existingQuote.auditTrail || [];
        } else {
            // New quote
            updatedQuote.version = 1;
            updatedQuote.versions = [];
            updatedQuote.auditTrail = [];
        }

        // Add audit entry for save
        updatedQuote = addAuditEntry(
            updatedQuote,
            existingQuote ? 'updated' : 'created',
            userId,
            undefined,
            changesSummary
        );

        // Update timestamp
        updatedQuote.savedAt = new Date().toISOString();

        // Save to localStorage using retry logic
        return await saveQuoteWithRetry(updatedQuote);

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to save quote version';
        return {
            success: false,
            status: 'error',
            error: errorMessage
        };
    }
};

/**
 * Gets a specific version of a quote
 * @param quoteId - The quote ID
 * @param version - The version number to retrieve
 * @returns The quote at that version, or null if not found
 */
export const getQuoteVersion = (quoteId: string, version: number): SavedQuote | null => {
    try {
        const quotes = loadQuotes();
        const quote = quotes.find(q => q.id === quoteId);

        if (!quote) {
            return null;
        }

        // If requesting current version
        if (version === quote.version) {
            return quote;
        }

        // Find in version history
        const historicVersion = quote.versions?.find(v => v.version === version);

        if (!historicVersion) {
            return null;
        }

        // Reconstruct quote at that version
        return {
            id: quote.id,
            details: historicVersion.details,
            results: historicVersion.results,
            products: historicVersion.products,
            savedAt: historicVersion.savedAt,
            version: historicVersion.version,
            versions: quote.versions?.filter(v => v.version < version),
            auditTrail: quote.auditTrail?.filter(e => (e.version || 0) <= version)
        };

    } catch (error) {
        console.error('Failed to get quote version:', error);
        return null;
    }
};

/**
 * Logs an action in the audit trail without saving a new version
 * @param quoteId - The quote ID
 * @param action - The action to log
 * @param userId - Optional user ID
 * @param userName - Optional user name
 * @param details - Optional additional details
 */
export const logQuoteAction = async (
    quoteId: string,
    action: QuoteAuditEntry['action'],
    userId?: string,
    userName?: string,
    details?: string
): Promise<SaveResult> => {
    try {
        const existingQuotes = loadQuotes();
        const quote = existingQuotes.find(q => q.id === quoteId);

        if (!quote) {
            return {
                success: false,
                status: 'error',
                error: 'Quote not found'
            };
        }

        const updatedQuote = addAuditEntry(quote, action, userId, userName, details);

        return await saveQuoteWithRetry(updatedQuote);

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to log quote action';
        return {
            success: false,
            status: 'error',
            error: errorMessage
        };
    }
};

/**
 * Deletes a quote from local storage by its ID.
 * @param quoteId - The ID of the quote to delete.
 */
export const deleteQuote = (quoteId: string) => {
    try {
        const existingQuotes = loadQuotes();
        const updatedQuotes = existingQuotes.filter(q => q.id !== quoteId);
        localStorage.setItem(SAVED_QUOTES_KEY, JSON.stringify(updatedQuotes));
    } catch {
        // Failed to delete quote from local storage
    }
};
