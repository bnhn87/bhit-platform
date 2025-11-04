-- =====================================================
-- TASK BANNER - QUICK SETUP SCRIPT
-- Run this after applying task-banner-schema.sql
-- =====================================================

-- Step 1: Find your user ID
-- Replace 'your@email.com' with your actual email
DO $$
DECLARE
  user_email TEXT := 'your@email.com'; -- CHANGE THIS!
  user_uuid UUID;
BEGIN
  -- Get user ID
  SELECT id INTO user_uuid
  FROM auth.users
  WHERE email = user_email;

  IF user_uuid IS NULL THEN
    RAISE NOTICE 'User not found with email: %', user_email;
    RAISE NOTICE 'Available users:';
    FOR user_uuid IN SELECT id, email FROM auth.users LOOP
      RAISE NOTICE '  - % (ID: %)', (SELECT email FROM auth.users WHERE id = user_uuid), user_uuid;
    END LOOP;
  ELSE
    RAISE NOTICE 'Found user: % (ID: %)', user_email, user_uuid;

    -- Step 2: Enable banner for this user
    INSERT INTO user_banner_permissions (user_id, banner_enabled)
    VALUES (user_uuid, true)
    ON CONFLICT (user_id) DO UPDATE SET banner_enabled = true;

    RAISE NOTICE '✓ Banner enabled for user';

    -- Step 3: Create demo tasks
    INSERT INTO task_banner_items (title, type, frequency, due_date, navigation_route, assigned_to, created_by)
    VALUES
      -- Urgent task (brightness 5) - due in 30 mins
      ('REVIEW PENDING INVOICES', 'invoicing', 'daily', NOW() + INTERVAL '30 minutes', '/invoicing/schedule', 'all', user_uuid),

      -- High priority (brightness 4) - due in 2 hours
      ('CALL CLIENT RE: PROJECT PHOENIX', 'calls', 'once', NOW() + INTERVAL '2 hours', '/dashboard', 'all', user_uuid),

      -- Medium (brightness 3) - due in 5 hours
      ('UPDATE SUPPLIER COST SHEETS', 'costs', 'weekly', NOW() + INTERVAL '5 hours', '/admin/costing', 'directors', user_uuid),

      -- Low (brightness 2) - due tomorrow
      ('APPROVE TIMESHEETS', 'admin', 'weekly', NOW() + INTERVAL '1 day', '/dashboard', 'all', user_uuid),

      -- Very low (brightness 1) - due in 3 days
      ('REVIEW SMARTQUOTE REVISIONS', 'admin', 'once', NOW() + INTERVAL '3 days', '/smart-quote', 'all', user_uuid);

    RAISE NOTICE '✓ Created 5 demo tasks with varying urgency levels';
    RAISE NOTICE '';
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'SETUP COMPLETE!';
    RAISE NOTICE '==========================================';
    RAISE NOTICE 'Refresh your browser to see the task banner';
    RAISE NOTICE '(It will only show if you have active tasks)';
  END IF;
END $$;

-- Verify setup
SELECT
  'User Permissions' AS check_type,
  COUNT(*) AS count,
  STRING_AGG(
    (SELECT email FROM auth.users WHERE id = user_id) || ': ' || banner_enabled::text,
    ', '
  ) AS details
FROM user_banner_permissions
UNION ALL
SELECT
  'Active Tasks' AS check_type,
  COUNT(*) AS count,
  STRING_AGG(title || ' (due: ' || due_date::text || ')', ', ') AS details
FROM task_banner_items
WHERE status != 'completed'
UNION ALL
SELECT
  'Banner Settings' AS check_type,
  1 AS count,
  'Background: ' || background_color || ', Style: ' || text_style || ', Size: ' || font_size || 'px' AS details
FROM task_banner_settings
LIMIT 1;
