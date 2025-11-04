-- =====================================================
-- QUICK DATABASE STATE CHECK
-- Run this to see what's missing
-- =====================================================

-- Check if task_banner_settings table exists
SELECT 'Checking task_banner_settings table...' AS status;
SELECT EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name = 'task_banner_settings'
) AS table_exists;

-- If table exists, check if it has records
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_name = 'task_banner_settings'
  ) THEN
    RAISE NOTICE '✅ task_banner_settings table EXISTS';

    -- Show record count
    PERFORM pg_sleep(0.1);
    RAISE NOTICE 'Record count: %', (SELECT COUNT(*) FROM task_banner_settings);

    -- Show all columns
    PERFORM pg_sleep(0.1);
    RAISE NOTICE 'Columns in table:';
    FOR rec IN
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'task_banner_settings'
      ORDER BY ordinal_position
    LOOP
      RAISE NOTICE '  - % (%)', rec.column_name, rec.data_type;
    END LOOP;

  ELSE
    RAISE NOTICE '❌ task_banner_settings table DOES NOT EXIST';
    RAISE NOTICE 'You need to run: task-banner-COMPLETE-SETUP.sql';
  END IF;
END $$;

-- Show actual data if exists
SELECT 'Current settings data:' AS status;
SELECT * FROM task_banner_settings;

-- Check user_banner_preferences table
SELECT 'Checking user_banner_preferences table...' AS status;
SELECT EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name = 'user_banner_preferences'
) AS table_exists;

-- Show instructions based on results
SELECT
  CASE
    WHEN (SELECT COUNT(*) FROM task_banner_settings) = 0 THEN
      '❌ NO SETTINGS FOUND - Run task-banner-COMPLETE-SETUP.sql'
    WHEN (SELECT COUNT(*) FROM task_banner_settings) > 0 THEN
      '✅ Settings exist! Check browser console for the actual error.'
    ELSE
      '❌ Table does not exist - Run task-banner-COMPLETE-SETUP.sql'
  END AS diagnosis;
