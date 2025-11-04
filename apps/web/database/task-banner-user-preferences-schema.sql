-- =====================================================
-- TASK BANNER - USER PREFERENCES SCHEMA
-- Run this AFTER task-banner-schema.sql
-- Adds user-level customization and message spacing
-- =====================================================

-- Add message spacing to global settings
ALTER TABLE task_banner_settings
ADD COLUMN IF NOT EXISTS message_spacing INTEGER DEFAULT 96
CHECK (message_spacing >= 48 AND message_spacing <= 400);

-- Create user preferences table for personal customization
CREATE TABLE IF NOT EXISTS user_banner_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  show_background BOOLEAN DEFAULT true,
  background_color TEXT DEFAULT 'black',
  text_style TEXT DEFAULT 'CLEAN_NEON' CHECK (text_style IN ('CLEAN_NEON', 'DOT_MATRIX')),
  font_size INTEGER DEFAULT 22 CHECK (font_size >= 12 AND font_size <= 48),
  scroll_speed INTEGER DEFAULT 30 CHECK (scroll_speed >= 10 AND scroll_speed <= 60),
  message_spacing INTEGER DEFAULT 96 CHECK (message_spacing >= 48 AND message_spacing <= 400),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE user_banner_preferences ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view and update their own preferences
CREATE POLICY "Users can manage own banner preferences"
ON user_banner_preferences
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy: Admins and directors can view all preferences
CREATE POLICY "Admins can view all banner preferences"
ON user_banner_preferences
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role IN ('admin', 'director')
  )
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_banner_preferences_user_id
ON user_banner_preferences(user_id);

-- Update function for timestamps
CREATE OR REPLACE FUNCTION update_user_banner_preferences_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_banner_preferences_updated_at
BEFORE UPDATE ON user_banner_preferences
FOR EACH ROW
EXECUTE FUNCTION update_user_banner_preferences_timestamp();

-- Verification
SELECT
  'user_banner_preferences table created' AS status,
  COUNT(*) AS existing_preferences
FROM user_banner_preferences;
