-- ============================================================================
-- SmartInvoice Complete Database Setup
-- ============================================================================
-- This file contains ALL migrations required for SmartInvoice to work
-- Run this in your Supabase SQL Editor to deploy the complete system
--
-- Includes:
-- 1. Invoice System (041_invoice_system.sql)
-- 2. Document Templates (042_document_templates.sql)
-- 3. Active Learning (043_active_learning.sql)
--
-- IMPORTANT: Run this ONCE. Running multiple times is safe (uses IF NOT EXISTS)
-- ============================================================================

-- ============================================================================
-- PART 1: CORE INVOICE SYSTEM (Migration 041)
-- ============================================================================

-- SUPPLIERS TABLE
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

-- INVOICES TABLE
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

CREATE INDEX IF NOT EXISTS idx_invoices_organization ON invoices(organization_id);
CREATE INDEX IF NOT EXISTS idx_invoices_job ON invoices(job_id);
CREATE INDEX IF NOT EXISTS idx_invoices_supplier ON invoices(supplier_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_date ON invoices(invoice_date);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_invoices_category ON invoices(category);

-- INVOICE LINE ITEMS TABLE
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

CREATE INDEX IF NOT EXISTS idx_invoice_line_items_invoice ON invoice_line_items(invoice_id);

-- INVOICE CORRECTIONS TABLE (for AI learning)
CREATE TABLE IF NOT EXISTS invoice_corrections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  original_value TEXT,
  corrected_value TEXT NOT NULL,
  corrected_by UUID NOT NULL REFERENCES users(id),
  corrected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  supplier_id UUID REFERENCES suppliers(id)
);

CREATE INDEX IF NOT EXISTS idx_invoice_corrections_invoice ON invoice_corrections(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_corrections_field ON invoice_corrections(field_name);
CREATE INDEX IF NOT EXISTS idx_invoice_corrections_supplier ON invoice_corrections(supplier_id);

-- TRIGGERS
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_invoices_updated_at'
  ) THEN
    CREATE TRIGGER update_invoices_updated_at
    BEFORE UPDATE ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_suppliers_updated_at'
  ) THEN
    CREATE TRIGGER update_suppliers_updated_at
    BEFORE UPDATE ON suppliers
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- ============================================================================
-- PART 2: DOCUMENT TEMPLATES SYSTEM (Migration 042)
-- ============================================================================

-- DOCUMENT TEMPLATES TABLE
CREATE TABLE IF NOT EXISTS document_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  document_type TEXT NOT NULL DEFAULT 'invoice',
  supplier_id UUID REFERENCES suppliers(id) ON DELETE CASCADE,
  reference_document_url TEXT NOT NULL,
  page_count INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  confidence_level TEXT DEFAULT 'medium' CHECK (confidence_level IN ('always', 'usually', 'sometimes', 'rarely')),
  usage_count INTEGER DEFAULT 0,
  success_rate DECIMAL(5, 2) DEFAULT 0,
  last_used_at TIMESTAMPTZ,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_document_templates_supplier ON document_templates(supplier_id);
CREATE INDEX IF NOT EXISTS idx_document_templates_type ON document_templates(document_type);
CREATE INDEX IF NOT EXISTS idx_document_templates_active ON document_templates(is_active) WHERE is_active = true;

-- TEMPLATE FIELDS TABLE
CREATE TABLE IF NOT EXISTS template_fields (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id UUID NOT NULL REFERENCES document_templates(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  field_type TEXT NOT NULL CHECK (field_type IN ('text', 'number', 'date', 'amount', 'supplier', 'description')),
  page_number INTEGER NOT NULL DEFAULT 1,
  x DECIMAL(10, 2) NOT NULL,
  y DECIMAL(10, 2) NOT NULL,
  width DECIMAL(10, 2) NOT NULL,
  height DECIMAL(10, 2) NOT NULL,
  expected_format TEXT,
  extraction_hints JSONB,
  validation_rules JSONB,
  is_required BOOLEAN DEFAULT false,
  confidence_threshold DECIMAL(5, 2) DEFAULT 70,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_template_fields_template ON template_fields(template_id);
CREATE INDEX IF NOT EXISTS idx_template_fields_name ON template_fields(field_name);
CREATE INDEX IF NOT EXISTS idx_template_fields_page ON template_fields(page_number);

-- TRIGGERS
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_document_templates_updated_at'
  ) THEN
    CREATE TRIGGER update_document_templates_updated_at
    BEFORE UPDATE ON document_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- ============================================================================
-- PART 3: ACTIVE LEARNING SYSTEM (Migration 043)
-- ============================================================================

-- ACTIVE LEARNING REQUESTS TABLE
CREATE TABLE IF NOT EXISTS active_learning_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  extracted_value TEXT NOT NULL,
  confidence DECIMAL(5, 2) NOT NULL,
  context TEXT,
  alternatives TEXT[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  user_correction TEXT,
  resolved_by UUID REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_active_learning_unresolved ON active_learning_requests(resolved, confidence) WHERE resolved = false;
CREATE INDEX IF NOT EXISTS idx_active_learning_invoice ON active_learning_requests(invoice_id);
CREATE INDEX IF NOT EXISTS idx_active_learning_created ON active_learning_requests(created_at DESC);

-- LEARNING PATTERNS TABLE
CREATE TABLE IF NOT EXISTS learning_patterns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pattern_type TEXT NOT NULL,
  field_name TEXT NOT NULL,
  original_pattern TEXT NOT NULL,
  corrected_pattern TEXT NOT NULL,
  occurrences INTEGER DEFAULT 1,
  confidence DECIMAL(5, 2) DEFAULT 50,
  example_original TEXT,
  example_corrected TEXT,
  first_detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_learning_patterns_field ON learning_patterns(field_name);
CREATE INDEX IF NOT EXISTS idx_learning_patterns_type ON learning_patterns(pattern_type);
CREATE INDEX IF NOT EXISTS idx_learning_patterns_active ON learning_patterns(is_active) WHERE is_active = true;

-- PREDICTED CORRECTIONS TABLE
CREATE TABLE IF NOT EXISTS predicted_corrections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  current_value TEXT NOT NULL,
  predicted_value TEXT NOT NULL,
  confidence DECIMAL(5, 2) NOT NULL,
  reason TEXT NOT NULL,
  pattern_based BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  was_accepted BOOLEAN,
  user_feedback TEXT
);

CREATE INDEX IF NOT EXISTS idx_predicted_corrections_invoice ON predicted_corrections(invoice_id);
CREATE INDEX IF NOT EXISTS idx_predicted_corrections_field ON predicted_corrections(field_name);
CREATE INDEX IF NOT EXISTS idx_predicted_corrections_created ON predicted_corrections(created_at DESC);

-- ANOMALY DETECTIONS TABLE
CREATE TABLE IF NOT EXISTS anomaly_detections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  anomaly_score DECIMAL(5, 2) NOT NULL,
  anomaly_types TEXT[] NOT NULL,
  description TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  requires_review BOOLEAN DEFAULT false,
  detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed BOOLEAN DEFAULT false,
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMPTZ,
  was_legitimate BOOLEAN,
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_anomaly_detections_invoice ON anomaly_detections(invoice_id);
CREATE INDEX IF NOT EXISTS idx_anomaly_detections_severity ON anomaly_detections(severity);
CREATE INDEX IF NOT EXISTS idx_anomaly_detections_unreviewed ON anomaly_detections(reviewed, requires_review) WHERE reviewed = false;

-- VALIDATION RESULTS TABLE
CREATE TABLE IF NOT EXISTS validation_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  is_valid BOOLEAN NOT NULL,
  issues_count INTEGER DEFAULT 0,
  warnings_count INTEGER DEFAULT 0,
  critical_issues TEXT[],
  all_issues JSONB,
  validated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_validation_results_invoice ON validation_results(invoice_id);
CREATE INDEX IF NOT EXISTS idx_validation_results_valid ON validation_results(is_valid);
CREATE INDEX IF NOT EXISTS idx_validation_results_created ON validation_results(validated_at DESC);

-- TRIGGERS FOR ACTIVE LEARNING
CREATE OR REPLACE FUNCTION set_learning_request_resolved_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.resolved = true AND OLD.resolved = false THEN
    NEW.resolved_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_learning_request_resolved_at'
  ) THEN
    CREATE TRIGGER update_learning_request_resolved_at
    BEFORE UPDATE ON active_learning_requests
    FOR EACH ROW
    EXECUTE FUNCTION set_learning_request_resolved_at();
  END IF;
END $$;

-- ============================================================================
-- DEPLOYMENT COMPLETE
-- ============================================================================

-- Verify installation
DO $$
DECLARE
  table_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO table_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name IN (
    'suppliers',
    'invoices',
    'invoice_line_items',
    'invoice_corrections',
    'document_templates',
    'template_fields',
    'active_learning_requests',
    'learning_patterns',
    'predicted_corrections',
    'anomaly_detections',
    'validation_results'
  );

  RAISE NOTICE '============================================';
  RAISE NOTICE 'SmartInvoice Migration Complete!';
  RAISE NOTICE 'Tables created: % / 11', table_count;

  IF table_count = 11 THEN
    RAISE NOTICE 'Status: SUCCESS ✓';
    RAISE NOTICE 'All tables have been created successfully.';
  ELSE
    RAISE NOTICE 'Status: WARNING';
    RAISE NOTICE 'Some tables may already exist or failed to create.';
  END IF;

  RAISE NOTICE '============================================';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Configure environment variables (.env.local)';
  RAISE NOTICE '2. Test setup: /api/test-smartinvoice-setup';
  RAISE NOTICE '3. Navigate to /smart-invoice page';
  RAISE NOTICE '============================================';
END $$;
