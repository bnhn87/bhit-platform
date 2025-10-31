-- ==========================================
-- Migration 036: Add User Management Support
-- Adds is_active to profiles and creates user_permissions table
-- ==========================================

-- Add is_active column to profiles if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'profiles' AND column_name = 'is_active') THEN
        ALTER TABLE profiles ADD COLUMN is_active BOOLEAN DEFAULT true;
        RAISE NOTICE '✓ Added is_active column to profiles';
    ELSE
        RAISE NOTICE '- is_active column already exists';
    END IF;
END $$;

-- Add deactivation tracking columns if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'profiles' AND column_name = 'deactivated_at') THEN
        ALTER TABLE profiles ADD COLUMN deactivated_at TIMESTAMPTZ;
        RAISE NOTICE '✓ Added deactivated_at column to profiles';
    ELSE
        RAISE NOTICE '- deactivated_at column already exists';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'profiles' AND column_name = 'deactivated_by') THEN
        ALTER TABLE profiles ADD COLUMN deactivated_by UUID REFERENCES auth.users(id);
        RAISE NOTICE '✓ Added deactivated_by column to profiles';
    ELSE
        RAISE NOTICE '- deactivated_by column already exists';
    END IF;
END $$;

-- Create user_permissions table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Job permissions
    can_create_jobs BOOLEAN DEFAULT true,
    can_edit_jobs BOOLEAN DEFAULT true,
    can_delete_jobs BOOLEAN DEFAULT false,

    -- Cost permissions
    can_view_costs BOOLEAN DEFAULT false,
    can_edit_costs BOOLEAN DEFAULT false,

    -- Invoice permissions
    can_view_invoices BOOLEAN DEFAULT false,
    can_create_invoices BOOLEAN DEFAULT false,
    can_edit_invoices BOOLEAN DEFAULT false,

    -- Admin permissions
    can_manage_users BOOLEAN DEFAULT false,
    can_edit_org_settings BOOLEAN DEFAULT false,

    -- General permissions
    can_view_reports BOOLEAN DEFAULT true,
    can_export_data BOOLEAN DEFAULT false,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(user_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id ON user_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON profiles(is_active);

-- Enable RLS on user_permissions
ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own permissions" ON user_permissions;
DROP POLICY IF EXISTS "Admins can manage all permissions" ON user_permissions;

-- RLS Policy: Users can view their own permissions
CREATE POLICY "Users can view own permissions"
    ON user_permissions
    FOR SELECT
    USING (auth.uid() = user_id);

-- RLS Policy: Admins and directors can manage all permissions
CREATE POLICY "Admins can manage all permissions"
    ON user_permissions
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid()
            AND LOWER(role) IN ('admin', 'director')
        )
    );

-- Create default permissions for existing users who don't have them
INSERT INTO user_permissions (user_id, can_manage_users, can_edit_org_settings, can_view_costs, can_edit_costs)
SELECT
    p.id,
    LOWER(p.role) IN ('admin', 'director') as can_manage_users,
    LOWER(p.role) IN ('admin', 'director') as can_edit_org_settings,
    LOWER(p.role) IN ('admin', 'director', 'manager') as can_view_costs,
    LOWER(p.role) IN ('admin', 'director', 'manager') as can_edit_costs
FROM profiles p
WHERE NOT EXISTS (
    SELECT 1 FROM user_permissions up WHERE up.user_id = p.id
)
ON CONFLICT (user_id) DO NOTHING;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✓ User management support tables created';
    RAISE NOTICE '✓ is_active column added to profiles';
    RAISE NOTICE '✓ user_permissions table created with RLS policies';
    RAISE NOTICE '✓ Default permissions created for existing users';
END $$;
