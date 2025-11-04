-- =====================================================
-- MINIMAL TASK BANNER SETUP
-- This is a stripped-down version that should work
-- Run this in Supabase SQL Editor
-- =====================================================

-- Drop existing tables if they exist (fresh start)
DROP TABLE IF EXISTS user_banner_preferences CASCADE;
DROP TABLE IF EXISTS user_banner_permissions CASCADE;
DROP TABLE IF EXISTS task_banner_items CASCADE;
DROP TABLE IF EXISTS task_banner_settings CASCADE;

-- Create task_banner_settings table (singleton for global settings)
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

-- Create task_banner_items table
CREATE TABLE task_banner_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  type TEXT NOT NULL,
  frequency TEXT NOT NULL,
  due_date TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  navigation_route TEXT NOT NULL,
  assigned_to TEXT NOT NULL DEFAULT 'all',
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create user_banner_permissions table
CREATE TABLE user_banner_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE,
  banner_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create user_banner_preferences table
CREATE TABLE user_banner_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE,
  show_background BOOLEAN DEFAULT true,
  background_color TEXT DEFAULT 'black',
  text_style TEXT DEFAULT 'CLEAN_NEON',
  text_color TEXT DEFAULT 'neon-blue',
  font_size INTEGER DEFAULT 22,
  scroll_speed INTEGER DEFAULT 30,
  message_spacing INTEGER DEFAULT 96,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE task_banner_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_banner_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_banner_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_banner_preferences ENABLE ROW LEVEL SECURITY;

-- Simple policies: Everyone can read, service role can write
CREATE POLICY "Allow read access" ON task_banner_settings FOR SELECT USING (true);
CREATE POLICY "Allow service role write" ON task_banner_settings FOR ALL USING (true);

CREATE POLICY "Allow read access" ON task_banner_items FOR SELECT USING (true);
CREATE POLICY "Allow service role write" ON task_banner_items FOR ALL USING (true);

CREATE POLICY "Allow read access" ON user_banner_permissions FOR SELECT USING (true);
CREATE POLICY "Allow service role write" ON user_banner_permissions FOR ALL USING (true);

CREATE POLICY "Allow read access" ON user_banner_preferences FOR SELECT USING (true);
CREATE POLICY "Allow service role write" ON user_banner_preferences FOR ALL USING (true);

-- Insert default settings record
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

-- Verify setup
SELECT * FROM task_banner_settings;
SELECT 'Setup complete! ✓' as status;
