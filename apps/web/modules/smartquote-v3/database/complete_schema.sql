-- ============================================================================
-- SmartQuote v3 - Complete Database Schema
-- ============================================================================
--
-- This schema combines the best of v1 + v2 plus new enterprise features:
-- ✅ Multi-pass parsing with confidence scoring (v2)
-- ✅ Product learning & pattern detection (v2)
-- ✅ Automatic revision tracking (v2)
-- ✅ Complete export & job creation (v1)
-- ✅ Multi-address management (v1)
-- ✅ Realistic waste calculation (v1)
-- ✅ Approval workflow system (NEW)
-- ✅ Notifications & collaboration (NEW)
-- ✅ Status lifecycle tracking (NEW)
-- ✅ Quote templates (NEW)
-- ✅ Pricing rules engine (NEW)
-- ✅ Client portal features (NEW)
-- ✅ Analytics & reporting (NEW)
--
-- Version: 3.0.0
-- Last Updated: 2025-11-04
-- ============================================================================

-- ============================================================================
-- SECTION 1: CORE QUOTES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS smartquote_v3_quotes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Quote identification
    quote_ref TEXT UNIQUE NOT NULL,
    quote_number SERIAL,

    -- Client information
    client_name TEXT NOT NULL,
    client_id UUID, -- Foreign key to clients table if exists
    project_name TEXT,

    -- Quote details (JSON storage for flexibility)
    quote_details JSONB NOT NULL DEFAULT '{}'::jsonb,
    -- Contains: deliveryAddress, preparedBy, upliftViaStairs, extendedUplift, etc.

    -- Products (array of product line items)
    products JSONB NOT NULL DEFAULT '[]'::jsonb,
    -- Each product: {lineNumber, productCode, description, quantity, timePerUnit, etc.}

    -- Calculation results
    results JSONB NOT NULL DEFAULT '{}'::jsonb,
    -- Contains: labour, crew, waste, pricing, vehicles, etc.

    -- Financial
    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    margin_percent DECIMAL(5,2),

    -- Status & workflow
    status TEXT NOT NULL DEFAULT 'draft',
    -- Possible values: 'draft', 'pending_internal', 'approved_internal',
    -- 'pending_client', 'sent', 'negotiating', 'won', 'lost', 'expired', 'cancelled'

    status_updated_at TIMESTAMPTZ DEFAULT NOW(),
    status_updated_by UUID,

    -- Approval workflow
    requires_approval BOOLEAN DEFAULT true,
    approval_threshold_amount DECIMAL(10,2) DEFAULT 5000.00,
    approved_by UUID,
    approved_at TIMESTAMPTZ,
    approval_notes TEXT,
    approval_conditions TEXT,

    -- Client interaction
    sent_to_client_at TIMESTAMPTZ,
    client_viewed_at TIMESTAMPTZ,
    client_approved_at TIMESTAMPTZ,
    client_feedback TEXT,
    client_signature_url TEXT,

    -- Public sharing
    public_link_token TEXT UNIQUE,
    public_link_expires_at TIMESTAMPTZ,
    public_link_password_hash TEXT,

    -- Win/Loss tracking
    outcome TEXT, -- 'won', 'lost', null
    outcome_date TIMESTAMPTZ,
    lost_reason TEXT,
    lost_reason_category TEXT, -- 'price', 'timeline', 'competitor', 'other'
    won_amount DECIMAL(10,2),

    -- Job conversion
    converted_to_job_id UUID,
    converted_to_job_at TIMESTAMPTZ,

    -- Revision tracking
    revision_number INTEGER DEFAULT 1,
    parent_quote_id UUID REFERENCES smartquote_v3_quotes(id),
    is_latest_revision BOOLEAN DEFAULT true,

    -- AI parsing metadata
    parse_confidence_score DECIMAL(5,2), -- 0.00 to 100.00
    parse_method TEXT, -- 'single_pass', 'multi_pass', 'manual'
    parse_warnings TEXT[],
    low_confidence_products TEXT[], -- Product codes with low confidence

    -- Expiry
    valid_until DATE,
    expires_at TIMESTAMPTZ,

    -- Metadata
    created_by UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ, -- Soft delete

    -- Full-text search
    search_vector tsvector,

    -- Constraints
    CONSTRAINT valid_status CHECK (status IN (
        'draft', 'pending_internal', 'approved_internal',
        'pending_client', 'sent', 'negotiating',
        'won', 'lost', 'expired', 'cancelled'
    )),
    CONSTRAINT valid_outcome CHECK (outcome IS NULL OR outcome IN ('won', 'lost'))
);

-- Indexes for performance
CREATE INDEX idx_quotes_status ON smartquote_v3_quotes(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_quotes_created_by ON smartquote_v3_quotes(created_by) WHERE deleted_at IS NULL;
CREATE INDEX idx_quotes_client_name ON smartquote_v3_quotes(client_name) WHERE deleted_at IS NULL;
CREATE INDEX idx_quotes_created_at ON smartquote_v3_quotes(created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_quotes_approval_pending ON smartquote_v3_quotes(status, requires_approval)
    WHERE status IN ('pending_internal', 'pending_client') AND deleted_at IS NULL;
CREATE INDEX idx_quotes_public_link ON smartquote_v3_quotes(public_link_token) WHERE public_link_token IS NOT NULL;
CREATE INDEX idx_quotes_search ON smartquote_v3_quotes USING GIN(search_vector);
CREATE INDEX idx_quotes_outcome ON smartquote_v3_quotes(outcome, outcome_date) WHERE outcome IS NOT NULL;

-- Update search vector trigger
CREATE OR REPLACE FUNCTION smartquote_v3_quotes_search_update() RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector :=
        setweight(to_tsvector('english', COALESCE(NEW.quote_ref, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.client_name, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.project_name, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(NEW.quote_details::text, '')), 'C');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER quotes_search_vector_update
    BEFORE INSERT OR UPDATE ON smartquote_v3_quotes
    FOR EACH ROW EXECUTE FUNCTION smartquote_v3_quotes_search_update();

-- Update timestamp trigger
CREATE OR REPLACE FUNCTION update_updated_at_column() RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER quotes_updated_at
    BEFORE UPDATE ON smartquote_v3_quotes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- SECTION 2: REVISION HISTORY
-- ============================================================================

CREATE TABLE IF NOT EXISTS smartquote_v3_revisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_id UUID NOT NULL REFERENCES smartquote_v3_quotes(id) ON DELETE CASCADE,

    -- Revision info
    revision_number INTEGER NOT NULL,
    changes_description TEXT NOT NULL,

    -- Snapshot of quote at this revision
    quote_snapshot JSONB NOT NULL,
    -- Contains complete quote state: details, products, results

    -- Diff from previous revision
    changes_diff JSONB,
    -- Structured diff showing what changed

    -- Metadata
    created_by UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(quote_id, revision_number)
);

CREATE INDEX idx_revisions_quote ON smartquote_v3_revisions(quote_id, revision_number DESC);
CREATE INDEX idx_revisions_created_at ON smartquote_v3_revisions(created_at DESC);

-- ============================================================================
-- SECTION 3: APPROVAL WORKFLOW
-- ============================================================================

CREATE TABLE IF NOT EXISTS smartquote_v3_approval_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_id UUID NOT NULL REFERENCES smartquote_v3_quotes(id) ON DELETE CASCADE,

    -- Action taken
    action TEXT NOT NULL, -- 'approved', 'rejected', 'requested_changes', 'cancelled'

    -- Status transition
    previous_status TEXT,
    new_status TEXT,

    -- Details
    notes TEXT,
    conditions TEXT, -- e.g., "Approved if price reduced by 5%"
    changes_requested JSONB, -- Structured change requests

    -- Actor
    performed_by UUID NOT NULL,
    performed_at TIMESTAMPTZ DEFAULT NOW(),

    -- IP & device info for audit
    ip_address INET,
    user_agent TEXT,

    CONSTRAINT valid_approval_action CHECK (action IN (
        'approved', 'rejected', 'requested_changes', 'cancelled', 'conditional_approval'
    ))
);

CREATE INDEX idx_approval_history_quote ON smartquote_v3_approval_history(quote_id, performed_at DESC);
CREATE INDEX idx_approval_history_user ON smartquote_v3_approval_history(performed_by, performed_at DESC);

-- Approval rules (who can approve what)
CREATE TABLE IF NOT EXISTS smartquote_v3_approval_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Rule definition
    name TEXT NOT NULL,
    description TEXT,

    -- Conditions
    min_amount DECIMAL(10,2),
    max_amount DECIMAL(10,2),

    -- Required approvers
    required_approver_role TEXT, -- 'manager', 'director', 'admin'
    required_approver_user_ids UUID[],
    min_approvers_count INTEGER DEFAULT 1,

    -- Auto-approval
    auto_approve_under_amount DECIMAL(10,2),
    auto_approve_conditions JSONB,

    -- Priority
    priority INTEGER DEFAULT 100, -- Lower = higher priority

    -- Active status
    is_active BOOLEAN DEFAULT true,

    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_approval_rules_active ON smartquote_v3_approval_rules(is_active, priority);

-- ============================================================================
-- SECTION 4: COMMENTS & COLLABORATION
-- ============================================================================

CREATE TABLE IF NOT EXISTS smartquote_v3_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_id UUID NOT NULL REFERENCES smartquote_v3_quotes(id) ON DELETE CASCADE,

    -- Comment content
    comment_text TEXT NOT NULL,

    -- Type
    is_internal BOOLEAN DEFAULT true, -- false = visible to client
    comment_type TEXT DEFAULT 'general', -- 'general', 'change_request', 'approval_note'

    -- Threading
    parent_comment_id UUID REFERENCES smartquote_v3_comments(id) ON DELETE CASCADE,
    thread_root_id UUID REFERENCES smartquote_v3_comments(id) ON DELETE CASCADE,

    -- Mentions & notifications
    mentioned_user_ids UUID[], -- Users mentioned with @

    -- Attachments
    attachments JSONB, -- Array of {filename, url, mimeType, size}

    -- Context (what was being commented on)
    context JSONB, -- {productLineNumber: 5, field: 'price', etc.}

    -- Resolution
    is_resolved BOOLEAN DEFAULT false,
    resolved_by UUID,
    resolved_at TIMESTAMPTZ,

    -- Reactions (like Slack)
    reactions JSONB DEFAULT '{}'::jsonb, -- {emoji: [userId1, userId2]}

    -- Edit history
    edited BOOLEAN DEFAULT false,
    edited_at TIMESTAMPTZ,
    original_text TEXT,

    -- Metadata
    created_by UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ, -- Soft delete

    CONSTRAINT valid_comment_type CHECK (comment_type IN (
        'general', 'change_request', 'approval_note', 'question', 'answer'
    ))
);

CREATE INDEX idx_comments_quote ON smartquote_v3_comments(quote_id, created_at DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_comments_thread ON smartquote_v3_comments(thread_root_id, created_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_comments_unresolved ON smartquote_v3_comments(quote_id, is_resolved)
    WHERE NOT is_resolved AND deleted_at IS NULL;
CREATE INDEX idx_comments_mentions ON smartquote_v3_comments USING GIN(mentioned_user_ids);

-- ============================================================================
-- SECTION 5: NOTIFICATIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS smartquote_v3_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Recipient
    user_id UUID NOT NULL,

    -- Notification type
    type TEXT NOT NULL,
    -- 'approval_request', 'comment_mention', 'status_change', 'quote_viewed',
    -- 'approval_approved', 'approval_rejected', 'quote_expired', 'quote_won', 'quote_lost'

    -- Content
    title TEXT NOT NULL,
    message TEXT,

    -- Related entities
    quote_id UUID REFERENCES smartquote_v3_quotes(id) ON DELETE CASCADE,
    comment_id UUID REFERENCES smartquote_v3_comments(id) ON DELETE CASCADE,
    approval_id UUID REFERENCES smartquote_v3_approval_history(id) ON DELETE CASCADE,

    -- Action
    action_url TEXT,
    action_label TEXT,

    -- Priority
    priority TEXT DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'

    -- Read status
    read BOOLEAN DEFAULT false,
    read_at TIMESTAMPTZ,

    -- Delivery status
    sent_push BOOLEAN DEFAULT false,
    sent_push_at TIMESTAMPTZ,
    push_token TEXT,

    sent_email BOOLEAN DEFAULT false,
    sent_email_at TIMESTAMPTZ,
    email_address TEXT,

    sent_sms BOOLEAN DEFAULT false,
    sent_sms_at TIMESTAMPTZ,
    phone_number TEXT,

    -- Grouping (for batching similar notifications)
    group_key TEXT,

    -- Expiry
    expires_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT valid_notification_type CHECK (type IN (
        'approval_request', 'comment_mention', 'status_change', 'quote_viewed',
        'approval_approved', 'approval_rejected', 'quote_expired', 'quote_won',
        'quote_lost', 'change_requested', 'client_feedback'
    )),
    CONSTRAINT valid_priority CHECK (priority IN ('low', 'normal', 'high', 'urgent'))
);

CREATE INDEX idx_notifications_user_unread ON smartquote_v3_notifications(user_id, read, created_at DESC);
CREATE INDEX idx_notifications_quote ON smartquote_v3_notifications(quote_id, created_at DESC);
CREATE INDEX idx_notifications_group ON smartquote_v3_notifications(group_key, created_at DESC)
    WHERE group_key IS NOT NULL;

-- ============================================================================
-- SECTION 6: TEMPLATES
-- ============================================================================

CREATE TABLE IF NOT EXISTS smartquote_v3_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Template info
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    tags TEXT[],

    -- Template content (JSON structure of quote)
    template_data JSONB NOT NULL,
    -- Contains: quote_details template, products template, default values

    -- Variables that can be replaced
    variables TEXT[], -- ['{{client_name}}', '{{project_name}}', '{{date}}', etc.]
    variable_descriptions JSONB, -- Help text for each variable

    -- Preview
    thumbnail_url TEXT,

    -- Usage & stats
    usage_count INTEGER DEFAULT 0,
    last_used_at TIMESTAMPTZ,
    avg_quote_value DECIMAL(10,2),

    -- Sharing
    is_public BOOLEAN DEFAULT false,
    is_featured BOOLEAN DEFAULT false,
    created_by UUID NOT NULL,
    shared_with_user_ids UUID[],
    shared_with_team_ids UUID[],

    -- Versioning
    version INTEGER DEFAULT 1,
    parent_template_id UUID REFERENCES smartquote_v3_templates(id),

    -- Active status
    is_active BOOLEAN DEFAULT true,
    archived_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_templates_category ON smartquote_v3_templates(category, is_active);
CREATE INDEX idx_templates_usage ON smartquote_v3_templates(usage_count DESC, last_used_at DESC);
CREATE INDEX idx_templates_creator ON smartquote_v3_templates(created_by, created_at DESC);
CREATE INDEX idx_templates_tags ON smartquote_v3_templates USING GIN(tags);
CREATE INDEX idx_templates_featured ON smartquote_v3_templates(is_featured, is_active)
    WHERE is_featured = true AND is_active = true;

-- ============================================================================
-- SECTION 7: PRICING RULES ENGINE
-- ============================================================================

CREATE TABLE IF NOT EXISTS smartquote_v3_pricing_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Rule identification
    name TEXT NOT NULL,
    description TEXT,
    code TEXT UNIQUE, -- Short code like 'VOL_DISCOUNT_10'

    -- Rule type
    rule_type TEXT NOT NULL,
    -- 'volume_discount', 'client_specific', 'seasonal', 'product_bundle',
    -- 'early_payment', 'markup', 'time_based'

    -- Conditions (when to apply this rule)
    conditions JSONB NOT NULL,
    -- Examples:
    -- {"product_category": "desks", "min_quantity": 10}
    -- {"client_id": "uuid", "min_total": 5000}
    -- {"date_range": {"start": "2025-01-01", "end": "2025-03-31"}}

    -- Action (what to do when conditions met)
    action JSONB NOT NULL,
    -- Examples:
    -- {"discount_percent": 5}
    -- {"discount_amount": 100}
    -- {"fixed_price": 1200}
    -- {"markup_percent": 15}

    -- Priority (lower = higher priority, applied first)
    priority INTEGER DEFAULT 100,

    -- Stackable with other rules?
    is_stackable BOOLEAN DEFAULT false,

    -- Exclusions
    excludes_rule_ids UUID[], -- Cannot be combined with these rules

    -- Active period
    active_from TIMESTAMPTZ,
    active_until TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,

    -- Usage limits
    max_uses INTEGER, -- Max number of times this rule can be applied
    current_uses INTEGER DEFAULT 0,

    -- Approval requirements
    requires_approval BOOLEAN DEFAULT false,
    auto_approve_under_discount DECIMAL(5,2), -- Auto-approve if discount < X%

    -- Metadata
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT valid_rule_type CHECK (rule_type IN (
        'volume_discount', 'client_specific', 'seasonal', 'product_bundle',
        'early_payment', 'markup', 'time_based', 'loyalty', 'clearance'
    ))
);

CREATE INDEX idx_pricing_rules_active ON smartquote_v3_pricing_rules(is_active, priority, active_from, active_until);
CREATE INDEX idx_pricing_rules_type ON smartquote_v3_pricing_rules(rule_type, is_active);

-- Track rule applications
CREATE TABLE IF NOT EXISTS smartquote_v3_pricing_rule_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_id UUID NOT NULL REFERENCES smartquote_v3_quotes(id) ON DELETE CASCADE,
    rule_id UUID NOT NULL REFERENCES smartquote_v3_pricing_rules(id),

    -- Application details
    applied_to JSONB, -- Which products/line items
    discount_amount DECIMAL(10,2),
    discount_percent DECIMAL(5,2),

    -- Result
    original_amount DECIMAL(10,2),
    final_amount DECIMAL(10,2),

    applied_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_rule_applications_quote ON smartquote_v3_pricing_rule_applications(quote_id);
CREATE INDEX idx_rule_applications_rule ON smartquote_v3_pricing_rule_applications(rule_id, applied_at DESC);

-- ============================================================================
-- SECTION 8: PRODUCT CATALOGUE & LEARNING (from v2)
-- ============================================================================

CREATE TABLE IF NOT EXISTS smartquote_v3_product_catalogue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Product identification
    product_code TEXT UNIQUE NOT NULL,
    product_name TEXT NOT NULL,
    description TEXT,

    -- Category & classification
    category TEXT,
    subcategory TEXT,
    tags TEXT[],

    -- Installation data
    install_time_hours DECIMAL(10,2) NOT NULL,
    install_time_confidence DECIMAL(3,2), -- 0.00-1.00
    install_time_sample_size INTEGER DEFAULT 0,

    -- Physical properties
    is_heavy BOOLEAN DEFAULT false,
    weight_kg DECIMAL(10,2),
    dimensions_cm JSONB, -- {length, width, height}

    -- Waste calculation
    waste_volume_m3 DECIMAL(10,4) DEFAULT 0.035,
    waste_calculation_method TEXT, -- 'fixed', 'calculated', 'learned'

    -- Pricing
    default_price DECIMAL(10,2),
    cost_price DECIMAL(10,2),

    -- Variations & relationships
    parent_product_code TEXT,
    variation_of TEXT,
    commonly_bundled_with TEXT[], -- Product codes

    -- Learning metadata
    times_used INTEGER DEFAULT 0,
    avg_quantity_per_quote DECIMAL(10,2),
    last_used_at TIMESTAMPTZ,

    -- Data source
    source TEXT DEFAULT 'manual', -- 'manual', 'learned', 'imported'

    -- Status
    is_active BOOLEAN DEFAULT true,
    discontinued_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_catalogue_code ON smartquote_v3_product_catalogue(product_code) WHERE is_active = true;
CREATE INDEX idx_catalogue_category ON smartquote_v3_product_catalogue(category, subcategory);
CREATE INDEX idx_catalogue_usage ON smartquote_v3_product_catalogue(times_used DESC, last_used_at DESC);
CREATE INDEX idx_catalogue_tags ON smartquote_v3_product_catalogue USING GIN(tags);

-- Product learning: Track selections
CREATE TABLE IF NOT EXISTS smartquote_v3_product_selections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_id UUID NOT NULL REFERENCES smartquote_v3_quotes(id) ON DELETE CASCADE,

    -- Selection data
    product_code TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    time_per_unit DECIMAL(10,2),

    -- Context
    selected_with TEXT[], -- Other product codes in same quote
    document_source TEXT, -- 'pdf', 'excel', 'word', 'manual', 'camera'
    parse_confidence DECIMAL(5,2),

    -- User data
    user_id UUID,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_selections_product ON smartquote_v3_product_selections(product_code, created_at DESC);
CREATE INDEX idx_selections_quote ON smartquote_v3_product_selections(quote_id);

-- Product similarity scoring
CREATE TABLE IF NOT EXISTS smartquote_v3_product_similarities (
    product_a TEXT NOT NULL,
    product_b TEXT NOT NULL,

    -- Similarity metrics
    co_occurrence_count INTEGER DEFAULT 1,
    similarity_score DECIMAL(5,4), -- 0.0000-1.0000

    -- Context
    avg_quantity_ratio DECIMAL(10,4), -- How many B's per A typically

    last_updated TIMESTAMPTZ DEFAULT NOW(),

    PRIMARY KEY (product_a, product_b),
    CHECK (product_a < product_b) -- Alphabetical to prevent duplicates
);

CREATE INDEX idx_similarities_a ON smartquote_v3_product_similarities(product_a, similarity_score DESC);
CREATE INDEX idx_similarities_b ON smartquote_v3_product_similarities(product_b, similarity_score DESC);

-- Product time adjustments (learning)
CREATE TABLE IF NOT EXISTS smartquote_v3_product_time_adjustments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Product
    product_code TEXT NOT NULL,

    -- Time data
    original_time DECIMAL(10,2) NOT NULL,
    adjusted_time DECIMAL(10,2) NOT NULL,
    adjustment_factor DECIMAL(10,4) NOT NULL, -- adjusted / original

    -- Reason
    adjustment_reason TEXT,
    context JSONB, -- Additional context

    -- Quote reference
    quote_id UUID REFERENCES smartquote_v3_quotes(id),

    -- User
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_time_adjustments_product ON smartquote_v3_product_time_adjustments(product_code, created_at DESC);

-- ============================================================================
-- SECTION 9: ANALYTICS & REPORTING
-- ============================================================================

CREATE TABLE IF NOT EXISTS smartquote_v3_analytics_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Event type
    event_type TEXT NOT NULL,
    -- 'quote_created', 'quote_parsed', 'quote_sent', 'quote_viewed',
    -- 'quote_approved', 'quote_won', 'quote_lost', 'export_pdf', 'export_excel'

    -- Related entities
    quote_id UUID REFERENCES smartquote_v3_quotes(id),
    user_id UUID,

    -- Event data
    event_data JSONB,
    -- Contains metrics specific to event type

    -- Performance metrics
    duration_ms INTEGER, -- How long the operation took

    -- Context
    ip_address INET,
    user_agent TEXT,
    referrer TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_analytics_type ON smartquote_v3_analytics_events(event_type, created_at DESC);
CREATE INDEX idx_analytics_quote ON smartquote_v3_analytics_events(quote_id, event_type);
CREATE INDEX idx_analytics_user ON smartquote_v3_analytics_events(user_id, created_at DESC);

-- Parse analytics (from v2)
CREATE TABLE IF NOT EXISTS smartquote_v3_parse_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_id UUID REFERENCES smartquote_v3_quotes(id),

    -- Parse metrics
    total_products_detected INTEGER,
    products_auto_resolved INTEGER,
    products_manual_input INTEGER,
    avg_confidence_score DECIMAL(5,2),

    -- Performance
    parse_duration_ms INTEGER,
    parse_attempts INTEGER DEFAULT 1, -- For multi-pass parsing

    -- Document info
    document_type TEXT, -- 'pdf', 'excel', 'word', 'image', 'text'
    document_pages INTEGER,
    document_size_bytes BIGINT,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_parse_analytics_date ON smartquote_v3_parse_analytics(created_at DESC);

-- Conversion funnel tracking
CREATE TABLE IF NOT EXISTS smartquote_v3_conversion_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Time period
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,

    -- Funnel metrics
    quotes_created INTEGER DEFAULT 0,
    quotes_sent INTEGER DEFAULT 0,
    quotes_viewed INTEGER DEFAULT 0,
    quotes_approved_internal INTEGER DEFAULT 0,
    quotes_approved_client INTEGER DEFAULT 0,
    quotes_won INTEGER DEFAULT 0,
    quotes_lost INTEGER DEFAULT 0,

    -- Financial metrics
    total_quoted_amount DECIMAL(12,2) DEFAULT 0,
    total_won_amount DECIMAL(12,2) DEFAULT 0,
    avg_quote_value DECIMAL(10,2),
    avg_win_value DECIMAL(10,2),

    -- Conversion rates
    sent_rate DECIMAL(5,2), -- sent / created
    view_rate DECIMAL(5,2), -- viewed / sent
    win_rate DECIMAL(5,2), -- won / sent

    -- Timing
    avg_time_to_send_hours DECIMAL(10,2),
    avg_time_to_win_days DECIMAL(10,2),

    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(period_start, period_end)
);

CREATE INDEX idx_conversion_metrics_period ON smartquote_v3_conversion_metrics(period_start DESC);

-- ============================================================================
-- SECTION 10: CLIENT PORTAL & PUBLIC ACCESS
-- ============================================================================

CREATE TABLE IF NOT EXISTS smartquote_v3_client_portal_access (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_id UUID NOT NULL REFERENCES smartquote_v3_quotes(id) ON DELETE CASCADE,

    -- Access token (different from quote's public_link_token)
    access_token TEXT UNIQUE NOT NULL,

    -- Client info
    client_email TEXT NOT NULL,
    client_name TEXT,
    client_phone TEXT,

    -- Access control
    can_approve BOOLEAN DEFAULT true,
    can_comment BOOLEAN DEFAULT true,
    can_request_changes BOOLEAN DEFAULT true,

    -- Password protection
    password_hash TEXT,

    -- Expiry
    expires_at TIMESTAMPTZ,

    -- Tracking
    access_count INTEGER DEFAULT 0,
    last_accessed_at TIMESTAMPTZ,
    ip_addresses INET[], -- Track all IPs that accessed

    -- E-signature
    signature_data TEXT, -- Base64 encoded signature image
    signature_ip INET,
    signed_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_client_portal_token ON smartquote_v3_client_portal_access(access_token);
CREATE INDEX idx_client_portal_quote ON smartquote_v3_client_portal_access(quote_id);
CREATE INDEX idx_client_portal_email ON smartquote_v3_client_portal_access(client_email);

-- ============================================================================
-- SECTION 11: EMAIL & DOCUMENT TRACKING
-- ============================================================================

CREATE TABLE IF NOT EXISTS smartquote_v3_quote_emails (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_id UUID REFERENCES smartquote_v3_quotes(id) ON DELETE CASCADE,

    -- Email details
    from_email TEXT NOT NULL,
    to_emails TEXT[] NOT NULL,
    cc_emails TEXT[],
    bcc_emails TEXT[],

    subject TEXT NOT NULL,
    body_html TEXT,
    body_text TEXT,

    -- Attachments
    attachments JSONB, -- [{filename, url, size, mimeType}]

    -- Type
    email_type TEXT, -- 'quote_send', 'follow_up', 'approval_request', 'won', 'lost'

    -- Status
    status TEXT DEFAULT 'pending', -- 'pending', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed'

    -- Tracking
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    opened_at TIMESTAMPTZ,
    clicked_at TIMESTAMPTZ,

    -- External IDs (for email service provider)
    external_message_id TEXT,

    -- Error handling
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_quote_emails_quote ON smartquote_v3_quote_emails(quote_id, created_at DESC);
CREATE INDEX idx_quote_emails_status ON smartquote_v3_quote_emails(status, sent_at);

-- ============================================================================
-- SECTION 12: CLIENTS & ADDRESSES (from v1 enhanced)
-- ============================================================================

CREATE TABLE IF NOT EXISTS smartquote_v3_clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Client info
    name TEXT NOT NULL,
    company TEXT,

    -- Contact
    primary_email TEXT,
    primary_phone TEXT,

    -- Client type
    client_type TEXT, -- 'residential', 'commercial', 'government'

    -- Pricing
    default_discount_percent DECIMAL(5,2),
    custom_pricing_rules UUID[], -- References to pricing_rules

    -- Payment terms
    payment_terms TEXT, -- 'NET 30', 'NET 60', 'COD', etc.
    credit_limit DECIMAL(10,2),

    -- Metadata
    notes TEXT,
    tags TEXT[],

    -- Stats
    total_quotes INTEGER DEFAULT 0,
    total_won INTEGER DEFAULT 0,
    total_revenue DECIMAL(12,2) DEFAULT 0,

    -- Status
    is_active BOOLEAN DEFAULT true,

    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_clients_name ON smartquote_v3_clients(name) WHERE is_active = true;
CREATE INDEX idx_clients_revenue ON smartquote_v3_clients(total_revenue DESC);

CREATE TABLE IF NOT EXISTS smartquote_v3_client_addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES smartquote_v3_clients(id) ON DELETE CASCADE,

    -- Address
    address_line1 TEXT NOT NULL,
    address_line2 TEXT,
    city TEXT,
    county TEXT,
    postcode TEXT NOT NULL,
    country TEXT DEFAULT 'UK',

    -- Address type
    address_type TEXT, -- 'site', 'billing', 'collection', 'warehouse'
    is_primary BOOLEAN DEFAULT false,

    -- Site details
    loading_bay_available BOOLEAN DEFAULT false,
    loading_bay_notes TEXT,
    access_restrictions TEXT,
    parking_notes TEXT,

    -- Logistics
    in_ulez_zone BOOLEAN DEFAULT false,
    in_congestion_zone BOOLEAN DEFAULT false,
    distance_from_base_miles DECIMAL(10,2),

    -- Coordinates
    latitude DECIMAL(10,7),
    longitude DECIMAL(10,7),

    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_addresses_client ON smartquote_v3_client_addresses(client_id);
CREATE INDEX idx_addresses_postcode ON smartquote_v3_client_addresses(postcode);

-- ============================================================================
-- SECTION 13: MOBILE APP SPECIFIC
-- ============================================================================

CREATE TABLE IF NOT EXISTS smartquote_v3_mobile_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,

    -- Device info
    device_name TEXT,
    device_type TEXT, -- 'ios', 'android', 'web'
    device_model TEXT,
    os_version TEXT,
    app_version TEXT,

    -- Push notification token
    push_token TEXT UNIQUE NOT NULL,
    push_provider TEXT, -- 'fcm', 'apns'

    -- Settings
    notifications_enabled BOOLEAN DEFAULT true,
    notification_preferences JSONB,
    -- {approval_requests: true, mentions: true, status_changes: false}

    -- Status
    is_active BOOLEAN DEFAULT true,
    last_active_at TIMESTAMPTZ,

    registered_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_mobile_devices_user ON smartquote_v3_mobile_devices(user_id, is_active);
CREATE INDEX idx_mobile_devices_token ON smartquote_v3_mobile_devices(push_token) WHERE is_active = true;

-- ============================================================================
-- SECTION 14: SYSTEM CONFIGURATION
-- ============================================================================

CREATE TABLE IF NOT EXISTS smartquote_v3_system_config (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    updated_by UUID,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default config values
INSERT INTO smartquote_v3_system_config (key, value, description) VALUES
('approval_thresholds', '{"auto_approve_under": 5000, "requires_director_over": 25000}'::jsonb, 'Approval amount thresholds'),
('notification_settings', '{"push_enabled": true, "email_enabled": true, "sms_enabled": false}'::jsonb, 'Global notification settings'),
('quote_expiry_days', '30'::jsonb, 'Default quote validity period in days'),
('auto_follow_up_days', '[7, 14, 21]'::jsonb, 'Days to send automatic follow-up emails')
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- SECTION 15: VIEWS FOR REPORTING
-- ============================================================================

-- Active quotes requiring approval
CREATE OR REPLACE VIEW smartquote_v3_pending_approvals AS
SELECT
    q.*,
    u.email as created_by_email,
    COUNT(c.id) as unresolved_comments
FROM smartquote_v3_quotes q
LEFT JOIN smartquote_v3_comments c ON c.quote_id = q.id AND NOT c.is_resolved AND c.deleted_at IS NULL
LEFT JOIN auth.users u ON u.id = q.created_by
WHERE q.status IN ('pending_internal', 'pending_client')
    AND q.requires_approval = true
    AND q.deleted_at IS NULL
GROUP BY q.id, u.email;

-- Quote pipeline summary
CREATE OR REPLACE VIEW smartquote_v3_pipeline_summary AS
SELECT
    status,
    COUNT(*) as count,
    SUM(total_amount) as total_value,
    AVG(total_amount) as avg_value
FROM smartquote_v3_quotes
WHERE deleted_at IS NULL
GROUP BY status;

-- Win rate by month
CREATE OR REPLACE VIEW smartquote_v3_monthly_win_rate AS
SELECT
    DATE_TRUNC('month', created_at) as month,
    COUNT(*) FILTER (WHERE status = 'won') as won,
    COUNT(*) FILTER (WHERE status = 'lost') as lost,
    COUNT(*) as total,
    ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'won') / NULLIF(COUNT(*), 0), 2) as win_rate_percent
FROM smartquote_v3_quotes
WHERE deleted_at IS NULL
    AND status IN ('won', 'lost')
GROUP BY DATE_TRUNC('month', created_at)
ORDER BY month DESC;

-- ============================================================================
-- SECTION 16: ROW LEVEL SECURITY (Optional but recommended)
-- ============================================================================

-- Enable RLS on key tables
ALTER TABLE smartquote_v3_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE smartquote_v3_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE smartquote_v3_notifications ENABLE ROW LEVEL SECURITY;

-- Example policies (adjust based on your auth setup)
-- Users can see their own quotes and quotes they're assigned to approve
CREATE POLICY quotes_select_policy ON smartquote_v3_quotes
    FOR SELECT
    USING (
        created_by = auth.uid() OR
        approved_by = auth.uid() OR
        EXISTS (
            SELECT 1 FROM smartquote_v3_approval_history ah
            WHERE ah.quote_id = id AND ah.performed_by = auth.uid()
        )
    );

-- Users can see their own notifications
CREATE POLICY notifications_select_policy ON smartquote_v3_notifications
    FOR SELECT
    USING (user_id = auth.uid());

-- Users can see comments on quotes they have access to
CREATE POLICY comments_select_policy ON smartquote_v3_comments
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM smartquote_v3_quotes q
            WHERE q.id = quote_id AND (
                q.created_by = auth.uid() OR
                q.approved_by = auth.uid()
            )
        )
    );

-- ============================================================================
-- SECTION 17: FUNCTIONS & TRIGGERS
-- ============================================================================

-- Function to automatically update quote status when approved
CREATE OR REPLACE FUNCTION auto_update_quote_status_on_approval()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.action = 'approved' THEN
        UPDATE smartquote_v3_quotes
        SET
            status = NEW.new_status,
            approved_by = NEW.performed_by,
            approved_at = NEW.performed_at,
            approval_notes = NEW.notes
        WHERE id = NEW.quote_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER approval_status_update
    AFTER INSERT ON smartquote_v3_approval_history
    FOR EACH ROW
    EXECUTE FUNCTION auto_update_quote_status_on_approval();

-- Function to create notification when comment mentions users
CREATE OR REPLACE FUNCTION create_mention_notifications()
RETURNS TRIGGER AS $$
DECLARE
    mentioned_user UUID;
BEGIN
    IF NEW.mentioned_user_ids IS NOT NULL AND array_length(NEW.mentioned_user_ids, 1) > 0 THEN
        FOREACH mentioned_user IN ARRAY NEW.mentioned_user_ids
        LOOP
            INSERT INTO smartquote_v3_notifications (
                user_id,
                type,
                title,
                message,
                quote_id,
                comment_id,
                action_url,
                priority
            ) VALUES (
                mentioned_user,
                'comment_mention',
                'You were mentioned in a comment',
                LEFT(NEW.comment_text, 200),
                NEW.quote_id,
                NEW.id,
                '/smartquote-v3/' || NEW.quote_id,
                'normal'
            );
        END LOOP;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER comment_mention_notification
    AFTER INSERT ON smartquote_v3_comments
    FOR EACH ROW
    EXECUTE FUNCTION create_mention_notifications();

-- Function to track quote stage changes
CREATE OR REPLACE FUNCTION track_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        -- Log to analytics
        INSERT INTO smartquote_v3_analytics_events (
            event_type,
            quote_id,
            user_id,
            event_data
        ) VALUES (
            'status_change',
            NEW.id,
            NEW.status_updated_by,
            jsonb_build_object(
                'old_status', OLD.status,
                'new_status', NEW.status
            )
        );

        -- Create notification for quote creator
        IF NEW.status_updated_by != NEW.created_by THEN
            INSERT INTO smartquote_v3_notifications (
                user_id,
                type,
                title,
                message,
                quote_id,
                action_url
            ) VALUES (
                NEW.created_by,
                'status_change',
                'Quote status changed: ' || NEW.quote_ref,
                'Status changed from ' || OLD.status || ' to ' || NEW.status,
                NEW.id,
                '/smartquote-v3/' || NEW.id
            );
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER quote_status_change
    AFTER UPDATE ON smartquote_v3_quotes
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION track_status_change();

-- Function to update product catalogue usage stats
CREATE OR REPLACE FUNCTION update_product_usage_stats()
RETURNS TRIGGER AS $$
DECLARE
    product_item JSONB;
    product_code_val TEXT;
BEGIN
    -- Extract products from quote and update catalogue
    FOR product_item IN SELECT * FROM jsonb_array_elements(NEW.products)
    LOOP
        product_code_val := product_item->>'productCode';

        IF product_code_val IS NOT NULL THEN
            UPDATE smartquote_v3_product_catalogue
            SET
                times_used = times_used + 1,
                last_used_at = NOW()
            WHERE product_code = product_code_val;
        END IF;
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_catalogue_on_quote_create
    AFTER INSERT ON smartquote_v3_quotes
    FOR EACH ROW
    EXECUTE FUNCTION update_product_usage_stats();

-- ============================================================================
-- SCHEMA COMPLETE
-- ============================================================================

-- Summary statistics
DO $$
DECLARE
    table_count INTEGER;
    index_count INTEGER;
    trigger_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables
    WHERE table_name LIKE 'smartquote_v3_%';

    SELECT COUNT(*) INTO index_count
    FROM pg_indexes
    WHERE tablename LIKE 'smartquote_v3_%';

    SELECT COUNT(*) INTO trigger_count
    FROM pg_trigger t
    JOIN pg_class c ON t.tgrelid = c.oid
    WHERE c.relname LIKE 'smartquote_v3_%';

    RAISE NOTICE '============================================';
    RAISE NOTICE 'SmartQuote v3 Schema Installation Complete';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Tables created: %', table_count;
    RAISE NOTICE 'Indexes created: %', index_count;
    RAISE NOTICE 'Triggers created: %', trigger_count;
    RAISE NOTICE '============================================';
END $$;
