-- =====================================================
-- FORCE CREATE TABLE (Simplified, no dependencies)
-- Run this to create JUST the settings table
-- =====================================================

-- Drop and recreate to ensure it's fresh
DROP TABLE IF EXISTS task_banner_settings CASCADE;

-- Create the table
CREATE TABLE task_banner_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  show_background BOOLEAN DEFAULT true,
  background_color TEXT DEFAULT 'black',
  text_style TEXT DEFAULT 'CLEAN_NEON',
  text_color TEXT DEFAULT 'neon-blue',
  font_size INTEGER DEFAULT 22,
  scroll_speed INTEGER DEFAULT 30,
  message_spacing INTEGER DEFAULT 96,
  empty_message TEXT DEFAULT 'NO ACTIVE TASKS - ALL CLEAR',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Disable RLS completely for now (we'll fix permissions later)
ALTER TABLE task_banner_settings DISABLE ROW LEVEL SECURITY;

-- Insert default record
INSERT INTO task_banner_settings (
  show_background,
  background_color,
  text_style,
  text_color,
  font_size,
  scroll_speed,
  message_spacing,
  empty_message
) VALUES (
  true,
  'black',
  'CLEAN_NEON',
  'neon-blue',
  22,
  30,
  96,
  'NO ACTIVE TASKS - ALL CLEAR'
);

-- Verify it was created
SELECT 'Table created successfully!' AS status;
SELECT * FROM task_banner_settings;

-- Check if Supabase can see it
SELECT
  table_name,
  table_schema
FROM information_schema.tables
WHERE table_name = 'task_banner_settings';
