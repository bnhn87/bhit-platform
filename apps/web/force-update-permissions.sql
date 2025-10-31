-- Force update permissions for admin/director users
-- This directly updates auth.users metadata

DO $$
DECLARE
  user_record RECORD;
  current_meta JSONB;
  current_perms JSONB;
  updated_perms JSONB;
BEGIN
  -- Update all admin and director users
  FOR user_record IN
    SELECT au.id, au.email, au.raw_user_meta_data, p.role
    FROM auth.users au
    JOIN profiles p ON p.id = au.id
    WHERE LOWER(p.role) IN ('admin', 'director')
  LOOP
    -- Get current metadata and permissions
    current_meta := COALESCE(user_record.raw_user_meta_data, '{}'::jsonb);
    current_perms := COALESCE(current_meta->'permissions', '{}'::jsonb);

    -- Add or update can_hard_delete_jobs
    updated_perms := current_perms || jsonb_build_object('can_hard_delete_jobs', true);

    -- Update the full metadata
    current_meta := current_meta || jsonb_build_object('permissions', updated_perms);

    -- Apply update
    UPDATE auth.users
    SET raw_user_meta_data = current_meta
    WHERE id = user_record.id;

    RAISE NOTICE 'Updated user: % (%) - role: %', user_record.email, user_record.id, user_record.role;
  END LOOP;

  RAISE NOTICE 'Done updating admin/director permissions';
END;
$$;

-- Verify the updates
SELECT
  au.email,
  p.role,
  (au.raw_user_meta_data->'permissions'->>'can_hard_delete_jobs')::boolean as can_hard_delete_jobs
FROM auth.users au
JOIN profiles p ON p.id = au.id
WHERE LOWER(p.role) IN ('admin', 'director');
