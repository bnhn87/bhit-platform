-- ============================================================================
-- COMPLETE SMARTINVOICE SETUP SCRIPT
-- Run this in Supabase SQL Editor to set up everything at once
-- ============================================================================

-- STEP 1: Create organizations table (if needed)
-- ============================================================================
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- STEP 2: Create default organization
-- ============================================================================
INSERT INTO organizations (id, name)
VALUES ('00000000-0000-0000-0000-000000000001', 'BHIT Default Organization')
ON CONFLICT (id) DO NOTHING;

-- STEP 2.5: Add organization_id column to users table
-- ============================================================================
ALTER TABLE users
ADD COLUMN IF NOT EXISTS organization_id UUID
REFERENCES organizations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_users_organization_id ON users(organization_id);

-- STEP 2.6: Ensure users table has RLS policy to read own record
-- ============================================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own record" ON users;
CREATE POLICY "Users can read own record"
  ON users FOR SELECT
  TO authenticated
  USING (id = auth.uid());

DROP POLICY IF EXISTS "Users can update own record" ON users;
CREATE POLICY "Users can update own record"
  ON users FOR UPDATE
  TO authenticated
  USING (id = auth.uid());

-- STEP 3: Update current user to have organization
-- ============================================================================
UPDATE users
SET organization_id = '00000000-0000-0000-0000-000000000001'
WHERE id = auth.uid()
AND organization_id IS NULL;

-- STEP 4: Create suppliers table
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

-- STEP 5: Create invoices table
-- ============================================================================
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Organization and user tracking
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(id),

  -- Relationships
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,

  -- Invoice details
  invoice_number TEXT NOT NULL,
  invoice_date DATE NOT NULL,
  due_date DATE,
  supplier_name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('Vehicle', 'Labour', 'Materials', 'Other')),

  -- Additional metadata
  vehicle_reg TEXT,
  job_reference TEXT,

  -- Financial amounts
  net_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  vat_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  gross_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  payment_terms TEXT,

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'rejected')),
  approval_status TEXT CHECK (approval_status IN ('pending', 'approved', 'rejected')),
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  paid_date DATE,

  -- File storage
  file_path TEXT,
  extracted_text TEXT,
  confidence_score DECIMAL(5, 2),

  -- Notes
  notes TEXT
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_invoices_organization ON invoices(organization_id);
CREATE INDEX IF NOT EXISTS idx_invoices_job ON invoices(job_id);
CREATE INDEX IF NOT EXISTS idx_invoices_supplier ON invoices(supplier_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_date ON invoices(invoice_date);
CREATE INDEX IF NOT EXISTS idx_invoices_category ON invoices(category);

-- STEP 6: Enable Row Level Security
-- ============================================================================
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- STEP 7: Create RLS Policies
-- ============================================================================

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

-- STEP 8: Create storage bucket (if needed)
-- ============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

-- STEP 9: Storage policies
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

-- STEP 10: Verification
-- ============================================================================
SELECT '✅ Setup Complete!' as status;

SELECT
  'Tables Created:' as info,
  COUNT(*) FILTER (WHERE table_name = 'organizations') as organizations,
  COUNT(*) FILTER (WHERE table_name = 'suppliers') as suppliers,
  COUNT(*) FILTER (WHERE table_name = 'invoices') as invoices
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('organizations', 'suppliers', 'invoices');

SELECT
  '✅ Your user is configured:' as status,
  id as user_id,
  role,
  organization_id,
  CASE
    WHEN organization_id IS NOT NULL THEN '✅ Ready to use SmartInvoice'
    ELSE '❌ Organization not set'
  END as smartinvoice_status
FROM users
WHERE id = auth.uid();
