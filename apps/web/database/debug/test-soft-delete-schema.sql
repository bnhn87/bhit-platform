-- Test script to check if soft delete columns exist on jobs table
-- This will help us determine if we need to apply the migration

SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'jobs' 
  AND column_name IN ('deleted_at', 'deleted_by')
ORDER BY column_name;

-- Also check if the jobs table exists at all
SELECT COUNT(*) as jobs_count FROM jobs WHERE 1=0;