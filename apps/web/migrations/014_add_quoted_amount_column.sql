-- Add quoted_amount column to jobs table
-- This column stores the total quoted price from SmartQuote calculations

ALTER TABLE jobs 
ADD COLUMN IF NOT EXISTS quoted_amount DECIMAL(12,2) DEFAULT 0;

COMMENT ON COLUMN jobs.quoted_amount IS 'Total quoted price from SmartQuote calculations';