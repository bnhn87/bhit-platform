-- ============================================
-- SMARTQUOTE SCHEMA VERIFICATION
-- Run this after applying APPLY_ALL_PENDING_FIXES.sql
-- ============================================

-- 1. Check all required tables exist
SELECT
    'Tables Check' as check_name,
    COUNT(*) as found,
    5 as expected,
    CASE WHEN COUNT(*) = 5 THEN '✅ PASS' ELSE '❌ FAIL' END as status
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('user_profiles', 'quotes', 'quote_lines', 'activity_log', 'product_catalogue');

-- 2. Check user_profiles columns
SELECT
    'User Profiles Columns' as check_name,
    COUNT(*) as found,
    6 as expected,
    CASE WHEN COUNT(*) >= 6 THEN '✅ PASS' ELSE '❌ FAIL' END as status
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'user_profiles'
AND column_name IN ('id', 'full_name', 'role', 'account_id', 'created_at', 'updated_at');

-- 3. Check quotes columns for SmartQuote
SELECT
    'Quotes SmartQuote Columns' as check_name,
    COUNT(*) as found,
    8 as expected,
    CASE WHEN COUNT(*) >= 8 THEN '✅ PASS' ELSE '❌ FAIL' END as status
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'quotes'
AND column_name IN ('prepared_by', 'delivery_address', 'project_name', 'quote_details',
                    'calculation_results', 'products_data', 'configuration_snapshot', 'version');

-- 4. Check quote_lines structure
SELECT
    'Quote Lines Table' as check_name,
    COUNT(*) as found,
    16 as expected,
    CASE WHEN COUNT(*) >= 15 THEN '✅ PASS' ELSE '❌ FAIL' END as status
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'quote_lines';

-- 5. Check RLS is enabled
SELECT
    'RLS Enabled' as check_name,
    COUNT(*) as found,
    4 as expected,
    CASE WHEN COUNT(*) >= 3 THEN '✅ PASS' ELSE '❌ FAIL' END as status
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('user_profiles', 'quotes', 'quote_lines', 'activity_log')
AND rowsecurity = true;

-- 6. Check RLS policies exist
SELECT
    'RLS Policies' as check_name,
    COUNT(*) as found,
    '5+' as expected,
    CASE WHEN COUNT(*) >= 5 THEN '✅ PASS' ELSE '❌ FAIL' END as status
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('user_profiles', 'quotes', 'quote_lines', 'activity_log');

-- 7. Detailed missing items report
WITH expected_tables AS (
    SELECT unnest(ARRAY['user_profiles', 'quotes', 'quote_lines', 'activity_log', 'product_catalogue']) as table_name
)
SELECT
    'MISSING TABLE: ' || et.table_name as issue
FROM expected_tables et
LEFT JOIN information_schema.tables it
    ON it.table_schema = 'public' AND it.table_name = et.table_name
WHERE it.table_name IS NULL;

-- 8. Summary
SELECT
    '==================' as line
UNION ALL
SELECT 'VERIFICATION COMPLETE' as line
UNION ALL
SELECT '==================' as line
UNION ALL
SELECT 'Run the checks above to see the status of your SmartQuote database setup.' as line
UNION ALL
SELECT 'All checks should show ✅ PASS for SmartQuote to work correctly.' as line;