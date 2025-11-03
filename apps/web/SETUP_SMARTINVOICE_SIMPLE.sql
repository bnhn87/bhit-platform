-- ============================================================================
-- SIMPLIFIED SMARTINVOICE SETUP SCRIPT
-- Run each section one at a time and check for errors
-- ============================================================================

-- SECTION 1: Create organizations table
-- ============================================================================
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- SECTION 2: Create default organization
-- ============================================================================
INSERT INTO organizations (id, name)
VALUES ('00000000-0000-0000-0000-000000000001', 'BHIT Default Organization')
ON CONFLICT (id) DO NOTHING;

-- SECTION 3: Add organization_id to users table (CRITICAL!)
-- ============================================================================
-- Check if column exists first
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'users'
        AND column_name = 'organization_id'
    ) THEN
        ALTER TABLE users ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;
        RAISE NOTICE '✅ Added organization_id column to users table';
    ELSE
        RAISE NOTICE '✅ organization_id column already exists';
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_users_organization_id ON users(organization_id);

-- SECTION 4: Set organization for current user
-- ============================================================================
UPDATE users
SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE id = auth.uid()
AND organization_id IS NULL;

-- Verify the update worked
SELECT
  '✅ Your user status:' as status,
  id,
  role,
  organization_id,
  CASE
    WHEN organization_id IS NOT NULL THEN '✅ Ready'
    ELSE '❌ Still NULL'
  END as ready
FROM users
WHERE id = auth.uid();

-- SECTION 5: Ensure users can read their own record
-- ============================================================================
DO $$
BEGIN
    -- Drop existing policies if they exist
    DROP POLICY IF EXISTS "Users can read own record" ON users;
    DROP POLICY IF EXISTS "Users can update own record" ON users;

    -- Enable RLS if not already enabled
    ALTER TABLE users ENABLE ROW LEVEL SECURITY;

    -- Create new policies
    CREATE POLICY "Users can read own record"
      ON users FOR SELECT
      TO authenticated
      USING (id = auth.uid());

    CREATE POLICY "Users can update own record"
      ON users FOR UPDATE
      TO authenticated
      USING (id = auth.uid());

    RAISE NOTICE '✅ Created RLS policies for users table';
EXCEPTION
    WHEN duplicate_object THEN
        RAISE NOTICE '⚠️  RLS policies already exist';
END $$;

-- SECTION 6: Create suppliers table
-- ============================================================================
CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  contact_name TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  payment_terms TEXT,
  vat_number TEXT,
  account_number TEXT,
  sort_code TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(name);

-- SECTION 7: Create invoices table
-- ============================================================================
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(id),
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  invoice_number TEXT NOT NULL,
  invoice_date DATE NOT NULL,
  due_date DATE,
  supplier_name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('Vehicle', 'Labour', 'Materials', 'Other')),
  vehicle_reg TEXT,
  job_reference TEXT,
  net_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  vat_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  gross_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  payment_terms TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'rejected')),
  approval_status TEXT CHECK (approval_status IN ('pending', 'approved', 'rejected')),
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  paid_date DATE,
  file_path TEXT,
  extracted_text TEXT,
  confidence_score DECIMAL(5, 2),
  notes TEXT
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_invoices_organization ON invoices(organization_id);
CREATE INDEX IF NOT EXISTS idx_invoices_job ON invoices(job_id);
CREATE INDEX IF NOT EXISTS idx_invoices_supplier ON invoices(supplier_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_date ON invoices(invoice_date);
CREATE INDEX IF NOT EXISTS idx_invoices_category ON invoices(category);

-- SECTION 8: Enable RLS and create policies
-- ============================================================================
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Suppliers policies
DROP POLICY IF EXISTS "Users can read suppliers" ON suppliers;
CREATE POLICY "Users can read suppliers"
  ON suppliers FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Ops/Director/Admin can manage suppliers" ON suppliers;
CREATE POLICY "Ops/Director/Admin can manage suppliers"
  ON suppliers FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('ops', 'director', 'admin')
    )
  );

-- Invoices policies
DROP POLICY IF EXISTS "Users can view organization invoices" ON invoices;
CREATE POLICY "Users can view organization invoices"
  ON invoices FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.organization_id = invoices.organization_id
    )
  );

DROP POLICY IF EXISTS "Ops/Director/Admin can manage invoices" ON invoices;
CREATE POLICY "Ops/Director/Admin can manage invoices"
  ON invoices FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('ops', 'director', 'admin')
      AND users.organization_id = invoices.organization_id
    )
  );

-- SECTION 9: Create storage bucket
-- ============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

-- SECTION 10: Storage policies
-- ============================================================================
DROP POLICY IF EXISTS "Users can upload organization documents" ON storage.objects;
CREATE POLICY "Users can upload organization documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents' AND
  (storage.foldername(name))[1] IN (
    SELECT organization_id::text FROM users WHERE id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can read organization documents" ON storage.objects;
CREATE POLICY "Users can read organization documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents' AND
  (storage.foldername(name))[1] IN (
    SELECT organization_id::text FROM users WHERE id = auth.uid()
  )
);

-- FINAL VERIFICATION
-- ============================================================================
SELECT '✅ Setup Complete!' as status;

SELECT
  'Tables:' as check_type,
  COUNT(*) FILTER (WHERE table_name = 'organizations') as organizations,
  COUNT(*) FILTER (WHERE table_name = 'suppliers') as suppliers,
  COUNT(*) FILTER (WHERE table_name = 'invoices') as invoices
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('organizations', 'suppliers', 'invoices');

SELECT
  '✅ Your user configuration:' as status,
  id as user_id,
  role,
  organization_id,
  CASE
    WHEN organization_id IS NOT NULL THEN '✅ Ready to use SmartInvoice'
    ELSE '❌ Organization not set'
  END as smartinvoice_status
FROM users
WHERE id = auth.uid();
