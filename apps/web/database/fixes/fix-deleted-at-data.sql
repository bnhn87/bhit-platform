-- Fix the deleted_at column data
-- Convert string 'null' values to actual NULL values

UPDATE jobs 
SET deleted_at = NULL 
WHERE deleted_at = 'null' OR deleted_at = '"null"' OR deleted_at = '';

-- Verify the fix
SELECT 
  COUNT(*) as total_jobs,
  COUNT(deleted_at) as jobs_with_deleted_at,
  COUNT(*) - COUNT(deleted_at) as jobs_with_null_deleted_at
FROM jobs;