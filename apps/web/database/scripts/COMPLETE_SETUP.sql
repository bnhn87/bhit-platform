-- ==========================================
-- COMPLETE SMARTQUOTE DATABASE SETUP
-- Run this file FIRST before APPLY_COMPLETE.sql
-- ==========================================

-- ==========================================
-- PART 1: CREATE QUOTES TABLE (if not exists)
-- ==========================================

CREATE TABLE IF NOT EXISTS quotes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    reference VARCHAR(100),
    status VARCHAR(50) DEFAULT 'draft',
    project_name TEXT,
    client_name TEXT,
    prepared_by UUID REFERENCES auth.users(id),
    total_amount DECIMAL(12,2),
    total_labour_days DECIMAL(8,2),
    delivery_address TEXT,
    quote_details JSONB,
    calculation_results JSONB,
    products_data JSONB,
    configuration_snapshot JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add missing columns to existing quotes table
ALTER TABLE quotes
ADD COLUMN IF NOT EXISTS reference VARCHAR(100),
ADD COLUMN IF NOT EXISTS project_name TEXT,
ADD COLUMN IF NOT EXISTS client_name TEXT,
ADD COLUMN IF NOT EXISTS prepared_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS total_amount DECIMAL(12,2),
ADD COLUMN IF NOT EXISTS total_labour_days DECIMAL(8,2),
ADD COLUMN IF NOT EXISTS delivery_address TEXT,
ADD COLUMN IF NOT EXISTS quote_details JSONB,
ADD COLUMN IF NOT EXISTS calculation_results JSONB,
ADD COLUMN IF NOT EXISTS products_data JSONB,
ADD COLUMN IF NOT EXISTS configuration_snapshot JSONB;

-- ==========================================
-- PART 2: CREATE QUOTE_SHARES TABLE
-- ==========================================

CREATE TABLE IF NOT EXISTS quote_shares (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    quote_id UUID REFERENCES quotes(id) ON DELETE CASCADE,
    shared_with_user UUID REFERENCES auth.users(id),
    shared_by UUID REFERENCES auth.users(id),
    can_edit BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT unique_quote_share UNIQUE(quote_id, shared_with_user)
);

-- ==========================================
-- PART 3: ADD INDEXES
-- ==========================================

CREATE INDEX IF NOT EXISTS idx_quotes_reference ON quotes(reference);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(status);
CREATE INDEX IF NOT EXISTS idx_quotes_client_name ON quotes(client_name);
CREATE INDEX IF NOT EXISTS idx_quotes_prepared_by ON quotes(prepared_by);
CREATE INDEX IF NOT EXISTS idx_quotes_created_at ON quotes(created_at);

CREATE INDEX IF NOT EXISTS idx_quote_shares_quote_id ON quote_shares(quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_shares_shared_with ON quote_shares(shared_with_user);

-- ==========================================
-- PART 4: ENABLE RLS ON QUOTES AND QUOTE_SHARES
-- ==========================================

ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_shares ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS quotes_user_access_policy ON quotes;
DROP POLICY IF EXISTS quote_shares_access_policy ON quote_shares;

-- Policy: Users can access quotes they created or that were shared with them
CREATE POLICY quotes_user_access_policy ON quotes
    FOR ALL
    USING (
        prepared_by = auth.uid()
        OR id IN (
            SELECT quote_id FROM quote_shares
            WHERE shared_with_user = auth.uid()
        )
    );

-- Policy: Users can see shares for quotes they have access to
CREATE POLICY quote_shares_access_policy ON quote_shares
    FOR ALL
    USING (
        quote_id IN (
            SELECT id FROM quotes
            WHERE prepared_by = auth.uid()
            OR id IN (
                SELECT quote_id FROM quote_shares
                WHERE shared_with_user = auth.uid()
            )
        )
    );

-- ==========================================
-- PART 5: ADD COMMENTS
-- ==========================================

COMMENT ON TABLE quotes IS 'SmartQuote quotes with full calculation data';
COMMENT ON TABLE quote_shares IS 'Sharing relationships for quotes between users';
COMMENT ON COLUMN quotes.reference IS 'Unique quote reference number (e.g., QT-20250915-001)';
COMMENT ON COLUMN quotes.status IS 'Values: draft, pending, sent, approved, rejected, expired';

-- ==========================================
-- COMPLETION MESSAGE
-- ==========================================

DO $$
BEGIN
    RAISE NOTICE '✓ Quotes table ready with % columns', (
        SELECT COUNT(*)
        FROM information_schema.columns
        WHERE table_name = 'quotes'
    );
    RAISE NOTICE '✓ Quote shares table created';
    RAISE NOTICE '✓ All indexes and RLS policies applied';
    RAISE NOTICE '✓ Ready to run APPLY_COMPLETE.sql';
END $$;
