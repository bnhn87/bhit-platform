-- ==========================================
-- USER MANAGEMENT SETUP - STEPWISE
-- Run each step separately in Supabase SQL Editor
-- ==========================================

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
-- STEP 2: UPDATE RLS POLICIES
-- ==========================================

-- For user_permissions
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

-- For user_profiles
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
-- STEP 3: CHECK IF USER EXISTS IN USERS TABLE
-- ==========================================

SELECT 'Checking users table' as step, * FROM users WHERE id = '97ac31b9-4953-4bb0-be23-e8f204acc337';

-- ==========================================
-- STEP 4: SETUP USER IN PUBLIC.USERS
-- Only run this if Step 3 returned no rows
-- ==========================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM users WHERE id = '97ac31b9-4953-4bb0-be23-e8f204acc337') THEN
        -- Update existing
        UPDATE users
        SET role = 'director',
            account_id = '0ebae71c-6c8d-45e1-9e18-9b83f3eba4b5',
            full_name = 'Ben Hone'
        WHERE id = '97ac31b9-4953-4bb0-be23-e8f204acc337';
        RAISE NOTICE 'Updated existing user in users table';
    ELSE
        -- Insert new
        INSERT INTO users (id, account_id, role, full_name, lang, updated_at)
        VALUES (
            '97ac31b9-4953-4bb0-be23-e8f204acc337',
            '0ebae71c-6c8d-45e1-9e18-9b83f3eba4b5',
            'director',
            'Ben Hone',
            'en',
            NOW()
        );
        RAISE NOTICE 'Inserted new user in users table';
    END IF;
END $$;

-- ==========================================
-- STEP 5: VERIFY USER EXISTS IN USERS TABLE
-- ==========================================

SELECT 'After users insert' as step, * FROM users WHERE id = '97ac31b9-4953-4bb0-be23-e8f204acc337';

-- ==========================================
-- STEP 6: SETUP USER_PROFILES
-- ==========================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM user_profiles WHERE id = '97ac31b9-4953-4bb0-be23-e8f204acc337') THEN
        -- Update existing
        UPDATE user_profiles
        SET role = 'director',
            is_active = true,
            account_id = '0ebae71c-6c8d-45e1-9e18-9b83f3eba4b5',
            full_name = 'Ben Hone'
        WHERE id = '97ac31b9-4953-4bb0-be23-e8f204acc337';
        RAISE NOTICE 'Updated existing user_profile';
    ELSE
        -- Insert new
        INSERT INTO user_profiles (id, account_id, full_name, role, is_active, created_at, updated_at)
        VALUES (
            '97ac31b9-4953-4bb0-be23-e8f204acc337',
            '0ebae71c-6c8d-45e1-9e18-9b83f3eba4b5',
            'Ben Hone',
            'director',
            true,
            NOW(),
            NOW()
        );
        RAISE NOTICE 'Inserted new user_profile';
    END IF;
END $$;

-- ==========================================
-- STEP 7: SETUP USER_PERMISSIONS
-- ==========================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM user_permissions WHERE user_id = '97ac31b9-4953-4bb0-be23-e8f204acc337') THEN
        -- Update existing
        UPDATE user_permissions
        SET can_manage_users = true,
            can_edit_org_settings = true,
            can_delete_jobs = true,
            can_view_costs = true,
            can_edit_costs = true,
            can_view_invoices = true,
            can_create_invoices = true,
            can_edit_invoices = true,
            updated_at = NOW()
        WHERE user_id = '97ac31b9-4953-4bb0-be23-e8f204acc337';
        RAISE NOTICE 'Updated existing permissions';
    ELSE
        -- Insert new
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
        );
        RAISE NOTICE 'Inserted new permissions';
    END IF;
END $$;

-- ==========================================
-- STEP 8: FINAL VERIFICATION
-- ==========================================

SELECT 'users table' as table_name, id, account_id, role, full_name
FROM users WHERE id = '97ac31b9-4953-4bb0-be23-e8f204acc337';

SELECT 'user_profiles table' as table_name, id, account_id, role, full_name, is_active
FROM user_profiles WHERE id = '97ac31b9-4953-4bb0-be23-e8f204acc337';

SELECT 'user_permissions table' as table_name, user_id, can_manage_users, can_edit_org_settings
FROM user_permissions WHERE user_id = '97ac31b9-4953-4bb0-be23-e8f204acc337';
