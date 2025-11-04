-- =====================================================
-- TASK BANNER - COMPLETE SETUP (ALL-IN-ONE)
-- Run this entire file in Supabase SQL Editor
-- =====================================================

-- =====================================================
-- STEP 1: BASE SCHEMA
-- =====================================================

-- Create task banner items table
CREATE TABLE IF NOT EXISTS task_banner_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('invoicing', 'costs', 'calls', 'admin')),
  frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'biweekly', 'monthly', 'once')),
  due_date TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  navigation_route TEXT NOT NULL,
  assigned_to TEXT NOT NULL DEFAULT 'all' CHECK (assigned_to IN ('all', 'directors', 'managers')),
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create task banner settings table (singleton)
CREATE TABLE IF NOT EXISTS task_banner_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  show_background BOOLEAN DEFAULT true,
  background_color TEXT DEFAULT 'black',
  text_style TEXT DEFAULT 'CLEAN_NEON',
  font_size INTEGER DEFAULT 22 CHECK (font_size >= 12 AND font_size <= 48),
  scroll_speed INTEGER DEFAULT 30 CHECK (scroll_speed >= 10 AND scroll_speed <= 60),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create user banner permissions table
CREATE TABLE IF NOT EXISTS user_banner_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  banner_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default settings (only if table is empty)
INSERT INTO task_banner_settings (id, show_background, background_color, text_style, font_size, scroll_speed)
SELECT uuid_generate_v4(), true, 'black', 'CLEAN_NEON', 22, 30
WHERE NOT EXISTS (SELECT 1 FROM task_banner_settings LIMIT 1);

-- =====================================================
-- STEP 2: ENABLE ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE task_banner_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_banner_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_banner_permissions ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 3: RLS POLICIES - task_banner_items
-- =====================================================

DROP POLICY IF EXISTS "Users can view assigned tasks" ON task_banner_items;
DROP POLICY IF EXISTS "Directors can manage tasks" ON task_banner_items;

-- SELECT: Users can see tasks assigned to 'all' OR tasks matching their role
CREATE POLICY "Users can view assigned tasks"
  ON task_banner_items FOR SELECT
  TO authenticated
  USING (
    assigned_to = 'all'
    OR (assigned_to = 'directors' AND EXISTS (
      SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('director', 'admin')
    ))
    OR (assigned_to = 'managers' AND EXISTS (
      SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('director', 'admin', 'ops')
    ))
  );

-- INSERT/UPDATE/DELETE: Only directors and admins
CREATE POLICY "Directors can manage tasks"
  ON task_banner_items FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('director', 'admin'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('director', 'admin'))
  );

-- =====================================================
-- STEP 4: RLS POLICIES - task_banner_settings
-- =====================================================

DROP POLICY IF EXISTS "All users can view settings" ON task_banner_settings;
DROP POLICY IF EXISTS "Directors can update settings" ON task_banner_settings;

-- SELECT: All authenticated users can view settings
CREATE POLICY "All users can view settings"
  ON task_banner_settings FOR SELECT
  TO authenticated
  USING (true);

-- UPDATE: Only directors and admins can update settings
CREATE POLICY "Directors can update settings"
  ON task_banner_settings FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('director', 'admin'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('director', 'admin'))
  );

-- =====================================================
-- STEP 5: RLS POLICIES - user_banner_permissions
-- =====================================================

DROP POLICY IF EXISTS "Users can view own permission" ON user_banner_permissions;
DROP POLICY IF EXISTS "Directors can manage permissions" ON user_banner_permissions;

-- SELECT: Users can only see their own permissions
CREATE POLICY "Users can view own permission"
  ON user_banner_permissions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- INSERT/UPDATE/DELETE: Only directors and admins can manage permissions
CREATE POLICY "Directors can manage permissions"
  ON user_banner_permissions FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('director', 'admin'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('director', 'admin'))
  );

-- =====================================================
-- STEP 6: INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_task_banner_items_due_date ON task_banner_items(due_date);
CREATE INDEX IF NOT EXISTS idx_task_banner_items_status ON task_banner_items(status);
CREATE INDEX IF NOT EXISTS idx_task_banner_items_assigned_to ON task_banner_items(assigned_to);
CREATE INDEX IF NOT EXISTS idx_user_banner_permissions_user_id ON user_banner_permissions(user_id);

-- =====================================================
-- STEP 7: TRIGGER FUNCTIONS
-- =====================================================

-- Create or replace updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- STEP 8: TRIGGERS FOR updated_at COLUMNS
-- =====================================================

DROP TRIGGER IF EXISTS update_task_banner_items_updated_at ON task_banner_items;
CREATE TRIGGER update_task_banner_items_updated_at
  BEFORE UPDATE ON task_banner_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_task_banner_settings_updated_at ON task_banner_settings;
CREATE TRIGGER update_task_banner_settings_updated_at
  BEFORE UPDATE ON task_banner_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_banner_permissions_updated_at ON user_banner_permissions;
CREATE TRIGGER update_user_banner_permissions_updated_at
  BEFORE UPDATE ON user_banner_permissions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- STEP 9: ADD MESSAGE SPACING TO GLOBAL SETTINGS
-- =====================================================

ALTER TABLE task_banner_settings
ADD COLUMN IF NOT EXISTS message_spacing INTEGER DEFAULT 96
CHECK (message_spacing >= 48 AND message_spacing <= 400);

-- =====================================================
-- STEP 10: CREATE USER PREFERENCES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS user_banner_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  show_background BOOLEAN DEFAULT true,
  background_color TEXT DEFAULT 'black',
  text_style TEXT DEFAULT 'CLEAN_NEON',
  font_size INTEGER DEFAULT 22 CHECK (font_size >= 12 AND font_size <= 48),
  scroll_speed INTEGER DEFAULT 30 CHECK (scroll_speed >= 10 AND scroll_speed <= 60),
  message_spacing INTEGER DEFAULT 96 CHECK (message_spacing >= 48 AND message_spacing <= 400),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE user_banner_preferences ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view and update their own preferences
DROP POLICY IF EXISTS "Users can manage own banner preferences" ON user_banner_preferences;
CREATE POLICY "Users can manage own banner preferences"
ON user_banner_preferences
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_banner_preferences_user_id
ON user_banner_preferences(user_id);

-- Trigger for user preferences
DROP TRIGGER IF EXISTS user_banner_preferences_updated_at ON user_banner_preferences;
CREATE TRIGGER user_banner_preferences_updated_at
BEFORE UPDATE ON user_banner_preferences
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- STEP 11: ADD TEXT COLOR AND EXPAND TEXT STYLES
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

-- =====================================================
-- VERIFICATION
-- =====================================================

SELECT
  'task_banner_items' AS table_name,
  COUNT(*) AS record_count
FROM task_banner_items
UNION ALL
SELECT
  'task_banner_settings' AS table_name,
  COUNT(*) AS record_count
FROM task_banner_settings
UNION ALL
SELECT
  'user_banner_permissions' AS table_name,
  COUNT(*) AS record_count
FROM user_banner_permissions
UNION ALL
SELECT
  'user_banner_preferences' AS table_name,
  COUNT(*) AS record_count
FROM user_banner_preferences;

-- Show settings schema to verify all columns exist
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'task_banner_settings'
ORDER BY ordinal_position;

-- Show user preferences schema to verify all columns exist
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'user_banner_preferences'
ORDER BY ordinal_position;
