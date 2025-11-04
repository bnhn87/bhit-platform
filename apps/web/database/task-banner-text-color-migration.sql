-- =====================================================
-- TASK BANNER - TEXT COLOR AND EXPANDED STYLES MIGRATION
-- Adds text_color column and expands text_style options
-- =====================================================

-- Add text_color column to task_banner_settings
ALTER TABLE task_banner_settings
ADD COLUMN IF NOT EXISTS text_color TEXT DEFAULT 'neon-blue'
CHECK (text_color IN (
  'neon-blue',
  'cyber-pink',
  'electric-purple',
  'toxic-green',
  'laser-red',
  'plasma-orange',
  'cosmic-teal',
  'radioactive-yellow',
  'hot-magenta',
  'ultra-violet',
  'neon-lime',
  'bright-cyan',
  'fire-orange',
  'shocking-pink',
  'vivid-gold',
  'rainbow'
));

-- Add text_color column to user_banner_preferences
ALTER TABLE user_banner_preferences
ADD COLUMN IF NOT EXISTS text_color TEXT DEFAULT 'neon-blue'
CHECK (text_color IN (
  'neon-blue',
  'cyber-pink',
  'electric-purple',
  'toxic-green',
  'laser-red',
  'plasma-orange',
  'cosmic-teal',
  'radioactive-yellow',
  'hot-magenta',
  'ultra-violet',
  'neon-lime',
  'bright-cyan',
  'fire-orange',
  'shocking-pink',
  'vivid-gold',
  'rainbow'
));

-- Drop old text_style constraint on task_banner_settings and add new one with expanded options
ALTER TABLE task_banner_settings
DROP CONSTRAINT IF EXISTS task_banner_settings_text_style_check;

ALTER TABLE task_banner_settings
ADD CONSTRAINT task_banner_settings_text_style_check
CHECK (text_style IN (
  'CLEAN_NEON',
  'DOT_MATRIX',
  'RETRO_GLOW',
  'CYBERPUNK',
  'NEON_TUBES',
  'HOLOGRAPHIC',
  'ELECTRIC_PULSE',
  'SYNTHWAVE'
));

-- Drop old text_style constraint on user_banner_preferences and add new one with expanded options
ALTER TABLE user_banner_preferences
DROP CONSTRAINT IF EXISTS user_banner_preferences_text_style_check;

ALTER TABLE user_banner_preferences
ADD CONSTRAINT user_banner_preferences_text_style_check
CHECK (text_style IN (
  'CLEAN_NEON',
  'DOT_MATRIX',
  'RETRO_GLOW',
  'CYBERPUNK',
  'NEON_TUBES',
  'HOLOGRAPHIC',
  'ELECTRIC_PULSE',
  'SYNTHWAVE'
));

-- Add empty_message column to task_banner_settings for custom message when no tasks
ALTER TABLE task_banner_settings
ADD COLUMN IF NOT EXISTS empty_message TEXT DEFAULT 'NO ACTIVE TASKS - ALL CLEAR';

-- Update any existing records to have the default text_color (in case they're NULL)
UPDATE task_banner_settings
SET text_color = 'neon-blue'
WHERE text_color IS NULL;

UPDATE user_banner_preferences
SET text_color = 'neon-blue'
WHERE text_color IS NULL;

-- Verification
SELECT
  'text_color column added to task_banner_settings' AS status,
  COUNT(*) AS records_updated
FROM task_banner_settings
WHERE text_color IS NOT NULL;

SELECT
  'text_color column added to user_banner_preferences' AS status,
  COUNT(*) AS records_updated
FROM user_banner_preferences
WHERE text_color IS NOT NULL;

-- Show updated schemas
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'task_banner_settings'
ORDER BY ordinal_position;

SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'user_banner_preferences'
ORDER BY ordinal_position;
