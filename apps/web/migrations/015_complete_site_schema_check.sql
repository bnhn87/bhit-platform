-- BHIT OS Complete Site Schema Check and Creation
-- This migration ensures all required tables and columns exist site-wide
-- Safe to run multiple times - uses IF NOT EXISTS and ADD COLUMN IF NOT EXISTS

-- ==========================================
-- CORE JOBS TABLE ENHANCEMENTS
-- ==========================================

-- Ensure jobs table has all required columns for SmartQuote integration
ALTER TABLE jobs 
ADD COLUMN IF NOT EXISTS products JSONB DEFAULT '[]'::jsonb;

ALTER TABLE jobs 
ADD COLUMN IF NOT EXISTS quote_details JSONB;

ALTER TABLE jobs 
ADD COLUMN IF NOT EXISTS labour_summary JSONB;

ALTER TABLE jobs 
ADD COLUMN IF NOT EXISTS quoted_amount DECIMAL(12,2) DEFAULT 0;

-- Create sites table if it doesn't exist
CREATE TABLE IF NOT EXISTS sites (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add site_id column with optional reference
ALTER TABLE jobs 
ADD COLUMN IF NOT EXISTS site_id UUID REFERENCES sites(id);

ALTER TABLE jobs 
ADD COLUMN IF NOT EXISTS start_date TIMESTAMP WITH TIME ZONE;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_jobs_products ON jobs USING GIN (products);
CREATE INDEX IF NOT EXISTS idx_jobs_site_id ON jobs(site_id);
CREATE INDEX IF NOT EXISTS idx_jobs_start_date ON jobs(start_date);

-- ==========================================
-- LABOUR MANAGEMENT SYSTEM TABLES
-- ==========================================

-- Job Labour Bank - tracks total labour allocation per job
CREATE TABLE IF NOT EXISTS job_labour_bank (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    total_labour_days DECIMAL(10,2) NOT NULL DEFAULT 0,
    allocated_days DECIMAL(10,2) NOT NULL DEFAULT 0,
    remaining_days DECIMAL(10,2) GENERATED ALWAYS AS (total_labour_days - allocated_days) STORED,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_job_labour_bank UNIQUE(job_id)
);

-- Labour Allocations - daily crew scheduling
CREATE TABLE IF NOT EXISTS labour_allocations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    work_date DATE NOT NULL,
    van_crews INTEGER DEFAULT 0,
    foot_crews INTEGER DEFAULT 0, 
    supervisors INTEGER DEFAULT 0,
    crew_mode VARCHAR(20) DEFAULT 'mixed',
    hours_allocated DECIMAL(8,2) DEFAULT 0,
    notes TEXT,
    is_closed BOOLEAN DEFAULT FALSE,
    closed_by UUID REFERENCES auth.users(id),
    closed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_job_date_allocation UNIQUE(job_id, work_date)
);

-- Job Build Targets - product build order and tracking
CREATE TABLE IF NOT EXISTS job_build_targets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    product_code VARCHAR(255) NOT NULL,
    product_label VARCHAR(500) NOT NULL,
    total_quantity INTEGER NOT NULL DEFAULT 0,
    built_quantity INTEGER NOT NULL DEFAULT 0,
    build_order INTEGER DEFAULT 999,
    target_completion_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_job_product_target UNIQUE(job_id, product_code)
);

-- Day Product Completions - daily progress tracking
CREATE TABLE IF NOT EXISTS day_product_completions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    target_id UUID NOT NULL REFERENCES job_build_targets(id) ON DELETE CASCADE,
    work_date DATE NOT NULL,
    quantity_completed INTEGER NOT NULL DEFAULT 0,
    notes TEXT,
    recorded_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_daily_product_completion UNIQUE(job_id, target_id, work_date)
);

-- Day Report Delays - delay tracking and reporting
CREATE TABLE IF NOT EXISTS day_report_delays (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    work_date DATE NOT NULL,
    delay_reason TEXT NOT NULL,
    delay_hours DECIMAL(4,2) DEFAULT 0,
    impact_description TEXT,
    reported_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    CONSTRAINT unique_job_date_delay UNIQUE(job_id, work_date, delay_reason)
);

-- ==========================================
-- FLOORPLAN AND TASK MANAGEMENT
-- ==========================================

-- Job Floorplans - floorplan storage and management
CREATE TABLE IF NOT EXISTS job_floorplans (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    floorplan_data JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Task Progress Tracking - ensure jobs table has task columns
ALTER TABLE jobs 
ADD COLUMN IF NOT EXISTS progress DECIMAL(5,2) DEFAULT 0 CHECK (progress >= 0 AND progress <= 100);

ALTER TABLE jobs 
ADD COLUMN IF NOT EXISTS tasks_generated BOOLEAN DEFAULT false;

ALTER TABLE jobs 
ADD COLUMN IF NOT EXISTS estimated_completion_date DATE;

-- Generated Tasks - task management system
CREATE TABLE IF NOT EXISTS complete_generated_tasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    category VARCHAR(50),
    estimated_duration_minutes INTEGER,
    dependencies TEXT[],
    floor_area VARCHAR(100),
    priority INTEGER DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),
    is_completed BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    notes TEXT
);

-- ==========================================
-- ENHANCED VIEWS AND FUNCTIONS
-- ==========================================

-- Drop dependent views first, then recreate
DROP VIEW IF EXISTS v_job_labour_summary CASCADE;
DROP VIEW IF EXISTS v_job_completion CASCADE;
DROP VIEW IF EXISTS v_labour_days_available CASCADE;

-- View: v_job_completion - comprehensive job completion overview
CREATE OR REPLACE VIEW v_job_completion AS
SELECT 
    jbt.job_id,
    COUNT(jbt.id) as total_products,
    COUNT(CASE WHEN jbt.built_quantity >= jbt.total_quantity THEN 1 END) as completed_products,
    ROUND(
        (COUNT(CASE WHEN jbt.built_quantity >= jbt.total_quantity THEN 1 END)::DECIMAL / 
         NULLIF(COUNT(jbt.id), 0)) * 100, 2
    ) as completion_percentage,
    SUM(jbt.total_quantity) as total_items,
    SUM(jbt.built_quantity) as built_items
FROM job_build_targets jbt
GROUP BY jbt.job_id;

-- View: v_labour_days_available - labour capacity overview
CREATE OR REPLACE VIEW v_labour_days_available AS
SELECT 
    la.job_id,
    la.work_date,
    la.van_crews,
    la.foot_crews,
    la.supervisors,
    la.crew_mode,
    la.hours_allocated,
    -- Calculate crew efficiency based on mode
    CASE 
        WHEN la.crew_mode = 'van' THEN la.van_crews * 8 * 1.2
        WHEN la.crew_mode = 'foot' THEN la.foot_crews * 8 * 0.9
        ELSE (la.van_crews + la.foot_crews) * 8
    END as effective_hours,
    la.is_closed,
    la.notes,
    COALESCE(drd.total_delay_hours, 0) as delay_hours,
    drd.delay_reasons
FROM labour_allocations la
LEFT JOIN (
    SELECT 
        job_id,
        work_date,
        SUM(delay_hours) as total_delay_hours,
        STRING_AGG(delay_reason, '; ') as delay_reasons
    FROM day_report_delays
    GROUP BY job_id, work_date
) drd ON la.job_id = drd.job_id AND la.work_date = drd.work_date;

-- View: v_job_labour_summary - comprehensive job labour overview
CREATE OR REPLACE VIEW v_job_labour_summary AS
SELECT 
    j.id as job_id,
    j.title as job_title,
    j.status as job_status,
    jlb.total_labour_days,
    jlb.allocated_days,
    jlb.remaining_days,
    -- Completion metrics
    jc.completion_percentage,
    jc.total_products,
    jc.completed_products,
    jc.total_items,
    jc.built_items,
    -- Schedule metrics
    la_stats.scheduled_days,
    la_stats.closed_days,
    la_stats.total_allocated_hours,
    la_stats.average_daily_crew,
    -- Progress prediction
    CASE 
        WHEN jlb.allocated_days > 0 THEN 
            ROUND((jc.completion_percentage / 100.0) / (jlb.allocated_days / jlb.total_labour_days), 2)
        ELSE 0
    END as efficiency_ratio
FROM jobs j
LEFT JOIN job_labour_bank jlb ON j.id = jlb.job_id
LEFT JOIN v_job_completion jc ON j.id = jc.job_id
LEFT JOIN (
    SELECT 
        job_id,
        COUNT(*) as scheduled_days,
        COUNT(CASE WHEN is_closed THEN 1 END) as closed_days,
        SUM(hours_allocated) as total_allocated_hours,
        ROUND(AVG(van_crews + foot_crews + supervisors), 1) as average_daily_crew
    FROM labour_allocations
    GROUP BY job_id
) la_stats ON j.id = la_stats.job_id;

-- Function: initialize_job_labour
CREATE OR REPLACE FUNCTION initialize_job_labour(
    p_job_id UUID,
    p_labour_days DECIMAL(10,2)
) RETURNS VOID AS $$
BEGIN
    INSERT INTO job_labour_bank (job_id, total_labour_days)
    VALUES (p_job_id, p_labour_days)
    ON CONFLICT (job_id) 
    DO UPDATE SET 
        total_labour_days = p_labour_days,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: seed_job_build_targets
CREATE OR REPLACE FUNCTION seed_job_build_targets(p_job_id UUID) RETURNS VOID AS $$
DECLARE
    job_record RECORD;
    product_item JSONB;
    build_counter INTEGER := 1;
BEGIN
    SELECT * INTO job_record FROM jobs WHERE id = p_job_id;
    
    IF job_record.products IS NOT NULL THEN
        FOR product_item IN SELECT * FROM jsonb_array_elements(job_record.products)
        LOOP
            INSERT INTO job_build_targets (
                job_id,
                product_code,
                product_label,
                total_quantity,
                build_order
            ) VALUES (
                p_job_id,
                COALESCE(product_item->>'productCode', product_item->>'code', 'UNKNOWN'),
                COALESCE(
                    product_item->>'cleanDescription', 
                    product_item->>'description',
                    product_item->>'rawDescription',
                    'Product ' || build_counter
                ),
                COALESCE((product_item->>'quantity')::INTEGER, 1),
                build_counter
            )
            ON CONFLICT (job_id, product_code) DO NOTHING;
            
            build_counter := build_counter + 1;
        END LOOP;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- ROW LEVEL SECURITY (RLS) SETUP
-- ==========================================

-- Enable RLS on all labour tables
ALTER TABLE job_labour_bank ENABLE ROW LEVEL SECURITY;
ALTER TABLE labour_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_build_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE day_product_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE day_report_delays ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_floorplans ENABLE ROW LEVEL SECURITY;
ALTER TABLE complete_generated_tasks ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies (everyone can read, directors can modify)
DO $$ 
DECLARE
    table_name TEXT;
    tables TEXT[] := ARRAY[
        'job_labour_bank', 'labour_allocations', 'job_build_targets', 
        'day_product_completions', 'day_report_delays', 'job_floorplans',
        'complete_generated_tasks'
    ];
BEGIN
    FOREACH table_name IN ARRAY tables
    LOOP
        -- Drop existing policies first
        EXECUTE format('DROP POLICY IF EXISTS "%s_select" ON %s', table_name, table_name);
        EXECUTE format('DROP POLICY IF EXISTS "%s_insert" ON %s', table_name, table_name);
        EXECUTE format('DROP POLICY IF EXISTS "%s_update" ON %s', table_name, table_name);
        EXECUTE format('DROP POLICY IF EXISTS "%s_delete" ON %s', table_name, table_name);
        
        -- Create new policies
        EXECUTE format('CREATE POLICY "%s_select" ON %s FOR SELECT USING (true)', table_name, table_name);
        EXECUTE format('CREATE POLICY "%s_insert" ON %s FOR INSERT WITH CHECK (
            EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN (''director'', ''supervisor''))
        )', table_name, table_name);
        EXECUTE format('CREATE POLICY "%s_update" ON %s FOR UPDATE USING (
            EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN (''director'', ''supervisor''))
        )', table_name, table_name);
        EXECUTE format('CREATE POLICY "%s_delete" ON %s FOR DELETE USING (
            EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = ''director'')
        )', table_name, table_name);
    END LOOP;
END $$;

-- ==========================================
-- PERFORMANCE INDEXES
-- ==========================================

-- Core labour management indexes
CREATE INDEX IF NOT EXISTS idx_job_labour_bank_job_id ON job_labour_bank(job_id);
CREATE INDEX IF NOT EXISTS idx_labour_allocations_job_date ON labour_allocations(job_id, work_date);
CREATE INDEX IF NOT EXISTS idx_labour_allocations_crew_mode ON labour_allocations(crew_mode);
CREATE INDEX IF NOT EXISTS idx_labour_allocations_closed ON labour_allocations(is_closed);
CREATE INDEX IF NOT EXISTS idx_job_build_targets_job_id ON job_build_targets(job_id);
CREATE INDEX IF NOT EXISTS idx_job_build_targets_build_order ON job_build_targets(build_order);
CREATE INDEX IF NOT EXISTS idx_day_completions_target_date ON day_product_completions(target_id, work_date);
CREATE INDEX IF NOT EXISTS idx_day_report_delays_job_date ON day_report_delays(job_id, work_date);

-- Task and floorplan indexes
CREATE INDEX IF NOT EXISTS idx_job_floorplans_job_id ON job_floorplans(job_id);
CREATE INDEX IF NOT EXISTS idx_job_floorplans_active ON job_floorplans(is_active);
CREATE INDEX IF NOT EXISTS idx_complete_generated_tasks_job_id ON complete_generated_tasks(job_id);
CREATE INDEX IF NOT EXISTS idx_complete_generated_tasks_completed ON complete_generated_tasks(is_completed);
CREATE INDEX IF NOT EXISTS idx_complete_generated_tasks_priority ON complete_generated_tasks(priority);

-- Jobs table additional indexes
CREATE INDEX IF NOT EXISTS idx_jobs_progress ON jobs(progress);
CREATE INDEX IF NOT EXISTS idx_jobs_tasks_generated ON jobs(tasks_generated);
CREATE INDEX IF NOT EXISTS idx_jobs_estimated_completion ON jobs(estimated_completion_date);

-- ==========================================
-- COLUMN COMMENTS FOR DOCUMENTATION
-- ==========================================

COMMENT ON COLUMN jobs.products IS 'Array of products from SmartQuote calculations';
COMMENT ON COLUMN jobs.quote_details IS 'Original quote details: client, project, delivery_address, etc.';
COMMENT ON COLUMN jobs.labour_summary IS 'Labour estimates: total_days, total_hours, crew_size, installation_days, uplift_days';
COMMENT ON COLUMN jobs.quoted_amount IS 'Total quoted price from SmartQuote calculations';
COMMENT ON COLUMN jobs.progress IS 'Overall job completion percentage (0-100)';
COMMENT ON COLUMN jobs.tasks_generated IS 'Whether tasks have been generated for this job';
COMMENT ON COLUMN jobs.estimated_completion_date IS 'Estimated completion date based on current progress';

-- ==========================================
-- MIGRATION COMPLETE
-- ==========================================

-- This migration ensures your BHIT OS database has all required:
-- ✅ SmartQuote integration columns
-- ✅ Labour management system tables  
-- ✅ Task generation and tracking
-- ✅ Floorplan management
-- ✅ Progress tracking
-- ✅ RLS security policies
-- ✅ Performance indexes
-- ✅ Helper functions and views

SELECT 'BHIT OS Complete Schema Migration - SUCCESS' as status;