// ========================================
// SmartQuote v2.0 - Enhanced Type Definitions
// ========================================

// Re-export base types from original (we'll extend them)
export * from '../../smartquote/types';

// ========================================
// PRODUCT LEARNING SYSTEM
// ========================================

export interface ProductSelection {
    id: string;
    quoteId: string;
    productCode: string;
    quantity: number;
    selectedWith: string[]; // Other products in same quote
    documentSource?: string;
    userId?: string;
    confidenceScore?: number;
    createdAt: string;
}

export interface ProductSimilarity {
    productA: string;
    productB: string;
    coOccurrenceCount: number;
    similarityScore: number;
    lastUpdated: string;
}

export interface ProductTimeAdjustment {
    id: string;
    productCode: string;
    originalTime: number;
    adjustedTime: number;
    adjustmentFactor: number;
    adjustmentReason?: string;
    context?: Record<string, any>;
    quoteId?: string;
    createdBy?: string;
    createdAt: string;
}

export interface LearnedProductTime {
    productCode: string;
    avgTimeHours: number;
    medianTimeHours: number;
    stdDev: number;
    sampleCount: number;
    confidenceLevel: number;
    lastUpdated: string;
}

export interface ProductSuggestion {
    productCode: string;
    productName: string;
    similarityScore: number;
    coOccurrenceCount: number;
    reason: 'frequently_paired' | 'similar_context' | 'time_similar';
}

// ========================================
// REVISION TRACKING
// ========================================

export interface QuoteRevision {
    id: string;
    quoteId: string;
    revisionNumber: number;
    details: any; // QuoteDetails from base types
    products: any[]; // CalculatedProduct[] from base types
    results: any; // CalculationResults from base types
    changesSummary?: string;
    previousRevisionId?: string;
    createdBy?: string;
    createdAt: string;
}

export interface AuditLogEntry {
    id: string;
    quoteId: string;
    revisionNumber?: number;
    action: 'created' | 'updated' | 'exported_pdf' | 'exported_xlsx' | 'job_created' | 'sent' | 'accepted' | 'rejected';
    details?: string;
    userId?: string;
    userName?: string;
    timestamp: string;
}

export interface QuoteWithRevisions {
    id: string;
    quoteRef: string;
    client: string;
    project: string;
    currentRevision: number;
    status: 'draft' | 'sent' | 'accepted' | 'rejected' | 'superseded';
    createdBy?: string;
    createdAt: string;
    updatedAt: string;
    revisions: QuoteRevision[];
    auditLog: AuditLogEntry[];
}

// ========================================
// EMAIL AUTOMATION
// ========================================

export interface QuoteEmail {
    id: string;
    fromEmail: string;
    subject?: string;
    body?: string;
    rawEmail?: Record<string, any>;
    attachments?: EmailAttachment[];
    receivedAt: string;
    processedAt?: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    errorMessage?: string;
    quoteId?: string;
}

export interface EmailAttachment {
    filename: string;
    mimeType: string;
    size: number;
    data?: string; // base64
    url?: string;
}

export interface QuoteDraft {
    id: string;
    emailId: string;
    parsedData: any; // ParseResult
    confidenceScore?: number;
    aiNotes?: string[];
    requiresAttention: boolean;
    attentionFlags?: string[];
    status: 'pending_review' | 'approved' | 'rejected' | 'superseded';
    reviewedBy?: string;
    reviewedAt?: string;
    reviewNotes?: string;
    createdAt: string;
}

// ========================================
// IMAGE EXTRACTION
// ========================================

export interface QuoteImage {
    id: string;
    quoteId: string;
    imageUrl?: string;
    storagePath: string;
    filename: string;
    mimeType: string;
    fileSize?: number;
    sourceType: 'pdf' | 'upload' | 'generated';
    pageNumber?: number;
    extractionMethod?: string;
    width?: number;
    height?: number;
    thumbnailUrl?: string;
    includedInOutput: boolean;
    displayOrder: number;
    createdAt: string;
}

// ========================================
// ANALYTICS
// ========================================

export interface ParseAnalytics {
    id: string;
    quoteId?: string;
    totalProductsDetected: number;
    productsAutoResolved: number;
    productsManualInput: number;
    avgConfidenceScore?: number;
    parseDurationMs?: number;
    totalProcessingTimeMs?: number;
    documentType?: string;
    documentPages?: number;
    documentSizeKb?: number;
    createdAt: string;
}

export interface QuoteMetrics {
    quoteId: string;
    totalValue: number;
    productCount: number;
    revisionCount: number;
    convertedToJob: boolean;
    jobId?: string;
    conversionDate?: string;
    timeToFirstSend?: string; // ISO duration
    timeToAcceptance?: string; // ISO duration
    lastUpdated: string;
}

// ========================================
// ENHANCED PARSE RESULT
// ========================================

export interface EnhancedParseResult {
    products: any[]; // ParsedProduct[] with confidence
    excludedProducts?: any[]; // For review
    details: Partial<any>; // Quote details
    confidenceScore: number; // Overall confidence (0-1)
    parseMetadata: {
        duration: number;
        retryCount: number;
        model: string;
        temperature: number;
    };
    suggestions?: ProductSuggestion[]; // AI-suggested related products
    warnings?: string[]; // Parse warnings
}

// ========================================
// SERVICE INTERFACES
// ========================================

export interface ProductLearningService {
    recordSelection(quoteId: string, productCode: string, quantity: number, selectedWith: string[]): Promise<void>;
    getSuggestions(productCodes: string[]): Promise<ProductSuggestion[]>;
    recordTimeAdjustment(productCode: string, originalTime: number, adjustedTime: number, context?: any): Promise<void>;
    getLearnedTime(productCode: string): Promise<LearnedProductTime | null>;
}

export interface RevisionTrackingService {
    createRevision(quoteId: string, details: any, products: any[], results: any, changesSummary?: string): Promise<QuoteRevision>;
    getRevisionHistory(quoteId: string): Promise<QuoteRevision[]>;
    compareRevisions(rev1Id: string, rev2Id: string): Promise<any>; // Returns diff
    logAction(quoteId: string, action: string, details?: string): Promise<void>;
}

export interface EmailAutomationService {
    processIncomingEmail(email: QuoteEmail): Promise<QuoteDraft>;
    createDraft(emailId: string, parsedData: any, confidenceScore: number): Promise<QuoteDraft>;
    approveDraft(draftId: string, reviewNotes?: string): Promise<string>; // Returns quoteId
    rejectDraft(draftId: string, reason: string): Promise<void>;
}

export interface ImageExtractionService {
    extractImagesFromPDF(pdfData: string | Uint8Array, quoteId: string): Promise<QuoteImage[]>;
    uploadImage(quoteId: string, imageData: Blob, metadata: Partial<QuoteImage>): Promise<QuoteImage>;
    getQuoteImages(quoteId: string): Promise<QuoteImage[]>;
    deleteImage(imageId: string): Promise<void>;
}

// ========================================
// UTILITY TYPES
// ========================================

export interface ValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    suggestions?: string[];
}

export interface ConfidenceMetrics {
    overall: number;
    parsing: number;
    productResolution: number;
    catalogueMatch: number;
}

export interface SmartQuoteConfig {
    // Enhanced config extending base AppConfig
    learningEnabled: boolean;
    autoSuggestProducts: boolean;
    minConfidenceThreshold: number;
    emailAutomationEnabled: boolean;
    imageExtractionEnabled: boolean;
    maxRevisionHistory: number;
}
