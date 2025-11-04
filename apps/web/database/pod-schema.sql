-- =====================================================
-- BHIT POD Manager - Complete Database Schema
-- For: BHIT Installation & Transport Ltd
-- Purpose: Proof of Delivery management with AI parsing
-- =====================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For text search

-- =====================================================
-- TABLE: suppliers
-- Suppliers and subcontractors who provide PODs
-- =====================================================
CREATE TABLE suppliers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  type TEXT CHECK (type IN ('subcontractor', 'supplier', 'haulier')),
  primary_contact_name TEXT,
  primary_email TEXT,
  primary_phone TEXT,
  whatsapp_enabled BOOLEAN DEFAULT FALSE,
  address_line_1 TEXT,
  address_line_2 TEXT,
  city TEXT,
  postcode TEXT,
  country TEXT DEFAULT 'United Kingdom',
  contacts JSONB DEFAULT '[]'::jsonb, -- Array of {name, email, phone, whatsapp_number}
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  notes TEXT
);

CREATE INDEX idx_suppliers_active ON suppliers(active) WHERE active = TRUE;
CREATE INDEX idx_suppliers_name ON suppliers USING gin(name gin_trgm_ops);

-- =====================================================
-- TABLE: delivery_pods
-- Main POD records with immutable original data
-- =====================================================
CREATE TABLE delivery_pods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Upload metadata
  upload_source TEXT CHECK (upload_source IN ('email', 'mobile_app', 'web_dashboard', 'whatsapp')),
  uploaded_by UUID REFERENCES auth.users(id),
  original_sender TEXT, -- Email or phone number
  original_filename TEXT NOT NULL,

  -- File storage
  file_path TEXT NOT NULL, -- Supabase storage path
  file_hash TEXT NOT NULL, -- SHA-256 for deduplication
  file_size_bytes BIGINT NOT NULL,
  mime_type TEXT NOT NULL,

  -- Dropbox backup
  dropbox_path TEXT,
  dropbox_synced_at TIMESTAMPTZ,
  dropbox_file_id TEXT,

  -- Relationships
  supplier_id UUID REFERENCES suppliers(id),
  job_id UUID, -- Future integration with jobs
  client_id UUID, -- Future integration with clients
  invoice_id UUID, -- Future integration with invoices

  -- Parsed delivery data
  sales_order_ref TEXT,
  delivery_date DATE,
  delivery_time TIME,
  recipient_name TEXT,
  recipient_signature_path TEXT, -- Extracted signature image path
  delivery_address TEXT,
  items_delivered JSONB DEFAULT '[]'::jsonb, -- Array of {product, quantity, unit}

  -- Vehicle info
  vehicle_type TEXT CHECK (vehicle_type IN ('luton', '7.5t', 'artic', 'van', 'sprinter', 'other')),
  vehicle_count INTEGER DEFAULT 1 CHECK (vehicle_count > 0),
  vehicle_registrations TEXT[],
  driver_names TEXT[],

  -- AI parsing metadata
  current_version INTEGER DEFAULT 1,
  ai_model_version TEXT,
  confidence_scores JSONB, -- {overall, sales_order_ref, delivery_date, etc.}
  parsing_completed_at TIMESTAMPTZ,

  -- Status and approval
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',           -- Uploaded, parsing not started
    'parsing',          -- AI parsing in progress
    'needs_review',     -- Low confidence or validation issues
    'approved',         -- Approved for payment
    'rejected',         -- Rejected, won't pay
    'whatsapp_requested', -- Requested clearer POD via WhatsApp
    'replacement_required', -- Waiting for replacement POD
    'payment_held'      -- Approved but payment on hold
  )),

  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  rejected_by UUID REFERENCES auth.users(id),
  rejected_at TIMESTAMPTZ,
  rejection_reason TEXT,

  -- Validation flags
  validation_flags JSONB DEFAULT '[]'::jsonb, -- Array of issue strings

  -- Soft delete
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES auth.users(id)
);

-- Indexes
CREATE INDEX idx_pods_sales_order ON delivery_pods(sales_order_ref) WHERE sales_order_ref IS NOT NULL;
CREATE INDEX idx_pods_status ON delivery_pods(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_pods_created ON delivery_pods(created_at DESC);
CREATE INDEX idx_pods_supplier ON delivery_pods(supplier_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_pods_uploaded_by ON delivery_pods(uploaded_by);
CREATE INDEX idx_pods_delivery_date ON delivery_pods(delivery_date) WHERE delivery_date IS NOT NULL;
CREATE INDEX idx_pods_not_deleted ON delivery_pods(id) WHERE deleted_at IS NULL;
CREATE INDEX idx_pods_job_id ON delivery_pods(job_id) WHERE job_id IS NOT NULL;
CREATE INDEX idx_pods_client_id ON delivery_pods(client_id) WHERE client_id IS NOT NULL;

-- =====================================================
-- TABLE: pod_versions
-- Complete version history of all POD changes
-- =====================================================
CREATE TABLE pod_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pod_id UUID NOT NULL REFERENCES delivery_pods(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  change_type TEXT NOT NULL CHECK (change_type IN (
    'initial_parse',
    'manual_correction',
    'reparse',
    'field_update',
    'status_change',
    'approval',
    'rejection'
  )),
  data JSONB NOT NULL, -- Full snapshot of POD at this version
  changed_fields TEXT[], -- Which fields changed
  change_reason TEXT,
  ai_model_version TEXT,
  confidence_scores JSONB,

  UNIQUE(pod_id, version_number)
);

CREATE INDEX idx_versions_pod ON pod_versions(pod_id, version_number DESC);
CREATE INDEX idx_versions_created ON pod_versions(created_at DESC);

-- =====================================================
-- TABLE: pod_edit_history
-- Granular field-level edit tracking
-- =====================================================
CREATE TABLE pod_edit_history (
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
    'ai_low_confidence',
    'user_correction',
    'missing_data',
    'validation_failed',
    'supplier_update'
  )),
  ip_address INET,
  user_agent TEXT
);

CREATE INDEX idx_history_pod ON pod_edit_history(pod_id, edited_at DESC);
CREATE INDEX idx_history_field ON pod_edit_history(field_name);

-- =====================================================
-- TABLE: pod_access_log
-- Audit log of all POD access and actions
-- =====================================================
CREATE TABLE pod_access_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pod_id UUID NOT NULL REFERENCES delivery_pods(id) ON DELETE CASCADE,
  accessed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  accessed_by UUID REFERENCES auth.users(id),
  access_type TEXT NOT NULL CHECK (access_type IN (
    'view', 'download', 'edit', 'approve', 'reject', 'delete'
  )),
  ip_address INET,
  user_agent TEXT,
  client_access BOOLEAN DEFAULT FALSE -- Was this accessed by the client?
);

CREATE INDEX idx_access_pod ON pod_access_log(pod_id, accessed_at DESC);
CREATE INDEX idx_access_user ON pod_access_log(accessed_by);
CREATE INDEX idx_access_type ON pod_access_log(access_type);

-- =====================================================
-- TABLE: pod_backup_status
-- Verification of POD backups to external storage
-- =====================================================
CREATE TABLE pod_backup_status (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pod_id UUID NOT NULL REFERENCES delivery_pods(id) ON DELETE CASCADE,
  backup_type TEXT NOT NULL CHECK (backup_type IN ('dropbox', 'supabase_storage', 's3')),
  backup_path TEXT NOT NULL,
  backed_up_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  verified_at TIMESTAMPTZ,
  verification_hash TEXT,
  backup_size_bytes BIGINT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed')),
  error_message TEXT,

  UNIQUE(pod_id, backup_type, backup_path)
);

CREATE INDEX idx_backup_pod ON pod_backup_status(pod_id);
CREATE INDEX idx_backup_status ON pod_backup_status(status) WHERE status != 'success';

-- =====================================================
-- TABLE: pod_whatsapp_requests
-- Tracking of WhatsApp requests for clearer PODs
-- =====================================================
CREATE TABLE pod_whatsapp_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pod_id UUID NOT NULL REFERENCES delivery_pods(id) ON DELETE CASCADE,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  requested_by UUID REFERENCES auth.users(id),
  supplier_id UUID REFERENCES suppliers(id),
  phone_number TEXT NOT NULL,
  contact_name TEXT,
  message_template TEXT NOT NULL,
  message_sent TEXT NOT NULL,
  issue_type TEXT NOT NULL CHECK (issue_type IN (
    'signature_unclear',
    'signature_missing',
    'date_missing',
    'poor_quality',
    'vehicle_missing',
    'items_not_visible',
    'custom'
  )),
  response_received_at TIMESTAMPTZ,
  replacement_pod_id UUID REFERENCES delivery_pods(id),
  escalated BOOLEAN DEFAULT FALSE,
  escalated_at TIMESTAMPTZ,
  escalation_reason TEXT,
  reminder_sent_at TIMESTAMPTZ,
  reminder_count INTEGER DEFAULT 0
);

CREATE INDEX idx_whatsapp_pod ON pod_whatsapp_requests(pod_id);
CREATE INDEX idx_whatsapp_pending ON pod_whatsapp_requests(requested_at)
  WHERE response_received_at IS NULL;

-- =====================================================
-- TRIGGERS: Auto-update timestamps
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_suppliers_updated_at
  BEFORE UPDATE ON suppliers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pods_updated_at
  BEFORE UPDATE ON delivery_pods
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- TRIGGER: Auto-create version on POD update
-- =====================================================
CREATE OR REPLACE FUNCTION create_pod_version()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create version if not a new insert
  IF TG_OP = 'UPDATE' THEN
    INSERT INTO pod_versions (
      pod_id,
      version_number,
      created_by,
      change_type,
      data,
      ai_model_version,
      confidence_scores
    ) VALUES (
      NEW.id,
      NEW.current_version,
      NEW.uploaded_by,
      CASE
        WHEN NEW.status = 'approved' AND OLD.status != 'approved' THEN 'approval'
        WHEN NEW.status = 'rejected' AND OLD.status != 'rejected' THEN 'rejection'
        WHEN NEW.status != OLD.status THEN 'status_change'
        ELSE 'field_update'
      END,
      to_jsonb(NEW),
      NEW.ai_model_version,
      NEW.confidence_scores
    );

    NEW.current_version = NEW.current_version + 1;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_version_on_update
  BEFORE UPDATE ON delivery_pods
  FOR EACH ROW
  EXECUTE FUNCTION create_pod_version();

-- =====================================================
-- TRIGGER: Prevent hard delete (convert to soft delete)
-- =====================================================
CREATE OR REPLACE FUNCTION prevent_pod_deletion()
RETURNS TRIGGER AS $$
BEGIN
  -- Don't actually delete, just mark as deleted
  UPDATE delivery_pods
  SET deleted_at = NOW(),
      deleted_by = auth.uid()
  WHERE id = OLD.id;

  -- Prevent the actual DELETE
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_hard_delete
  BEFORE DELETE ON delivery_pods
  FOR EACH ROW
  EXECUTE FUNCTION prevent_pod_deletion();

-- =====================================================
-- FUNCTIONS: Helper functions
-- =====================================================

-- Calculate overall confidence score from confidence_scores JSON
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

  -- Average all confidence scores
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

-- Determine if POD needs manual review
CREATE OR REPLACE FUNCTION needs_review(pod_id_param UUID)
RETURNS BOOLEAN AS $$
DECLARE
  pod RECORD;
  overall_conf NUMERIC;
BEGIN
  SELECT * INTO pod
  FROM delivery_pods
  WHERE id = pod_id_param;

  -- If not parsed yet, doesn't need review
  IF pod.parsing_completed_at IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Calculate overall confidence
  overall_conf := calculate_overall_confidence(pod_id_param);

  -- Needs review if:
  -- 1. Confidence < 75%
  -- 2. Has validation flags
  -- 3. Missing critical data
  RETURN (
    overall_conf < 75 OR
    jsonb_array_length(COALESCE(pod.validation_flags, '[]'::jsonb)) > 0 OR
    pod.delivery_date IS NULL OR
    pod.sales_order_ref IS NULL
  );
END;
$$ LANGUAGE plpgsql;

-- Log POD access
CREATE OR REPLACE FUNCTION log_pod_access(
  pod_id_param UUID,
  access_type_param TEXT,
  client_access_param BOOLEAN DEFAULT FALSE
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO pod_access_log (
    pod_id,
    accessed_by,
    access_type,
    client_access
  ) VALUES (
    pod_id_param,
    auth.uid(),
    access_type_param,
    client_access_param
  );
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- VIEWS: Commonly used data views
-- =====================================================

-- PODs needing review
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

-- Recent POD activity for dashboard
CREATE OR REPLACE VIEW recent_pod_activity AS
SELECT
  p.*,
  s.name as supplier_name,
  u.email as uploaded_by_email,
  calculate_overall_confidence(p.id) as overall_confidence,
  needs_review(p.id) as needs_review
FROM delivery_pods p
LEFT JOIN suppliers s ON p.supplier_id = s.id
LEFT JOIN auth.users u ON p.uploaded_by = u.id
WHERE p.deleted_at IS NULL
ORDER BY p.updated_at DESC
LIMIT 50;

-- POD statistics
CREATE OR REPLACE VIEW pod_statistics AS
SELECT
  COUNT(*) FILTER (WHERE status = 'pending') as pending_count,
  COUNT(*) FILTER (WHERE status = 'needs_review') as needs_review_count,
  COUNT(*) FILTER (WHERE status = 'approved') as approved_count,
  COUNT(*) FILTER (WHERE status = 'rejected') as rejected_count,
  COUNT(*) FILTER (WHERE status = 'whatsapp_requested') as whatsapp_requested_count,
  AVG(calculate_overall_confidence(id)) as avg_confidence,
  COUNT(*) FILTER (WHERE delivery_date IS NULL) as missing_date_count,
  COUNT(*) FILTER (WHERE dropbox_synced_at IS NOT NULL) as backed_up_count
FROM delivery_pods
WHERE deleted_at IS NULL;

-- =====================================================
-- RLS POLICIES: Row Level Security
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE delivery_pods ENABLE ROW LEVEL SECURITY;
ALTER TABLE pod_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pod_edit_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE pod_access_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE pod_backup_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE pod_whatsapp_requests ENABLE ROW LEVEL SECURITY;

-- Helper function to get user role
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
  SELECT COALESCE(
    (SELECT role FROM profiles WHERE id = auth.uid()),
    'guest'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Helper function to check permission
CREATE OR REPLACE FUNCTION has_permission(permission TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  user_role TEXT;
BEGIN
  user_role := get_user_role();

  RETURN CASE permission
    WHEN 'view_pods' THEN user_role IN ('director', 'ops', 'admin')
    WHEN 'edit_pods' THEN user_role IN ('director', 'ops')
    WHEN 'approve_pods' THEN user_role IN ('director', 'ops')
    WHEN 'manage_suppliers' THEN user_role IN ('director', 'ops', 'admin')
    ELSE FALSE
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Suppliers: Director, Ops, Admin can view/edit
CREATE POLICY suppliers_select ON suppliers
  FOR SELECT USING (has_permission('view_pods'));

CREATE POLICY suppliers_insert ON suppliers
  FOR INSERT WITH CHECK (has_permission('manage_suppliers'));

CREATE POLICY suppliers_update ON suppliers
  FOR UPDATE USING (has_permission('manage_suppliers'));

-- PODs: Director and Ops can access
CREATE POLICY pods_select ON delivery_pods
  FOR SELECT USING (has_permission('view_pods'));

CREATE POLICY pods_insert ON delivery_pods
  FOR INSERT WITH CHECK (has_permission('edit_pods'));

CREATE POLICY pods_update ON delivery_pods
  FOR UPDATE USING (has_permission('edit_pods'));

CREATE POLICY pods_delete ON delivery_pods
  FOR DELETE USING (has_permission('edit_pods'));

-- Versions: Read-only for authorized users
CREATE POLICY versions_select ON pod_versions
  FOR SELECT USING (has_permission('view_pods'));

-- Edit history: Read-only for authorized users
CREATE POLICY history_select ON pod_edit_history
  FOR SELECT USING (has_permission('view_pods'));

-- Access log: Read-only for director/ops
CREATE POLICY access_log_select ON pod_access_log
  FOR SELECT USING (has_permission('view_pods'));

CREATE POLICY access_log_insert ON pod_access_log
  FOR INSERT WITH CHECK (true); -- Anyone can log their own access

-- Backup status: Read for authorized users
CREATE POLICY backup_status_select ON pod_backup_status
  FOR SELECT USING (has_permission('view_pods'));

-- WhatsApp requests: Director/Ops can create and view
CREATE POLICY whatsapp_select ON pod_whatsapp_requests
  FOR SELECT USING (has_permission('view_pods'));

CREATE POLICY whatsapp_insert ON pod_whatsapp_requests
  FOR INSERT WITH CHECK (has_permission('edit_pods'));

-- =====================================================
-- STORAGE BUCKET: pods
-- =====================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('pods', 'pods', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Authenticated users can upload PODs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'pods');

CREATE POLICY "Directors and Ops can view PODs"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'pods' AND has_permission('view_pods'));

-- =====================================================
-- SEED DATA: Example supplier
-- =====================================================
INSERT INTO suppliers (name, type, primary_contact_name, primary_email, primary_phone, whatsapp_enabled, city, country, contacts)
VALUES (
  'Rawside Ltd',
  'supplier',
  'John Smith',
  'john@rawside.com',
  '+44 7700 900000',
  true,
  'London',
  'United Kingdom',
  '[{"name": "John Smith", "phone": "+44 7700 900000", "email": "john@rawside.com", "whatsapp_number": "+447700900000"}]'::jsonb
) ON CONFLICT DO NOTHING;

-- =====================================================
-- COMPLETION
-- =====================================================
COMMENT ON DATABASE CURRENT_DATABASE() IS 'BHIT POD Manager schema installed successfully';
