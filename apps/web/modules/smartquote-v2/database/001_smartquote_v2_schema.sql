-- ========================================
-- SmartQuote v2.0 - Enhanced Database Schema
-- ========================================
-- This schema adds:
-- 1. Product learning system
-- 2. Revision tracking with full history
-- 3. Email automation workflow
-- 4. Image extraction and storage
-- 5. Enhanced analytics

-- ========================================
-- 1. PRODUCT LEARNING SYSTEM
-- ========================================

-- Track product selections for pattern detection
CREATE TABLE IF NOT EXISTS smartquote_v2_product_selections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_id UUID NOT NULL,
    product_code TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    selected_with TEXT[], -- Array of other product codes in same quote
    document_source TEXT, -- Source document type (pdf, excel, manual)
    user_id UUID REFERENCES auth.users(id),
    confidence_score DECIMAL(3,2), -- AI confidence (0.00-1.00)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Indexes for fast lookups
    INDEX idx_product_selections_product_code (product_code),
    INDEX idx_product_selections_quote_id (quote_id),
    INDEX idx_product_selections_user_id (user_id)
);

-- Track which products are commonly used together
CREATE TABLE IF NOT EXISTS smartquote_v2_product_similarities (
    product_a TEXT NOT NULL,
    product_b TEXT NOT NULL,
    co_occurrence_count INTEGER DEFAULT 1,
    similarity_score DECIMAL(5,4), -- 0.0000-1.0000
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    
    PRIMARY KEY (product_a, product_b),
    
    -- Ensure product_a < product_b alphabetically to avoid duplicates
    CHECK (product_a < product_b),
    
    INDEX idx_product_similarities_a (product_a),
    INDEX idx_product_similarities_b (product_b),
    INDEX idx_product_similarities_score (similarity_score DESC)
);

-- Track time adjustments for learning
CREATE TABLE IF NOT EXISTS smartquote_v2_product_time_adjustments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_code TEXT NOT NULL,
    original_time DECIMAL(10,2) NOT NULL,
    adjusted_time DECIMAL(10,2) NOT NULL,
    adjustment_factor DECIMAL(10,4) NOT NULL, -- adjusted / original
    adjustment_reason TEXT,
    context JSONB, -- Store context: quote details, similar products, etc.
    quote_id UUID,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    INDEX idx_time_adjustments_product_code (product_code),
    INDEX idx_time_adjustments_created_at (created_at DESC)
);

-- Aggregate learned time data
CREATE TABLE IF NOT EXISTS smartquote_v2_product_learned_times (
    product_code TEXT PRIMARY KEY,
    avg_time_hours DECIMAL(10,2),
    median_time_hours DECIMAL(10,2),
    std_dev DECIMAL(10,2),
    sample_count INTEGER DEFAULT 0,
    confidence_level DECIMAL(3,2), -- Based on sample size and consistency
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    
    INDEX idx_learned_times_confidence (confidence_level DESC)
);

-- ========================================
-- 2. REVISION TRACKING SYSTEM
-- ========================================

-- Master quotes table with version support
CREATE TABLE IF NOT EXISTS smartquote_v2_quotes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_ref TEXT NOT NULL UNIQUE,
    client TEXT NOT NULL,
    project TEXT NOT NULL,
    current_revision INTEGER DEFAULT 1,
    status TEXT DEFAULT 'draft', -- draft, sent, accepted, rejected, superseded
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMPTZ, -- Soft delete
    
    INDEX idx_quotes_ref (quote_ref),
    INDEX idx_quotes_client (client),
    INDEX idx_quotes_status (status),
    INDEX idx_quotes_created_by (created_by)
);

-- Quote revisions - full snapshot of each version
CREATE TABLE IF NOT EXISTS smartquote_v2_quote_revisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_id UUID NOT NULL REFERENCES smartquote_v2_quotes(id) ON DELETE CASCADE,
    revision_number INTEGER NOT NULL,
    
    -- Quote data snapshot
    details JSONB NOT NULL, -- QuoteDetails object
    products JSONB NOT NULL, -- CalculatedProduct[] array
    results JSONB NOT NULL, -- CalculationResults object
    
    -- Change metadata
    changes_summary TEXT, -- Brief description of changes
    previous_revision_id UUID REFERENCES smartquote_v2_quote_revisions(id),
    
    -- Audit trail
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(quote_id, revision_number),
    INDEX idx_revisions_quote_id (quote_id),
    INDEX idx_revisions_revision_num (revision_number DESC)
);

-- Detailed change log for audit trail
CREATE TABLE IF NOT EXISTS smartquote_v2_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_id UUID NOT NULL REFERENCES smartquote_v2_quotes(id) ON DELETE CASCADE,
    revision_number INTEGER,
    action TEXT NOT NULL, -- created, updated, exported_pdf, exported_xlsx, job_created, sent, accepted
    details TEXT, -- Additional context
    user_id UUID REFERENCES auth.users(id),
    user_name TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    
    INDEX idx_audit_quote_id (quote_id),
    INDEX idx_audit_timestamp (timestamp DESC),
    INDEX idx_audit_action (action)
);

-- ========================================
-- 3. EMAIL AUTOMATION WORKFLOW
-- ========================================

-- Incoming quote emails
CREATE TABLE IF NOT EXISTS smartquote_v2_quote_emails (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_email TEXT NOT NULL,
    subject TEXT,
    body TEXT,
    raw_email JSONB, -- Full email data
    attachments JSONB[], -- Array of attachment metadata
    received_at TIMESTAMPTZ DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    status TEXT DEFAULT 'pending', -- pending, processing, completed, failed
    error_message TEXT,
    
    -- Link to created quote if successful
    quote_id UUID REFERENCES smartquote_v2_quotes(id),
    
    INDEX idx_emails_status (status),
    INDEX idx_emails_received_at (received_at DESC),
    INDEX idx_emails_from (from_email)
);

-- Draft quotes prepared from emails (human review before finalization)
CREATE TABLE IF NOT EXISTS smartquote_v2_quote_drafts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email_id UUID REFERENCES smartquote_v2_quote_emails(id) ON DELETE CASCADE,
    
    -- Parsed data with confidence
    parsed_data JSONB NOT NULL, -- ParseResult
    confidence_score DECIMAL(3,2),
    ai_notes TEXT[], -- AI-generated notes about uncertainties
    requires_attention BOOLEAN DEFAULT false,
    attention_flags TEXT[], -- Specific items needing review
    
    -- Draft status
    status TEXT DEFAULT 'pending_review', -- pending_review, approved, rejected, superseded
    reviewed_by UUID REFERENCES auth.users(id),
    reviewed_at TIMESTAMPTZ,
    review_notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    INDEX idx_drafts_status (status),
    INDEX idx_drafts_email_id (email_id)
);

-- ========================================
-- 4. IMAGE STORAGE AND EXTRACTION
-- ========================================

-- Images extracted from PDFs or uploaded
CREATE TABLE IF NOT EXISTS smartquote_v2_quote_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_id UUID REFERENCES smartquote_v2_quotes(id) ON DELETE CASCADE,
    
    -- Image metadata
    image_url TEXT, -- Storage URL (Supabase Storage)
    storage_path TEXT NOT NULL, -- Path in storage bucket
    filename TEXT NOT NULL,
    mime_type TEXT DEFAULT 'image/png',
    file_size INTEGER, -- bytes
    
    -- Source information
    source_type TEXT DEFAULT 'pdf', -- pdf, upload, generated
    page_number INTEGER, -- If from PDF
    extraction_method TEXT, -- pdf-lib, pdfjs, manual
    
    -- Image properties
    width INTEGER,
    height INTEGER,
    thumbnail_url TEXT, -- Smaller version for previews
    
    -- Usage tracking
    included_in_output BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    INDEX idx_images_quote_id (quote_id),
    INDEX idx_images_source_type (source_type),
    INDEX idx_images_display_order (display_order)
);

-- ========================================
-- 5. ANALYTICS AND METRICS
-- ========================================

-- Track parse accuracy over time
CREATE TABLE IF NOT EXISTS smartquote_v2_parse_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_id UUID REFERENCES smartquote_v2_quotes(id),
    
    -- Parsing metrics
    total_products_detected INTEGER,
    products_auto_resolved INTEGER,
    products_manual_input INTEGER,
    avg_confidence_score DECIMAL(3,2),
    
    -- Time metrics
    parse_duration_ms INTEGER,
    total_processing_time_ms INTEGER,
    
    -- Document info
    document_type TEXT, -- pdf, excel, image, text
    document_pages INTEGER,
    document_size_kb INTEGER,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    INDEX idx_analytics_created_at (created_at DESC)
);

-- Quote performance metrics
CREATE TABLE IF NOT EXISTS smartquote_v2_quote_metrics (
    quote_id UUID PRIMARY KEY REFERENCES smartquote_v2_quotes(id) ON DELETE CASCADE,
    
    -- Business metrics
    total_value DECIMAL(12,2),
    product_count INTEGER,
    revision_count INTEGER DEFAULT 1,
    
    -- Conversion tracking
    converted_to_job BOOLEAN DEFAULT false,
    job_id UUID,
    conversion_date TIMESTAMPTZ,
    
    -- Time tracking
    time_to_first_send INTERVAL, -- Time from creation to first send
    time_to_acceptance INTERVAL, -- Time from creation to acceptance
    
    last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- 6. UTILITY FUNCTIONS
-- ========================================

-- Function to get frequently paired products
CREATE OR REPLACE FUNCTION smartquote_v2_get_product_suggestions(
    input_product_codes TEXT[]
)
RETURNS TABLE(
    product_code TEXT,
    product_name TEXT,
    similarity_score DECIMAL,
    co_occurrence_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT DISTINCT
        CASE 
            WHEN ps.product_a = ANY(input_product_codes) THEN ps.product_b
            ELSE ps.product_a
        END as product_code,
        pc.product_name,
        ps.similarity_score,
        ps.co_occurrence_count
    FROM smartquote_v2_product_similarities ps
    JOIN product_catalogue pc ON (
        pc.product_code = CASE 
            WHEN ps.product_a = ANY(input_product_codes) THEN ps.product_b
            ELSE ps.product_a
        END
    )
    WHERE ps.product_a = ANY(input_product_codes)
       OR ps.product_b = ANY(input_product_codes)
    ORDER BY ps.similarity_score DESC, ps.co_occurrence_count DESC
    LIMIT 10;
END;
$$ LANGUAGE plpgsql;

-- Function to update product co-occurrence
CREATE OR REPLACE FUNCTION smartquote_v2_update_product_cooccurrence(
    product_codes TEXT[]
)
RETURNS void AS $$
DECLARE
    prod_a TEXT;
    prod_b TEXT;
    i INTEGER;
    j INTEGER;
BEGIN
    -- For each pair of products in the array
    FOR i IN 1..array_length(product_codes, 1) LOOP
        FOR j IN (i+1)..array_length(product_codes, 1) LOOP
            prod_a := LEAST(product_codes[i], product_codes[j]);
            prod_b := GREATEST(product_codes[i], product_codes[j]);
            
            -- Insert or update co-occurrence
            INSERT INTO smartquote_v2_product_similarities (product_a, product_b, co_occurrence_count, last_updated)
            VALUES (prod_a, prod_b, 1, NOW())
            ON CONFLICT (product_a, product_b) 
            DO UPDATE SET 
                co_occurrence_count = smartquote_v2_product_similarities.co_occurrence_count + 1,
                last_updated = NOW();
        END LOOP;
    END LOOP;
    
    -- Recalculate similarity scores (simple: count / max_count)
    UPDATE smartquote_v2_product_similarities
    SET similarity_score = (
        co_occurrence_count::DECIMAL / NULLIF(
            (SELECT MAX(co_occurrence_count) FROM smartquote_v2_product_similarities), 
            0
        )
    )
    WHERE (product_a = ANY(product_codes) OR product_b = ANY(product_codes));
END;
$$ LANGUAGE plpgsql;

-- Function to calculate learned time with confidence
CREATE OR REPLACE FUNCTION smartquote_v2_get_learned_time(
    product_code_input TEXT
)
RETURNS TABLE(
    avg_time DECIMAL,
    confidence DECIMAL,
    sample_count INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        plt.avg_time_hours,
        plt.confidence_level,
        plt.sample_count
    FROM smartquote_v2_product_learned_times plt
    WHERE plt.product_code = product_code_input;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update quote updated_at timestamp
CREATE OR REPLACE FUNCTION smartquote_v2_update_quote_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_quote_timestamp
BEFORE UPDATE ON smartquote_v2_quotes
FOR EACH ROW
EXECUTE FUNCTION smartquote_v2_update_quote_timestamp();

-- ========================================
-- 7. ROW LEVEL SECURITY (RLS) POLICIES
-- ========================================

-- Enable RLS on all tables
ALTER TABLE smartquote_v2_product_selections ENABLE ROW LEVEL SECURITY;
ALTER TABLE smartquote_v2_product_similarities ENABLE ROW LEVEL SECURITY;
ALTER TABLE smartquote_v2_product_time_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE smartquote_v2_product_learned_times ENABLE ROW LEVEL SECURITY;
ALTER TABLE smartquote_v2_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE smartquote_v2_quote_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE smartquote_v2_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE smartquote_v2_quote_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE smartquote_v2_quote_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE smartquote_v2_quote_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE smartquote_v2_parse_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE smartquote_v2_quote_metrics ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read all product learning data
CREATE POLICY "Allow authenticated users to read product data" ON smartquote_v2_product_selections
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to read similarities" ON smartquote_v2_product_similarities
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to read learned times" ON smartquote_v2_product_learned_times
    FOR SELECT USING (auth.role() = 'authenticated');

-- Users can manage their own quotes
CREATE POLICY "Users can view their quotes" ON smartquote_v2_quotes
    FOR SELECT USING (
        auth.uid() = created_by OR 
        auth.uid() IN (SELECT user_id FROM profiles WHERE company = (SELECT company FROM profiles WHERE user_id = smartquote_v2_quotes.created_by))
    );

CREATE POLICY "Users can insert quotes" ON smartquote_v2_quotes
    FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their quotes" ON smartquote_v2_quotes
    FOR UPDATE USING (auth.uid() = created_by);

-- Revisions follow quote access
CREATE POLICY "Users can view quote revisions" ON smartquote_v2_quote_revisions
    FOR SELECT USING (
        quote_id IN (SELECT id FROM smartquote_v2_quotes WHERE auth.uid() = created_by)
    );

-- Similar policies for other tables...
-- (Add more RLS policies as needed for production)

-- ========================================
-- 8. INDEXES FOR PERFORMANCE
-- ========================================

-- Additional composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_revisions_quote_rev ON smartquote_v2_quote_revisions(quote_id, revision_number DESC);
CREATE INDEX IF NOT EXISTS idx_audit_quote_timestamp ON smartquote_v2_audit_log(quote_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_images_quote_order ON smartquote_v2_quote_images(quote_id, display_order);

-- ========================================
-- MIGRATION COMPLETE
-- ========================================
