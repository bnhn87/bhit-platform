// ============================================================================
// SmartQuote v3 - Type Definitions
// ============================================================================

// ============================================================================
// ENUMS
// ============================================================================

export type AppView = 'home' | 'parsing' | 'results' | 'history' | 'templates';

export enum QuoteStatus {
    DRAFT = 'draft',
    PENDING_INTERNAL = 'pending_internal',
    APPROVED_INTERNAL = 'approved_internal',
    PENDING_CLIENT = 'pending_client',
    SENT = 'sent',
    NEGOTIATING = 'negotiating',
    WON = 'won',
    LOST = 'lost',
    EXPIRED = 'expired',
    CANCELLED = 'cancelled',
}

export enum ApprovalAction {
    APPROVED = 'approved',
    REJECTED = 'rejected',
    REQUESTED_CHANGES = 'requested_changes',
    CONDITIONAL_APPROVAL = 'conditional_approval',
    CANCELLED = 'cancelled',
}

export enum NotificationType {
    APPROVAL_REQUEST = 'approval_request',
    COMMENT_MENTION = 'comment_mention',
    STATUS_CHANGE = 'status_change',
    QUOTE_VIEWED = 'quote_viewed',
    APPROVAL_APPROVED = 'approval_approved',
    APPROVAL_REJECTED = 'approval_rejected',
    QUOTE_EXPIRED = 'quote_expired',
    QUOTE_WON = 'quote_won',
    QUOTE_LOST = 'quote_lost',
    CHANGE_REQUESTED = 'change_requested',
    CLIENT_FEEDBACK = 'client_feedback',
}

export enum NotificationPriority {
    LOW = 'low',
    NORMAL = 'normal',
    HIGH = 'high',
    URGENT = 'urgent',
}

export enum CommentType {
    GENERAL = 'general',
    CHANGE_REQUEST = 'change_request',
    APPROVAL_NOTE = 'approval_note',
    QUESTION = 'question',
    ANSWER = 'answer',
}

export enum PricingRuleType {
    VOLUME_DISCOUNT = 'volume_discount',
    CLIENT_SPECIFIC = 'client_specific',
    SEASONAL = 'seasonal',
    PRODUCT_BUNDLE = 'product_bundle',
    EARLY_PAYMENT = 'early_payment',
    MARKUP = 'markup',
    TIME_BASED = 'time_based',
    LOYALTY = 'loyalty',
    CLEARANCE = 'clearance',
}

// ============================================================================
// QUOTE TYPES (V3 Database Schema)
// ============================================================================
// NOTE: For calculations, use v1 types imported from '../smartquote/types'
// These v3 types are primarily for database storage and v3-specific features

export interface QuoteDetails {
    quoteRef: string;
    client: string;
    clientId?: string;
    project: string;
    deliveryAddress: string;
    collectionAddress?: string;
    preparedBy: string;
    upliftViaStairs: boolean;
    extendedUplift: boolean;
    specialistReworking: boolean;
    manuallyAddSupervisor: boolean;
    overrideFitterCount: number | null;
    overrideSupervisorCount: number | null;
    overrideVanType: string | null;
    overrideWasteVolumeM3: number | null;
    dailyParkingCharge: number | null;
    validUntil?: Date;
    parsedAddresses?: string[];
}

export interface ParsedProduct {
    lineNumber: number;
    productCode: string;
    rawDescription: string;
    cleanDescription: string; // Required to match v1 interface
    quantity: number;
    confidence?: number; // 0-100
}

export interface CalculatedProduct extends ParsedProduct {
    description: string;
    timePerUnit: number;
    totalTime: number;
    isHeavy: boolean;
    wastePerUnit: number;
    totalWaste: number;
    source: 'catalogue' | 'user-inputted' | 'default' | 'learned'; // Match v1 values exactly
    isManuallyEdited?: boolean;
}

export interface CalculationResults {
    detailedProducts: CalculatedProduct[];
    labour: LabourResults;
    crew: CrewResults;
    waste: WasteResults;
    pricing: PricingResults;
    summary: SummaryResults;
}

export interface LabourResults {
    totalInstallHours: number;
    totalUpliftHours: number;
    totalReworkingHours: number;
    totalLabourHours: number;
}

export interface CrewResults {
    fitterCount: number;
    supervisorCount: number;
    totalDays: number;
}

export interface WasteResults {
    totalWasteM3: number;
    skipsNeeded: number;
    skipCost: number;
}

export interface PricingResults {
    labourCost: number;
    vehicleCost: number;
    wasteCost: number;
    parkingCost: number;
    totalCost: number;
}

export interface SummaryResults {
    totalProducts: number;
    totalQuantity: number;
    estimatedDuration: string;
}

export interface Quote {
    id: string;
    quoteRef: string;
    quoteNumber: number;
    clientName: string;
    clientId?: string;
    projectName: string;
    quoteDetails: QuoteDetails;
    products: CalculatedProduct[];
    results: CalculationResults;
    totalAmount: number;
    marginPercent?: number;
    status: QuoteStatus;
    statusUpdatedAt: Date;
    statusUpdatedBy?: string;
    requiresApproval: boolean;
    approvalThresholdAmount?: number;
    approvedBy?: string;
    approvedAt?: Date;
    approvalNotes?: string;
    approvalConditions?: string;
    sentToClientAt?: Date;
    clientViewedAt?: Date;
    clientApprovedAt?: Date;
    clientFeedback?: string;
    publicLinkToken?: string;
    publicLinkExpiresAt?: Date;
    outcome?: 'won' | 'lost';
    outcomeDate?: Date;
    lostReason?: string;
    lostReasonCategory?: string;
    wonAmount?: number;
    convertedToJobId?: string;
    convertedToJobAt?: Date;
    revisionNumber: number;
    parentQuoteId?: string;
    isLatestRevision: boolean;
    parseConfidenceScore?: number;
    parseMethod?: string;
    parseWarnings?: string[];
    lowConfidenceProducts?: string[];
    validUntil?: Date;
    expiresAt?: Date;
    createdBy: string;
    createdAt: Date;
    updatedBy?: string;
    updatedAt: Date;
    deletedAt?: Date;
}

export interface SavedQuote {
    id: string;
    details: QuoteDetails;
    products: CalculatedProduct[];
    results: CalculationResults;
    savedAt: string;
    version: number;
}

// ============================================================================
// APPROVAL WORKFLOW TYPES
// ============================================================================

export interface ApprovalHistory {
    id: string;
    quoteId: string;
    action: ApprovalAction;
    previousStatus?: string;
    newStatus?: string;
    notes?: string;
    conditions?: string;
    changesRequested?: ChangeRequest[];
    performedBy: string;
    performedAt: Date;
    ipAddress?: string;
    userAgent?: string;
}

export interface ChangeRequest {
    field: string;
    currentValue: any;
    requestedValue: any;
    reason: string;
    priority: 'low' | 'medium' | 'high';
}

export interface ApprovalRule {
    id: string;
    name: string;
    description?: string;
    minAmount?: number;
    maxAmount?: number;
    requiredApproverRole?: string;
    requiredApproverUserIds?: string[];
    minApproversCount: number;
    autoApproveUnderAmount?: number;
    autoApproveConditions?: Record<string, any>;
    priority: number;
    isActive: boolean;
    createdBy?: string;
    createdAt: Date;
}

// ============================================================================
// COMMENT & COLLABORATION TYPES
// ============================================================================

export interface Comment {
    id: string;
    quoteId: string;
    commentText: string;
    isInternal: boolean;
    commentType: CommentType;
    parentCommentId?: string;
    threadRootId?: string;
    mentionedUserIds?: string[];
    attachments?: CommentAttachment[];
    context?: CommentContext;
    isResolved: boolean;
    resolvedBy?: string;
    resolvedAt?: Date;
    reactions?: Record<string, string[]>; // {emoji: [userId1, userId2]}
    edited: boolean;
    editedAt?: Date;
    originalText?: string;
    createdBy: string;
    createdByName?: string;
    createdByAvatar?: string;
    createdAt: Date;
    updatedAt: Date;
    deletedAt?: Date;
}

export interface CommentAttachment {
    filename: string;
    url: string;
    mimeType: string;
    size: number;
}

export interface CommentContext {
    productLineNumber?: number;
    field?: string;
    section?: string;
}

// ============================================================================
// NOTIFICATION TYPES
// ============================================================================

export interface Notification {
    id: string;
    userId: string;
    type: NotificationType;
    title: string;
    message?: string;
    quoteId?: string;
    commentId?: string;
    approvalId?: string;
    actionUrl?: string;
    actionLabel?: string;
    priority: NotificationPriority;
    read: boolean;
    readAt?: Date;
    sentPush: boolean;
    sentPushAt?: Date;
    sentEmail: boolean;
    sentEmailAt?: Date;
    sentSms: boolean;
    sentSmsAt?: Date;
    groupKey?: string;
    expiresAt?: Date;
    createdAt: Date;
}

export interface NotificationPreferences {
    approvalRequests: boolean;
    mentions: boolean;
    statusChanges: boolean;
    quoteViewed: boolean;
    wonLost: boolean;
    expiring: boolean;
}

// ============================================================================
// TEMPLATE TYPES
// ============================================================================

export interface QuoteTemplate {
    id: string;
    name: string;
    description?: string;
    category?: string;
    tags?: string[];
    templateData: {
        quoteDetails: Partial<QuoteDetails>;
        products: Partial<CalculatedProduct>[];
        defaultValues: Record<string, any>;
    };
    variables?: string[];
    variableDescriptions?: Record<string, string>;
    thumbnailUrl?: string;
    usageCount: number;
    lastUsedAt?: Date;
    avgQuoteValue?: number;
    isPublic: boolean;
    isFeatured: boolean;
    createdBy: string;
    sharedWithUserIds?: string[];
    sharedWithTeamIds?: string[];
    version: number;
    parentTemplateId?: string;
    isActive: boolean;
    archivedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

// ============================================================================
// PRICING RULE TYPES
// ============================================================================

export interface PricingRule {
    id: string;
    name: string;
    description?: string;
    code?: string;
    ruleType: PricingRuleType;
    conditions: PricingRuleConditions;
    action: PricingRuleAction;
    priority: number;
    isStackable: boolean;
    excludesRuleIds?: string[];
    activeFrom?: Date;
    activeUntil?: Date;
    isActive: boolean;
    maxUses?: number;
    currentUses: number;
    requiresApproval: boolean;
    autoApproveUnderDiscount?: number;
    createdBy?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface PricingRuleConditions {
    productCategory?: string;
    productCodes?: string[];
    minQuantity?: number;
    maxQuantity?: number;
    minTotal?: number;
    maxTotal?: number;
    clientId?: string;
    dateRange?: {
        start: string;
        end: string;
    };
    dayOfWeek?: number[];
    customCondition?: string;
}

export interface PricingRuleAction {
    discountPercent?: number;
    discountAmount?: number;
    fixedPrice?: number;
    markupPercent?: number;
    customAction?: string;
}

export interface PricingRuleApplication {
    id: string;
    quoteId: string;
    ruleId: string;
    appliedTo: any;
    discountAmount?: number;
    discountPercent?: number;
    originalAmount: number;
    finalAmount: number;
    appliedAt: Date;
}

// ============================================================================
// PRODUCT CATALOGUE & LEARNING TYPES
// ============================================================================

export interface ProductCatalogueItem {
    id: string;
    productCode: string;
    productName: string;
    description?: string;
    category?: string;
    subcategory?: string;
    tags?: string[];
    installTimeHours: number;
    installTimeConfidence?: number;
    installTimeSampleSize: number;
    isHeavy: boolean;
    weightKg?: number;
    dimensions?: {
        length?: number;
        width?: number;
        height?: number;
    };
    wasteVolumeM3: number;
    wasteCalculationMethod?: string;
    defaultPrice?: number;
    costPrice?: number;
    parentProductCode?: string;
    variationOf?: string;
    commonlyBundledWith?: string[];
    timesUsed: number;
    avgQuantityPerQuote?: number;
    lastUsedAt?: Date;
    source: string;
    isActive: boolean;
    discontinuedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

export interface ProductSuggestion {
    productCode: string;
    productName: string;
    reason: string;
    confidence: number; // 0-1
    suggestedQuantity?: number;
    basedOnProducts?: string[];
}

export interface ProductSimilarity {
    productA: string;
    productB: string;
    coOccurrenceCount: number;
    similarityScore: number;
    avgQuantityRatio?: number;
    lastUpdated: Date;
}

// ============================================================================
// ANALYTICS TYPES
// ============================================================================

export interface AnalyticsEvent {
    id: string;
    eventType: string;
    quoteId?: string;
    userId?: string;
    eventData?: Record<string, any>;
    durationMs?: number;
    ipAddress?: string;
    userAgent?: string;
    referrer?: string;
    createdAt: Date;
}

export interface ParseAnalytics {
    id: string;
    quoteId?: string;
    totalProductsDetected: number;
    productsAutoResolved: number;
    productsManualInput: number;
    avgConfidenceScore: number;
    parseDurationMs: number;
    parseAttempts: number;
    documentType?: string;
    documentPages?: number;
    documentSizeBytes?: number;
    createdAt: Date;
}

export interface ConversionMetrics {
    id: string;
    periodStart: Date;
    periodEnd: Date;
    quotesCreated: number;
    quotesSent: number;
    quotesViewed: number;
    quotesApprovedInternal: number;
    quotesApprovedClient: number;
    quotesWon: number;
    quotesLost: number;
    totalQuotedAmount: number;
    totalWonAmount: number;
    avgQuoteValue: number;
    avgWinValue: number;
    sentRate: number;
    viewRate: number;
    winRate: number;
    avgTimeToSendHours: number;
    avgTimeToWinDays: number;
    createdAt: Date;
}

// ============================================================================
// CLIENT TYPES
// ============================================================================

export interface Client {
    id: string;
    name: string;
    company?: string;
    primaryEmail?: string;
    primaryPhone?: string;
    clientType?: string;
    defaultDiscountPercent?: number;
    customPricingRules?: string[];
    paymentTerms?: string;
    creditLimit?: number;
    notes?: string;
    tags?: string[];
    totalQuotes: number;
    totalWon: number;
    totalRevenue: number;
    isActive: boolean;
    createdBy?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface ClientAddress {
    id: string;
    clientId: string;
    addressLine1: string;
    addressLine2?: string;
    city?: string;
    county?: string;
    postcode: string;
    country: string;
    addressType?: string;
    isPrimary: boolean;
    loadingBayAvailable: boolean;
    loadingBayNotes?: string;
    accessRestrictions?: string;
    parkingNotes?: string;
    inUlezZone: boolean;
    inCongestionZone: boolean;
    distanceFromBaseMiles?: number;
    latitude?: number;
    longitude?: number;
    createdAt: Date;
}

// ============================================================================
// MOBILE APP TYPES
// ============================================================================

export interface MobileDevice {
    id: string;
    userId: string;
    deviceName?: string;
    deviceType: string;
    deviceModel?: string;
    osVersion?: string;
    appVersion?: string;
    pushToken: string;
    pushProvider: string;
    notificationsEnabled: boolean;
    notificationPreferences?: NotificationPreferences;
    isActive: boolean;
    lastActiveAt?: Date;
    registeredAt: Date;
}

// ============================================================================
// APP CONFIG TYPES (from v1)
// ============================================================================

export interface AppConfig {
    productCatalogue: Record<string, ProductReference>;
    rules: ConfigRules;
    pricing: ConfigPricing;
    logistics: ConfigLogistics;
    vehicles: Record<string, VehicleConfig>;
}

export interface ProductReference {
    installTimeHours: number;
    isHeavy: boolean;
    wasteVolumeM3: number;
}

export interface ConfigRules {
    hoursPerDay: number;
    supervisorRatio: number;
    preparedByOptions: string[];
    upliftStairsMultiplier: number;
    extendedUpliftBaseHours: number;
    extendedUpliftHourlyRate: number;
    reworkingRate: number;
}

export interface ConfigPricing {
    fitterHourlyRate: number;
    supervisorHourlyRate: number;
    skipCostPer8M3: number;
    oneManVanDayRate: number;
    twoManVanDayRate: number;
}

export interface ConfigLogistics {
    oneManVanCapacityM3: number;
    twoManVanCapacityM3: number;
}

export interface VehicleConfig {
    label: string;
    capacity: number;
    costPerDay: number;
    crew: number;
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}

export interface PaginatedResponse<T> {
    data: T[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
}

// ============================================================================
// PARSING TYPES (Enhanced from v2)
// ============================================================================

export interface EnhancedParseResult {
    products: ParsedProduct[];
    details: Partial<QuoteDetails>;
    confidenceScore: number;
    warnings?: string[];
    excludedProducts?: ParsedProduct[];
    parseMethod: 'single_pass' | 'multi_pass';
    attempts: number;
    durationMs: number;
}

export interface ParseOptions {
    maxRetries?: number;
    minConfidence?: number;
    includeLowConfidence?: boolean;
    timeout?: number;
}

export type ParseContent = Array<string | { mimeType: string; data: string }>;

// ============================================================================
// UI STATE TYPES
// ============================================================================

export enum AppView {
    HOME = 'home',
    PARSING = 'parsing',
    MANUAL = 'manual',
    HISTORY = 'history',
    RESULTS = 'results',
    ADMIN = 'admin',
    COMPARISON = 'comparison',
    APPROVALS = 'approvals',
    ANALYTICS = 'analytics',
}

export enum AppState {
    IDLE = 'idle',
    LOADING = 'loading',
    AWAITING_INPUT = 'awaiting_input',
    DETAILS_ENTRY = 'details_entry',
    ERROR = 'error',
    SUCCESS = 'success',
}

// ============================================================================
// EXPORT ALL
// ============================================================================

export type {
    // Core types exported above
};
