-- ============================================================================
-- RPC WORKAROUND - Bypass PostgREST schema cache
-- ============================================================================

-- Create function to fetch invoices (bypasses schema cache)
CREATE OR REPLACE FUNCTION get_invoices()
RETURNS TABLE (
  id UUID,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  created_by UUID,
  job_id UUID,
  supplier_id UUID,
  invoice_number TEXT,
  invoice_date DATE,
  due_date DATE,
  supplier_name TEXT,
  description TEXT,
  category TEXT,
  vehicle_reg TEXT,
  job_reference TEXT,
  net_amount NUMERIC,
  vat_amount NUMERIC,
  gross_amount NUMERIC,
  payment_terms TEXT,
  status TEXT,
  approval_status TEXT,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  paid_date DATE,
  file_path TEXT,
  extracted_text TEXT,
  confidence_score NUMERIC,
  notes TEXT
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT * FROM invoices ORDER BY invoice_date DESC;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_invoices() TO authenticated, anon;

SELECT '✅ RPC function created - Use supabase.rpc("get_invoices") instead of .from("invoices")' as status;
