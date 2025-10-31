-- Complete migration to create or update the generated_tasks table with all required columns
-- This ensures the table has all necessary fields for the task generation feature

-- Create or update the generated_tasks table
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
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    -- Progress tracking fields
    status TEXT DEFAULT 'Uplift',
    completed_qty INTEGER DEFAULT 0,
    total_qty INTEGER DEFAULT 1,
    missing_notes TEXT
);

-- Add constraints to ensure data integrity
ALTER TABLE generated_tasks 
ADD CONSTRAINT IF NOT EXISTS valid_status 
CHECK (status IN ('Uplift', 'Placed', 'Built', 'Incomplete', 'Missing'));

-- Add constraint to ensure completed_qty is not negative
ALTER TABLE generated_tasks 
ADD CONSTRAINT IF NOT EXISTS non_negative_completed_qty 
CHECK (completed_qty >= 0);

-- Add constraint to ensure total_qty is positive
ALTER TABLE generated_tasks 
ADD CONSTRAINT IF NOT EXISTS positive_total_qty 
CHECK (total_qty > 0);

-- Add constraint to ensure completed_qty does not exceed total_qty
ALTER TABLE generated_tasks 
ADD CONSTRAINT IF NOT EXISTS completed_not_exceed_total 
CHECK (completed_qty <= total_qty);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_generated_tasks_job_id ON generated_tasks(job_id);
CREATE INDEX IF NOT EXISTS idx_generated_tasks_install_order ON generated_tasks(job_id, install_order);
CREATE INDEX IF NOT EXISTS idx_generated_tasks_status ON generated_tasks(status);
CREATE INDEX IF NOT EXISTS idx_generated_tasks_completed_qty ON generated_tasks(completed_qty);
CREATE INDEX IF NOT EXISTS idx_generated_tasks_total_qty ON generated_tasks(total_qty);

-- Enable RLS (Row Level Security)
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

-- Create trigger for automatic timestamp updates
DROP TRIGGER IF EXISTS update_generated_tasks_updated_at ON generated_tasks;
CREATE TRIGGER update_generated_tasks_updated_at
    BEFORE UPDATE ON generated_tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add foreign key constraint if jobs table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'jobs') THEN
        ALTER TABLE generated_tasks 
        ADD CONSTRAINT IF NOT EXISTS fk_generated_tasks_job_id 
        FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE;
    END IF;
END $$;