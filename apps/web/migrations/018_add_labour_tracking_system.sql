-- Labour Tracking System Extension
-- Adds comprehensive labour tracking and progress management
-- BACKWARD COMPATIBLE - extends existing schema without breaking changes

-- 1. Project Labour Allocation
CREATE TABLE IF NOT EXISTS project_labour_allocation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL, -- Using job_id to match existing jobs table
    total_man_hours DECIMAL(10,2) DEFAULT 0,
    planned_team_size INTEGER DEFAULT 1,
    planned_days INTEGER DEFAULT 1,
    hourly_rate DECIMAL(8,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    CONSTRAINT fk_project_labour_job FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
);

-- 2. Product Labour Rates
CREATE TABLE IF NOT EXISTS product_labour_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_type VARCHAR(100) NOT NULL,
    product_category VARCHAR(50),
    hours_per_unit DECIMAL(5,2) NOT NULL DEFAULT 1.5,
    job_id UUID, -- Optional - can be job-specific or global
    complexity_multiplier DECIMAL(3,2) DEFAULT 1.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT fk_product_labour_job FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE
);

-- 3. Daily Progress Log
CREATE TABLE IF NOT EXISTS daily_progress_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL,
    log_date DATE NOT NULL DEFAULT CURRENT_DATE,
    units_completed INTEGER DEFAULT 0,
    hours_worked DECIMAL(8,2) DEFAULT 0,
    workers_on_site INTEGER DEFAULT 0,
    efficiency_percentage DECIMAL(5,2) DEFAULT 100.0,
    weather_conditions VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    CONSTRAINT fk_daily_progress_job FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
    CONSTRAINT unique_job_date UNIQUE (job_id, log_date)
);

-- 4. Product Progress Tracking
CREATE TABLE IF NOT EXISTS product_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL,
    product_type VARCHAR(100) NOT NULL,
    product_name VARCHAR(200),
    total_quantity INTEGER NOT NULL DEFAULT 1,
    completed_units INTEGER DEFAULT 0,
    in_progress_units INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'not_started',
    estimated_hours_per_unit DECIMAL(5,2) DEFAULT 1.5,
    actual_hours_spent DECIMAL(8,2) DEFAULT 0,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id),
    notes TEXT,
    CONSTRAINT fk_product_progress_job FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
    CONSTRAINT valid_product_status CHECK (status IN ('not_started', 'in_progress', 'completed', 'on_hold', 'blocked')),
    CONSTRAINT valid_quantities CHECK (completed_units >= 0 AND in_progress_units >= 0 AND total_quantity > 0),
    CONSTRAINT completed_not_exceed_total CHECK (completed_units <= total_quantity)
);

-- 5. Daily Close-out Forms
CREATE TABLE IF NOT EXISTS daily_closeout_forms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL,
    closeout_date DATE NOT NULL DEFAULT CURRENT_DATE,
    summary_data JSONB DEFAULT '{}'::jsonb,
    labour_analysis JSONB DEFAULT '{}'::jsonb,
    progress_summary JSONB DEFAULT '{}'::jsonb,
    issues_raised TEXT,
    tomorrow_plan TEXT,
    supervisor_signature VARCHAR(255),
    contractor_signature VARCHAR(255),
    photo_urls JSONB DEFAULT '[]'::jsonb,
    signed_at TIMESTAMP WITH TIME ZONE,
    pdf_generated_url TEXT,
    email_sent BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    CONSTRAINT fk_closeout_job FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
    CONSTRAINT unique_job_closeout_date UNIQUE (job_id, closeout_date)
);

-- 6. Offline Sync Queue (for PWA functionality)
CREATE TABLE IF NOT EXISTS offline_sync_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id UUID NOT NULL,
    operation_type VARCHAR(50) NOT NULL,
    table_name VARCHAR(100) NOT NULL,
    record_id UUID,
    data_payload JSONB NOT NULL,
    sync_status VARCHAR(20) DEFAULT 'pending',
    retry_count INTEGER DEFAULT 0,
    last_retry_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    synced_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    CONSTRAINT fk_sync_queue_job FOREIGN KEY (job_id) REFERENCES jobs(id) ON DELETE CASCADE,
    CONSTRAINT valid_sync_status CHECK (sync_status IN ('pending', 'processing', 'completed', 'failed'))
);

-- Create Performance Indexes
CREATE INDEX IF NOT EXISTS idx_project_labour_job_id ON project_labour_allocation(job_id);
CREATE INDEX IF NOT EXISTS idx_product_labour_type ON product_labour_rates(product_type);
CREATE INDEX IF NOT EXISTS idx_product_labour_job_id ON product_labour_rates(job_id);
CREATE INDEX IF NOT EXISTS idx_daily_progress_job_date ON daily_progress_log(job_id, log_date);
CREATE INDEX IF NOT EXISTS idx_daily_progress_date ON daily_progress_log(log_date);
CREATE INDEX IF NOT EXISTS idx_product_progress_job_id ON product_progress(job_id);
CREATE INDEX IF NOT EXISTS idx_product_progress_status ON product_progress(status);
CREATE INDEX IF NOT EXISTS idx_product_progress_type ON product_progress(product_type);
CREATE INDEX IF NOT EXISTS idx_closeout_job_date ON daily_closeout_forms(job_id, closeout_date);
CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON offline_sync_queue(sync_status);
CREATE INDEX IF NOT EXISTS idx_sync_queue_job_id ON offline_sync_queue(job_id);

-- Enable Row Level Security
ALTER TABLE project_labour_allocation ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_labour_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_progress_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_closeout_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE offline_sync_queue ENABLE ROW LEVEL SECURITY;

-- Create update timestamp triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers where needed
CREATE TRIGGER update_project_labour_updated_at
    BEFORE UPDATE ON project_labour_allocation
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_product_labour_updated_at
    BEFORE UPDATE ON product_labour_rates
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create functions for labour calculations
CREATE OR REPLACE FUNCTION calculate_remaining_hours(p_job_id UUID)
RETURNS DECIMAL(10,2) AS $$
DECLARE
    total_remaining DECIMAL(10,2) := 0;
BEGIN
    SELECT COALESCE(SUM(
        (pp.total_quantity - pp.completed_units) * pp.estimated_hours_per_unit
    ), 0)
    INTO total_remaining
    FROM product_progress pp
    WHERE pp.job_id = p_job_id AND pp.status != 'completed';
    
    RETURN total_remaining;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION calculate_project_efficiency(p_job_id UUID)
RETURNS DECIMAL(5,2) AS $$
DECLARE
    planned_hours DECIMAL(10,2);
    actual_hours DECIMAL(10,2);
    efficiency DECIMAL(5,2);
BEGIN
    -- Get planned hours from labour allocation
    SELECT total_man_hours INTO planned_hours
    FROM project_labour_allocation
    WHERE job_id = p_job_id;
    
    -- Get actual hours spent
    SELECT COALESCE(SUM(actual_hours_spent), 0) INTO actual_hours
    FROM product_progress
    WHERE job_id = p_job_id;
    
    -- Calculate efficiency (planned/actual * 100)
    IF actual_hours > 0 AND planned_hours > 0 THEN
        efficiency := (planned_hours / actual_hours) * 100;
    ELSE
        efficiency := 100;
    END IF;
    
    RETURN LEAST(efficiency, 999.99); -- Cap at 999.99%
END;
$$ LANGUAGE plpgsql;

-- Insert default labour rates for common products
INSERT INTO product_labour_rates (product_type, product_category, hours_per_unit, complexity_multiplier)
VALUES 
    ('FLX_6P', 'Desk', 1.5, 1.0),
    ('FLX_4P', 'Desk', 1.2, 1.0),
    ('FLX_2P', 'Desk', 1.0, 1.0),
    ('HT_DESK', 'Height Adjustable', 2.0, 1.2),
    ('MEETING_TABLE', 'Conference', 2.5, 1.3),
    ('STORAGE_UNIT', 'Storage', 1.8, 1.1),
    ('CHAIR', 'Seating', 0.3, 0.8),
    ('PARTITION', 'Divider', 1.0, 1.0)
ON CONFLICT DO NOTHING;

-- Add comments for documentation
COMMENT ON TABLE project_labour_allocation IS 'Overall labour planning and allocation for projects';
COMMENT ON TABLE product_labour_rates IS 'Standard and custom labour rates per product type';
COMMENT ON TABLE daily_progress_log IS 'Daily progress tracking for projects';
COMMENT ON TABLE product_progress IS 'Individual product installation progress';
COMMENT ON TABLE daily_closeout_forms IS 'End of day summary and reporting';
COMMENT ON TABLE offline_sync_queue IS 'Queue for offline operations to sync when online';

COMMENT ON COLUMN product_progress.status IS 'Current status: not_started, in_progress, completed, on_hold, blocked';
COMMENT ON COLUMN daily_closeout_forms.summary_data IS 'JSON summary of daily progress';
COMMENT ON COLUMN daily_closeout_forms.labour_analysis IS 'JSON labour efficiency and time analysis';

SELECT 'Labour tracking system migration - SUCCESS' as status;