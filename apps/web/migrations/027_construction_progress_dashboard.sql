-- Construction Progress Dashboard Schema
-- This migration creates the complete schema for construction progress tracking

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Construction Progress Metrics Table
CREATE TABLE IF NOT EXISTS construction_progress_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  metric_type VARCHAR(50) NOT NULL CHECK (metric_type IN (
    'completion_percentage',
    'quality_score',
    'safety_incidents',
    'budget_variance',
    'schedule_variance',
    'labor_efficiency',
    'material_waste',
    'client_satisfaction'
  )),
  metric_value DECIMAL(10,2) NOT NULL,
  target_value DECIMAL(10,2),
  unit VARCHAR(20) DEFAULT '%',
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  recorded_by UUID REFERENCES users(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Construction Milestones Table
CREATE TABLE IF NOT EXISTS construction_milestones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  milestone_name VARCHAR(200) NOT NULL,
  description TEXT,
  planned_start_date DATE,
  planned_end_date DATE,
  actual_start_date DATE,
  actual_end_date DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'in_progress', 'completed', 'delayed', 'cancelled'
  )),
  completion_percentage DECIMAL(5,2) DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
  budget_allocated DECIMAL(12,2),
  budget_spent DECIMAL(12,2) DEFAULT 0,
  priority INTEGER DEFAULT 1 CHECK (priority >= 1 AND priority <= 5),
  dependencies TEXT[], -- Array of milestone IDs this depends on
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Daily Progress Reports Table
CREATE TABLE IF NOT EXISTS daily_progress_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  report_date DATE NOT NULL,
  weather_conditions VARCHAR(100),
  crew_size INTEGER,
  hours_worked DECIMAL(5,2),
  work_completed TEXT NOT NULL,
  issues_encountered TEXT,
  materials_used TEXT,
  equipment_status TEXT,
  safety_notes TEXT,
  quality_notes TEXT,
  next_day_plan TEXT,
  photos_uploaded TEXT[], -- Array of photo URLs/paths
  reported_by UUID REFERENCES users(id),
  approved_by UUID REFERENCES users(id),
  approval_status VARCHAR(20) DEFAULT 'pending' CHECK (approval_status IN (
    'pending', 'approved', 'rejected'
  )),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(job_id, report_date)
);

-- Progress Photos Table
CREATE TABLE IF NOT EXISTS progress_photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  daily_report_id UUID REFERENCES daily_progress_reports(id) ON DELETE SET NULL,
  milestone_id UUID REFERENCES construction_milestones(id) ON DELETE SET NULL,
  photo_url TEXT NOT NULL,
  caption TEXT,
  location_description TEXT,
  photo_type VARCHAR(50) DEFAULT 'progress' CHECK (photo_type IN (
    'progress', 'issue', 'safety', 'quality', 'completion', 'before', 'after'
  )),
  gps_coordinates POINT,
  taken_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  uploaded_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Construction Alerts Table
CREATE TABLE IF NOT EXISTS construction_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  alert_type VARCHAR(50) NOT NULL CHECK (alert_type IN (
    'schedule_delay', 'budget_overrun', 'safety_incident', 'quality_issue',
    'weather_delay', 'material_shortage', 'equipment_failure', 'milestone_at_risk'
  )),
  severity VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (severity IN (
    'low', 'medium', 'high', 'critical'
  )),
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  action_required TEXT,
  assigned_to UUID REFERENCES users(id),
  status VARCHAR(20) DEFAULT 'open' CHECK (status IN (
    'open', 'in_progress', 'resolved', 'dismissed'
  )),
  due_date DATE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolution_notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Weather Impact Log Table
CREATE TABLE IF NOT EXISTS weather_impact_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  weather_condition VARCHAR(100) NOT NULL,
  temperature_high DECIMAL(5,2),
  temperature_low DECIMAL(5,2),
  precipitation DECIMAL(5,2),
  wind_speed DECIMAL(5,2),
  impact_level VARCHAR(20) NOT NULL CHECK (impact_level IN (
    'none', 'minimal', 'moderate', 'significant', 'severe'
  )),
  work_affected TEXT,
  hours_lost DECIMAL(5,2) DEFAULT 0,
  cost_impact DECIMAL(10,2) DEFAULT 0,
  mitigation_actions TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_progress_metrics_job_id ON construction_progress_metrics(job_id);
CREATE INDEX IF NOT EXISTS idx_progress_metrics_type ON construction_progress_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_progress_metrics_recorded_at ON construction_progress_metrics(recorded_at);

CREATE INDEX IF NOT EXISTS idx_milestones_job_id ON construction_milestones(job_id);
CREATE INDEX IF NOT EXISTS idx_milestones_status ON construction_milestones(status);
CREATE INDEX IF NOT EXISTS idx_milestones_dates ON construction_milestones(planned_start_date, planned_end_date);

CREATE INDEX IF NOT EXISTS idx_daily_reports_job_id ON daily_progress_reports(job_id);
CREATE INDEX IF NOT EXISTS idx_daily_reports_date ON daily_progress_reports(report_date);
CREATE INDEX IF NOT EXISTS idx_daily_reports_status ON daily_progress_reports(approval_status);

CREATE INDEX IF NOT EXISTS idx_progress_photos_job_id ON progress_photos(job_id);
CREATE INDEX IF NOT EXISTS idx_progress_photos_type ON progress_photos(photo_type);
CREATE INDEX IF NOT EXISTS idx_progress_photos_taken_at ON progress_photos(taken_at);

CREATE INDEX IF NOT EXISTS idx_alerts_job_id ON construction_alerts(job_id);
CREATE INDEX IF NOT EXISTS idx_alerts_status ON construction_alerts(status);
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON construction_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON construction_alerts(created_at);

CREATE INDEX IF NOT EXISTS idx_weather_log_job_id ON weather_impact_log(job_id);
CREATE INDEX IF NOT EXISTS idx_weather_log_date ON weather_impact_log(date);

-- Create views for dashboard queries
CREATE OR REPLACE VIEW construction_dashboard_summary AS
SELECT
  j.id as job_id,
  j.reference,
  j.location,
  j.client_name,
  j.status as job_status,
  j.start_date,
  j.end_date,
  j.quoted_amount,

  -- Progress metrics
  COALESCE(
    (SELECT metric_value
     FROM construction_progress_metrics
     WHERE job_id = j.id AND metric_type = 'completion_percentage'
     ORDER BY recorded_at DESC LIMIT 1), 0
  ) as completion_percentage,

  COALESCE(
    (SELECT metric_value
     FROM construction_progress_metrics
     WHERE job_id = j.id AND metric_type = 'quality_score'
     ORDER BY recorded_at DESC LIMIT 1), 0
  ) as quality_score,

  -- Milestone summary
  (SELECT COUNT(*) FROM construction_milestones WHERE job_id = j.id) as total_milestones,
  (SELECT COUNT(*) FROM construction_milestones WHERE job_id = j.id AND status = 'completed') as completed_milestones,
  (SELECT COUNT(*) FROM construction_milestones WHERE job_id = j.id AND status = 'delayed') as delayed_milestones,

  -- Budget tracking
  COALESCE(
    (SELECT SUM(budget_spent) FROM construction_milestones WHERE job_id = j.id), 0
  ) as total_spent,

  -- Alert counts
  (SELECT COUNT(*) FROM construction_alerts
   WHERE job_id = j.id AND status IN ('open', 'in_progress')) as active_alerts,
  (SELECT COUNT(*) FROM construction_alerts
   WHERE job_id = j.id AND status IN ('open', 'in_progress') AND severity IN ('high', 'critical')) as critical_alerts,

  -- Latest report
  (SELECT report_date FROM daily_progress_reports
   WHERE job_id = j.id ORDER BY report_date DESC LIMIT 1) as last_report_date,

  -- Schedule variance
  CASE
    WHEN j.end_date IS NOT NULL AND j.end_date < CURRENT_DATE
      AND COALESCE(
        (SELECT metric_value
         FROM construction_progress_metrics
         WHERE job_id = j.id AND metric_type = 'completion_percentage'
         ORDER BY recorded_at DESC LIMIT 1), 0
      ) < 100
    THEN 'overdue'
    WHEN j.end_date IS NOT NULL AND j.end_date - CURRENT_DATE <= 7
      AND COALESCE(
        (SELECT metric_value
         FROM construction_progress_metrics
         WHERE job_id = j.id AND metric_type = 'completion_percentage'
         ORDER BY recorded_at DESC LIMIT 1), 0
      ) < 90
    THEN 'at_risk'
    ELSE 'on_track'
  END as schedule_status

FROM jobs j
WHERE j.status IN ('in_progress', 'active', 'started')
  AND j.deleted_at IS NULL;

-- Row Level Security (RLS) Policies
ALTER TABLE construction_progress_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE construction_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_progress_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE construction_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE weather_impact_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies for construction_progress_metrics
CREATE POLICY "Users can view metrics for their account jobs"
  ON construction_progress_metrics FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM jobs j
      INNER JOIN users u ON u.account_id = j.account_id
      WHERE j.id = construction_progress_metrics.job_id
        AND u.id = auth.uid()
    )
  );

CREATE POLICY "Users can insert metrics for their account jobs"
  ON construction_progress_metrics FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM jobs j
      INNER JOIN users u ON u.account_id = j.account_id
      WHERE j.id = construction_progress_metrics.job_id
        AND u.id = auth.uid()
    )
  );

CREATE POLICY "Users can update metrics for their account jobs"
  ON construction_progress_metrics FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM jobs j
      INNER JOIN users u ON u.account_id = j.account_id
      WHERE j.id = construction_progress_metrics.job_id
        AND u.id = auth.uid()
    )
  );

-- Similar RLS policies for other tables
CREATE POLICY "Users can view milestones for their account jobs"
  ON construction_milestones FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM jobs j
      INNER JOIN users u ON u.account_id = j.account_id
      WHERE j.id = construction_milestones.job_id
        AND u.id = auth.uid()
    )
  );

CREATE POLICY "Users can manage milestones for their account jobs"
  ON construction_milestones FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM jobs j
      INNER JOIN users u ON u.account_id = j.account_id
      WHERE j.id = construction_milestones.job_id
        AND u.id = auth.uid()
    )
  );

CREATE POLICY "Users can view daily reports for their account jobs"
  ON daily_progress_reports FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM jobs j
      INNER JOIN users u ON u.account_id = j.account_id
      WHERE j.id = daily_progress_reports.job_id
        AND u.id = auth.uid()
    )
  );

CREATE POLICY "Users can manage daily reports for their account jobs"
  ON daily_progress_reports FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM jobs j
      INNER JOIN users u ON u.account_id = j.account_id
      WHERE j.id = daily_progress_reports.job_id
        AND u.id = auth.uid()
    )
  );

CREATE POLICY "Users can view photos for their account jobs"
  ON progress_photos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM jobs j
      INNER JOIN users u ON u.account_id = j.account_id
      WHERE j.id = progress_photos.job_id
        AND u.id = auth.uid()
    )
  );

CREATE POLICY "Users can manage photos for their account jobs"
  ON progress_photos FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM jobs j
      INNER JOIN users u ON u.account_id = j.account_id
      WHERE j.id = progress_photos.job_id
        AND u.id = auth.uid()
    )
  );

CREATE POLICY "Users can view alerts for their account jobs"
  ON construction_alerts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM jobs j
      INNER JOIN users u ON u.account_id = j.account_id
      WHERE j.id = construction_alerts.job_id
        AND u.id = auth.uid()
    )
  );

CREATE POLICY "Users can manage alerts for their account jobs"
  ON construction_alerts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM jobs j
      INNER JOIN users u ON u.account_id = j.account_id
      WHERE j.id = construction_alerts.job_id
        AND u.id = auth.uid()
    )
  );

CREATE POLICY "Users can view weather log for their account jobs"
  ON weather_impact_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM jobs j
      INNER JOIN users u ON u.account_id = j.account_id
      WHERE j.id = weather_impact_log.job_id
        AND u.id = auth.uid()
    )
  );

CREATE POLICY "Users can manage weather log for their account jobs"
  ON weather_impact_log FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM jobs j
      INNER JOIN users u ON u.account_id = j.account_id
      WHERE j.id = weather_impact_log.job_id
        AND u.id = auth.uid()
    )
  );

-- Grant access to the view
GRANT SELECT ON construction_dashboard_summary TO authenticated;

-- Create trigger functions for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_construction_progress_metrics_updated_at
  BEFORE UPDATE ON construction_progress_metrics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_construction_milestones_updated_at
  BEFORE UPDATE ON construction_milestones
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_daily_progress_reports_updated_at
  BEFORE UPDATE ON daily_progress_reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_construction_alerts_updated_at
  BEFORE UPDATE ON construction_alerts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();