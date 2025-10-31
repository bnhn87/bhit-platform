-- Create job_floorplans table for floor plan functionality
-- This migration creates the job_floorplans table needed for the floor planner feature

-- Create job_floorplans table
CREATE TABLE IF NOT EXISTS job_floorplans (
    id TEXT PRIMARY KEY,
    job_id UUID NOT NULL,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    floor_plan_url TEXT,
    furniture JSONB DEFAULT '[]'::jsonb,
    scale NUMERIC,
    floor_plan_width INTEGER,
    floor_plan_height INTEGER,
    
    -- Ensure one floor plan per job
    UNIQUE(job_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_job_floorplans_job_id ON job_floorplans(job_id);
CREATE INDEX IF NOT EXISTS idx_job_floorplans_created_at ON job_floorplans(created_at);

-- Enable RLS (Row Level Security)
ALTER TABLE job_floorplans ENABLE ROW LEVEL SECURITY;

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

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for automatic timestamp updates
DROP TRIGGER IF EXISTS update_job_floorplans_updated_at ON job_floorplans;
CREATE TRIGGER update_job_floorplans_updated_at
    BEFORE UPDATE ON job_floorplans
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add foreign key constraint if jobs table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'jobs') THEN
        ALTER TABLE job_floorplans 
        ADD CONSTRAINT IF NOT EXISTS fk_job_floorplans_job_id 
        FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Add comment for documentation
COMMENT ON TABLE job_floorplans IS 'Floor plans associated with jobs, including furniture placement data';