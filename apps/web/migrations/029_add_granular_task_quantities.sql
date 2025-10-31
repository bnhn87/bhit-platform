-- Migration: Add granular quantity tracking columns to generated_tasks table
-- This adds detailed tracking for uplifted, placed, built, missing, and damaged quantities

-- Add granular quantity columns
ALTER TABLE generated_tasks
ADD COLUMN IF NOT EXISTS uplifted_qty INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS placed_qty INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS built_qty INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS missing_qty INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS damaged_qty INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS damage_notes TEXT;

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_generated_tasks_uplifted_qty ON generated_tasks(uplifted_qty);
CREATE INDEX IF NOT EXISTS idx_generated_tasks_placed_qty ON generated_tasks(placed_qty);
CREATE INDEX IF NOT EXISTS idx_generated_tasks_built_qty ON generated_tasks(built_qty);
CREATE INDEX IF NOT EXISTS idx_generated_tasks_missing_qty ON generated_tasks(missing_qty);
CREATE INDEX IF NOT EXISTS idx_generated_tasks_damaged_qty ON generated_tasks(damaged_qty);

-- Add comments explaining the fields
COMMENT ON COLUMN generated_tasks.uplifted_qty IS 'Number of items that have been uplifted from storage/warehouse';
COMMENT ON COLUMN generated_tasks.placed_qty IS 'Number of items that have been placed in position';
COMMENT ON COLUMN generated_tasks.built_qty IS 'Number of items that have been fully built/installed';
COMMENT ON COLUMN generated_tasks.missing_qty IS 'Number of items that are missing from delivery';
COMMENT ON COLUMN generated_tasks.damaged_qty IS 'Number of items that arrived damaged';
COMMENT ON COLUMN generated_tasks.damage_notes IS 'Notes about damaged items';