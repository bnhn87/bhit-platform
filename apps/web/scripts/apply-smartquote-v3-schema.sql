-- ============================================================================
-- SmartQuote v3 - Essential Tables for Immediate Fix
-- ============================================================================
-- This creates the essential tables to fix the current errors
-- Run the complete_schema.sql for the full implementation

-- Drop tables if they exist (for clean slate)
DROP TABLE IF EXISTS smartquote_v3_notifications CASCADE;
DROP TABLE IF EXISTS smartquote_v3_quotes CASCADE;
DROP VIEW IF EXISTS product_catalogue_view CASCADE;

-- ============================================================================
-- CORE QUOTES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS smartquote_v3_quotes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Quote identification
    quote_ref TEXT UNIQUE NOT NULL,
    quote_number SERIAL,

    -- Client information
    client_name TEXT NOT NULL,
    client_id UUID,
    project_name TEXT,

    -- Quote details (JSON storage for flexibility)
    quote_details JSONB NOT NULL DEFAULT '{}'::jsonb,
    products JSONB NOT NULL DEFAULT '[]'::jsonb,
    results JSONB NOT NULL DEFAULT '{}'::jsonb,

    -- Financial
    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
    margin_percent DECIMAL(5,2),

    -- Status
    status TEXT NOT NULL DEFAULT 'draft',
    status_updated_at TIMESTAMPTZ DEFAULT NOW(),
    status_updated_by UUID,

    -- Approval workflow
    requires_approval BOOLEAN DEFAULT true,
    approval_threshold_amount DECIMAL(10,2) DEFAULT 5000.00,
    approved_by UUID,
    approved_at TIMESTAMPTZ,
    approval_notes TEXT,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID,
    updated_by UUID
);

-- ============================================================================
-- NOTIFICATIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS smartquote_v3_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Notification details
    user_id UUID NOT NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT,

    -- Related entities
    quote_id UUID REFERENCES smartquote_v3_quotes(id) ON DELETE CASCADE,
    entity_type TEXT,
    entity_id UUID,

    -- Status
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMPTZ,

    -- Action buttons
    action_url TEXT,
    action_label TEXT,

    -- Priority & expiry
    priority TEXT DEFAULT 'normal',
    expires_at TIMESTAMPTZ,

    -- Metadata
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- PRODUCT CATALOGUE VIEW (Placeholder)
-- ============================================================================
CREATE OR REPLACE VIEW product_catalogue_view AS
SELECT
    gen_random_uuid() as id,
    'PLACEHOLDER' as product_code,
    'Placeholder Product' as description,
    'unit' as unit,
    0.00::decimal as price,
    NOW() as created_at
WHERE false; -- Empty view for now

-- ============================================================================
-- RPC FUNCTION: find_product_match (Placeholder)
-- ============================================================================
CREATE OR REPLACE FUNCTION find_product_match(search_text TEXT)
RETURNS TABLE (
    product_code TEXT,
    description TEXT,
    unit TEXT,
    price DECIMAL,
    match_score FLOAT
) AS $$
BEGIN
    -- Return empty result set for now
    RETURN QUERY
    SELECT
        'NO_MATCH'::TEXT as product_code,
        'No matching product found'::TEXT as description,
        'unit'::TEXT as unit,
        0.00::DECIMAL as price,
        0.0::FLOAT as match_score
    WHERE false;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- INDEXES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_quotes_status ON smartquote_v3_quotes(status);
CREATE INDEX IF NOT EXISTS idx_quotes_created_by ON smartquote_v3_quotes(created_by);
CREATE INDEX IF NOT EXISTS idx_quotes_client_id ON smartquote_v3_quotes(client_id);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON smartquote_v3_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_quote_id ON smartquote_v3_notifications(quote_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON smartquote_v3_notifications(is_read);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
ALTER TABLE smartquote_v3_quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE smartquote_v3_notifications ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to manage their own quotes
CREATE POLICY "Users can view their own quotes" ON smartquote_v3_quotes
    FOR ALL USING (auth.uid() = created_by OR auth.uid() = updated_by);

-- Allow authenticated users to manage their own notifications
CREATE POLICY "Users can view their own notifications" ON smartquote_v3_notifications
    FOR ALL USING (auth.uid() = user_id);

-- Grant permissions
GRANT ALL ON smartquote_v3_quotes TO authenticated;
GRANT ALL ON smartquote_v3_notifications TO authenticated;
GRANT ALL ON product_catalogue_view TO authenticated;
GRANT EXECUTE ON FUNCTION find_product_match TO authenticated;