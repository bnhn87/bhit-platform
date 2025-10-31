-- Add progress tracking columns to generated_tasks table
-- This migration adds columns needed for the task generation feature

-- Add status column with default value
ALTER TABLE generated_tasks 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Uplift';

-- Add completed quantity column
ALTER TABLE generated_tasks 
ADD COLUMN IF NOT EXISTS completed_qty INTEGER DEFAULT 0;

-- Add total quantity column
ALTER TABLE generated_tasks 
ADD COLUMN IF NOT EXISTS total_qty INTEGER DEFAULT 1;

-- Add missing notes column
ALTER TABLE generated_tasks 
ADD COLUMN IF NOT EXISTS missing_notes TEXT;

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

-- Update existing records to have default values for new columns
UPDATE generated_tasks 
SET status = 'Uplift', 
    completed_qty = 0, 
    total_qty = 1 
WHERE status IS NULL;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_generated_tasks_status ON generated_tasks(status);
CREATE INDEX IF NOT EXISTS idx_generated_tasks_completed_qty ON generated_tasks(completed_qty);
CREATE INDEX IF NOT EXISTS idx_generated_tasks_total_qty ON generated_tasks(total_qty);