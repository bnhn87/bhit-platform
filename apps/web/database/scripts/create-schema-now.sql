-- Create required tables for task generation
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
    status TEXT DEFAULT 'Uplift',
    completed_qty INTEGER DEFAULT 0,
    total_qty INTEGER DEFAULT 1,
    missing_notes TEXT
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_job_floorplans_job_id ON job_floorplans(job_id);
CREATE INDEX IF NOT EXISTS idx_generated_tasks_job_id ON generated_tasks(job_id);
CREATE INDEX IF NOT EXISTS idx_generated_tasks_install_order ON generated_tasks(job_id, install_order);