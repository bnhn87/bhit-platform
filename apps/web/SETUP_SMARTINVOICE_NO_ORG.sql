-- ============================================================================
-- SIMPLIFIED SMARTINVOICE SETUP - NO ORGANIZATIONS REQUIRED
-- Run this in Supabase SQL Editor
-- ============================================================================

-- STEP 1: Create suppliers table
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

-- STEP 2: Create invoices table (simplified - no organization_id required)
-- ============================================================================
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID NOT NULL REFERENCES auth.users(id),
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
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  paid_date DATE,
  file_path TEXT,
  extracted_text TEXT,
  confidence_score DECIMAL(5, 2),
  notes TEXT
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_invoices_created_by ON invoices(created_by);
CREATE INDEX IF NOT EXISTS idx_invoices_job ON invoices(job_id);
CREATE INDEX IF NOT EXISTS idx_invoices_supplier ON invoices(supplier_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_date ON invoices(invoice_date);
CREATE INDEX IF NOT EXISTS idx_invoices_category ON invoices(category);

-- STEP 3: Enable RLS and create policies
-- ============================================================================
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Suppliers policies - all authenticated users can read
DROP POLICY IF EXISTS "Users can read suppliers" ON suppliers;
CREATE POLICY "Users can read suppliers"
  ON suppliers FOR SELECT
  TO authenticated
  USING (true);

-- Ops/Director/Admin can manage suppliers
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

-- Invoices policies - all authenticated users can view all invoices
DROP POLICY IF EXISTS "Authenticated users can view invoices" ON invoices;
CREATE POLICY "Authenticated users can view invoices"
  ON invoices FOR SELECT
  TO authenticated
  USING (true);

-- Ops/Director/Admin can manage invoices
DROP POLICY IF EXISTS "Ops/Director/Admin can manage invoices" ON invoices;
CREATE POLICY "Ops/Director/Admin can manage invoices"
  ON invoices FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('ops', 'director', 'admin')
    )
  );

-- STEP 4: Create storage bucket
-- ============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

-- STEP 5: Storage policies (simplified - no organization folders)
-- ============================================================================
DROP POLICY IF EXISTS "Authenticated users can upload documents" ON storage.objects;
CREATE POLICY "Authenticated users can upload documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'documents');

DROP POLICY IF EXISTS "Authenticated users can read documents" ON storage.objects;
CREATE POLICY "Authenticated users can read documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'documents');

-- FINAL VERIFICATION
-- ============================================================================
SELECT '✅ Setup Complete!' as status;

SELECT
  'Tables Created:' as check_type,
  COUNT(*) FILTER (WHERE table_name = 'suppliers') as suppliers,
  COUNT(*) FILTER (WHERE table_name = 'invoices') as invoices
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('suppliers', 'invoices');

SELECT
  '✅ Your user is ready:' as status,
  id as user_id,
  role
FROM users
WHERE id = auth.uid();
