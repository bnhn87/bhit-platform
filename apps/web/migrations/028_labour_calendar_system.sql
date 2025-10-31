-- Labour Calendar System Schema
-- This migration creates the complete schema for labour calendar and scheduling

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Labour Resources Table (Workers, Teams, Equipment)
CREATE TABLE IF NOT EXISTS labour_resources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  resource_type VARCHAR(20) NOT NULL CHECK (resource_type IN ('worker', 'team', 'equipment')),
  name VARCHAR(200) NOT NULL,
  employee_id VARCHAR(50),
  role VARCHAR(100),
  skills TEXT[], -- Array of skills/certifications
  hourly_rate DECIMAL(8,2),
  daily_rate DECIMAL(8,2),
  availability_status VARCHAR(20) DEFAULT 'available' CHECK (availability_status IN (
    'available', 'busy', 'off_duty', 'holiday', 'sick', 'unavailable'
  )),
  team_id UUID REFERENCES labour_resources(id), -- For workers belonging to teams
  contact_email VARCHAR(255),
  contact_phone VARCHAR(50),
  notes TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Labour Shifts Table
CREATE TABLE IF NOT EXISTS labour_shifts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  resource_id UUID NOT NULL REFERENCES labour_resources(id) ON DELETE CASCADE,
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  shift_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  break_duration INTEGER DEFAULT 0, -- Minutes
  shift_type VARCHAR(20) DEFAULT 'regular' CHECK (shift_type IN (
    'regular', 'overtime', 'night', 'weekend', 'holiday'
  )),
  status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN (
    'scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'no_show'
  )),
  actual_start_time TIME,
  actual_end_time TIME,
  hours_worked DECIMAL(5,2),
  overtime_hours DECIMAL(5,2) DEFAULT 0,
  rate_per_hour DECIMAL(8,2),
  total_cost DECIMAL(10,2),
  notes TEXT,
  weather_impact TEXT,
  productivity_score INTEGER CHECK (productivity_score >= 1 AND productivity_score <= 10),
  created_by UUID REFERENCES users(id),
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Labour Assignments Table (Tasks assigned to resources)
CREATE TABLE IF NOT EXISTS labour_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shift_id UUID NOT NULL REFERENCES labour_shifts(id) ON DELETE CASCADE,
  task_name VARCHAR(200) NOT NULL,
  task_description TEXT,
  estimated_hours DECIMAL(5,2),
  actual_hours DECIMAL(5,2),
  completion_percentage DECIMAL(5,2) DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
  priority INTEGER DEFAULT 1 CHECK (priority >= 1 AND priority <= 5),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN (
    'pending', 'in_progress', 'completed', 'cancelled', 'blocked'
  )),
  skills_required TEXT[],
  tools_required TEXT[],
  safety_requirements TEXT[],
  quality_standards TEXT,
  completion_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Time Tracking Table
CREATE TABLE IF NOT EXISTS labour_time_tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shift_id UUID NOT NULL REFERENCES labour_shifts(id) ON DELETE CASCADE,
  assignment_id UUID REFERENCES labour_assignments(id) ON DELETE SET NULL,
  clock_in_time TIMESTAMP WITH TIME ZONE NOT NULL,
  clock_out_time TIMESTAMP WITH TIME ZONE,
  break_start_time TIMESTAMP WITH TIME ZONE,
  break_end_time TIMESTAMP WITH TIME ZONE,
  location_lat DECIMAL(10,8),
  location_lng DECIMAL(11,8),
  location_accuracy DECIMAL(8,2),
  photo_verification_url TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Labour Calendar Events Table
CREATE TABLE IF NOT EXISTS labour_calendar_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  event_type VARCHAR(30) NOT NULL CHECK (event_type IN (
    'shift', 'meeting', 'training', 'holiday', 'maintenance', 'inspection', 'delivery'
  )),
  title VARCHAR(200) NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  all_day BOOLEAN DEFAULT false,
  location VARCHAR(200),
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  resource_ids UUID[], -- Array of resource IDs involved
  recurrence_rule TEXT, -- RRULE for recurring events
  color VARCHAR(7) DEFAULT '#3b82f6',
  priority INTEGER DEFAULT 1 CHECK (priority >= 1 AND priority <= 5),
  status VARCHAR(20) DEFAULT 'scheduled' CHECK (status IN (
    'scheduled', 'confirmed', 'in_progress', 'completed', 'cancelled', 'postponed'
  )),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Labour Availability Table
CREATE TABLE IF NOT EXISTS labour_availability (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  resource_id UUID NOT NULL REFERENCES labour_resources(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  available_from TIME,
  available_to TIME,
  availability_type VARCHAR(20) NOT NULL CHECK (availability_type IN (
    'available', 'holiday', 'sick_leave', 'personal_leave', 'training', 'unavailable'
  )),
  notes TEXT,
  recurring BOOLEAN DEFAULT false,
  recurrence_pattern VARCHAR(20) CHECK (recurrence_pattern IN (
    'daily', 'weekly', 'monthly', 'yearly'
  )),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(resource_id, date)
);

-- Labour Budget Tracking Table
CREATE TABLE IF NOT EXISTS labour_budget_tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  budgeted_hours DECIMAL(8,2) NOT NULL,
  budgeted_cost DECIMAL(12,2) NOT NULL,
  actual_hours DECIMAL(8,2) DEFAULT 0,
  actual_cost DECIMAL(12,2) DEFAULT 0,
  overtime_hours DECIMAL(8,2) DEFAULT 0,
  overtime_cost DECIMAL(12,2) DEFAULT 0,
  variance_hours DECIMAL(8,2) GENERATED ALWAYS AS (actual_hours - budgeted_hours) STORED,
  variance_cost DECIMAL(12,2) GENERATED ALWAYS AS (actual_cost - budgeted_cost) STORED,
  variance_percentage DECIMAL(5,2) GENERATED ALWAYS AS (
    CASE
      WHEN budgeted_cost > 0 THEN ((actual_cost - budgeted_cost) / budgeted_cost) * 100
      ELSE 0
    END
  ) STORED,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_labour_resources_account_id ON labour_resources(account_id);
CREATE INDEX IF NOT EXISTS idx_labour_resources_type ON labour_resources(resource_type);
CREATE INDEX IF NOT EXISTS idx_labour_resources_status ON labour_resources(availability_status);

CREATE INDEX IF NOT EXISTS idx_labour_shifts_resource_id ON labour_shifts(resource_id);
CREATE INDEX IF NOT EXISTS idx_labour_shifts_job_id ON labour_shifts(job_id);
CREATE INDEX IF NOT EXISTS idx_labour_shifts_date ON labour_shifts(shift_date);
CREATE INDEX IF NOT EXISTS idx_labour_shifts_status ON labour_shifts(status);

CREATE INDEX IF NOT EXISTS idx_labour_assignments_shift_id ON labour_assignments(shift_id);
CREATE INDEX IF NOT EXISTS idx_labour_assignments_status ON labour_assignments(status);

CREATE INDEX IF NOT EXISTS idx_time_tracking_shift_id ON labour_time_tracking(shift_id);
CREATE INDEX IF NOT EXISTS idx_time_tracking_clock_in ON labour_time_tracking(clock_in_time);

CREATE INDEX IF NOT EXISTS idx_calendar_events_account_id ON labour_calendar_events(account_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_dates ON labour_calendar_events(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_calendar_events_type ON labour_calendar_events(event_type);

CREATE INDEX IF NOT EXISTS idx_availability_resource_id ON labour_availability(resource_id);
CREATE INDEX IF NOT EXISTS idx_availability_date ON labour_availability(date);

CREATE INDEX IF NOT EXISTS idx_budget_tracking_job_id ON labour_budget_tracking(job_id);
CREATE INDEX IF NOT EXISTS idx_budget_tracking_period ON labour_budget_tracking(period_start, period_end);

-- Create views for dashboard queries
CREATE OR REPLACE VIEW labour_calendar_summary AS
SELECT
  lr.id as resource_id,
  lr.name as resource_name,
  lr.resource_type,
  lr.role,
  lr.availability_status,

  -- Current week shifts
  (SELECT COUNT(*)
   FROM labour_shifts ls
   WHERE ls.resource_id = lr.id
     AND ls.shift_date >= date_trunc('week', CURRENT_DATE)
     AND ls.shift_date < date_trunc('week', CURRENT_DATE) + interval '7 days'
     AND ls.status NOT IN ('cancelled')
  ) as shifts_this_week,

  -- Hours this week
  COALESCE(
    (SELECT SUM(
       EXTRACT(EPOCH FROM (ls.end_time - ls.start_time)) / 3600 -
       COALESCE(ls.break_duration, 0) / 60.0
     )
     FROM labour_shifts ls
     WHERE ls.resource_id = lr.id
       AND ls.shift_date >= date_trunc('week', CURRENT_DATE)
       AND ls.shift_date < date_trunc('week', CURRENT_DATE) + interval '7 days'
       AND ls.status NOT IN ('cancelled')
    ), 0
  ) as hours_this_week,

  -- Next shift
  (SELECT ls.shift_date
   FROM labour_shifts ls
   WHERE ls.resource_id = lr.id
     AND ls.shift_date >= CURRENT_DATE
     AND ls.status = 'scheduled'
   ORDER BY ls.shift_date, ls.start_time
   LIMIT 1
  ) as next_shift_date,

  -- Utilization rate (this month)
  CASE
    WHEN lr.resource_type = 'worker' THEN
      COALESCE(
        (SELECT (SUM(
           EXTRACT(EPOCH FROM (ls.end_time - ls.start_time)) / 3600 -
           COALESCE(ls.break_duration, 0) / 60.0
         ) / (22 * 8)) * 100 -- Assuming 22 working days, 8 hours per day
         FROM labour_shifts ls
         WHERE ls.resource_id = lr.id
           AND ls.shift_date >= date_trunc('month', CURRENT_DATE)
           AND ls.shift_date < date_trunc('month', CURRENT_DATE) + interval '1 month'
           AND ls.status NOT IN ('cancelled')
        ), 0
      )
    ELSE 0
  END as utilization_percentage

FROM labour_resources lr
WHERE lr.active = true;

-- Row Level Security (RLS) Policies
ALTER TABLE labour_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE labour_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE labour_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE labour_time_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE labour_calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE labour_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE labour_budget_tracking ENABLE ROW LEVEL SECURITY;

-- RLS Policies for labour_resources
CREATE POLICY "Users can view resources for their account"
  ON labour_resources FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
        AND u.account_id = labour_resources.account_id
    )
  );

CREATE POLICY "Users can manage resources for their account"
  ON labour_resources FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
        AND u.account_id = labour_resources.account_id
    )
  );

-- Similar RLS policies for other tables
CREATE POLICY "Users can view shifts for their account resources"
  ON labour_shifts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM labour_resources lr
      INNER JOIN users u ON u.account_id = lr.account_id
      WHERE lr.id = labour_shifts.resource_id
        AND u.id = auth.uid()
    )
  );

CREATE POLICY "Users can manage shifts for their account resources"
  ON labour_shifts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM labour_resources lr
      INNER JOIN users u ON u.account_id = lr.account_id
      WHERE lr.id = labour_shifts.resource_id
        AND u.id = auth.uid()
    )
  );

CREATE POLICY "Users can view assignments for their account shifts"
  ON labour_assignments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM labour_shifts ls
      INNER JOIN labour_resources lr ON lr.id = ls.resource_id
      INNER JOIN users u ON u.account_id = lr.account_id
      WHERE ls.id = labour_assignments.shift_id
        AND u.id = auth.uid()
    )
  );

CREATE POLICY "Users can manage assignments for their account shifts"
  ON labour_assignments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM labour_shifts ls
      INNER JOIN labour_resources lr ON lr.id = ls.resource_id
      INNER JOIN users u ON u.account_id = lr.account_id
      WHERE ls.id = labour_assignments.shift_id
        AND u.id = auth.uid()
    )
  );

CREATE POLICY "Users can view time tracking for their account shifts"
  ON labour_time_tracking FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM labour_shifts ls
      INNER JOIN labour_resources lr ON lr.id = ls.resource_id
      INNER JOIN users u ON u.account_id = lr.account_id
      WHERE ls.id = labour_time_tracking.shift_id
        AND u.id = auth.uid()
    )
  );

CREATE POLICY "Users can manage time tracking for their account shifts"
  ON labour_time_tracking FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM labour_shifts ls
      INNER JOIN labour_resources lr ON lr.id = ls.resource_id
      INNER JOIN users u ON u.account_id = lr.account_id
      WHERE ls.id = labour_time_tracking.shift_id
        AND u.id = auth.uid()
    )
  );

CREATE POLICY "Users can view calendar events for their account"
  ON labour_calendar_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
        AND u.account_id = labour_calendar_events.account_id
    )
  );

CREATE POLICY "Users can manage calendar events for their account"
  ON labour_calendar_events FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
        AND u.account_id = labour_calendar_events.account_id
    )
  );

CREATE POLICY "Users can view availability for their account resources"
  ON labour_availability FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM labour_resources lr
      INNER JOIN users u ON u.account_id = lr.account_id
      WHERE lr.id = labour_availability.resource_id
        AND u.id = auth.uid()
    )
  );

CREATE POLICY "Users can manage availability for their account resources"
  ON labour_availability FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM labour_resources lr
      INNER JOIN users u ON u.account_id = lr.account_id
      WHERE lr.id = labour_availability.resource_id
        AND u.id = auth.uid()
    )
  );

CREATE POLICY "Users can view budget tracking for their account jobs"
  ON labour_budget_tracking FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM jobs j
      INNER JOIN users u ON u.account_id = j.account_id
      WHERE j.id = labour_budget_tracking.job_id
        AND u.id = auth.uid()
    )
  );

CREATE POLICY "Users can manage budget tracking for their account jobs"
  ON labour_budget_tracking FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM jobs j
      INNER JOIN users u ON u.account_id = j.account_id
      WHERE j.id = labour_budget_tracking.job_id
        AND u.id = auth.uid()
    )
  );

-- Grant access to the view
GRANT SELECT ON labour_calendar_summary TO authenticated;

-- Create trigger functions for updated_at timestamps
CREATE TRIGGER update_labour_resources_updated_at
  BEFORE UPDATE ON labour_resources
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_labour_shifts_updated_at
  BEFORE UPDATE ON labour_shifts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_labour_assignments_updated_at
  BEFORE UPDATE ON labour_assignments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_labour_calendar_events_updated_at
  BEFORE UPDATE ON labour_calendar_events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_labour_availability_updated_at
  BEFORE UPDATE ON labour_availability
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_labour_budget_tracking_updated_at
  BEFORE UPDATE ON labour_budget_tracking
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();