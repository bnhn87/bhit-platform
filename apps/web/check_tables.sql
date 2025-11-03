-- Quick check: Do the tables exist?

SELECT
  table_name,
  CASE
    WHEN table_name = 'invoices' THEN '✅ EXISTS'
    WHEN table_name = 'suppliers' THEN '✅ EXISTS'
    ELSE '❓'
  END as status
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('invoices', 'suppliers');

-- If no results, tables don't exist yet
-- Expected output: 2 rows showing invoices and suppliers

-- Also check what tables DO exist
SELECT
  'All public tables:' as info,
  table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name
LIMIT 20;
