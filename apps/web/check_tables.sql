-- Check what tables actually exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('profiles', 'user_profiles', 'user_permissions')
ORDER BY table_name;
