-- Add soft delete functionality to jobs table
-- This allows jobs to be "deleted" but kept in the database for recovery

-- Add deleted_at column to jobs table
ALTER TABLE jobs 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

-- Add deleted_by column to track who deleted the job
ALTER TABLE jobs 
ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES auth.users(id);

-- Add index for better performance on deleted jobs queries
CREATE INDEX IF NOT EXISTS idx_jobs_deleted_at ON jobs(deleted_at);

-- Add comments for documentation
COMMENT ON COLUMN jobs.deleted_at IS 'Timestamp when job was soft deleted. NULL means not deleted.';
COMMENT ON COLUMN jobs.deleted_by IS 'User who deleted the job';

SELECT 'Soft delete migration for jobs - SUCCESS' as status;