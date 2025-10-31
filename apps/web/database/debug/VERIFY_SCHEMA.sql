-- Check if user_profiles table exists
SELECT
    'Table exists' as check_name,
    schemaname,
    tablename,
    tableowner
FROM pg_tables
WHERE tablename = 'user_profiles';

-- Check RLS status
SELECT
    'RLS status' as check_name,
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'user_profiles';

-- Check if table is exposed via PostgREST
SELECT
    'Exposed schemas' as check_name,
    nspname as schema_name
FROM pg_namespace
WHERE nspname IN ('public', 'auth');

-- Check your profile data directly
SELECT
    'Direct profile query' as check_name,
    id,
    account_id,
    role,
    full_name,
    is_active
FROM user_profiles
WHERE id = '97ac31b9-4953-4bb0-be23-e8f204acc337';

-- Force PostgREST schema reload
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';
