-- Floor Planner Database Schema for BHIT Work OS
-- Run this in your Supabase SQL editor to add floor planner functionality

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

-- Create generated_tasks table for auto-generated installation tasks
CREATE TABLE IF NOT EXISTS generated_tasks (
    id TEXT PRIMARY KEY,
    job_id UUID NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    install_order INTEGER DEFAULT 0,
    room_zone TEXT,
    furniture_ids JSONB DEFAULT '[]'::jsonb,
    estimated_time_minutes INTEGER,
    dependencies JSONB DEFAULT '[]'::jsonb,
    is_generated BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for generated_tasks
CREATE INDEX IF NOT EXISTS idx_generated_tasks_job_id ON generated_tasks(job_id);
CREATE INDEX IF NOT EXISTS idx_generated_tasks_install_order ON generated_tasks(job_id, install_order);

-- Enable RLS for generated_tasks
ALTER TABLE generated_tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for generated_tasks
CREATE POLICY "Users can view generated tasks for authenticated users"
    ON generated_tasks FOR SELECT
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "Directors and ops can manage generated tasks"
    ON generated_tasks FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('director', 'ops')
        )
    );

-- Policy for authenticated users to insert generated tasks
CREATE POLICY "Authenticated users can create generated tasks"
    ON generated_tasks FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for automatic timestamp updates
DROP TRIGGER IF EXISTS update_job_floorplans_updated_at ON job_floorplans;
CREATE TRIGGER update_job_floorplans_updated_at
    BEFORE UPDATE ON job_floorplans
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_generated_tasks_updated_at ON generated_tasks;
CREATE TRIGGER update_generated_tasks_updated_at
    BEFORE UPDATE ON generated_tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add foreign key constraints after table creation (only if jobs table exists)
-- Uncomment these lines if you have existing jobs and users tables:
-- ALTER TABLE job_floorplans ADD CONSTRAINT fk_job_floorplans_job_id 
--     FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE;
-- ALTER TABLE generated_tasks ADD CONSTRAINT fk_generated_tasks_job_id 
--     FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE;

-- Insert sample data (optional - remove if not needed)
-- This creates a sample floor plan for the first job in your system
/*
INSERT INTO job_floorplans (id, job_id, name) 
SELECT 
    'sample_plan_' || jobs.id,
    jobs.id,
    'Sample Floor Plan - ' || COALESCE(jobs.reference, 'Job ' || jobs.id)
FROM jobs 
WHERE NOT EXISTS (SELECT 1 FROM job_floorplans WHERE job_floorplans.job_id = jobs.id)
LIMIT 1;
*/

-- Comments for documentation
COMMENT ON TABLE job_floorplans IS 'Floor plans associated with jobs, including furniture placement data';
COMMENT ON TABLE generated_tasks IS 'Auto-generated installation tasks based on floor plan furniture placement';
COMMENT ON COLUMN job_floorplans.furniture IS 'JSON array of placed furniture items with positions and properties';
COMMENT ON COLUMN generated_tasks.dependencies IS 'JSON array of task IDs that must complete before this task';
COMMENT ON COLUMN generated_tasks.furniture_ids IS 'JSON array of furniture IDs this task involves installing';

-- Create storage bucket for floor plan images (run this in Supabase Dashboard > Storage)
-- You need to manually create a bucket called 'job-assets' with public access
-- Or run this SQL to create it programmatically:
/*
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'job-assets',
  'job-assets',
  true,
  52428800, -- 50MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']
) ON CONFLICT (id) DO NOTHING;

-- Storage policies for job-assets bucket
CREATE POLICY "Authenticated users can upload job assets"
  ON storage.objects FOR INSERT 
  WITH CHECK (bucket_id = 'job-assets' AND auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can view job assets"
  ON storage.objects FOR SELECT 
  USING (bucket_id = 'job-assets' AND auth.uid() IS NOT NULL);

CREATE POLICY "Directors and ops can delete job assets"
  ON storage.objects FOR DELETE 
  USING (
    bucket_id = 'job-assets' AND 
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('director', 'ops')
    )
  );
*/