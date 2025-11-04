-- Document Template System for AI Training
-- Allows users to mark up sample documents with bounding boxes to train AI extraction

-- ============================================================================
-- DOCUMENT TEMPLATES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS document_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  document_type TEXT NOT NULL CHECK (document_type IN ('invoice', 'pod', 'quote', 'receipt', 'timesheet', 'custom')),
  supplier_id UUID REFERENCES suppliers(id) ON DELETE SET NULL,
  is_generic BOOLEAN DEFAULT false,
  created_by UUID NOT NULL REFERENCES users(id),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  version INTEGER DEFAULT 1,
  page_count INTEGER DEFAULT 1,
  sample_file_path TEXT,
  match_rate DECIMAL(5, 2) DEFAULT 0,  -- Average template match rate %
  usage_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true
);

-- ============================================================================
-- TEMPLATE FIELDS (Bounding Boxes)
-- ============================================================================
CREATE TABLE IF NOT EXISTS template_fields (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id UUID NOT NULL REFERENCES document_templates(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  field_label TEXT NOT NULL,
  page_number INTEGER DEFAULT 1,

  -- Bounding box coordinates (pixels)
  x INTEGER NOT NULL,
  y INTEGER NOT NULL,
  width INTEGER NOT NULL,
  height INTEGER NOT NULL,

  -- Field properties
  confidence_level TEXT DEFAULT 'usually' CHECK (confidence_level IN ('always', 'usually', 'sometimes', 'fallback')),
  priority INTEGER DEFAULT 0,  -- Order of extraction (lower = higher priority)
  validation_regex TEXT,
  expected_format TEXT,  -- e.g., "DD/MM/YYYY", "£X,XXX.XX"
  notes TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- TEMPLATE USAGE TRACKING
-- ============================================================================
CREATE TABLE IF NOT EXISTS template_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  template_id UUID NOT NULL REFERENCES document_templates(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  document_type TEXT NOT NULL,
  used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  match_rate DECIMAL(5, 2),  -- How well template matched (% of fields found)
  fields_matched INTEGER,
  fields_total INTEGER,
  avg_confidence DECIMAL(5, 2),  -- Average AI confidence for matched fields
  extraction_time_ms INTEGER,  -- How long extraction took
  had_errors BOOLEAN DEFAULT false
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_templates_supplier ON document_templates(supplier_id);
CREATE INDEX IF NOT EXISTS idx_templates_type ON document_templates(document_type);
CREATE INDEX IF NOT EXISTS idx_templates_org ON document_templates(organization_id);
CREATE INDEX IF NOT EXISTS idx_templates_active ON document_templates(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_template_fields_template ON template_fields(template_id);
CREATE INDEX IF NOT EXISTS idx_template_fields_name ON template_fields(field_name);

CREATE INDEX IF NOT EXISTS idx_template_usage_template ON template_usage(template_id);
CREATE INDEX IF NOT EXISTS idx_template_usage_date ON template_usage(used_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE document_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_usage ENABLE ROW LEVEL SECURITY;

-- Templates: Users can view templates from their organization
DROP POLICY IF EXISTS "Users can view organization templates" ON document_templates;
CREATE POLICY "Users can view organization templates"
  ON document_templates FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.organization_id = document_templates.organization_id
    )
  );

-- Templates: Ops/Director/Admin can manage templates
DROP POLICY IF EXISTS "Ops/Director/Admin can manage templates" ON document_templates;
CREATE POLICY "Ops/Director/Admin can manage templates"
  ON document_templates FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('ops', 'director', 'admin')
      AND users.organization_id = document_templates.organization_id
    )
  );

-- Template Fields: Inherit from parent template
DROP POLICY IF EXISTS "Users can view template fields" ON template_fields;
CREATE POLICY "Users can view template fields"
  ON template_fields FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM document_templates t
      JOIN users u ON u.organization_id = t.organization_id
      WHERE t.id = template_fields.template_id
      AND u.id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Ops/Director/Admin can manage template fields" ON template_fields;
CREATE POLICY "Ops/Director/Admin can manage template fields"
  ON template_fields FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM document_templates t
      JOIN users u ON u.organization_id = t.organization_id
      WHERE t.id = template_fields.template_id
      AND u.id = auth.uid()
      AND u.role IN ('ops', 'director', 'admin')
    )
  );

-- Template Usage: Users can view usage from their org
DROP POLICY IF EXISTS "Users can view template usage" ON template_usage;
CREATE POLICY "Users can view template usage"
  ON template_usage FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM document_templates t
      JOIN users u ON u.organization_id = t.organization_id
      WHERE t.id = template_usage.template_id
      AND u.id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "System can record template usage" ON template_usage;
CREATE POLICY "System can record template usage"
  ON template_usage FOR INSERT
  TO authenticated
  WITH CHECK (true);  -- Anyone can record usage

-- ============================================================================
-- FUNCTIONS AND TRIGGERS
-- ============================================================================

-- Update template updated_at timestamp
CREATE OR REPLACE FUNCTION update_template_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_templates_updated_at ON document_templates;
CREATE TRIGGER update_templates_updated_at
  BEFORE UPDATE ON document_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_template_updated_at();

-- Update template usage count when used
CREATE OR REPLACE FUNCTION increment_template_usage()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE document_templates
  SET usage_count = usage_count + 1
  WHERE id = NEW.template_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS increment_template_usage_trigger ON template_usage;
CREATE TRIGGER increment_template_usage_trigger
  AFTER INSERT ON template_usage
  FOR EACH ROW
  EXECUTE FUNCTION increment_template_usage();

-- Update template match rate (rolling average)
CREATE OR REPLACE FUNCTION update_template_match_rate()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE document_templates
  SET match_rate = (
    SELECT AVG(match_rate)
    FROM template_usage
    WHERE template_id = NEW.template_id
    AND match_rate IS NOT NULL
  )
  WHERE id = NEW.template_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_template_match_rate_trigger ON template_usage;
CREATE TRIGGER update_template_match_rate_trigger
  AFTER INSERT ON template_usage
  FOR EACH ROW
  WHEN (NEW.match_rate IS NOT NULL)
  EXECUTE FUNCTION update_template_match_rate();

-- ============================================================================
-- VIEWS FOR ANALYTICS
-- ============================================================================

-- Template performance summary
CREATE OR REPLACE VIEW template_performance AS
SELECT
  t.id,
  t.name,
  t.document_type,
  s.name AS supplier_name,
  t.version,
  t.is_active,
  t.usage_count,
  t.match_rate,
  COUNT(DISTINCT tu.id) AS total_uses,
  AVG(tu.avg_confidence) AS avg_confidence,
  AVG(tu.extraction_time_ms) AS avg_extraction_time_ms,
  COUNT(DISTINCT tu.id) FILTER (WHERE tu.had_errors = true) AS error_count,
  MAX(tu.used_at) AS last_used_at,
  COUNT(tf.id) AS field_count,
  t.created_at
FROM document_templates t
LEFT JOIN suppliers s ON t.supplier_id = s.id
LEFT JOIN template_usage tu ON t.id = tu.template_id
LEFT JOIN template_fields tf ON t.id = tf.template_id
GROUP BY t.id, t.name, t.document_type, s.name, t.version, t.is_active, t.usage_count, t.match_rate, t.created_at;

-- Top performing templates
CREATE OR REPLACE VIEW top_templates AS
SELECT *
FROM template_performance
WHERE is_active = true
AND usage_count > 0
ORDER BY match_rate DESC, usage_count DESC
LIMIT 50;

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT ON template_performance TO authenticated;
GRANT SELECT ON top_templates TO authenticated;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE document_templates IS 'Stores template definitions for AI-assisted document extraction';
COMMENT ON TABLE template_fields IS 'Bounding box regions and field definitions for templates';
COMMENT ON TABLE template_usage IS 'Tracks template usage and performance metrics';

COMMENT ON COLUMN document_templates.match_rate IS 'Rolling average match rate (% of fields successfully extracted)';
COMMENT ON COLUMN template_fields.confidence_level IS 'How reliable this field location is (always/usually/sometimes/fallback)';
COMMENT ON COLUMN template_fields.priority IS 'Extraction order - lower number = higher priority';
COMMENT ON COLUMN template_usage.match_rate IS 'Percentage of template fields that matched in this extraction';
