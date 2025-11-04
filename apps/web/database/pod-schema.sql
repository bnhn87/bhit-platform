-- =====================================================
-- BHIT POD Manager - Database Schema (Production Ready)
-- NO WhatsApp features - removed per requirements
-- =====================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- =====================================================
-- Suppliers Table
-- =====================================================
CREATE TABLE IF NOT EXISTS suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type TEXT CHECK (type IN ('subcontractor', 'supplier', 'haulier')),
  primary_contact_name TEXT,
  primary_email TEXT,
  primary_phone TEXT,
  address_line_1 TEXT,
  address_line_2 TEXT,
  city TEXT,
  postcode TEXT,
  country TEXT DEFAULT 'United Kingdom',
  contacts JSONB DEFAULT '[]'::jsonb,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_suppliers_active ON suppliers(active) WHERE active = TRUE;
CREATE INDEX IF NOT EXISTS idx_suppliers_name ON suppliers USING gin(name gin_trgm_ops);

-- =====================================================
-- Delivery PODs Table
-- =====================================================
CREATE TABLE IF NOT EXISTS delivery_pods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Upload metadata
  upload_source TEXT CHECK (upload_source IN ('email', 'mobile_app', 'web_dashboard')),
  uploaded_by UUID REFERENCES auth.users(id),
  original_sender TEXT,
  original_filename TEXT NOT NULL,

  -- File storage
  file_path TEXT NOT NULL,
  file_hash TEXT NOT NULL,
  file_size_bytes BIGINT NOT NULL,
  mime_type TEXT NOT NULL,

  -- Dropbox backup
  dropbox_path TEXT,
  dropbox_synced_at TIMESTAMPTZ,
  dropbox_file_id TEXT,

  -- Relationships
  supplier_id UUID REFERENCES suppliers(id),
  job_id UUID,
  client_id UUID,
  invoice_id UUID,

  -- Parsed delivery data
  sales_order_ref TEXT,
  delivery_date DATE,
  delivery_time TIME,
  recipient_name TEXT,
  recipient_signature_path TEXT,
  delivery_address TEXT,
  items_delivered JSONB DEFAULT '[]'::jsonb,

  -- Vehicle info
  vehicle_type TEXT CHECK (vehicle_type IN ('luton', '7.5t', 'artic', 'van', 'sprinter', 'other')),
  vehicle_count INTEGER DEFAULT 1 CHECK (vehicle_count > 0),
  vehicle_registrations TEXT[],
  driver_names TEXT[],

  -- AI parsing metadata
  current_version INTEGER DEFAULT 1,
  ai_model_version TEXT,
  confidence_scores JSONB,
  parsing_completed_at TIMESTAMPTZ,

  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'parsing', 'needs_review', 'approved', 'rejected'
  )),

  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  rejected_by UUID REFERENCES auth.users(id),
  rejected_at TIMESTAMPTZ,
  rejection_reason TEXT,

  -- Validation flags
  validation_flags JSONB DEFAULT '[]'::jsonb,

  -- Soft delete
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_pods_sales_order ON delivery_pods(sales_order_ref) WHERE sales_order_ref IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pods_status ON delivery_pods(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_pods_created ON delivery_pods(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pods_supplier ON delivery_pods(supplier_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_pods_delivery_date ON delivery_pods(delivery_date) WHERE delivery_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pods_not_deleted ON delivery_pods(id) WHERE deleted_at IS NULL;

-- =====================================================
-- POD Versions Table
-- =====================================================
CREATE TABLE IF NOT EXISTS pod_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pod_id UUID NOT NULL REFERENCES delivery_pods(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  change_type TEXT NOT NULL CHECK (change_type IN (
    'initial_parse', 'manual_correction', 'reparse', 'field_update', 'status_change', 'approval', 'rejection'
  )),
  data JSONB NOT NULL,
  changed_fields TEXT[],
  change_reason TEXT,
  ai_model_version TEXT,
  confidence_scores JSONB,

  UNIQUE(pod_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_versions_pod ON pod_versions(pod_id, version_number DESC);

-- =====================================================
-- POD Edit History Table
-- =====================================================
CREATE TABLE IF NOT EXISTS pod_edit_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pod_id UUID NOT NULL REFERENCES delivery_pods(id) ON DELETE CASCADE,
  version_id UUID REFERENCES pod_versions(id) ON DELETE CASCADE,
  edited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  edited_by UUID REFERENCES auth.users(id),
  field_name TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  confidence_before NUMERIC(5,2),
  confidence_after NUMERIC(5,2),
  edit_reason TEXT CHECK (edit_reason IN (
    'ai_low_confidence', 'user_correction', 'missing_data', 'validation_failed'
  )),
  ip_address INET,
  user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_history_pod ON pod_edit_history(pod_id, edited_at DESC);

-- =====================================================
-- POD Access Log Table
-- =====================================================
CREATE TABLE IF NOT EXISTS pod_access_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pod_id UUID NOT NULL REFERENCES delivery_pods(id) ON DELETE CASCADE,
  accessed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accessed_by UUID REFERENCES auth.users(id),
  access_type TEXT NOT NULL CHECK (access_type IN ('view', 'download', 'edit', 'approve', 'reject', 'delete')),
  ip_address INET,
  user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_access_pod ON pod_access_log(pod_id, accessed_at DESC);

-- =====================================================
-- Triggers
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
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
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_pods_updated_at ON delivery_pods;
CREATE TRIGGER update_pods_updated_at
  BEFORE UPDATE ON delivery_pods
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- Helper Functions
-- =====================================================
CREATE OR REPLACE FUNCTION calculate_overall_confidence(pod_id_param UUID)
RETURNS NUMERIC AS $$
DECLARE
  scores JSONB;
  total_score NUMERIC := 0;
  count INTEGER := 0;
  key TEXT;
  value NUMERIC;
BEGIN
  SELECT confidence_scores INTO scores
  FROM delivery_pods
  WHERE id = pod_id_param;

  IF scores IS NULL THEN
    RETURN 0;
  END IF;

  FOR key, value IN SELECT * FROM jsonb_each_text(scores)
  LOOP
    IF key != 'overall' AND value ~ '^\d+(\.\d+)?$' THEN
      total_score := total_score + value::NUMERIC;
      count := count + 1;
    END IF;
  END LOOP;

  IF count = 0 THEN
    RETURN 0;
  END IF;

  RETURN ROUND(total_score / count, 2);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION needs_review(pod_id_param UUID)
RETURNS BOOLEAN AS $$
DECLARE
  pod RECORD;
  overall_conf NUMERIC;
BEGIN
  SELECT * INTO pod
  FROM delivery_pods
  WHERE id = pod_id_param;

  IF pod.parsing_completed_at IS NULL THEN
    RETURN FALSE;
  END IF;

  overall_conf := calculate_overall_confidence(pod_id_param);

  RETURN (
    overall_conf < 75 OR
    jsonb_array_length(COALESCE(pod.validation_flags, '[]'::jsonb)) > 0 OR
    pod.delivery_date IS NULL OR
    pod.sales_order_ref IS NULL
  );
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- Views
-- =====================================================
CREATE OR REPLACE VIEW pods_needing_review AS
SELECT
  p.*,
  s.name as supplier_name,
  calculate_overall_confidence(p.id) as overall_confidence
FROM delivery_pods p
LEFT JOIN suppliers s ON p.supplier_id = s.id
WHERE
  p.deleted_at IS NULL
  AND p.status IN ('pending', 'needs_review')
  AND needs_review(p.id) = TRUE
ORDER BY p.created_at ASC;

CREATE OR REPLACE VIEW pod_statistics AS
SELECT
  COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
  COUNT(*) FILTER (WHERE status = 'needs_review') as needs_review_count,
  COUNT(*) FILTER (WHERE status = 'approved') as approved_count,
  COUNT(*) FILTER (WHERE status = 'rejected') as rejected_count,
  AVG(calculate_overall_confidence(id)) as avg_confidence,
  COUNT(*) FILTER (WHERE delivery_date IS NULL) as missing_date_count,
  COUNT(*) FILTER (WHERE dropbox_synced_at IS NOT NULL) as backed_up_count,
  COUNT(*) FILTER (WHERE deleted_at IS NULL) as total_count
FROM delivery_pods
WHERE deleted_at IS NULL;

-- =====================================================
-- RLS Policies
-- =====================================================
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_pods ENABLE ROW LEVEL SECURITY;
ALTER TABLE pod_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pod_edit_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE pod_access_log ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
  SELECT COALESCE(
    (SELECT role FROM profiles WHERE id = auth.uid()),
    'guest'
  );
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION has_pod_access()
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
BEGIN
  user_role := LOWER(get_user_role());
  RETURN user_role IN ('director', 'ops', 'admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP POLICY IF EXISTS suppliers_access ON suppliers;
CREATE POLICY suppliers_access ON suppliers
  FOR ALL USING (has_pod_access());

DROP POLICY IF EXISTS pods_access ON delivery_pods;
CREATE POLICY pods_access ON delivery_pods
  FOR ALL USING (has_pod_access());

DROP POLICY IF EXISTS versions_access ON pod_versions;
CREATE POLICY versions_access ON pod_versions
  FOR ALL USING (has_pod_access());

DROP POLICY IF EXISTS history_access ON pod_edit_history;
CREATE POLICY history_access ON pod_edit_history
  FOR ALL USING (has_pod_access());

DROP POLICY IF EXISTS access_log_access ON pod_access_log;
CREATE POLICY access_log_access ON pod_access_log
  FOR ALL USING (has_pod_access());

-- =====================================================
-- Storage Bucket
-- =====================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('pods', 'pods', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "POD upload access" ON storage.objects;
CREATE POLICY "POD upload access"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'pods' AND (SELECT has_pod_access()));

DROP POLICY IF EXISTS "POD view access" ON storage.objects;
CREATE POLICY "POD view access"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'pods' AND (SELECT has_pod_access()));

-- =====================================================
-- Seed Data
-- =====================================================
INSERT INTO suppliers (name, type, primary_contact_name, primary_email, primary_phone, city, country)
VALUES
  ('Rawside Ltd', 'supplier', 'John Smith', 'john@rawside.com', '+44 7700 900000', 'London', 'United Kingdom'),
  ('Acme Haulage', 'haulier', 'Jane Doe', 'jane@acme.com', '+44 7700 900001', 'Manchester', 'United Kingdom')
ON CONFLICT DO NOTHING;
