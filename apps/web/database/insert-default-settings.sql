-- =====================================================
-- INSERT DEFAULT TASK BANNER SETTINGS
-- Run this if you get "Settings not found" error
-- =====================================================

-- Check if settings exist
SELECT 'Current settings count:' AS status, COUNT(*) AS count
FROM task_banner_settings;

-- Insert default settings (will skip if already exists)
INSERT INTO task_banner_settings (
  id,
  show_background,
  background_color,
  text_style,
  text_color,
  font_size,
  scroll_speed,
  message_spacing,
  empty_message,
  created_at,
  updated_at
)
SELECT
  uuid_generate_v4(),
  true,
  'black',
  'CLEAN_NEON',
  'neon-blue',
  22,
  30,
  96,
  'NO ACTIVE TASKS - ALL CLEAR',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM task_banner_settings LIMIT 1);

-- Verify it was inserted
SELECT 'Settings after insert:' AS status;
SELECT
  id,
  show_background,
  background_color,
  text_style,
  text_color,
  font_size,
  scroll_speed,
  message_spacing,
  empty_message
FROM task_banner_settings;

SELECT '✅ Default settings inserted! Try saving again.' AS result;
