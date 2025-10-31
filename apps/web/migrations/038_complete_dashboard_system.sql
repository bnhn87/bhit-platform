-- ==========================================
-- MIGRATION 038: COMPLETE DASHBOARD SYSTEM
-- Production-ready dashboard with automated metrics
-- Handles both new and existing tables gracefully
-- ==========================================

BEGIN;

-- ==========================================
-- PART 1: CREATE TABLES (WITHOUT deleted_at)
-- ==========================================

-- Profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  role TEXT DEFAULT 'user',
  phone TEXT,
  department TEXT,
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Jobs table
CREATE TABLE IF NOT EXISTS public.jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  client_name TEXT NOT NULL,
  client_email TEXT,
  client_phone TEXT,
  address TEXT,
  postcode TEXT,
  status TEXT DEFAULT 'pending',
  job_type TEXT,
  priority TEXT DEFAULT 'normal',
  scheduled_date DATE,
  scheduled_time TIME,
  estimated_duration_minutes INTEGER DEFAULT 120,
  actual_duration_minutes INTEGER,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  total_cost DECIMAL(12,2) DEFAULT 0,
  labour_cost DECIMAL(12,2) DEFAULT 0,
  materials_cost DECIMAL(12,2) DEFAULT 0,
  assigned_to UUID,
  created_by UUID,
  notes TEXT,
  requirements TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Quotes table
CREATE TABLE IF NOT EXISTS public.quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference TEXT UNIQUE NOT NULL,
  client_name TEXT NOT NULL,
  contact_email TEXT,
  contact_phone TEXT,
  address TEXT,
  description TEXT,
  total_amount DECIMAL(12,2) DEFAULT 0,
  labour_cost DECIMAL(12,2) DEFAULT 0,
  materials_cost DECIMAL(12,2) DEFAULT 0,
  status TEXT DEFAULT 'pending',
  quoted_at TIMESTAMPTZ DEFAULT NOW(),
  valid_until TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  job_id UUID,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vehicles table
CREATE TABLE IF NOT EXISTS public.vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  registration TEXT UNIQUE NOT NULL,
  vehicle_type TEXT,
  make TEXT,
  model TEXT,
  year INTEGER,
  in_use BOOLEAN DEFAULT false,
  assigned_to UUID,
  current_job_id UUID,
  mot_due DATE,
  service_due DATE,
  last_service DATE,
  mileage INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Waste loads table
CREATE TABLE IF NOT EXISTS public.waste_loads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID,
  vehicle_id UUID,
  waste_type TEXT,
  estimated_weight_kg DECIMAL(10,2),
  actual_weight_kg DECIMAL(10,2),
  booked_at TIMESTAMPTZ DEFAULT NOW(),
  scheduled_pickup TIMESTAMPTZ,
  pickup_address TEXT,
  status TEXT DEFAULT 'booked',
  collected_at TIMESTAMPTZ,
  estimated_cost DECIMAL(10,2),
  actual_cost DECIMAL(10,2),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activity log table
CREATE TABLE IF NOT EXISTS public.activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  text TEXT NOT NULL,
  activity_type TEXT NOT NULL,
  user_id UUID,
  job_id UUID,
  quote_id UUID,
  metadata JSONB,
  occurred_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Metrics tables
CREATE TABLE IF NOT EXISTS public.crew_usage (
  d DATE PRIMARY KEY,
  total_crews INTEGER DEFAULT 0,
  crews_deployed INTEGER DEFAULT 0,
  utilization INTEGER DEFAULT 0,
  crews_on_installs INTEGER DEFAULT 0,
  crews_on_snagging INTEGER DEFAULT 0,
  crews_on_other INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.buffer_usage (
  d DATE PRIMARY KEY,
  total_buffer_minutes INTEGER DEFAULT 0,
  buffer_used_minutes INTEGER DEFAULT 0,
  percent INTEGER DEFAULT 0,
  jobs_count INTEGER DEFAULT 0,
  avg_buffer_per_job INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.finance_metrics (
  d DATE PRIMARY KEY,
  total_revenue DECIMAL(12,2) DEFAULT 0,
  invoice_revenue DECIMAL(12,2) DEFAULT 0,
  quote_revenue DECIMAL(12,2) DEFAULT 0,
  total_costs DECIMAL(12,2) DEFAULT 0,
  labour_costs DECIMAL(12,2) DEFAULT 0,
  materials_costs DECIMAL(12,2) DEFAULT 0,
  overhead_costs DECIMAL(12,2) DEFAULT 0,
  gross_margin DECIMAL(12,2) DEFAULT 0,
  net_margin DECIMAL(12,2) DEFAULT 0,
  margin_percent DECIMAL(5,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.installs_by_day (
  d DATE PRIMARY KEY,
  installs INTEGER DEFAULT 0,
  crews INTEGER DEFAULT 0,
  residential_installs INTEGER DEFAULT 0,
  commercial_installs INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==========================================
-- PART 2: ADD MISSING COLUMNS
-- ==========================================

-- Add deleted_at to profiles
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'deleted_at') THEN
    ALTER TABLE public.profiles ADD COLUMN deleted_at TIMESTAMPTZ;
  END IF;
END $$;

-- Add deleted_at to jobs
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'jobs' AND column_name = 'deleted_at') THEN
    ALTER TABLE public.jobs ADD COLUMN deleted_at TIMESTAMPTZ;
  END IF;
END $$;

-- Add deleted_at to quotes
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quotes' AND column_name = 'deleted_at') THEN
    ALTER TABLE public.quotes ADD COLUMN deleted_at TIMESTAMPTZ;
  END IF;
END $$;

-- Add deleted_at to vehicles
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicles' AND column_name = 'deleted_at') THEN
    ALTER TABLE public.vehicles ADD COLUMN deleted_at TIMESTAMPTZ;
  END IF;
END $$;

-- Add deleted_at to waste_loads
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'waste_loads' AND column_name = 'deleted_at') THEN
    ALTER TABLE public.waste_loads ADD COLUMN deleted_at TIMESTAMPTZ;
  END IF;
END $$;

-- ==========================================
-- PART 3: ADD CONSTRAINTS
-- ==========================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_role_check') THEN
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check
      CHECK (role IN ('director', 'admin', 'manager', 'installer', 'user'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'jobs_status_check') THEN
    ALTER TABLE public.jobs ADD CONSTRAINT jobs_status_check
      CHECK (status IN ('pending', 'scheduled', 'in_progress', 'completed', 'cancelled', 'on_hold'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'jobs_type_check') THEN
    ALTER TABLE public.jobs ADD CONSTRAINT jobs_type_check
      CHECK (job_type IN ('installation', 'snagging', 'maintenance', 'survey', 'other'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'jobs_priority_check') THEN
    ALTER TABLE public.jobs ADD CONSTRAINT jobs_priority_check
      CHECK (priority IN ('low', 'normal', 'high', 'urgent'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'quotes_status_check') THEN
    ALTER TABLE public.quotes ADD CONSTRAINT quotes_status_check
      CHECK (status IN ('pending', 'approved', 'rejected', 'expired'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'vehicles_type_check') THEN
    ALTER TABLE public.vehicles ADD CONSTRAINT vehicles_type_check
      CHECK (vehicle_type IN ('van', 'truck', 'car'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'waste_loads_type_check') THEN
    ALTER TABLE public.waste_loads ADD CONSTRAINT waste_loads_type_check
      CHECK (waste_type IN ('general', 'electrical', 'hazardous', 'recyclable'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'waste_loads_status_check') THEN
    ALTER TABLE public.waste_loads ADD CONSTRAINT waste_loads_status_check
      CHECK (status IN ('booked', 'collected', 'cancelled'));
  END IF;
END $$;

-- ==========================================
-- PART 4: INDEXES
-- ==========================================

-- Basic indexes (no deleted_at filter)
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_jobs_reference ON public.jobs(reference);
CREATE INDEX IF NOT EXISTS idx_jobs_scheduled_date ON public.jobs(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_jobs_assigned_to ON public.jobs(assigned_to);
CREATE INDEX IF NOT EXISTS idx_quotes_created_at ON public.quotes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_quotes_job_id ON public.quotes(job_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_assigned_to ON public.vehicles(assigned_to);
CREATE INDEX IF NOT EXISTS idx_waste_loads_booked_at ON public.waste_loads(booked_at);
CREATE INDEX IF NOT EXISTS idx_waste_loads_job_id ON public.waste_loads(job_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_occurred_at ON public.activity_log(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_log_type ON public.activity_log(activity_type);
CREATE INDEX IF NOT EXISTS idx_activity_log_job_id ON public.activity_log(job_id);
CREATE INDEX IF NOT EXISTS idx_crew_usage_d ON public.crew_usage(d DESC);
CREATE INDEX IF NOT EXISTS idx_buffer_usage_d ON public.buffer_usage(d DESC);
CREATE INDEX IF NOT EXISTS idx_finance_metrics_d ON public.finance_metrics(d DESC);
CREATE INDEX IF NOT EXISTS idx_installs_by_day_d ON public.installs_by_day(d DESC);

-- Conditional indexes with deleted_at filter
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'deleted_at') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role) WHERE deleted_at IS NULL';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_profiles_active ON public.profiles(is_active) WHERE deleted_at IS NULL';
  ELSE
    CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
    CREATE INDEX IF NOT EXISTS idx_profiles_active ON public.profiles(is_active);
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'jobs' AND column_name = 'deleted_at') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_jobs_status ON public.jobs(status) WHERE deleted_at IS NULL';
  ELSE
    CREATE INDEX IF NOT EXISTS idx_jobs_status ON public.jobs(status);
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quotes' AND column_name = 'deleted_at') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_quotes_status ON public.quotes(status) WHERE deleted_at IS NULL';
  ELSE
    CREATE INDEX IF NOT EXISTS idx_quotes_status ON public.quotes(status);
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicles' AND column_name = 'deleted_at') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_vehicles_in_use ON public.vehicles(in_use) WHERE deleted_at IS NULL';
  ELSE
    CREATE INDEX IF NOT EXISTS idx_vehicles_in_use ON public.vehicles(in_use);
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'waste_loads' AND column_name = 'deleted_at') THEN
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_waste_loads_status ON public.waste_loads(status) WHERE deleted_at IS NULL';
  ELSE
    CREATE INDEX IF NOT EXISTS idx_waste_loads_status ON public.waste_loads(status);
  END IF;
END $$;

-- ==========================================
-- PART 5: TRIGGERS
-- ==========================================

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_jobs_updated_at ON public.jobs;
CREATE TRIGGER update_jobs_updated_at
  BEFORE UPDATE ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_quotes_updated_at ON public.quotes;
CREATE TRIGGER update_quotes_updated_at
  BEFORE UPDATE ON public.quotes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_vehicles_updated_at ON public.vehicles;
CREATE TRIGGER update_vehicles_updated_at
  BEFORE UPDATE ON public.vehicles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_waste_loads_updated_at ON public.waste_loads;
CREATE TRIGGER update_waste_loads_updated_at
  BEFORE UPDATE ON public.waste_loads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Activity logging triggers
CREATE OR REPLACE FUNCTION log_job_activity()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.activity_log (text, activity_type, job_id, user_id, occurred_at)
    VALUES (
      'New job created: ' || COALESCE(NEW.reference, NEW.title),
      'job_created',
      NEW.id,
      NEW.created_by,
      NOW()
    );
  ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.activity_log (text, activity_type, job_id, occurred_at)
    VALUES (
      'Job ' || COALESCE(NEW.reference, NEW.title) || ' status: ' || NEW.status,
      'job_status_change',
      NEW.id,
      NOW()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS log_job_changes ON public.jobs;
CREATE TRIGGER log_job_changes
  AFTER INSERT OR UPDATE ON public.jobs
  FOR EACH ROW EXECUTE FUNCTION log_job_activity();

CREATE OR REPLACE FUNCTION log_quote_activity()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.activity_log (text, activity_type, quote_id, user_id, occurred_at)
    VALUES (
      'Quote created: ' || NEW.reference,
      'quote_created',
      NEW.id,
      NEW.created_by,
      NOW()
    );
  ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.activity_log (text, activity_type, quote_id, occurred_at)
    VALUES (
      'Quote ' || NEW.reference || ' ' || NEW.status,
      'quote_status_change',
      NEW.id,
      NOW()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS log_quote_changes ON public.quotes;
CREATE TRIGGER log_quote_changes
  AFTER INSERT OR UPDATE ON public.quotes
  FOR EACH ROW EXECUTE FUNCTION log_quote_activity();

CREATE OR REPLACE FUNCTION log_vehicle_activity()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.in_use IS DISTINCT FROM NEW.in_use THEN
    INSERT INTO public.activity_log (text, activity_type, occurred_at)
    VALUES (
      'Vehicle ' || NEW.registration ||
      CASE WHEN NEW.in_use THEN ' deployed' ELSE ' returned' END,
      'vehicle_status_change',
      NOW()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS log_vehicle_changes ON public.vehicles;
CREATE TRIGGER log_vehicle_changes
  AFTER UPDATE ON public.vehicles
  FOR EACH ROW EXECUTE FUNCTION log_vehicle_activity();

-- ==========================================
-- PART 6: METRIC CALCULATION FUNCTIONS
-- ==========================================

CREATE OR REPLACE FUNCTION refresh_dashboard_metrics(target_date DATE DEFAULT CURRENT_DATE)
RETURNS void AS $$
DECLARE
  v_total_crews INTEGER;
  v_crews_deployed INTEGER;
  v_crews_installs INTEGER;
  v_crews_snagging INTEGER;
  v_jobs_count INTEGER;
  v_total_buffer INTEGER;
  v_buffer_used INTEGER;
  v_installs INTEGER;
  v_residential INTEGER;
  v_commercial INTEGER;
  v_total_revenue DECIMAL;
  v_labour_costs DECIMAL;
  v_materials_costs DECIMAL;
BEGIN
  -- Crew usage
  SELECT
    COUNT(DISTINCT CASE WHEN role IN ('installer', 'manager') THEN id END),
    COUNT(DISTINCT CASE WHEN j.assigned_to IS NOT NULL THEN j.assigned_to END),
    COUNT(DISTINCT CASE WHEN j.job_type = 'installation' THEN j.assigned_to END),
    COUNT(DISTINCT CASE WHEN j.job_type = 'snagging' THEN j.assigned_to END)
  INTO v_total_crews, v_crews_deployed, v_crews_installs, v_crews_snagging
  FROM public.profiles p
  LEFT JOIN public.jobs j ON j.assigned_to = p.id
    AND j.scheduled_date = target_date
    AND j.status IN ('in_progress', 'completed')
    AND (NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'jobs' AND column_name = 'deleted_at')
         OR j.deleted_at IS NULL);

  INSERT INTO public.crew_usage (d, total_crews, crews_deployed, utilization, crews_on_installs, crews_on_snagging, crews_on_other)
  VALUES (
    target_date,
    COALESCE(v_total_crews, 8),
    COALESCE(v_crews_deployed, 0),
    CASE WHEN v_total_crews > 0 THEN (v_crews_deployed * 100 / v_total_crews) ELSE 0 END,
    COALESCE(v_crews_installs, 0),
    COALESCE(v_crews_snagging, 0),
    GREATEST(COALESCE(v_crews_deployed, 0) - COALESCE(v_crews_installs, 0) - COALESCE(v_crews_snagging, 0), 0)
  )
  ON CONFLICT (d) DO UPDATE SET
    total_crews = EXCLUDED.total_crews,
    crews_deployed = EXCLUDED.crews_deployed,
    utilization = EXCLUDED.utilization,
    crews_on_installs = EXCLUDED.crews_on_installs,
    crews_on_snagging = EXCLUDED.crews_on_snagging,
    crews_on_other = EXCLUDED.crews_on_other,
    updated_at = NOW();

  -- Buffer usage
  SELECT
    COUNT(*),
    SUM(COALESCE(estimated_duration_minutes, 120)) * 1.2,
    SUM(COALESCE(actual_duration_minutes, estimated_duration_minutes, 120))
  INTO v_jobs_count, v_total_buffer, v_buffer_used
  FROM public.jobs
  WHERE scheduled_date = target_date
    AND (NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'jobs' AND column_name = 'deleted_at')
         OR deleted_at IS NULL);

  INSERT INTO public.buffer_usage (d, total_buffer_minutes, buffer_used_minutes, percent, jobs_count, avg_buffer_per_job)
  VALUES (
    target_date,
    COALESCE(v_total_buffer, 0),
    COALESCE(v_buffer_used, 0),
    CASE WHEN v_total_buffer > 0 THEN (v_buffer_used * 100 / v_total_buffer) ELSE 0 END,
    COALESCE(v_jobs_count, 0),
    CASE WHEN v_jobs_count > 0 THEN (v_total_buffer / v_jobs_count) ELSE 0 END
  )
  ON CONFLICT (d) DO UPDATE SET
    total_buffer_minutes = EXCLUDED.total_buffer_minutes,
    buffer_used_minutes = EXCLUDED.buffer_used_minutes,
    percent = EXCLUDED.percent,
    jobs_count = EXCLUDED.jobs_count,
    avg_buffer_per_job = EXCLUDED.avg_buffer_per_job,
    updated_at = NOW();

  -- Finance metrics
  SELECT
    SUM(COALESCE(total_cost, 0)),
    SUM(COALESCE(labour_cost, 0)),
    SUM(COALESCE(materials_cost, 0))
  INTO v_total_revenue, v_labour_costs, v_materials_costs
  FROM public.jobs
  WHERE scheduled_date = target_date
    AND status = 'completed'
    AND (NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'jobs' AND column_name = 'deleted_at')
         OR deleted_at IS NULL);

  INSERT INTO public.finance_metrics (d, total_revenue, labour_costs, materials_costs, gross_margin, margin_percent)
  VALUES (
    target_date,
    COALESCE(v_total_revenue, 0),
    COALESCE(v_labour_costs, 0),
    COALESCE(v_materials_costs, 0),
    COALESCE(v_total_revenue, 0) - COALESCE(v_labour_costs, 0) - COALESCE(v_materials_costs, 0),
    CASE WHEN v_total_revenue > 0
      THEN ((v_total_revenue - v_labour_costs - v_materials_costs) * 100 / v_total_revenue)
      ELSE 0
    END
  )
  ON CONFLICT (d) DO UPDATE SET
    total_revenue = EXCLUDED.total_revenue,
    labour_costs = EXCLUDED.labour_costs,
    materials_costs = EXCLUDED.materials_costs,
    gross_margin = EXCLUDED.gross_margin,
    margin_percent = EXCLUDED.margin_percent,
    updated_at = NOW();

  -- Installs by day
  SELECT
    COUNT(*) FILTER (WHERE job_type = 'installation'),
    COUNT(*) FILTER (WHERE job_type = 'installation' AND (address ILIKE '%residential%' OR client_name ILIKE '%residence%')),
    COUNT(*) FILTER (WHERE job_type = 'installation' AND (address ILIKE '%commercial%' OR address ILIKE '%office%'))
  INTO v_installs, v_residential, v_commercial
  FROM public.jobs
  WHERE scheduled_date = target_date
    AND (NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'jobs' AND column_name = 'deleted_at')
         OR deleted_at IS NULL);

  INSERT INTO public.installs_by_day (d, installs, crews, residential_installs, commercial_installs)
  VALUES (
    target_date,
    COALESCE(v_installs, 0),
    COALESCE(v_crews_installs, 0),
    COALESCE(v_residential, 0),
    COALESCE(v_commercial, 0)
  )
  ON CONFLICT (d) DO UPDATE SET
    installs = EXCLUDED.installs,
    crews = EXCLUDED.crews,
    residential_installs = EXCLUDED.residential_installs,
    commercial_installs = EXCLUDED.commercial_installs,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION refresh_dashboard_metrics_30days()
RETURNS void AS $$
DECLARE
  current_day DATE;
BEGIN
  FOR current_day IN
    SELECT CURRENT_DATE - i
    FROM generate_series(0, 29) i
  LOOP
    PERFORM refresh_dashboard_metrics(current_day);
  END LOOP;
  RAISE NOTICE 'Refreshed metrics for last 30 days';
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- PART 7: VIEWS
-- ==========================================

DROP VIEW IF EXISTS active_quotes CASCADE;
DROP VIEW IF EXISTS available_vehicles CASCADE;
DROP VIEW IF EXISTS todays_jobs CASCADE;
DROP VIEW IF EXISTS todays_waste_loads CASCADE;
DROP VIEW IF EXISTS recent_activity CASCADE;

-- Active quotes
CREATE VIEW active_quotes AS
SELECT q.*, p.full_name as created_by_name
FROM public.quotes q
LEFT JOIN public.profiles p ON p.id = q.created_by
WHERE (NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quotes' AND column_name = 'deleted_at')
       OR q.deleted_at IS NULL)
  AND q.status = 'pending'
  AND (q.valid_until IS NULL OR q.valid_until > NOW());

-- Available vehicles
CREATE VIEW available_vehicles AS
SELECT v.*, p.full_name as assigned_to_name
FROM public.vehicles v
LEFT JOIN public.profiles p ON p.id = v.assigned_to
WHERE (NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicles' AND column_name = 'deleted_at')
       OR v.deleted_at IS NULL)
  AND v.in_use = false;

-- Today's jobs
CREATE VIEW todays_jobs AS
SELECT j.*, p.full_name as assigned_to_name
FROM public.jobs j
LEFT JOIN public.profiles p ON p.id = j.assigned_to
WHERE (NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'jobs' AND column_name = 'deleted_at')
       OR j.deleted_at IS NULL)
  AND j.scheduled_date = CURRENT_DATE
ORDER BY j.scheduled_time;

-- Today's waste loads
CREATE VIEW todays_waste_loads AS
SELECT w.*, j.reference as job_reference, v.registration as vehicle_reg
FROM public.waste_loads w
LEFT JOIN public.jobs j ON j.id = w.job_id
LEFT JOIN public.vehicles v ON v.id = w.vehicle_id
WHERE (NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'waste_loads' AND column_name = 'deleted_at')
       OR w.deleted_at IS NULL)
  AND DATE(w.booked_at) = CURRENT_DATE;

-- Recent activity
CREATE VIEW recent_activity AS
SELECT a.*, p.full_name as user_name, j.reference as job_ref, q.reference as quote_ref
FROM public.activity_log a
LEFT JOIN public.profiles p ON p.id = a.user_id
LEFT JOIN public.jobs j ON j.id = a.job_id
LEFT JOIN public.quotes q ON q.id = a.quote_id
WHERE a.occurred_at > NOW() - INTERVAL '24 hours'
ORDER BY a.occurred_at DESC;

-- ==========================================
-- PART 8: RLS POLICIES
-- ==========================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waste_loads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crew_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buffer_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.installs_by_day ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view profiles" ON public.profiles;
CREATE POLICY "Users can view profiles"
  ON public.profiles FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can view jobs" ON public.jobs;
CREATE POLICY "Users can view jobs"
  ON public.jobs FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can manage jobs" ON public.jobs;
CREATE POLICY "Users can manage jobs"
  ON public.jobs FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view quotes" ON public.quotes;
CREATE POLICY "Users can view quotes"
  ON public.quotes FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can manage quotes" ON public.quotes;
CREATE POLICY "Users can manage quotes"
  ON public.quotes FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view vehicles" ON public.vehicles;
CREATE POLICY "Users can view vehicles"
  ON public.vehicles FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can manage vehicles" ON public.vehicles;
CREATE POLICY "Users can manage vehicles"
  ON public.vehicles FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view waste" ON public.waste_loads;
CREATE POLICY "Users can view waste"
  ON public.waste_loads FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can manage waste" ON public.waste_loads;
CREATE POLICY "Users can manage waste"
  ON public.waste_loads FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Users can view metrics" ON public.crew_usage;
CREATE POLICY "Users can view metrics"
  ON public.crew_usage FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can view buffer" ON public.buffer_usage;
CREATE POLICY "Users can view buffer"
  ON public.buffer_usage FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can view finance" ON public.finance_metrics;
CREATE POLICY "Users can view finance"
  ON public.finance_metrics FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can view installs" ON public.installs_by_day;
CREATE POLICY "Users can view installs"
  ON public.installs_by_day FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can view activity" ON public.activity_log;
CREATE POLICY "Users can view activity"
  ON public.activity_log FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users can create activity" ON public.activity_log;
CREATE POLICY "Users can create activity"
  ON public.activity_log FOR INSERT TO authenticated WITH CHECK (true);

-- ==========================================
-- PART 9: SAMPLE DATA
-- ==========================================

INSERT INTO public.jobs (reference, title, client_name, address, status, job_type, priority, scheduled_date, scheduled_time, estimated_duration_minutes, total_cost, labour_cost, materials_cost)
VALUES
  ('JOB-001', 'Office Carpet', 'Tech Corp', '123 Business Park', 'scheduled', 'installation', 'high', CURRENT_DATE, '09:00', 240, 5500, 2500, 2800),
  ('JOB-002', 'Residential Floor', 'John Smith', '45 Oak Street', 'in_progress', 'installation', 'normal', CURRENT_DATE, '14:00', 180, 3200, 1400, 1600)
ON CONFLICT (reference) DO NOTHING;

INSERT INTO public.vehicles (registration, vehicle_type, make, model, year, in_use, mot_due, service_due, mileage)
VALUES
  ('BH24 ABC', 'van', 'Ford', 'Transit', 2022, true, '2025-06-15', '2025-03-01', 45000),
  ('BH24 DEF', 'van', 'Mercedes', 'Sprinter', 2023, false, '2025-08-20', '2025-04-15', 28000)
ON CONFLICT (registration) DO NOTHING;

INSERT INTO public.quotes (reference, client_name, contact_email, description, total_amount, labour_cost, materials_cost, status, quoted_at, valid_until)
VALUES
  ('Q-001', 'Johnson Properties', 'john@properties.com', 'Office carpet 500 sqm', 8500, 3500, 4200, 'pending', NOW() - INTERVAL '2 days', NOW() + INTERVAL '28 days'),
  ('Q-002', 'Green Valley', 'contact@greenvalley.com', 'Residential flooring', 4200, 1800, 1900, 'approved', NOW() - INTERVAL '5 days', NOW() + INTERVAL '25 days')
ON CONFLICT (reference) DO NOTHING;

INSERT INTO public.waste_loads (waste_type, estimated_weight_kg, booked_at, scheduled_pickup, status, estimated_cost)
VALUES
  ('general', 120.5, NOW(), NOW() + INTERVAL '4 hours', 'booked', 45.00),
  ('electrical', 85.0, NOW(), NOW() + INTERVAL '6 hours', 'booked', 35.00)
ON CONFLICT DO NOTHING;

SELECT refresh_dashboard_metrics_30days();

-- ==========================================
-- PART 10: GRANTS
-- ==========================================

GRANT SELECT ON active_quotes TO authenticated;
GRANT SELECT ON available_vehicles TO authenticated;
GRANT SELECT ON todays_jobs TO authenticated;
GRANT SELECT ON todays_waste_loads TO authenticated;
GRANT SELECT ON recent_activity TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_dashboard_metrics(DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_dashboard_metrics_30days() TO service_role;

NOTIFY pgrst, 'reload schema';

COMMIT;

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '════════════════════════════════════════════';
  RAISE NOTICE '✓ DASHBOARD SYSTEM DEPLOYED SUCCESSFULLY';
  RAISE NOTICE '════════════════════════════════════════════';
  RAISE NOTICE 'Tables: profiles, jobs, quotes, vehicles, waste_loads, activity_log, 4 metrics';
  RAISE NOTICE 'Features: Soft delete, auto-triggers, activity logging, metric calculation';
  RAISE NOTICE 'Views: active_quotes, available_vehicles, todays_jobs, todays_waste_loads, recent_activity';
  RAISE NOTICE 'Sample data: 2 jobs, 2 vehicles, 2 quotes, 2 waste loads, 30 days metrics';
  RAISE NOTICE '';
  RAISE NOTICE 'Run: SELECT refresh_dashboard_metrics(CURRENT_DATE);';
  RAISE NOTICE '════════════════════════════════════════════';
END $$;
