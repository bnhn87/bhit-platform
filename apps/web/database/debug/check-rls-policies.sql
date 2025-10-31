-- Check all RLS policies on user_profiles table
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename IN ('user_profiles', 'user_permissions')
ORDER BY tablename, policyname;
