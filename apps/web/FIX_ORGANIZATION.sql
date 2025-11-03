-- Fix: User organization not found error
-- Run this in Supabase SQL Editor

-- Step 1: Check if organizations table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name = 'organizations'
);

-- Step 2: If organizations table doesn't exist, create it
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Step 3: Create a default organization if none exists
INSERT INTO organizations (id, name)
VALUES ('00000000-0000-0000-0000-000000000001', 'BHIT Default Organization')
ON CONFLICT (id) DO NOTHING;

-- Step 4: Check your current user
SELECT
  id,
  email,
  role,
  organization_id,
  CASE
    WHEN organization_id IS NULL THEN '❌ NO ORGANIZATION SET'
    ELSE '✅ Organization set'
  END as status
FROM users
WHERE id = auth.uid();

-- Step 5: Set organization_id for your user (if it's NULL)
UPDATE users
SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE id = auth.uid()
AND organization_id IS NULL;

-- Step 6: Verify the fix
SELECT
  u.id,
  u.email,
  u.role,
  u.organization_id,
  o.name as organization_name
FROM users u
LEFT JOIN organizations o ON u.organization_id = o.id
WHERE u.id = auth.uid();

-- You should now see:
-- ✅ organization_id populated
-- ✅ organization_name showing "BHIT Default Organization"
