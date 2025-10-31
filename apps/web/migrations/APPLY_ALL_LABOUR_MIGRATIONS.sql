-- BHIT OS Labour Module - Complete Migration Script
-- Apply this entire script in Supabase SQL Editor to set up the labour management system

-- Step 1: Add labour_summary column to jobs table
ALTER TABLE jobs 
ADD COLUMN IF NOT EXISTS labour_summary JSONB;

COMMENT ON COLUMN jobs.labour_summary IS 'Stores labour estimates: {total_days, total_hours, crew_size, installation_days, uplift_days}';

-- Step 2: Create core labour management tables

-- Table: job_labour_bank
-- Stores the total labour days allocated to each job
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

-- Table: labour_allocations  
-- Tracks daily crew allocations and capacity
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

-- Table: job_build_targets
-- Defines build order and targets for each product
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

-- Table: day_product_completions
-- Tracks daily product completion progress
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

-- Table: day_report_delays
-- Tracks daily delays and their impact
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

-- Step 3: Create Views

-- View: v_labour_bank_remaining
CREATE OR REPLACE VIEW v_labour_bank_remaining AS
SELECT 
    jlb.job_id,
    jlb.total_labour_days,
    jlb.allocated_days,
    jlb.remaining_days,
    j.status as job_status,
    j.title as job_title
FROM job_labour_bank jlb
JOIN jobs j ON j.id = jlb.job_id;

-- View: v_job_completion
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

-- View: v_labour_days_available
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
        WHEN la.crew_mode = 'van' THEN la.van_crews * 8 * 1.2  -- Van crews 20% more efficient
        WHEN la.crew_mode = 'foot' THEN la.foot_crews * 8 * 0.9  -- Foot crews 10% less efficient  
        ELSE (la.van_crews + la.foot_crews) * 8  -- Mixed mode standard
    END as effective_hours,
    la.is_closed,
    la.notes,
    -- Calculate delays for the day
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

-- View: v_job_labour_summary  
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

-- Step 4: Create Functions

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
    -- Get the job record
    SELECT * INTO job_record FROM jobs WHERE id = p_job_id;
    
    IF job_record.products IS NOT NULL THEN
        -- Loop through products and create targets
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

-- Function: allocate_daily_labour
CREATE OR REPLACE FUNCTION allocate_daily_labour(
    p_job_id UUID,
    p_work_date DATE,
    p_van_crews INTEGER DEFAULT 0,
    p_foot_crews INTEGER DEFAULT 0,
    p_supervisors INTEGER DEFAULT 0,
    p_crew_mode VARCHAR(20) DEFAULT 'mixed',
    p_notes TEXT DEFAULT NULL
) RETURNS VOID AS $$
DECLARE
    calculated_hours DECIMAL(8,2);
BEGIN
    -- Calculate hours based on crew mode
    CASE p_crew_mode
        WHEN 'van' THEN calculated_hours := p_van_crews * 8 * 1.2;
        WHEN 'foot' THEN calculated_hours := p_foot_crews * 8 * 0.9;
        ELSE calculated_hours := (p_van_crews + p_foot_crews) * 8;
    END CASE;
    
    -- Insert or update allocation
    INSERT INTO labour_allocations (
        job_id, work_date, van_crews, foot_crews, supervisors, 
        crew_mode, hours_allocated, notes
    )
    VALUES (
        p_job_id, p_work_date, p_van_crews, p_foot_crews, p_supervisors,
        p_crew_mode, calculated_hours, p_notes
    )
    ON CONFLICT (job_id, work_date) 
    DO UPDATE SET
        van_crews = p_van_crews,
        foot_crews = p_foot_crews,
        supervisors = p_supervisors,
        crew_mode = p_crew_mode,
        hours_allocated = calculated_hours,
        notes = p_notes,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 5: Create Triggers

-- Trigger function: update_labour_bank_allocated
CREATE OR REPLACE FUNCTION update_labour_bank_allocated() RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        UPDATE job_labour_bank 
        SET allocated_days = (
            SELECT COALESCE(SUM(hours_allocated / 8.0), 0)
            FROM labour_allocations 
            WHERE job_id = NEW.job_id
        ),
        updated_at = NOW()
        WHERE job_id = NEW.job_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE job_labour_bank 
        SET allocated_days = (
            SELECT COALESCE(SUM(hours_allocated / 8.0), 0)
            FROM labour_allocations 
            WHERE job_id = OLD.job_id
        ),
        updated_at = NOW()
        WHERE job_id = OLD.job_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_labour_bank ON labour_allocations;
CREATE TRIGGER trigger_update_labour_bank
    AFTER INSERT OR UPDATE OR DELETE ON labour_allocations
    FOR EACH ROW EXECUTE FUNCTION update_labour_bank_allocated();

-- Trigger function: update_build_targets_from_completions
CREATE OR REPLACE FUNCTION update_build_targets_from_completions() RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
        UPDATE job_build_targets 
        SET built_quantity = (
            SELECT COALESCE(SUM(quantity_completed), 0)
            FROM day_product_completions 
            WHERE target_id = NEW.target_id
        ),
        updated_at = NOW()
        WHERE id = NEW.target_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE job_build_targets 
        SET built_quantity = (
            SELECT COALESCE(SUM(quantity_completed), 0)
            FROM day_product_completions 
            WHERE target_id = OLD.target_id
        ),
        updated_at = NOW()
        WHERE id = OLD.target_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_build_targets ON day_product_completions;
CREATE TRIGGER trigger_update_build_targets
    AFTER INSERT OR UPDATE OR DELETE ON day_product_completions
    FOR EACH ROW EXECUTE FUNCTION update_build_targets_from_completions();

-- Step 6: Set up RLS (Row Level Security)
ALTER TABLE job_labour_bank ENABLE ROW LEVEL SECURITY;
ALTER TABLE labour_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_build_targets ENABLE ROW LEVEL SECURITY;  
ALTER TABLE day_product_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE day_report_delays ENABLE ROW LEVEL SECURITY;

-- RLS Policies for job_labour_bank
DROP POLICY IF EXISTS "job_labour_bank_select" ON job_labour_bank;
CREATE POLICY "job_labour_bank_select" ON job_labour_bank FOR SELECT USING (true);

DROP POLICY IF EXISTS "job_labour_bank_insert" ON job_labour_bank;
CREATE POLICY "job_labour_bank_insert" ON job_labour_bank FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'director')
);

DROP POLICY IF EXISTS "job_labour_bank_update" ON job_labour_bank;
CREATE POLICY "job_labour_bank_update" ON job_labour_bank FOR UPDATE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'director')
);

-- RLS Policies for labour_allocations
DROP POLICY IF EXISTS "labour_allocations_select" ON labour_allocations;
CREATE POLICY "labour_allocations_select" ON labour_allocations FOR SELECT USING (true);

DROP POLICY IF EXISTS "labour_allocations_insert" ON labour_allocations;
CREATE POLICY "labour_allocations_insert" ON labour_allocations FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'director')
);

DROP POLICY IF EXISTS "labour_allocations_update" ON labour_allocations;
CREATE POLICY "labour_allocations_update" ON labour_allocations FOR UPDATE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'director')
);

-- RLS Policies for job_build_targets
DROP POLICY IF EXISTS "job_build_targets_select" ON job_build_targets;
CREATE POLICY "job_build_targets_select" ON job_build_targets FOR SELECT USING (true);

DROP POLICY IF EXISTS "job_build_targets_insert" ON job_build_targets;
CREATE POLICY "job_build_targets_insert" ON job_build_targets FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'director')
);

DROP POLICY IF EXISTS "job_build_targets_update" ON job_build_targets;
CREATE POLICY "job_build_targets_update" ON job_build_targets FOR UPDATE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'director')
);

-- RLS Policies for day_product_completions
DROP POLICY IF EXISTS "day_product_completions_select" ON day_product_completions;
CREATE POLICY "day_product_completions_select" ON day_product_completions FOR SELECT USING (true);

DROP POLICY IF EXISTS "day_product_completions_insert" ON day_product_completions;
CREATE POLICY "day_product_completions_insert" ON day_product_completions FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('director', 'supervisor'))
);

DROP POLICY IF EXISTS "day_product_completions_update" ON day_product_completions;
CREATE POLICY "day_product_completions_update" ON day_product_completions FOR UPDATE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('director', 'supervisor'))
);

-- RLS Policies for day_report_delays
DROP POLICY IF EXISTS "day_report_delays_select" ON day_report_delays;
CREATE POLICY "day_report_delays_select" ON day_report_delays FOR SELECT USING (true);

DROP POLICY IF EXISTS "day_report_delays_insert" ON day_report_delays;
CREATE POLICY "day_report_delays_insert" ON day_report_delays FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('director', 'supervisor'))
);

DROP POLICY IF EXISTS "day_report_delays_update" ON day_report_delays;
CREATE POLICY "day_report_delays_update" ON day_report_delays FOR UPDATE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('director', 'supervisor'))
);

-- Step 7: Create Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_job_labour_bank_job_id ON job_labour_bank(job_id);
CREATE INDEX IF NOT EXISTS idx_labour_allocations_job_date ON labour_allocations(job_id, work_date);
CREATE INDEX IF NOT EXISTS idx_labour_allocations_crew_mode ON labour_allocations(crew_mode);
CREATE INDEX IF NOT EXISTS idx_labour_allocations_closed ON labour_allocations(is_closed);
CREATE INDEX IF NOT EXISTS idx_job_build_targets_job_id ON job_build_targets(job_id);
CREATE INDEX IF NOT EXISTS idx_day_completions_target_date ON day_product_completions(target_id, work_date);
CREATE INDEX IF NOT EXISTS idx_day_report_delays_job_date ON day_report_delays(job_id, work_date);

-- Migration Complete!
-- You should now be able to use the "Create Job from Quote" functionality.