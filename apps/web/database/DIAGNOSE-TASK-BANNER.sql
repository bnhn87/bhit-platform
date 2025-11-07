-- =====================================================
-- DIAGNOSTIC: Check Task Banner Tables Status
-- Run this in Supabase SQL Editor to see what exists
-- =====================================================

-- Check if tables exist
SELECT
  tablename,
  schemaname
FROM pg_tables
WHERE tablename LIKE '%banner%'
ORDER BY tablename;

-- Check task_banner_settings table structure (if it exists)
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'task_banner_settings'
ORDER BY ordinal_position;

-- Check if there are any records in settings
SELECT COUNT(*) as settings_count
FROM task_banner_settings;

-- Check RLS policies
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename LIKE '%banner%'
ORDER BY tablename, policyname;

-- Check for any constraint violations or issues
SELECT conname, contype, conrelid::regclass
FROM pg_constraint
WHERE conrelid::regclass::text LIKE '%banner%';
