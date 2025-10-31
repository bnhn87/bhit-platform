-- Labour Matrix Core Tables and Functions
-- Creates the foundation for job labour management system

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

-- View: v_labour_bank_remaining
-- Provides quick access to labour bank status
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

-- View: v_daily_hours_budget
-- Calculates daily hours budget and usage
CREATE OR REPLACE VIEW v_daily_hours_budget AS
SELECT 
    la.job_id,
    la.work_date,
    la.van_crews,
    la.foot_crews, 
    la.supervisors,
    la.hours_allocated,
    -- Standard 8-hour day calculation
    (la.van_crews + la.foot_crews) * 8 as daily_capacity_hours,
    la.is_closed,
    la.notes
FROM labour_allocations la;

-- View: v_job_completion
-- Provides job completion overview
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

-- Function: initialize_job_labour
-- Sets up initial labour bank for a job
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
-- Creates build targets from job products
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

-- Trigger: update_labour_bank_allocated
-- Automatically updates allocated days when labour allocations change
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

-- Trigger: update_build_targets_from_completions
-- Automatically updates built quantities from daily completions
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

-- Set up RLS policies (Director-only editing)
ALTER TABLE job_labour_bank ENABLE ROW LEVEL SECURITY;
ALTER TABLE labour_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_build_targets ENABLE ROW LEVEL SECURITY;  
ALTER TABLE day_product_completions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for job_labour_bank
CREATE POLICY "job_labour_bank_select" ON job_labour_bank FOR SELECT USING (true);
CREATE POLICY "job_labour_bank_insert" ON job_labour_bank FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'director')
);
CREATE POLICY "job_labour_bank_update" ON job_labour_bank FOR UPDATE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'director')
);

-- RLS Policies for labour_allocations
CREATE POLICY "labour_allocations_select" ON labour_allocations FOR SELECT USING (true);
CREATE POLICY "labour_allocations_insert" ON labour_allocations FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'director')
);
CREATE POLICY "labour_allocations_update" ON labour_allocations FOR UPDATE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'director')
);

-- RLS Policies for job_build_targets
CREATE POLICY "job_build_targets_select" ON job_build_targets FOR SELECT USING (true);
CREATE POLICY "job_build_targets_insert" ON job_build_targets FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'director')
);
CREATE POLICY "job_build_targets_update" ON job_build_targets FOR UPDATE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'director')
);

-- RLS Policies for day_product_completions
CREATE POLICY "day_product_completions_select" ON day_product_completions FOR SELECT USING (true);
CREATE POLICY "day_product_completions_insert" ON day_product_completions FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('director', 'supervisor'))
);
CREATE POLICY "day_product_completions_update" ON day_product_completions FOR UPDATE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('director', 'supervisor'))
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_job_labour_bank_job_id ON job_labour_bank(job_id);
CREATE INDEX IF NOT EXISTS idx_labour_allocations_job_date ON labour_allocations(job_id, work_date);
CREATE INDEX IF NOT EXISTS idx_job_build_targets_job_id ON job_build_targets(job_id);
CREATE INDEX IF NOT EXISTS idx_day_completions_target_date ON day_product_completions(target_id, work_date);