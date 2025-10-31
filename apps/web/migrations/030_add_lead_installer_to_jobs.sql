-- Migration: Add lead_installer field to jobs table
-- This adds the ability to assign a lead installer to each job

-- Add lead_installer column to jobs table
ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS lead_installer_id UUID REFERENCES auth.users(id);

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_jobs_lead_installer ON jobs(lead_installer_id);

-- Add comment explaining the field
COMMENT ON COLUMN jobs.lead_installer_id IS 'Reference to the user assigned as lead installer for this job';