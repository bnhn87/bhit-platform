-- Add labour_summary column to jobs table
-- This allows jobs to store calculated labour estimates from quotes

ALTER TABLE jobs 
ADD COLUMN IF NOT EXISTS labour_summary JSONB;

-- Add comment explaining the structure
COMMENT ON COLUMN jobs.labour_summary IS 'Stores labour estimates: {total_days, total_hours, crew_size, installation_days, uplift_days}';