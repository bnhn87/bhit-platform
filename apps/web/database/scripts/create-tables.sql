-- SQL script to create the required tables for task generation
-- Copy and paste this into the Supabase SQL editor

-- Create job_floorplans table
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

-- Create generated_tasks table
CREATE TABLE IF NOT EXISTS generated_tasks (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
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
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    -- Progress tracking fields
    status TEXT DEFAULT 'Uplift',
    completed_qty INTEGER DEFAULT 0,
    total_qty INTEGER DEFAULT 1,
    missing_notes TEXT
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_job_floorplans_job_id ON job_floorplans(job_id);
CREATE INDEX IF NOT EXISTS idx_job_floorplans_created_at ON job_floorplans(created_at);
CREATE INDEX IF NOT EXISTS idx_generated_tasks_job_id ON generated_tasks(job_id);
CREATE INDEX IF NOT EXISTS idx_generated_tasks_install_order ON generated_tasks(job_id, install_order);
CREATE INDEX IF NOT EXISTS idx_generated_tasks_status ON generated_tasks(status);
CREATE INDEX IF NOT EXISTS idx_generated_tasks_completed_qty ON generated_tasks(completed_qty);
CREATE INDEX IF NOT EXISTS idx_generated_tasks_total_qty ON generated_tasks(total_qty);

-- Enable RLS (Row Level Security)
ALTER TABLE job_floorplans ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_tasks ENABLE ROW LEVEL SECURITY;

-- Add constraints to ensure data integrity for generated_tasks
-- Check if constraints exist before adding them
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'valid_status'
    ) THEN
        ALTER TABLE generated_tasks 
        ADD CONSTRAINT valid_status 
        CHECK (status IN ('Uplift', 'Placed', 'Built', 'Incomplete', 'Missing'));
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        -- Constraint might already exist with a different name
        NULL;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'non_negative_completed_qty'
    ) THEN
        ALTER TABLE generated_tasks 
        ADD CONSTRAINT non_negative_completed_qty 
        CHECK (completed_qty >= 0);
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        NULL;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'positive_total_qty'
    ) THEN
        ALTER TABLE generated_tasks 
        ADD CONSTRAINT positive_total_qty 
        CHECK (total_qty > 0);
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        NULL;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'completed_not_exceed_total'
    ) THEN
        ALTER TABLE generated_tasks 
        ADD CONSTRAINT completed_not_exceed_total 
        CHECK (completed_qty <= total_qty);
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        NULL;
END $$;

-- Create function to automatically update updated_at timestamp if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for automatic timestamp updates
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
        NULL;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger 
        WHERE tgname = 'update_generated_tasks_updated_at'
    ) THEN
        CREATE TRIGGER update_generated_tasks_updated_at
            BEFORE UPDATE ON generated_tasks
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        NULL;
END $$;

-- Add comments for documentation
COMMENT ON TABLE job_floorplans IS 'Floor plans associated with jobs, including furniture placement data';
COMMENT ON TABLE generated_tasks IS 'Auto-generated installation tasks based on floor plan furniture placement';
COMMENT ON COLUMN job_floorplans.furniture IS 'JSON array of placed furniture items with positions and properties';
COMMENT ON COLUMN generated_tasks.dependencies IS 'JSON array of task IDs that must complete before this task';
COMMENT ON COLUMN generated_tasks.furniture_ids IS 'JSON array of furniture IDs this task involves installing';