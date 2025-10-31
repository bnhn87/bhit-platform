-- ==========================================
-- FIX QUOTES TABLE - ADD MISSING COLUMNS
-- ==========================================

-- Add all missing columns to quotes table
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

-- Add indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_quotes_reference ON quotes(reference);
CREATE INDEX IF NOT EXISTS idx_quotes_client_name ON quotes(client_name);
CREATE INDEX IF NOT EXISTS idx_quotes_prepared_by ON quotes(prepared_by);

-- Add comment
COMMENT ON COLUMN quotes.reference IS 'Unique quote reference number (e.g., QT-20250915-001)';
COMMENT ON COLUMN quotes.status IS 'Values: draft, pending, sent, approved, rejected, expired';

DO $$
BEGIN
    RAISE NOTICE '✓ Quotes table updated with all required columns';
END $$;
