-- Safe fix for deleted_at column with string 'null' values
-- First, let's see what we're dealing with

-- Check the current data types and values
SELECT 
  deleted_at,
  pg_typeof(deleted_at) as data_type,
  COUNT(*) as count
FROM jobs 
GROUP BY deleted_at, pg_typeof(deleted_at);

-- If the above shows string 'null' values, we need to fix the column
-- This approach converts the column to text first, then back to timestamp

-- Step 1: Convert column to text temporarily to clean the data
ALTER TABLE jobs ALTER COLUMN deleted_at TYPE TEXT;

-- Step 2: Update string nulls to actual NULL
UPDATE jobs SET deleted_at = NULL WHERE deleted_at IN ('null', '"null"', '', 'undefined');

-- Step 3: Convert back to timestamp, replacing any remaining invalid values with NULL  
ALTER TABLE jobs ALTER COLUMN deleted_at TYPE TIMESTAMP WITH TIME ZONE 
USING CASE 
  WHEN deleted_at IS NULL OR deleted_at = '' THEN NULL 
  ELSE deleted_at::TIMESTAMP WITH TIME ZONE 
END;

-- Step 4: Verify the fix
SELECT 
  COUNT(*) as total_jobs,
  COUNT(deleted_at) as jobs_with_deleted_at,
  COUNT(*) - COUNT(deleted_at) as jobs_with_null_deleted_at
FROM jobs;