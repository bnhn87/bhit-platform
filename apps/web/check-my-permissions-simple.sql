-- Check your current permissions in the database
SELECT
  au.email,
  p.role,
  au.raw_user_meta_data->'permissions' as permissions_in_database,
  (au.raw_user_meta_data->'permissions'->>'can_hard_delete_jobs')::boolean as can_hard_delete
FROM auth.users au
JOIN profiles p ON p.id = au.id
WHERE LOWER(p.role) = 'director'
ORDER BY au.email;
