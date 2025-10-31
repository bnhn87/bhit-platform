-- ==========================================
-- Migration 034: User Management Functions
-- Admin functions for creating, updating, and managing users
-- Requires service_role key to bypass RLS
-- ==========================================

-- ==========================================
-- PART 1: ADD MISSING COLUMNS TO USER_PROFILES
-- ==========================================

-- Add is_active flag for soft deactivation
ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS deactivated_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS deactivated_by UUID REFERENCES auth.users(id);

-- ==========================================
-- PART 2: USER PERMISSIONS TABLE
-- ==========================================

-- Create a more granular permissions table
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

    -- User management
    can_manage_users BOOLEAN DEFAULT false,

    -- Settings
    can_edit_org_settings BOOLEAN DEFAULT false,

    -- Reporting
    can_view_reports BOOLEAN DEFAULT true,
    can_export_data BOOLEAN DEFAULT false,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can view all permissions, users can view their own
CREATE POLICY "Users can view own permissions"
    ON user_permissions FOR SELECT
    USING (
        user_id = auth.uid()
        OR EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Policy: Only admins can modify permissions
CREATE POLICY "Admins can manage permissions"
    ON user_permissions FOR ALL
    USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin'));

-- ==========================================
-- PART 3: ADMIN FUNCTION - CREATE USER
-- ==========================================

-- This function creates a new user with email/password
-- MUST be called with service_role key (not anon key)
CREATE OR REPLACE FUNCTION admin_create_user(
    p_email TEXT,
    p_password TEXT,
    p_full_name TEXT,
    p_role TEXT,
    p_account_id UUID,
    p_permissions JSONB DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_user_id UUID;
    v_result JSONB;
BEGIN
    -- Check if caller is admin
    IF NOT EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin') THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Permission denied: Only admins can create users'
        );
    END IF;

    -- Validate role
    IF p_role NOT IN ('admin', 'manager', 'installer', 'user') THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Invalid role. Must be: admin, manager, installer, or user'
        );
    END IF;

    -- Note: The actual user creation in auth.users must be done via Supabase Admin API
    -- This function creates the profile and permissions after the auth user is created
    -- Return instructions for the API call

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Use Supabase Admin API to create auth.users first, then call admin_setup_user_profile',
        'api_endpoint', '/auth/v1/admin/users',
        'next_step', 'Call admin_setup_user_profile with the returned user_id'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- PART 4: ADMIN FUNCTION - SETUP USER PROFILE
-- ==========================================

-- Called after creating auth.users via Admin API
CREATE OR REPLACE FUNCTION admin_setup_user_profile(
    p_user_id UUID,
    p_full_name TEXT,
    p_role TEXT,
    p_account_id UUID,
    p_permissions JSONB DEFAULT NULL
)
RETURNS JSONB AS $$
BEGIN
    -- Check if caller is admin
    IF NOT EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin') THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Permission denied: Only admins can setup user profiles'
        );
    END IF;

    -- Create user profile
    INSERT INTO user_profiles (id, full_name, role, account_id, is_active)
    VALUES (p_user_id, p_full_name, p_role, p_account_id, true)
    ON CONFLICT (id) DO UPDATE
    SET full_name = p_full_name,
        role = p_role,
        account_id = p_account_id,
        is_active = true;

    -- Setup permissions based on role defaults or custom permissions
    INSERT INTO user_permissions (
        user_id,
        can_create_jobs,
        can_edit_jobs,
        can_delete_jobs,
        can_view_costs,
        can_edit_costs,
        can_view_invoices,
        can_create_invoices,
        can_edit_invoices,
        can_manage_users,
        can_edit_org_settings,
        can_view_reports,
        can_export_data
    )
    VALUES (
        p_user_id,
        COALESCE((p_permissions->>'can_create_jobs')::boolean, p_role IN ('admin', 'manager', 'installer')),
        COALESCE((p_permissions->>'can_edit_jobs')::boolean, p_role IN ('admin', 'manager', 'installer')),
        COALESCE((p_permissions->>'can_delete_jobs')::boolean, p_role = 'admin'),
        COALESCE((p_permissions->>'can_view_costs')::boolean, p_role IN ('admin', 'manager')),
        COALESCE((p_permissions->>'can_edit_costs')::boolean, p_role IN ('admin', 'manager')),
        COALESCE((p_permissions->>'can_view_invoices')::boolean, p_role IN ('admin', 'manager')),
        COALESCE((p_permissions->>'can_create_invoices')::boolean, p_role IN ('admin', 'manager')),
        COALESCE((p_permissions->>'can_edit_invoices')::boolean, p_role IN ('admin', 'manager')),
        COALESCE((p_permissions->>'can_manage_users')::boolean, p_role = 'admin'),
        COALESCE((p_permissions->>'can_edit_org_settings')::boolean, p_role = 'admin'),
        COALESCE((p_permissions->>'can_view_reports')::boolean, true),
        COALESCE((p_permissions->>'can_export_data')::boolean, p_role IN ('admin', 'manager'))
    )
    ON CONFLICT (user_id) DO UPDATE
    SET can_create_jobs = EXCLUDED.can_create_jobs,
        can_edit_jobs = EXCLUDED.can_edit_jobs,
        can_delete_jobs = EXCLUDED.can_delete_jobs,
        can_view_costs = EXCLUDED.can_view_costs,
        can_edit_costs = EXCLUDED.can_edit_costs,
        can_view_invoices = EXCLUDED.can_view_invoices,
        can_create_invoices = EXCLUDED.can_create_invoices,
        can_edit_invoices = EXCLUDED.can_edit_invoices,
        can_manage_users = EXCLUDED.can_manage_users,
        can_edit_org_settings = EXCLUDED.can_edit_org_settings,
        can_view_reports = EXCLUDED.can_view_reports,
        can_export_data = EXCLUDED.can_export_data;

    -- Grant cost access if needed
    IF p_role IN ('admin', 'manager') OR (p_permissions->>'can_view_costs')::boolean THEN
        INSERT INTO cost_access (user_id, has_access, granted_by)
        VALUES (p_user_id, true, auth.uid())
        ON CONFLICT (user_id) DO UPDATE
        SET has_access = true;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'user_id', p_user_id,
        'message', 'User profile and permissions created successfully'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- PART 5: ADMIN FUNCTION - UPDATE USER
-- ==========================================

CREATE OR REPLACE FUNCTION admin_update_user(
    p_user_id UUID,
    p_full_name TEXT DEFAULT NULL,
    p_role TEXT DEFAULT NULL,
    p_permissions JSONB DEFAULT NULL
)
RETURNS JSONB AS $$
BEGIN
    -- Check if caller is admin
    IF NOT EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin') THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Permission denied: Only admins can update users'
        );
    END IF;

    -- Update user profile
    UPDATE user_profiles
    SET
        full_name = COALESCE(p_full_name, full_name),
        role = COALESCE(p_role, role),
        updated_at = NOW()
    WHERE id = p_user_id;

    -- Update permissions if provided
    IF p_permissions IS NOT NULL THEN
        UPDATE user_permissions
        SET
            can_create_jobs = COALESCE((p_permissions->>'can_create_jobs')::boolean, can_create_jobs),
            can_edit_jobs = COALESCE((p_permissions->>'can_edit_jobs')::boolean, can_edit_jobs),
            can_delete_jobs = COALESCE((p_permissions->>'can_delete_jobs')::boolean, can_delete_jobs),
            can_view_costs = COALESCE((p_permissions->>'can_view_costs')::boolean, can_view_costs),
            can_edit_costs = COALESCE((p_permissions->>'can_edit_costs')::boolean, can_edit_costs),
            can_view_invoices = COALESCE((p_permissions->>'can_view_invoices')::boolean, can_view_invoices),
            can_create_invoices = COALESCE((p_permissions->>'can_create_invoices')::boolean, can_create_invoices),
            can_edit_invoices = COALESCE((p_permissions->>'can_edit_invoices')::boolean, can_edit_invoices),
            can_manage_users = COALESCE((p_permissions->>'can_manage_users')::boolean, can_manage_users),
            can_edit_org_settings = COALESCE((p_permissions->>'can_edit_org_settings')::boolean, can_edit_org_settings),
            can_view_reports = COALESCE((p_permissions->>'can_view_reports')::boolean, can_view_reports),
            can_export_data = COALESCE((p_permissions->>'can_export_data')::boolean, can_export_data),
            updated_at = NOW()
        WHERE user_id = p_user_id;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'user_id', p_user_id,
        'message', 'User updated successfully'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- PART 6: ADMIN FUNCTION - DEACTIVATE USER
-- ==========================================

CREATE OR REPLACE FUNCTION admin_deactivate_user(
    p_user_id UUID
)
RETURNS JSONB AS $$
BEGIN
    -- Check if caller is admin
    IF NOT EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin') THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Permission denied: Only admins can deactivate users'
        );
    END IF;

    -- Prevent self-deactivation
    IF p_user_id = auth.uid() THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Cannot deactivate your own account'
        );
    END IF;

    -- Deactivate user
    UPDATE user_profiles
    SET
        is_active = false,
        deactivated_at = NOW(),
        deactivated_by = auth.uid(),
        updated_at = NOW()
    WHERE id = p_user_id;

    RETURN jsonb_build_object(
        'success', true,
        'user_id', p_user_id,
        'message', 'User deactivated successfully'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- PART 7: ADMIN FUNCTION - ACTIVATE USER
-- ==========================================

CREATE OR REPLACE FUNCTION admin_activate_user(
    p_user_id UUID
)
RETURNS JSONB AS $$
BEGIN
    -- Check if caller is admin
    IF NOT EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin') THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Permission denied: Only admins can activate users'
        );
    END IF;

    -- Activate user
    UPDATE user_profiles
    SET
        is_active = true,
        deactivated_at = NULL,
        deactivated_by = NULL,
        updated_at = NOW()
    WHERE id = p_user_id;

    RETURN jsonb_build_object(
        'success', true,
        'user_id', p_user_id,
        'message', 'User activated successfully'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- PART 8: VIEW - USER LIST FOR ADMINS
-- ==========================================

CREATE OR REPLACE VIEW v_user_management AS
SELECT
    up.id,
    au.email,
    up.full_name,
    up.role,
    up.is_active,
    up.account_id,
    a.name as account_name,
    up.created_at,
    up.updated_at,
    up.deactivated_at,
    deactivator.full_name as deactivated_by_name,

    -- Permissions
    perm.can_create_jobs,
    perm.can_edit_jobs,
    perm.can_delete_jobs,
    perm.can_view_costs,
    perm.can_edit_costs,
    perm.can_view_invoices,
    perm.can_create_invoices,
    perm.can_edit_invoices,
    perm.can_manage_users,
    perm.can_edit_org_settings,
    perm.can_view_reports,
    perm.can_export_data,

    -- Last login (if available)
    au.last_sign_in_at

FROM user_profiles up
LEFT JOIN auth.users au ON up.id = au.id
LEFT JOIN accounts a ON up.account_id = a.id
LEFT JOIN user_permissions perm ON up.id = perm.user_id
LEFT JOIN user_profiles deactivator ON up.deactivated_by = deactivator.id;

-- ==========================================
-- PART 9: INDEXES
-- ==========================================

CREATE INDEX IF NOT EXISTS idx_user_profiles_is_active ON user_profiles(is_active);
CREATE INDEX IF NOT EXISTS idx_user_profiles_account_role ON user_profiles(account_id, role);
CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id ON user_permissions(user_id);

-- ==========================================
-- PART 10: COMMENTS
-- ==========================================

COMMENT ON TABLE user_permissions IS 'Granular permission control for users beyond role-based access';
COMMENT ON FUNCTION admin_setup_user_profile IS 'Admin function to setup user profile after creating auth.users via Supabase Admin API';
COMMENT ON FUNCTION admin_update_user IS 'Admin function to update user details and permissions';
COMMENT ON FUNCTION admin_deactivate_user IS 'Admin function to soft-deactivate a user without deleting';
COMMENT ON FUNCTION admin_activate_user IS 'Admin function to reactivate a deactivated user';
COMMENT ON VIEW v_user_management IS 'Comprehensive user list for admin dashboard with permissions';

-- ==========================================
-- COMPLETION MESSAGE
-- ==========================================

DO $$
BEGIN
    RAISE NOTICE '✓ User management functions migration complete';
    RAISE NOTICE '✓ Created admin_setup_user_profile function';
    RAISE NOTICE '✓ Created admin_update_user function';
    RAISE NOTICE '✓ Created admin_deactivate_user function';
    RAISE NOTICE '✓ Created admin_activate_user function';
    RAISE NOTICE '✓ Created user_permissions table';
    RAISE NOTICE '✓ Created v_user_management view';
    RAISE NOTICE '✓ Ready for admin dashboard integration';
END $$;
