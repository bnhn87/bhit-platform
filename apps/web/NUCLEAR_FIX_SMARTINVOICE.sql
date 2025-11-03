-- ============================================================================
-- NUCLEAR FIX - Complete rebuild of SmartInvoice tables
-- ============================================================================

-- STEP 1: Drop everything cleanly
DROP TABLE IF EXISTS invoices CASCADE;
DROP TABLE IF EXISTS suppliers CASCADE;

-- STEP 2: Create suppliers table
CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

-- STEP 3: Create invoices table (NO organization_id)
CREATE TABLE invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID NOT NULL,
  job_id UUID,
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
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  paid_date DATE,
  file_path TEXT,
  extracted_text TEXT,
  confidence_score DECIMAL(5, 2),
  notes TEXT
);

-- STEP 4: Create indexes
CREATE INDEX idx_suppliers_name ON suppliers(name);
CREATE INDEX idx_invoices_created_by ON invoices(created_by);
CREATE INDEX idx_invoices_supplier ON invoices(supplier_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_date ON invoices(invoice_date);
CREATE INDEX idx_invoices_category ON invoices(category);

-- STEP 5: Grant permissions to anon and authenticated roles
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON TABLE suppliers TO anon, authenticated;
GRANT ALL ON TABLE invoices TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- STEP 6: Enable RLS
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- STEP 7: Create RLS policies
CREATE POLICY "suppliers_select_all"
  ON suppliers FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "suppliers_manage_ops"
  ON suppliers FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('ops', 'director', 'admin')
    )
  );

CREATE POLICY "invoices_select_all"
  ON invoices FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "invoices_manage_ops"
  ON invoices FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('ops', 'director', 'admin')
    )
  );

-- STEP 8: Force PostgREST schema reload (multiple methods)
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';

-- Also try alternative reload
SELECT pg_notify('pgrst', 'reload schema');

-- STEP 9: Verify everything
SELECT '✅ SUPPLIERS TABLE' as check, COUNT(*) as columns
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'suppliers';

SELECT '✅ INVOICES TABLE' as check, COUNT(*) as columns
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'invoices';

SELECT '✅ RLS POLICIES' as check, COUNT(*) as policy_count
FROM pg_policies
WHERE tablename IN ('suppliers', 'invoices');

SELECT '✅ PERMISSIONS' as check,
  has_table_privilege('authenticated', 'public.invoices', 'SELECT') as auth_can_select,
  has_table_privilege('anon', 'public.invoices', 'SELECT') as anon_can_select;

SELECT '✅ SETUP COMPLETE - Refresh your app now!' as final_status;
