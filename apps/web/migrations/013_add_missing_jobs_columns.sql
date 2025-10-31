-- Add missing columns to jobs table for SmartQuote integration
-- These columns are needed to store quote data when converting to jobs

-- Add products column to store product array from quotes
ALTER TABLE jobs 
ADD COLUMN IF NOT EXISTS products JSONB DEFAULT '[]'::jsonb;

-- Add quote_details column to store original quote metadata
ALTER TABLE jobs 
ADD COLUMN IF NOT EXISTS quote_details JSONB;

-- Add comments for documentation
COMMENT ON COLUMN jobs.products IS 'Array of products from SmartQuote calculations';
COMMENT ON COLUMN jobs.quote_details IS 'Original quote details: client, project, delivery_address, etc.';
COMMENT ON COLUMN jobs.labour_summary IS 'Labour estimates: total_days, total_hours, crew_size, installation_days, uplift_days';

-- Create index for performance on products searches
CREATE INDEX IF NOT EXISTS idx_jobs_products ON jobs USING GIN (products);