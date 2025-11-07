-- Active Learning System
-- AI requests human help for uncertain extractions

-- ============================================================================
-- ACTIVE LEARNING REQUESTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS active_learning_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  extracted_value TEXT NOT NULL,
  confidence DECIMAL(5, 2) NOT NULL,
  context TEXT,  -- Additional context about the extraction
  alternatives TEXT[],  -- Possible alternative values
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  user_correction TEXT,
  resolved_by UUID REFERENCES users(id)
);

-- ============================================================================
-- LEARNING PATTERNS TABLE (Detected patterns from corrections)
-- ============================================================================
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

-- ============================================================================
-- PREDICTED CORRECTIONS TABLE (Auto-suggested fixes)
-- ============================================================================
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

-- ============================================================================
-- ANOMALY DETECTIONS TABLE (Suspicious invoices flagged)
-- ============================================================================
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

-- ============================================================================
-- VALIDATION RESULTS TABLE (Smart validation findings)
-- ============================================================================
CREATE TABLE IF NOT EXISTS validation_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  is_valid BOOLEAN NOT NULL,
  issues_count INTEGER DEFAULT 0,
  warnings_count INTEGER DEFAULT 0,
  critical_issues TEXT[],
  all_issues JSONB,  -- Full validation results
  validated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_active_learning_unresolved ON active_learning_requests(resolved, confidence) WHERE resolved = false;
CREATE INDEX IF NOT EXISTS idx_active_learning_invoice ON active_learning_requests(invoice_id);
CREATE INDEX IF NOT EXISTS idx_active_learning_created ON active_learning_requests(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_learning_patterns_field ON learning_patterns(field_name);
CREATE INDEX IF NOT EXISTS idx_learning_patterns_type ON learning_patterns(pattern_type);
CREATE INDEX IF NOT EXISTS idx_learning_patterns_active ON learning_patterns(is_active) WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_predicted_corrections_invoice ON predicted_corrections(invoice_id);
CREATE INDEX IF NOT EXISTS idx_predicted_corrections_accepted ON predicted_corrections(was_accepted);

CREATE INDEX IF NOT EXISTS idx_anomaly_detections_invoice ON anomaly_detections(invoice_id);
CREATE INDEX IF NOT EXISTS idx_anomaly_detections_unreviewed ON anomaly_detections(reviewed) WHERE reviewed = false;
CREATE INDEX IF NOT EXISTS idx_anomaly_detections_severity ON anomaly_detections(severity);
CREATE INDEX IF NOT EXISTS idx_anomaly_detections_score ON anomaly_detections(anomaly_score DESC);

CREATE INDEX IF NOT EXISTS idx_validation_results_invoice ON validation_results(invoice_id);
CREATE INDEX IF NOT EXISTS idx_validation_results_invalid ON validation_results(is_valid) WHERE is_valid = false;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

ALTER TABLE active_learning_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE learning_patterns ENABLE ROW LEVEL SECURITY;
ALTER TABLE predicted_corrections ENABLE ROW LEVEL SECURITY;
ALTER TABLE anomaly_detections ENABLE ROW LEVEL SECURITY;
ALTER TABLE validation_results ENABLE ROW LEVEL SECURITY;

-- Active Learning: Users can view and resolve requests from their org
DROP POLICY IF EXISTS "Users can view learning requests" ON active_learning_requests;
CREATE POLICY "Users can view learning requests"
  ON active_learning_requests FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM invoices i
      JOIN users u ON u.organization_id = i.organization_id
      WHERE i.id = active_learning_requests.invoice_id
      AND u.id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can resolve learning requests" ON active_learning_requests;
CREATE POLICY "Users can resolve learning requests"
  ON active_learning_requests FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM invoices i
      JOIN users u ON u.organization_id = i.organization_id
      WHERE i.id = active_learning_requests.invoice_id
      AND u.id = auth.uid()
    )
  );

-- Learning Patterns: All authenticated users can read
DROP POLICY IF EXISTS "Users can view patterns" ON learning_patterns;
CREATE POLICY "Users can view patterns"
  ON learning_patterns FOR SELECT
  TO authenticated
  USING (true);

-- System can create patterns
DROP POLICY IF EXISTS "System can create patterns" ON learning_patterns;
CREATE POLICY "System can create patterns"
  ON learning_patterns FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Predicted Corrections: Inherit from invoice
DROP POLICY IF EXISTS "Users can view predictions" ON predicted_corrections;
CREATE POLICY "Users can view predictions"
  ON predicted_corrections FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM invoices i
      JOIN users u ON u.organization_id = i.organization_id
      WHERE i.id = predicted_corrections.invoice_id
      AND u.id = auth.uid()
    )
  );

-- Anomaly Detections: Inherit from invoice
DROP POLICY IF EXISTS "Users can view anomalies" ON anomaly_detections;
CREATE POLICY "Users can view anomalies"
  ON anomaly_detections FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM invoices i
      JOIN users u ON u.organization_id = i.organization_id
      WHERE i.id = anomaly_detections.invoice_id
      AND u.id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can review anomalies" ON anomaly_detections;
CREATE POLICY "Users can review anomalies"
  ON anomaly_detections FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM invoices i
      JOIN users u ON u.organization_id = i.organization_id
      WHERE i.id = anomaly_detections.invoice_id
      AND u.id = auth.uid()
    )
  );

-- Validation Results: Inherit from invoice
DROP POLICY IF EXISTS "Users can view validation results" ON validation_results;
CREATE POLICY "Users can view validation results"
  ON validation_results FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM invoices i
      JOIN users u ON u.organization_id = i.organization_id
      WHERE i.id = validation_results.invoice_id
      AND u.id = auth.uid()
    )
  );

-- ============================================================================
-- FUNCTIONS AND TRIGGERS
-- ============================================================================

-- Update resolved timestamp when active learning request is resolved
CREATE OR REPLACE FUNCTION set_learning_request_resolved_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.resolved = true AND OLD.resolved = false THEN
    NEW.resolved_at = NOW();
    NEW.resolved_by = auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_learning_request_resolved ON active_learning_requests;
CREATE TRIGGER trigger_learning_request_resolved
  BEFORE UPDATE ON active_learning_requests
  FOR EACH ROW
  EXECUTE FUNCTION set_learning_request_resolved_at();

-- Update pattern last_seen_at when pattern is matched again
CREATE OR REPLACE FUNCTION update_pattern_last_seen()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_seen_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_pattern_last_seen ON learning_patterns;
CREATE TRIGGER trigger_pattern_last_seen
  BEFORE UPDATE ON learning_patterns
  FOR EACH ROW
  WHEN (NEW.occurrences > OLD.occurrences)
  EXECUTE FUNCTION update_pattern_last_seen();

-- Update anomaly reviewed timestamp
CREATE OR REPLACE FUNCTION set_anomaly_reviewed_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.reviewed = true AND OLD.reviewed = false THEN
    NEW.reviewed_at = NOW();
    NEW.reviewed_by = auth.uid();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_anomaly_reviewed ON anomaly_detections;
CREATE TRIGGER trigger_anomaly_reviewed
  BEFORE UPDATE ON anomaly_detections
  FOR EACH ROW
  EXECUTE FUNCTION set_anomaly_reviewed_at();

-- ============================================================================
-- VIEWS FOR ANALYTICS
-- ============================================================================

-- Pending active learning summary
CREATE OR REPLACE VIEW pending_learning_requests AS
SELECT
  COUNT(*) as total_pending,
  AVG(confidence) as avg_confidence,
  MIN(confidence) as min_confidence,
  COUNT(*) FILTER (WHERE confidence < 50) as very_low_confidence,
  COUNT(*) FILTER (WHERE confidence >= 50 AND confidence < 70) as low_confidence,
  array_agg(DISTINCT field_name) as fields_needing_help
FROM active_learning_requests
WHERE resolved = false;

-- Pattern effectiveness summary
CREATE OR REPLACE VIEW pattern_effectiveness AS
SELECT
  pattern_type,
  field_name,
  COUNT(*) as pattern_count,
  AVG(confidence) as avg_confidence,
  MAX(occurrences) as max_occurrences,
  MAX(last_seen_at) as most_recent
FROM learning_patterns
WHERE is_active = true
GROUP BY pattern_type, field_name
ORDER BY max_occurrences DESC;

-- Unreviewed anomalies summary
CREATE OR REPLACE VIEW unreviewed_anomalies AS
SELECT
  COUNT(*) as total_anomalies,
  COUNT(*) FILTER (WHERE severity = 'critical') as critical_count,
  COUNT(*) FILTER (WHERE severity = 'high') as high_count,
  COUNT(*) FILTER (WHERE severity = 'medium') as medium_count,
  AVG(anomaly_score) as avg_anomaly_score,
  MAX(detected_at) as most_recent
FROM anomaly_detections
WHERE reviewed = false;

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

GRANT SELECT ON pending_learning_requests TO authenticated;
GRANT SELECT ON pattern_effectiveness TO authenticated;
GRANT SELECT ON unreviewed_anomalies TO authenticated;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE active_learning_requests IS 'AI requests human help for uncertain field extractions';
COMMENT ON TABLE learning_patterns IS 'Detected correction patterns that AI can auto-apply';
COMMENT ON TABLE predicted_corrections IS 'AI-suggested corrections based on learned patterns';
COMMENT ON TABLE anomaly_detections IS 'Suspicious invoices flagged for review';
COMMENT ON TABLE validation_results IS 'Validation findings for each invoice';

COMMENT ON COLUMN active_learning_requests.confidence IS 'AI confidence in the extraction (0-100)';
COMMENT ON COLUMN learning_patterns.occurrences IS 'How many times this pattern has been observed';
COMMENT ON COLUMN anomaly_detections.anomaly_score IS 'Suspiciousness score (0-100, higher = more suspicious)';
