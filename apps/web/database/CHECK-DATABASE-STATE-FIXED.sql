-- =====================================================
-- QUICK DATABASE STATE CHECK (FIXED)
-- Run this to see what's missing
-- =====================================================

-- Check if task_banner_settings table exists
SELECT 'Step 1: Checking if table exists...' AS status;

SELECT
  table_name,
  CASE WHEN table_name IS NOT NULL THEN '✅ EXISTS' ELSE '❌ MISSING' END AS status
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name = 'task_banner_settings';

-- Check columns in the table
SELECT 'Step 2: Checking columns...' AS status;

SELECT
  column_name,
  data_type,
  column_default
FROM information_schema.columns
WHERE table_name = 'task_banner_settings'
ORDER BY ordinal_position;

-- Check if there are any settings records
SELECT 'Step 3: Checking for settings records...' AS status;

SELECT
  COUNT(*) as record_count,
  CASE
    WHEN COUNT(*) = 0 THEN '❌ NO RECORDS - Need to insert default settings'
    WHEN COUNT(*) > 0 THEN '✅ Settings exist'
  END as diagnosis
FROM task_banner_settings;

-- Show the actual settings data (if any)
SELECT 'Step 4: Current settings data:' AS status;

SELECT * FROM task_banner_settings;

-- Check if text_color column exists (this was added in migration)
SELECT 'Step 5: Checking for new columns...' AS status;

SELECT
  CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'task_banner_settings'
      AND column_name = 'text_color'
    ) THEN '✅ text_color column exists'
    ELSE '❌ text_color column MISSING - Run task-banner-COMPLETE-SETUP.sql'
  END AS text_color_status,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'task_banner_settings'
      AND column_name = 'empty_message'
    ) THEN '✅ empty_message column exists'
    ELSE '❌ empty_message column MISSING - Run task-banner-COMPLETE-SETUP.sql'
  END AS empty_message_status,
  CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'task_banner_settings'
      AND column_name = 'message_spacing'
    ) THEN '✅ message_spacing column exists'
    ELSE '❌ message_spacing column MISSING - Run task-banner-COMPLETE-SETUP.sql'
  END AS message_spacing_status;

-- Final diagnosis
SELECT 'Step 6: FINAL DIAGNOSIS' AS status;

SELECT
  CASE
    WHEN NOT EXISTS (
      SELECT FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name = 'task_banner_settings'
    ) THEN '❌ TABLE MISSING - Run task-banner-COMPLETE-SETUP.sql'
    WHEN (SELECT COUNT(*) FROM task_banner_settings) = 0 THEN '❌ NO SETTINGS RECORD - Run insert-default-settings.sql'
    WHEN NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'task_banner_settings'
      AND column_name = 'text_color'
    ) THEN '❌ MISSING COLUMNS - Run task-banner-COMPLETE-SETUP.sql'
    ELSE '✅ DATABASE LOOKS GOOD - Check browser console for actual error'
  END AS final_diagnosis;
