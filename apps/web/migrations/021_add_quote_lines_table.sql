-- Migration: Add quote_lines table for SmartQuote system
-- This extends the existing quotes table with detailed line items

-- Quote lines table for detailed product breakdown
CREATE TABLE IF NOT EXISTS quote_lines (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    quote_id UUID REFERENCES quotes(id) ON DELETE CASCADE,
    line_number INTEGER NOT NULL,
    product_code VARCHAR(100),
    product_description TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    time_per_unit DECIMAL(8,2) NOT NULL DEFAULT 0,
    total_time DECIMAL(8,2) NOT NULL DEFAULT 0,
    waste_per_unit DECIMAL(8,2) NOT NULL DEFAULT 0,
    total_waste DECIMAL(8,2) NOT NULL DEFAULT 0,
    is_heavy BOOLEAN DEFAULT false,
    is_manually_edited BOOLEAN DEFAULT false,
    source VARCHAR(50) DEFAULT 'catalogue', -- catalogue, user-inputted, default, learned
    raw_description TEXT, -- Original parsed description
    clean_description TEXT, -- AI-cleaned description
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT unique_quote_line UNIQUE(quote_id, line_number)
);

-- Update quotes table to match SmartQuote requirements
ALTER TABLE quotes
ADD COLUMN IF NOT EXISTS delivery_address TEXT,
ADD COLUMN IF NOT EXISTS quote_details JSONB, -- Store QuoteDetails object
ADD COLUMN IF NOT EXISTS calculation_results JSONB, -- Store full CalculationResults
ADD COLUMN IF NOT EXISTS products_data JSONB, -- Store CalculatedProduct array
ADD COLUMN IF NOT EXISTS configuration_snapshot JSONB; -- Store config used for calculations

-- Update the quotes status enum to match SmartQuote states
ALTER TABLE quotes ALTER COLUMN status TYPE VARCHAR(50);
COMMENT ON COLUMN quotes.status IS 'Values: draft, pending, sent, approved, rejected, expired';

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_quote_lines_quote_id ON quote_lines(quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_lines_line_number ON quote_lines(quote_id, line_number);
CREATE INDEX IF NOT EXISTS idx_quotes_reference ON quotes(reference);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(status);
CREATE INDEX IF NOT EXISTS idx_quotes_client_name ON quotes(client_name);
CREATE INDEX IF NOT EXISTS idx_quotes_created_at ON quotes(created_at);

-- ==========================================
-- ROW LEVEL SECURITY POLICIES
-- ==========================================

-- Enable RLS on quote_lines
ALTER TABLE quote_lines ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access quote_lines for quotes they can access
CREATE POLICY quote_lines_access_policy ON quote_lines
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

-- ==========================================
-- SAMPLE DATA FOR TESTING
-- ==========================================

-- Insert sample quote for testing (only if no quotes exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM quotes LIMIT 1) THEN
        INSERT INTO quotes (
            reference,
            status,
            client_name,
            project_name,
            prepared_by,
            total_amount,
            total_labour_days,
            quote_details,
            calculation_results
        ) VALUES (
            'QT-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-001',
            'draft',
            'Sample Client Ltd',
            'Office Refurbishment Project',
            (SELECT id FROM auth.users LIMIT 1),
            15750.00,
            12.5,
            '{"client": "Sample Client Ltd", "project": "Office Refurbishment", "quoteRef": "QT-20250919-001", "deliveryAddress": "123 Business Park, London", "preparedBy": "John Smith", "upliftViaStairs": false, "extendedUplift": false, "specialistReworking": false}'::jsonb,
            '{"labour": {"totalHours": 100, "totalDays": 12.5}, "pricing": {"totalCost": 15750}}'::jsonb
        );

        -- Insert sample quote lines
        INSERT INTO quote_lines (
            quote_id,
            line_number,
            product_code,
            product_description,
            quantity,
            time_per_unit,
            total_time,
            waste_per_unit,
            total_waste,
            source
        )
        SELECT
            q.id,
            1,
            'WS-001',
            'Standard Office Workstation',
            25,
            2.5,
            62.5,
            0.15,
            3.75,
            'catalogue'
        FROM quotes q
        WHERE q.reference LIKE 'QT-%001'
        LIMIT 1;
    END IF;
END $$;