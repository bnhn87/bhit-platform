-- Dashboard Support Tables Migration
-- Safe to run - adds missing tables needed for Master-ops-dash components
-- Does not modify existing tables or data

-- ==========================================
-- DASHBOARD DATA TABLES
-- ==========================================

-- Crew utilization tracking
CREATE TABLE IF NOT EXISTS crew_usage (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    d DATE NOT NULL,
    utilization DECIMAL(5,2) NOT NULL DEFAULT 0,
    total_crews INTEGER DEFAULT 0,
    active_crews INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_crew_usage_date UNIQUE(d)
);

-- Buffer usage tracking
CREATE TABLE IF NOT EXISTS buffer_usage (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    d DATE NOT NULL,
    percent DECIMAL(5,2) NOT NULL DEFAULT 0,
    planned_hours DECIMAL(8,2) DEFAULT 0,
    actual_hours DECIMAL(8,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_buffer_usage_date UNIQUE(d)
);

-- Finance metrics tracking
CREATE TABLE IF NOT EXISTS finance_metrics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    d DATE NOT NULL,
    net_margin DECIMAL(12,2) NOT NULL DEFAULT 0,
    revenue DECIMAL(12,2) DEFAULT 0,
    costs DECIMAL(12,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_finance_metrics_date UNIQUE(d)
);

-- Installs by day tracking
CREATE TABLE IF NOT EXISTS installs_by_day (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    d DATE NOT NULL,
    installs INTEGER NOT NULL DEFAULT 0,
    crews INTEGER NOT NULL DEFAULT 0,
    hours_worked DECIMAL(8,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_installs_by_day_date UNIQUE(d)
);

-- Pipeline heatmap data
CREATE TABLE IF NOT EXISTS pipeline_heatmap (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    row_label VARCHAR(100) NOT NULL,
    col_label VARCHAR(100) NOT NULL,
    value INTEGER NOT NULL DEFAULT 0,
    category VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_pipeline_heatmap_labels UNIQUE(row_label, col_label)
);

-- Activity log for dashboard feed
CREATE TABLE IF NOT EXISTS activity_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    text TEXT NOT NULL,
    occurred_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    actor_id UUID REFERENCES auth.users(id),
    entity_type VARCHAR(50),
    entity_id UUID,
    action VARCHAR(50),
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Vehicles tracking
CREATE TABLE IF NOT EXISTS vehicles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    registration VARCHAR(20) NOT NULL,
    type VARCHAR(50) NOT NULL, -- van, truck, car
    capacity_weight DECIMAL(8,2),
    capacity_volume DECIMAL(8,2),
    in_use BOOLEAN DEFAULT false,
    current_job_id UUID REFERENCES jobs(id),
    driver_id UUID REFERENCES auth.users(id),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Waste loads tracking
CREATE TABLE IF NOT EXISTS waste_loads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    job_id UUID REFERENCES jobs(id),
    booked_at TIMESTAMP WITH TIME ZONE NOT NULL,
    pickup_date DATE,
    pickup_time TIME,
    waste_type VARCHAR(100),
    estimated_volume DECIMAL(8,2),
    cost DECIMAL(10,2),
    status VARCHAR(50) DEFAULT 'booked', -- booked, collected, cancelled
    supplier VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Quotes table (extend existing quote functionality)
CREATE TABLE IF NOT EXISTS quotes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    reference VARCHAR(100) NOT NULL,
    project_id UUID, -- Will link to jobs for now
    job_id UUID REFERENCES jobs(id),
    version INTEGER DEFAULT 1,
    status VARCHAR(50) DEFAULT 'draft', -- draft, sent, approved, rejected
    client_name VARCHAR(200),
    project_name VARCHAR(200),
    prepared_by UUID REFERENCES auth.users(id),
    quote_data JSONB, -- Store SmartQuote calculation results
    total_amount DECIMAL(12,2),
    total_labour_days DECIMAL(8,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sent_at TIMESTAMP WITH TIME ZONE,
    approved_at TIMESTAMP WITH TIME ZONE
);

-- ==========================================
-- INDEXES FOR PERFORMANCE
-- ==========================================

CREATE INDEX IF NOT EXISTS idx_crew_usage_date ON crew_usage(d);
CREATE INDEX IF NOT EXISTS idx_buffer_usage_date ON buffer_usage(d);
CREATE INDEX IF NOT EXISTS idx_finance_metrics_date ON finance_metrics(d);
CREATE INDEX IF NOT EXISTS idx_installs_by_day_date ON installs_by_day(d);
CREATE INDEX IF NOT EXISTS idx_activity_log_occurred_at ON activity_log(occurred_at);
CREATE INDEX IF NOT EXISTS idx_activity_log_entity ON activity_log(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_in_use ON vehicles(in_use);
CREATE INDEX IF NOT EXISTS idx_waste_loads_booked_at ON waste_loads(booked_at);
CREATE INDEX IF NOT EXISTS idx_waste_loads_job_id ON waste_loads(job_id);
CREATE INDEX IF NOT EXISTS idx_quotes_job_id ON quotes(job_id);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(status);

-- ==========================================
-- SEED SAMPLE DATA FOR DASHBOARD
-- ==========================================

-- Insert sample crew usage data for last 30 days
INSERT INTO crew_usage (d, utilization, total_crews, active_crews)
SELECT
    date_trunc('day', generate_series(NOW() - INTERVAL '30 days', NOW(), '1 day')),
    ROUND((RANDOM() * 40 + 60)::numeric, 2), -- 60-100% utilization
    8, -- Total crews
    ROUND((RANDOM() * 3 + 5)::numeric, 0) -- 5-8 active crews
ON CONFLICT (d) DO NOTHING;

-- Insert sample buffer usage data
INSERT INTO buffer_usage (d, percent, planned_hours, actual_hours)
SELECT
    date_trunc('day', generate_series(NOW() - INTERVAL '30 days', NOW(), '1 day')),
    ROUND((RANDOM() * 30 + 5)::numeric, 2), -- 5-35% buffer usage
    ROUND((RANDOM() * 20 + 40)::numeric, 2), -- 40-60 planned hours
    ROUND((RANDOM() * 25 + 35)::numeric, 2) -- 35-60 actual hours
ON CONFLICT (d) DO NOTHING;

-- Insert sample finance metrics
INSERT INTO finance_metrics (d, net_margin, revenue, costs)
SELECT
    date_trunc('day', generate_series(NOW() - INTERVAL '30 days', NOW(), '1 day')),
    ROUND((RANDOM() * 10000 + 15000)::numeric, 2), -- £15k-£25k margin
    ROUND((RANDOM() * 20000 + 50000)::numeric, 2), -- £50k-£70k revenue
    ROUND((RANDOM() * 15000 + 30000)::numeric, 2) -- £30k-£45k costs
ON CONFLICT (d) DO NOTHING;

-- Insert sample installs data
INSERT INTO installs_by_day (d, installs, crews, hours_worked)
SELECT
    date_trunc('day', generate_series(NOW() - INTERVAL '30 days', NOW(), '1 day')),
    ROUND((RANDOM() * 50 + 20)::numeric, 0), -- 20-70 installs
    ROUND((RANDOM() * 4 + 4)::numeric, 0), -- 4-8 crews
    ROUND((RANDOM() * 20 + 30)::numeric, 2) -- 30-50 hours
ON CONFLICT (d) DO NOTHING;

-- Insert sample pipeline heatmap data
INSERT INTO pipeline_heatmap (row_label, col_label, value) VALUES
('Floor 1', 'Workstations', 45),
('Floor 1', 'Meeting Rooms', 12),
('Floor 1', 'Storage', 8),
('Floor 2', 'Workstations', 38),
('Floor 2', 'Meeting Rooms', 15),
('Floor 2', 'Storage', 6),
('Floor 3', 'Workstations', 52),
('Floor 3', 'Meeting Rooms', 10),
('Floor 3', 'Storage', 4),
('Reception', 'Furniture', 25),
('Reception', 'Technology', 8)
ON CONFLICT (row_label, col_label) DO NOTHING;

-- Insert sample activity log entries
INSERT INTO activity_log (text, occurred_at, action, entity_type) VALUES
('Quote #06421 parsed – ready for review', NOW() - INTERVAL '2 hours', 'quote_parsed', 'quote'),
('Crew 2 running +30 min delay', NOW() - INTERVAL '4 hours', 'delay_reported', 'crew'),
('Waste load van en route', NOW() - INTERVAL '1 hour', 'waste_pickup', 'waste'),
('Crew 4 starting Job #230', NOW() - INTERVAL '6 hours', 'job_started', 'job'),
('Floor plan updated for Manchester project', NOW() - INTERVAL '3 hours', 'floorplan_updated', 'job'),
('New quote generated for British Land', NOW() - INTERVAL '5 hours', 'quote_generated', 'quote');

-- Insert sample vehicles
INSERT INTO vehicles (registration, type, in_use, capacity_weight, capacity_volume) VALUES
('BH24 001', 'van', true, 1500.00, 12.5),
('BH24 002', 'van', true, 1500.00, 12.5),
('BH24 003', 'van', false, 1500.00, 12.5),
('BH24 004', 'truck', true, 7500.00, 35.0),
('BH24 005', 'van', true, 1500.00, 12.5),
('BH24 006', 'car', false, 500.00, 2.0);

-- Insert sample waste loads
INSERT INTO waste_loads (booked_at, pickup_date, waste_type, estimated_volume, cost, status, supplier)
SELECT
    NOW() - INTERVAL '1 hour',
    CURRENT_DATE,
    'Mixed Construction',
    ROUND((RANDOM() * 8 + 2)::numeric, 1), -- 2-10 cubic meters
    ROUND((RANDOM() * 200 + 150)::numeric, 2), -- £150-£350
    'booked',
    'ClearWaste Ltd'
UNION ALL
SELECT
    NOW() + INTERVAL '2 hours',
    CURRENT_DATE + 1,
    'Cardboard & Packaging',
    ROUND((RANDOM() * 5 + 1)::numeric, 1),
    ROUND((RANDOM() * 100 + 75)::numeric, 2),
    'booked',
    'RecycleRight'
UNION ALL
SELECT
    NOW() - INTERVAL '3 days',
    CURRENT_DATE - 3,
    'General Waste',
    ROUND((RANDOM() * 6 + 3)::numeric, 1),
    ROUND((RANDOM() * 150 + 100)::numeric, 2),
    'collected',
    'ClearWaste Ltd';

-- ==========================================
-- ROW LEVEL SECURITY
-- ==========================================

-- Enable RLS on new tables
ALTER TABLE crew_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE buffer_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE installs_by_day ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_heatmap ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE waste_loads ENABLE ROW LEVEL SECURITY;
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies (all users can read, supervisors+ can write)
DO $$
DECLARE
    table_name TEXT;
    tables TEXT[] := ARRAY[
        'crew_usage', 'buffer_usage', 'finance_metrics', 'installs_by_day',
        'pipeline_heatmap', 'activity_log', 'vehicles', 'waste_loads', 'quotes'
    ];
BEGIN
    FOREACH table_name IN ARRAY tables
    LOOP
        -- Everyone can read
        EXECUTE format('CREATE POLICY "%s_select" ON %s FOR SELECT USING (true)', table_name, table_name);

        -- Supervisors and directors can insert/update
        EXECUTE format('CREATE POLICY "%s_insert" ON %s FOR INSERT WITH CHECK (
            EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN (''supervisor'', ''ops'', ''director''))
        )', table_name, table_name);

        EXECUTE format('CREATE POLICY "%s_update" ON %s FOR UPDATE USING (
            EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN (''supervisor'', ''ops'', ''director''))
        )', table_name, table_name);

        -- Only directors can delete
        EXECUTE format('CREATE POLICY "%s_delete" ON %s FOR DELETE USING (
            EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = ''director'')
        )', table_name, table_name);
    END LOOP;
END $$;

-- ==========================================
-- SUCCESS MESSAGE
-- ==========================================

SELECT 'Dashboard support tables created successfully! Ready for Master-ops-dash integration.' as status;