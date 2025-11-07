-- SmartInvoice System Database Schema (Standalone Version)
-- Creates tables for invoice management with optional external references

-- ============================================================================
-- SUPPLIERS TABLE
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

-- Create index for faster supplier lookups
CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers(name);

-- ============================================================================
-- INVOICES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Organization and user tracking (nullable for standalone use)
  organization_id UUID,
  created_by UUID,

  -- Relationships (nullable)
  job_id UUID,
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
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  paid_date DATE,

  -- File storage
  file_path TEXT,
  extracted_text TEXT,
  confidence_score DECIMAL(5, 2),

  -- Notes
  notes TEXT
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_invoices_organization ON invoices(organization_id);
CREATE INDEX IF NOT EXISTS idx_invoices_job ON invoices(job_id);
CREATE INDEX IF NOT EXISTS idx_invoices_supplier ON invoices(supplier_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_date ON invoices(invoice_date);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_invoices_category ON invoices(category);
CREATE INDEX IF NOT EXISTS idx_invoices_created_by ON invoices(created_by);

-- ============================================================================
-- INVOICE LINE ITEMS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS invoice_line_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  line_number INTEGER NOT NULL,
  description TEXT,
  quantity DECIMAL(10, 2),
  unit_price DECIMAL(10, 2),
  net_amount DECIMAL(10, 2),
  vat_rate DECIMAL(5, 2),
  vat_amount DECIMAL(10, 2),
  gross_amount DECIMAL(10, 2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for line item lookups
CREATE INDEX IF NOT EXISTS idx_invoice_line_items_invoice ON invoice_line_items(invoice_id);

-- ============================================================================
-- INVOICE CORRECTIONS TABLE (AI Learning)
-- ============================================================================
CREATE TABLE IF NOT EXISTS invoice_corrections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  original_value TEXT,
  corrected_value TEXT,
  corrected_by UUID,
  corrected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL
);

-- Index for learning pattern analysis
CREATE INDEX IF NOT EXISTS idx_invoice_corrections_supplier ON invoice_corrections(supplier_id);
CREATE INDEX IF NOT EXISTS idx_invoice_corrections_field ON invoice_corrections(field_name);

-- ============================================================================
-- INVOICE APPROVALS TABLE (Audit trail)
-- ============================================================================
CREATE TABLE IF NOT EXISTS invoice_approvals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  approved_by UUID,
  action TEXT NOT NULL CHECK (action IN ('approved', 'rejected')),
  comments TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for approval history
CREATE INDEX IF NOT EXISTS idx_invoice_approvals_invoice ON invoice_approvals(invoice_id);

-- ============================================================================
-- FUNCTIONS AND TRIGGERS
-- ============================================================================

-- Update updated_at timestamp on suppliers
CREATE OR REPLACE FUNCTION update_supplier_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_suppliers_updated_at ON suppliers;
CREATE TRIGGER update_suppliers_updated_at
  BEFORE UPDATE ON suppliers
  FOR EACH ROW
  EXECUTE FUNCTION update_supplier_updated_at();

-- Update updated_at timestamp on invoices
CREATE OR REPLACE FUNCTION update_invoice_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_invoices_updated_at ON invoices;
CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_invoice_updated_at();

-- ============================================================================
-- VIEWS FOR ANALYTICS
-- ============================================================================

-- Invoice summary view (basic version without external joins)
CREATE OR REPLACE VIEW invoice_summary AS
SELECT
  i.id,
  i.invoice_number,
  i.invoice_date,
  i.due_date,
  i.supplier_name,
  s.name AS supplier_full_name,
  i.category,
  i.description,
  i.net_amount,
  i.vat_amount,
  i.gross_amount,
  i.status,
  i.approval_status,
  i.job_reference,
  i.created_at,
  i.confidence_score,
  CASE
    WHEN i.due_date < CURRENT_DATE AND i.status != 'paid' THEN true
    ELSE false
  END AS is_overdue,
  CASE
    WHEN i.due_date IS NOT NULL THEN i.due_date - CURRENT_DATE
    ELSE NULL
  END AS days_until_due
FROM invoices i
LEFT JOIN suppliers s ON i.supplier_id = s.id;

-- Invoice statistics by category
CREATE OR REPLACE VIEW invoice_stats_by_category AS
SELECT
  category,
  COUNT(*) AS total_invoices,
  SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending_count,
  SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) AS approved_count,
  SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) AS paid_count,
  SUM(gross_amount) AS total_amount,
  SUM(CASE WHEN status = 'pending' THEN gross_amount ELSE 0 END) AS pending_amount,
  SUM(CASE WHEN status = 'approved' THEN gross_amount ELSE 0 END) AS approved_amount,
  SUM(CASE WHEN status = 'paid' THEN gross_amount ELSE 0 END) AS paid_amount
FROM invoices
GROUP BY category;

-- Supplier performance view
CREATE OR REPLACE VIEW supplier_performance AS
SELECT
  s.id,
  s.name,
  COUNT(i.id) AS total_invoices,
  SUM(i.gross_amount) AS total_spent,
  AVG(i.confidence_score) AS avg_confidence_score,
  MAX(i.invoice_date) AS last_invoice_date,
  COUNT(CASE WHEN i.status = 'paid' THEN 1 END) AS paid_invoices,
  COUNT(CASE WHEN i.status = 'pending' THEN 1 END) AS pending_invoices
FROM suppliers s
LEFT JOIN invoices i ON s.id = i.supplier_id
GROUP BY s.id, s.name;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE suppliers IS 'Stores supplier/subcontractor information for invoice management';
COMMENT ON TABLE invoices IS 'Main invoice tracking table with AI extraction support';
COMMENT ON TABLE invoice_line_items IS 'Detailed line items for invoices';
COMMENT ON TABLE invoice_corrections IS 'Tracks user corrections to AI extractions for learning';
COMMENT ON TABLE invoice_approvals IS 'Audit trail of invoice approvals and rejections';

COMMENT ON COLUMN invoices.confidence_score IS 'AI extraction confidence score (0-100)';
COMMENT ON COLUMN invoices.extracted_text IS 'Raw text extracted from invoice file';
COMMENT ON COLUMN invoices.file_path IS 'Path to invoice file in Supabase Storage';
