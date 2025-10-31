-- Check which schema the profiles table is in
SELECT
    table_schema,
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'profiles'
ORDER BY table_schema, ordinal_position;

-- Also check for any table with 'profile' in the name
SELECT
    table_schema,
    table_name
FROM information_schema.tables
WHERE table_name LIKE '%profile%'
ORDER BY table_schema, table_name;
