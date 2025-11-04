-- =====================================================
-- BHIT WORK OS - TASK BANNER SYSTEM
-- Database Schema and RLS Policies
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
  text_style TEXT DEFAULT 'CLEAN_NEON' CHECK (text_style IN ('CLEAN_NEON', 'DOT_MATRIX')),
  font_size INTEGER DEFAULT 24 CHECK (font_size >= 12 AND font_size <= 48),
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
SELECT uuid_generate_v4(), true, 'black', 'CLEAN_NEON', 24, 30
WHERE NOT EXISTS (SELECT 1 FROM task_banner_settings LIMIT 1);

-- =====================================================
-- ENABLE ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE task_banner_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_banner_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_banner_permissions ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES - task_banner_items
-- =====================================================

-- Drop existing policies if they exist
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
-- RLS POLICIES - task_banner_settings
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
-- RLS POLICIES - user_banner_permissions
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
-- INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_task_banner_items_due_date ON task_banner_items(due_date);
CREATE INDEX IF NOT EXISTS idx_task_banner_items_status ON task_banner_items(status);
CREATE INDEX IF NOT EXISTS idx_task_banner_items_assigned_to ON task_banner_items(assigned_to);
CREATE INDEX IF NOT EXISTS idx_user_banner_permissions_user_id ON user_banner_permissions(user_id);

-- =====================================================
-- TRIGGER FUNCTIONS
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
-- TRIGGERS FOR updated_at COLUMNS
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
-- VERIFICATION QUERIES (Comment out after running)
-- =====================================================

-- Verify tables exist
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public' AND table_name LIKE '%task_banner%';

-- Verify default settings inserted
-- SELECT * FROM task_banner_settings;

-- Verify RLS enabled
-- SELECT tablename, rowsecurity FROM pg_tables
-- WHERE tablename LIKE '%task_banner%';
