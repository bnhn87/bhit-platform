-- ==========================================
-- USER MANAGEMENT COMPLETE SETUP
-- Run this entire file in Supabase SQL Editor
-- ==========================================

BEGIN;

-- ==========================================
-- STEP 1: CREATE USER_PERMISSIONS TABLE
-- ==========================================

CREATE TABLE IF NOT EXISTS user_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    can_create_jobs BOOLEAN DEFAULT true,
    can_edit_jobs BOOLEAN DEFAULT true,
    can_delete_jobs BOOLEAN DEFAULT false,
    can_view_costs BOOLEAN DEFAULT false,
    can_edit_costs BOOLEAN DEFAULT false,
    can_view_invoices BOOLEAN DEFAULT false,
    can_create_invoices BOOLEAN DEFAULT false,
    can_edit_invoices BOOLEAN DEFAULT false,
    can_manage_users BOOLEAN DEFAULT false,
    can_edit_org_settings BOOLEAN DEFAULT false,
    can_view_reports BOOLEAN DEFAULT true,
    can_export_data BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id ON user_permissions(user_id);
ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;

-- ==========================================
-- STEP 2: UPDATE RLS POLICIES FOR user_permissions
-- ==========================================

DROP POLICY IF EXISTS "Users can view own permissions" ON user_permissions;
DROP POLICY IF EXISTS "Admins can manage permissions" ON user_permissions;
DROP POLICY IF EXISTS "Admins can manage all permissions" ON user_permissions;

CREATE POLICY "Users can view own permissions"
    ON user_permissions FOR SELECT
    USING (
        user_id = auth.uid()
        OR EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND LOWER(role) IN ('admin', 'director'))
    );

CREATE POLICY "Admins can manage permissions"
    ON user_permissions FOR ALL
    USING (EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND LOWER(role) IN ('admin', 'director')));

-- ==========================================
-- STEP 3: UPDATE RLS POLICIES FOR user_profiles
-- ==========================================

DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can manage profiles" ON user_profiles;

CREATE POLICY "Users can view own profile"
    ON user_profiles FOR SELECT
    USING (id = auth.uid());

CREATE POLICY "Admins can view all profiles"
    ON user_profiles FOR SELECT
    USING (EXISTS (SELECT 1 FROM user_profiles up WHERE up.id = auth.uid() AND LOWER(up.role) IN ('admin', 'director')));

CREATE POLICY "Admins can manage profiles"
    ON user_profiles FOR ALL
    USING (EXISTS (SELECT 1 FROM user_profiles up WHERE up.id = auth.uid() AND LOWER(up.role) IN ('admin', 'director')));

-- ==========================================
-- STEP 4: CREATE ADMIN FUNCTIONS
-- ==========================================

DROP FUNCTION IF EXISTS admin_setup_user_profile(UUID, TEXT, TEXT, UUID, JSONB);
DROP FUNCTION IF EXISTS admin_update_user(UUID, TEXT, TEXT, JSONB);
DROP FUNCTION IF EXISTS admin_deactivate_user(UUID);
DROP FUNCTION IF EXISTS admin_activate_user(UUID);

CREATE OR REPLACE FUNCTION admin_setup_user_profile(
    p_user_id UUID,
    p_full_name TEXT,
    p_role TEXT,
    p_account_id UUID,
    p_permissions JSONB DEFAULT NULL
)
RETURNS JSONB AS $func$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM user_profiles
        WHERE id = auth.uid()
        AND LOWER(role) IN ('admin', 'director')
    ) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Permission denied: Admin or Director privileges required'
        );
    END IF;

    INSERT INTO user_profiles (id, full_name, role, account_id, is_active)
    VALUES (p_user_id, p_full_name, p_role, p_account_id, true)
    ON CONFLICT (id) DO UPDATE
    SET full_name = p_full_name,
        role = p_role,
        account_id = p_account_id,
        is_active = true;

    INSERT INTO user_permissions (
        user_id, can_create_jobs, can_edit_jobs, can_delete_jobs,
        can_view_costs, can_edit_costs, can_view_invoices,
        can_create_invoices, can_edit_invoices, can_manage_users,
        can_edit_org_settings, can_view_reports, can_export_data
    )
    VALUES (
        p_user_id,
        COALESCE((p_permissions->>'can_create_jobs')::boolean, p_role IN ('admin', 'director', 'manager', 'installer')),
        COALESCE((p_permissions->>'can_edit_jobs')::boolean, p_role IN ('admin', 'director', 'manager', 'installer')),
        COALESCE((p_permissions->>'can_delete_jobs')::boolean, p_role IN ('admin', 'director')),
        COALESCE((p_permissions->>'can_view_costs')::boolean, p_role IN ('admin', 'director', 'manager')),
        COALESCE((p_permissions->>'can_edit_costs')::boolean, p_role IN ('admin', 'director', 'manager')),
        COALESCE((p_permissions->>'can_view_invoices')::boolean, p_role IN ('admin', 'director', 'manager')),
        COALESCE((p_permissions->>'can_create_invoices')::boolean, p_role IN ('admin', 'director', 'manager')),
        COALESCE((p_permissions->>'can_edit_invoices')::boolean, p_role IN ('admin', 'director', 'manager')),
        COALESCE((p_permissions->>'can_manage_users')::boolean, p_role IN ('admin', 'director')),
        COALESCE((p_permissions->>'can_edit_org_settings')::boolean, p_role IN ('admin', 'director')),
        COALESCE((p_permissions->>'can_view_reports')::boolean, true),
        COALESCE((p_permissions->>'can_export_data')::boolean, p_role IN ('admin', 'director', 'manager'))
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

    RETURN jsonb_build_object(
        'success', true,
        'user_id', p_user_id,
        'message', 'User profile and permissions created successfully'
    );
END;
$func$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- STEP 5: SETUP YOUR DIRECTOR PROFILE
-- ==========================================

-- Setup user in public.users if not exists
INSERT INTO users (id, account_id, role, full_name, lang, updated_at)
VALUES (
    '97ac31b9-4953-4bb0-be23-e8f204acc337',
    '0ebae71c-6c8d-45e1-9e18-9b83f3eba4b5',
    'director',
    'Ben Hone',
    'en',
    NOW()
)
ON CONFLICT (id) DO UPDATE
SET role = 'director', account_id = '0ebae71c-6c8d-45e1-9e18-9b83f3eba4b5';

-- Setup user_profiles
INSERT INTO user_profiles (id, account_id, full_name, role, is_active, created_at, updated_at)
VALUES (
    '97ac31b9-4953-4bb0-be23-e8f204acc337',
    '0ebae71c-6c8d-45e1-9e18-9b83f3eba4b5',
    'Ben Hone',
    'director',
    true,
    NOW(),
    NOW()
)
ON CONFLICT (id) DO UPDATE
SET role = 'director', is_active = true, account_id = '0ebae71c-6c8d-45e1-9e18-9b83f3eba4b5';

-- Setup permissions
INSERT INTO user_permissions (
    user_id, can_create_jobs, can_edit_jobs, can_delete_jobs,
    can_view_costs, can_edit_costs, can_view_invoices,
    can_create_invoices, can_edit_invoices, can_manage_users,
    can_edit_org_settings, can_view_reports, can_export_data,
    created_at, updated_at
) VALUES (
    '97ac31b9-4953-4bb0-be23-e8f204acc337',
    true, true, true,  -- jobs
    true, true, true,  -- costs & invoices
    true, true, true,  -- invoices & users
    true, true, true,  -- settings, reports, export
    NOW(), NOW()
)
ON CONFLICT (user_id) DO UPDATE
SET can_manage_users = true,
    can_edit_org_settings = true,
    can_delete_jobs = true,
    updated_at = NOW();

COMMIT;

-- ==========================================
-- VERIFICATION
-- ==========================================

SELECT 'Director Profile' as check_name, * FROM user_profiles WHERE id = '97ac31b9-4953-4bb0-be23-e8f204acc337';
SELECT 'Director Permissions' as check_name, * FROM user_permissions WHERE user_id = '97ac31b9-4953-4bb0-be23-e8f204acc337';
