-- ==========================================
-- COMPREHENSIVE USER DEBUG SCRIPT
-- ==========================================

-- 1. Check auth.users
SELECT
    '1. AUTH.USERS' as check_name,
    id,
    email,
    raw_user_meta_data->>'role' as metadata_role,
    created_at
FROM auth.users
WHERE id = '97ac31b9-4953-4bb0-be23-e8f204acc337';

-- 2. Check public.users
SELECT
    '2. PUBLIC.USERS' as check_name,
    id,
    account_id,
    role,
    full_name,
    lang
FROM users
WHERE id = '97ac31b9-4953-4bb0-be23-e8f204acc337';

-- 3. Check user_profiles
SELECT
    '3. USER_PROFILES' as check_name,
    id,
    account_id,
    role,
    full_name,
    is_active,
    created_at
FROM user_profiles
WHERE id = '97ac31b9-4953-4bb0-be23-e8f204acc337';

-- 4. Check user_permissions
SELECT
    '4. USER_PERMISSIONS' as check_name,
    user_id,
    can_create_jobs,
    can_manage_users,
    can_edit_org_settings
FROM user_permissions
WHERE user_id = '97ac31b9-4953-4bb0-be23-e8f204acc337';

-- 5. Check account exists
SELECT
    '5. ACCOUNT' as check_name,
    id,
    name
FROM accounts
WHERE id = '0ebae71c-6c8d-45e1-9e18-9b83f3eba4b5';

-- 6. Check RLS policies on user_profiles
SELECT
    '6. RLS POLICIES - user_profiles' as check_name,
    policyname,
    cmd as command,
    qual as using_expression,
    with_check
FROM pg_policies
WHERE tablename = 'user_profiles';

-- 7. Check RLS policies on user_permissions
SELECT
    '7. RLS POLICIES - user_permissions' as check_name,
    policyname,
    cmd as command,
    qual as using_expression,
    with_check
FROM pg_policies
WHERE tablename = 'user_permissions';

-- 8. Test if current user can SELECT their own profile
SELECT
    '8. TEST SELECT OWN PROFILE' as check_name,
    id,
    role,
    full_name
FROM user_profiles
WHERE id = auth.uid();
