-- Ensure job_floorplans table exists with proper schema
-- This migration ensures the job_floorplans table is properly created with all required columns and constraints

-- Create job_floorplans table if it doesn't exist
CREATE TABLE IF NOT EXISTS job_floorplans (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    job_id UUID NOT NULL,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    floor_plan_url TEXT,
    furniture JSONB DEFAULT '[]'::jsonb,
    scale NUMERIC,
    floor_plan_width INTEGER,
    floor_plan_height INTEGER
);

-- Add UNIQUE constraint on job_id if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'job_floorplans_job_id_key'
    ) THEN
        ALTER TABLE job_floorplans ADD CONSTRAINT job_floorplans_job_id_key UNIQUE (job_id);
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        -- Constraint might already exist with a different name
        NULL;
END $$;

-- Create indexes for performance if they don't exist
CREATE INDEX IF NOT EXISTS idx_job_floorplans_job_id ON job_floorplans(job_id);
CREATE INDEX IF NOT EXISTS idx_job_floorplans_created_at ON job_floorplans(created_at);

-- Enable RLS (Row Level Security) if not already enabled
ALTER TABLE job_floorplans ENABLE ROW LEVEL SECURITY;

-- Remove existing policies to avoid duplicates
DROP POLICY IF EXISTS "Users can view floor plans for authenticated users" ON job_floorplans;
DROP POLICY IF EXISTS "Directors and ops can manage floor plans" ON job_floorplans;
DROP POLICY IF EXISTS "Authenticated users can create floor plans" ON job_floorplans;

-- RLS Policies for job_floorplans
CREATE POLICY "Users can view floor plans for authenticated users"
    ON job_floorplans FOR SELECT
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "Directors and ops can manage floor plans"
    ON job_floorplans FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('director', 'ops')
        )
    );

-- Policy for authenticated users to insert their own floor plans
CREATE POLICY "Authenticated users can create floor plans"
    ON job_floorplans FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- Create function to automatically update updated_at timestamp if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for automatic timestamp updates if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_job_floorplans_updated_at'
    ) THEN
        CREATE TRIGGER update_job_floorplans_updated_at
            BEFORE UPDATE ON job_floorplans
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        -- Trigger might already exist
        NULL;
END $$;

-- Add foreign key constraint if jobs table exists and constraint doesn't exist
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'jobs') THEN
        IF NOT EXISTS (
            SELECT 1 FROM pg_constraint 
            WHERE conname = 'fk_job_floorplans_job_id'
        ) THEN
            ALTER TABLE job_floorplans 
            ADD CONSTRAINT IF NOT EXISTS fk_job_floorplans_job_id 
            FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE;
        END IF;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        -- Constraint might already exist or jobs table might not exist
        NULL;
END $$;

-- Add comment for documentation
COMMENT ON TABLE job_floorplans IS 'Floor plans associated with jobs, including furniture placement data';
COMMENT ON COLUMN job_floorplans.furniture IS 'JSON array of placed furniture items with positions and properties';