-- Labour Matrix Enhancements
-- Adds crew modes, day reporting, and enhanced views

-- Add crew_mode column to labour_allocations
ALTER TABLE labour_allocations 
ADD COLUMN IF NOT EXISTS crew_mode VARCHAR(20) DEFAULT 'mixed';

-- Add day_report_delays table for tracking daily delays
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

-- Enhanced view: v_labour_days_available
-- Shows available labour capacity and scheduling
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

-- Enhanced view: v_job_labour_summary  
-- Comprehensive job labour overview
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

-- Function: allocate_daily_labour
-- Creates or updates daily labour allocation
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

-- Function: close_work_day
-- Closes a work day and records completion
CREATE OR REPLACE FUNCTION close_work_day(
    p_job_id UUID,
    p_work_date DATE,
    p_notes TEXT DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
    UPDATE labour_allocations 
    SET 
        is_closed = TRUE,
        closed_by = auth.uid(),
        closed_at = NOW(),
        notes = COALESCE(p_notes, notes)
    WHERE job_id = p_job_id AND work_date = p_work_date;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'No labour allocation found for job % on date %', p_job_id, p_work_date;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: record_daily_completion
-- Records product completion for a specific day
CREATE OR REPLACE FUNCTION record_daily_completion(
    p_job_id UUID,
    p_product_code VARCHAR(255),
    p_work_date DATE,
    p_quantity_completed INTEGER,
    p_notes TEXT DEFAULT NULL
) RETURNS VOID AS $$
DECLARE
    target_record RECORD;
BEGIN
    -- Find the build target
    SELECT * INTO target_record 
    FROM job_build_targets 
    WHERE job_id = p_job_id AND product_code = p_product_code;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'No build target found for product % in job %', p_product_code, p_job_id;
    END IF;
    
    -- Insert or update daily completion
    INSERT INTO day_product_completions (
        job_id, target_id, work_date, quantity_completed, notes, recorded_by
    )
    VALUES (
        p_job_id, target_record.id, p_work_date, p_quantity_completed, p_notes, auth.uid()
    )
    ON CONFLICT (job_id, target_id, work_date)
    DO UPDATE SET
        quantity_completed = p_quantity_completed,
        notes = p_notes,
        recorded_by = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: predict_job_completion
-- Predicts when job will be completed based on current progress
CREATE OR REPLACE FUNCTION predict_job_completion(p_job_id UUID) 
RETURNS TABLE(
    predicted_completion_date DATE,
    days_remaining INTEGER,
    efficiency_required DECIMAL(4,2)
) AS $$
DECLARE
    job_summary RECORD;
    work_days_per_week INTEGER := 5;
BEGIN
    SELECT * INTO job_summary FROM v_job_labour_summary WHERE job_id = p_job_id;
    
    IF job_summary.remaining_days <= 0 THEN
        predicted_completion_date := CURRENT_DATE;
        days_remaining := 0;
        efficiency_required := 1.0;
    ELSE
        -- Predict based on remaining labour and average crew size
        days_remaining := CEIL(job_summary.remaining_days);
        predicted_completion_date := CURRENT_DATE + (days_remaining * 7 / work_days_per_week)::INTEGER;
        
        -- Calculate efficiency needed to complete on time
        IF job_summary.allocated_days > 0 THEN
            efficiency_required := job_summary.remaining_days / 
                GREATEST(job_summary.remaining_days, 1);
        ELSE
            efficiency_required := 1.0;
        END IF;
    END IF;
    
    RETURN QUERY SELECT 
        predict_job_completion.predicted_completion_date,
        predict_job_completion.days_remaining,
        predict_job_completion.efficiency_required;
END;
$$ LANGUAGE plpgsql;

-- RLS Policies for new tables
ALTER TABLE day_report_delays ENABLE ROW LEVEL SECURITY;

CREATE POLICY "day_report_delays_select" ON day_report_delays FOR SELECT USING (true);
CREATE POLICY "day_report_delays_insert" ON day_report_delays FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('director', 'supervisor'))
);
CREATE POLICY "day_report_delays_update" ON day_report_delays FOR UPDATE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('director', 'supervisor'))
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_day_report_delays_job_date ON day_report_delays(job_id, work_date);
CREATE INDEX IF NOT EXISTS idx_labour_allocations_crew_mode ON labour_allocations(crew_mode);
CREATE INDEX IF NOT EXISTS idx_labour_allocations_closed ON labour_allocations(is_closed);