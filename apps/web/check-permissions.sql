-- Check current user permissions in auth.users
SELECT
  au.id,
  au.email,
  p.role,
  au.raw_user_meta_data->'permissions' as current_permissions,
  get_default_permissions(p.role) as default_permissions_for_role
FROM auth.users au
JOIN profiles p ON p.id = au.id
ORDER BY p.role, au.email;
