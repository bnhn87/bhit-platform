-- ==========================================
-- Migration 032: Job-Related Tables
-- Creates all tables for job documents, photos, tasks, notes, planning, etc.
-- Depends on: 000_create_core_schema.sql (jobs table must exist)
-- ==========================================

-- ==========================================
-- PART 1: JOB DOCUMENTS
-- ==========================================

CREATE TABLE IF NOT EXISTS job_documents (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_size BIGINT,
    mime_type TEXT,
    is_pdf BOOLEAN DEFAULT false,
    uploaded_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_job_documents_job_id ON job_documents(job_id);
CREATE INDEX IF NOT EXISTS idx_job_documents_uploaded_by ON job_documents(uploaded_by);

-- ==========================================
-- PART 2: JOB PHOTOS
-- ==========================================

CREATE TABLE IF NOT EXISTS job_photos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
    photo_url TEXT NOT NULL,
    thumbnail_url TEXT,
    caption TEXT,
    uploaded_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_job_photos_job_id ON job_photos(job_id);
CREATE INDEX IF NOT EXISTS idx_job_photos_uploaded_by ON job_photos(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_job_photos_created_at ON job_photos(created_at DESC);

-- ==========================================
-- PART 3: JOB DRAWINGS
-- ==========================================

CREATE TABLE IF NOT EXISTS job_drawings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    drawing_url TEXT NOT NULL,
    thumbnail_url TEXT,
    is_catalogue BOOLEAN DEFAULT false,
    uploaded_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_job_drawings_job_id ON job_drawings(job_id);
CREATE INDEX IF NOT EXISTS idx_job_drawings_uploaded_by ON job_drawings(uploaded_by);

-- ==========================================
-- PART 4: JOB NOTES
-- ==========================================

CREATE TABLE IF NOT EXISTS job_notes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_job_notes_job_id ON job_notes(job_id);
CREATE INDEX IF NOT EXISTS idx_job_notes_created_by ON job_notes(created_by);
CREATE INDEX IF NOT EXISTS idx_job_notes_created_at ON job_notes(created_at DESC);

-- ==========================================
-- PART 5: JOB TASKS (Manual Tasks)
-- ==========================================

CREATE TABLE IF NOT EXISTS job_tasks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    is_done BOOLEAN DEFAULT false,
    order_index INTEGER DEFAULT 0,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_job_tasks_job_id ON job_tasks(job_id);
CREATE INDEX IF NOT EXISTS idx_job_tasks_is_done ON job_tasks(is_done);
CREATE INDEX IF NOT EXISTS idx_job_tasks_order_index ON job_tasks(job_id, order_index);

-- ==========================================
-- PART 6: JOB PLANNING
-- ==========================================

CREATE TABLE IF NOT EXISTS job_planning (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
    planning_data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(job_id)
);

CREATE INDEX IF NOT EXISTS idx_job_planning_job_id ON job_planning(job_id);

-- ==========================================
-- PART 7: JOB RISK FLAGS
-- ==========================================

CREATE TABLE IF NOT EXISTS job_risk_flags (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
    risk_type TEXT NOT NULL,
    description TEXT,
    severity TEXT DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    is_resolved BOOLEAN DEFAULT false,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_job_risk_flags_job_id ON job_risk_flags(job_id);
CREATE INDEX IF NOT EXISTS idx_job_risk_flags_is_resolved ON job_risk_flags(is_resolved);
CREATE INDEX IF NOT EXISTS idx_job_risk_flags_severity ON job_risk_flags(severity);

-- ==========================================
-- PART 8: JOB COSTS
-- ==========================================

CREATE TABLE IF NOT EXISTS job_costs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,

    -- Labour
    labour_days DECIMAL(8,2) DEFAULT 0,
    crew_size INTEGER DEFAULT 2,
    installers_per_day INTEGER DEFAULT 2,
    supervisors_per_day INTEGER DEFAULT 0,

    -- Other costs
    buffer_percent DECIMAL(5,2) DEFAULT 0,
    vehicle_days INTEGER DEFAULT 0,
    waste_loads INTEGER DEFAULT 0,

    -- Calculated totals
    total_labour_cost DECIMAL(12,2),
    total_vehicle_cost DECIMAL(12,2),
    total_waste_cost DECIMAL(12,2),
    total_cost DECIMAL(12,2),

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(job_id)
);

CREATE INDEX IF NOT EXISTS idx_job_costs_job_id ON job_costs(job_id);

-- ==========================================
-- PART 9: JOB PINS (Guest Access)
-- ==========================================

CREATE TABLE IF NOT EXISTS job_pins (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
    pin VARCHAR(10) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(job_id)
);

CREATE INDEX IF NOT EXISTS idx_job_pins_job_id ON job_pins(job_id);
CREATE INDEX IF NOT EXISTS idx_job_pins_pin ON job_pins(pin);

-- ==========================================
-- PART 10: TEMP ACCESS TOKENS (Guest Access)
-- ==========================================

CREATE TABLE IF NOT EXISTS temp_access_tokens (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    pin VARCHAR(10),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_temp_access_tokens_job_id ON temp_access_tokens(job_id);
CREATE INDEX IF NOT EXISTS idx_temp_access_tokens_token ON temp_access_tokens(token);
CREATE INDEX IF NOT EXISTS idx_temp_access_tokens_expires_at ON temp_access_tokens(expires_at);

-- Clean up expired tokens periodically
CREATE OR REPLACE FUNCTION cleanup_expired_tokens()
RETURNS void AS $$
BEGIN
    DELETE FROM temp_access_tokens WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- PART 11: COST ACCESS PERMISSIONS
-- ==========================================

CREATE TABLE IF NOT EXISTS cost_access (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    has_access BOOLEAN DEFAULT false,
    granted_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(user_id)
);

CREATE INDEX IF NOT EXISTS idx_cost_access_user_id ON cost_access(user_id);
CREATE INDEX IF NOT EXISTS idx_cost_access_has_access ON cost_access(has_access);

-- ==========================================
-- PART 12: JOB ITEMS (Product Items)
-- ==========================================

CREATE TABLE IF NOT EXISTS job_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
    product_code VARCHAR(100),
    product_name TEXT,
    quantity INTEGER DEFAULT 1,
    install_time_hours DECIMAL(8,2),
    waste_volume_m3 DECIMAL(8,2),
    is_heavy BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_job_items_job_id ON job_items(job_id);
CREATE INDEX IF NOT EXISTS idx_job_items_product_code ON job_items(product_code);

-- ==========================================
-- PART 13: ROW LEVEL SECURITY POLICIES
-- ==========================================

-- Enable RLS on all tables
ALTER TABLE job_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_drawings ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_planning ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_risk_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_pins ENABLE ROW LEVEL SECURITY;
ALTER TABLE temp_access_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE cost_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_items ENABLE ROW LEVEL SECURITY;

-- Generic policy for job-related tables: access if you can access the job
CREATE OR REPLACE FUNCTION user_can_access_job(p_job_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM jobs
        WHERE id = p_job_id
        AND deleted_at IS NULL
        AND (
            created_by = auth.uid()
            OR account_id IN (
                SELECT account_id FROM user_profiles
                WHERE id = auth.uid()
            )
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Job documents policies
DROP POLICY IF EXISTS job_documents_access_policy ON job_documents;
CREATE POLICY job_documents_access_policy ON job_documents
    FOR ALL
    USING (user_can_access_job(job_id));

-- Job photos policies
DROP POLICY IF EXISTS job_photos_access_policy ON job_photos;
CREATE POLICY job_photos_access_policy ON job_photos
    FOR ALL
    USING (user_can_access_job(job_id));

-- Job drawings policies
DROP POLICY IF EXISTS job_drawings_access_policy ON job_drawings;
CREATE POLICY job_drawings_access_policy ON job_drawings
    FOR ALL
    USING (user_can_access_job(job_id));

-- Job notes policies
DROP POLICY IF EXISTS job_notes_access_policy ON job_notes;
CREATE POLICY job_notes_access_policy ON job_notes
    FOR ALL
    USING (user_can_access_job(job_id));

-- Job tasks policies
DROP POLICY IF EXISTS job_tasks_access_policy ON job_tasks;
CREATE POLICY job_tasks_access_policy ON job_tasks
    FOR ALL
    USING (user_can_access_job(job_id));

-- Job planning policies
DROP POLICY IF EXISTS job_planning_access_policy ON job_planning;
CREATE POLICY job_planning_access_policy ON job_planning
    FOR ALL
    USING (user_can_access_job(job_id));

-- Job risk flags policies
DROP POLICY IF EXISTS job_risk_flags_access_policy ON job_risk_flags;
CREATE POLICY job_risk_flags_access_policy ON job_risk_flags
    FOR ALL
    USING (user_can_access_job(job_id));

-- Job costs policies (restricted by cost_access table)
DROP POLICY IF EXISTS job_costs_access_policy ON job_costs;
CREATE POLICY job_costs_access_policy ON job_costs
    FOR ALL
    USING (
        user_can_access_job(job_id)
        AND (
            EXISTS (
                SELECT 1 FROM cost_access
                WHERE user_id = auth.uid()
                AND has_access = true
            )
            OR EXISTS (
                SELECT 1 FROM user_profiles
                WHERE id = auth.uid()
                AND role IN ('admin', 'manager')
            )
        )
    );

-- Job pins policies
DROP POLICY IF EXISTS job_pins_access_policy ON job_pins;
CREATE POLICY job_pins_access_policy ON job_pins
    FOR ALL
    USING (user_can_access_job(job_id));

-- Temp access tokens policies
DROP POLICY IF EXISTS temp_access_tokens_access_policy ON temp_access_tokens;
CREATE POLICY temp_access_tokens_access_policy ON temp_access_tokens
    FOR ALL
    USING (user_can_access_job(job_id));

-- Cost access policies
DROP POLICY IF EXISTS cost_access_read_policy ON cost_access;
CREATE POLICY cost_access_read_policy ON cost_access
    FOR SELECT
    USING (user_id = auth.uid() OR auth.uid() IN (
        SELECT id FROM user_profiles WHERE role IN ('admin', 'manager')
    ));

DROP POLICY IF EXISTS cost_access_write_policy ON cost_access;
CREATE POLICY cost_access_write_policy ON cost_access
    FOR ALL
    USING (auth.uid() IN (
        SELECT id FROM user_profiles WHERE role IN ('admin', 'manager')
    ));

-- Job items policies
DROP POLICY IF EXISTS job_items_access_policy ON job_items;
CREATE POLICY job_items_access_policy ON job_items
    FOR ALL
    USING (user_can_access_job(job_id));

-- ==========================================
-- PART 14: TRIGGERS
-- ==========================================

-- Update timestamp triggers
DROP TRIGGER IF EXISTS update_job_documents_updated_at ON job_documents;
CREATE TRIGGER update_job_documents_updated_at
    BEFORE UPDATE ON job_documents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_job_photos_updated_at ON job_photos;
CREATE TRIGGER update_job_photos_updated_at
    BEFORE UPDATE ON job_photos
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_job_drawings_updated_at ON job_drawings;
CREATE TRIGGER update_job_drawings_updated_at
    BEFORE UPDATE ON job_drawings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_job_notes_updated_at ON job_notes;
CREATE TRIGGER update_job_notes_updated_at
    BEFORE UPDATE ON job_notes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_job_tasks_updated_at ON job_tasks;
CREATE TRIGGER update_job_tasks_updated_at
    BEFORE UPDATE ON job_tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_job_planning_updated_at ON job_planning;
CREATE TRIGGER update_job_planning_updated_at
    BEFORE UPDATE ON job_planning
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_job_risk_flags_updated_at ON job_risk_flags;
CREATE TRIGGER update_job_risk_flags_updated_at
    BEFORE UPDATE ON job_risk_flags
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_job_costs_updated_at ON job_costs;
CREATE TRIGGER update_job_costs_updated_at
    BEFORE UPDATE ON job_costs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_cost_access_updated_at ON cost_access;
CREATE TRIGGER update_cost_access_updated_at
    BEFORE UPDATE ON cost_access
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_job_items_updated_at ON job_items;
CREATE TRIGGER update_job_items_updated_at
    BEFORE UPDATE ON job_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- PART 15: COMMENTS
-- ==========================================

COMMENT ON TABLE job_documents IS 'Documents uploaded for jobs (PDFs, Word docs, etc.)';
COMMENT ON TABLE job_photos IS 'Photos uploaded for jobs with optional captions';
COMMENT ON TABLE job_drawings IS 'Drawings/floor plans for jobs';
COMMENT ON TABLE job_notes IS 'Text notes for jobs';
COMMENT ON TABLE job_tasks IS 'Manual task list for jobs (not AI-generated)';
COMMENT ON TABLE job_planning IS 'Planning metadata and configuration for jobs';
COMMENT ON TABLE job_risk_flags IS 'Risk flags and issues identified for jobs';
COMMENT ON TABLE job_costs IS 'Cost breakdown and calculations for jobs';
COMMENT ON TABLE job_pins IS 'PIN codes for guest access to jobs';
COMMENT ON TABLE temp_access_tokens IS 'Temporary access tokens for guest/unauthenticated access';
COMMENT ON TABLE cost_access IS 'User permissions for viewing cost data';
COMMENT ON TABLE job_items IS 'Individual product items associated with jobs';

-- ==========================================
-- COMPLETION MESSAGE
-- ==========================================

DO $$
BEGIN
    RAISE NOTICE '✓ Job-related tables migration complete';
    RAISE NOTICE '✓ Created 12 tables: job_documents, job_photos, job_drawings, job_notes, job_tasks, job_planning, job_risk_flags, job_costs, job_pins, temp_access_tokens, cost_access, job_items';
    RAISE NOTICE '✓ Applied RLS policies using user_can_access_job() function';
    RAISE NOTICE '✓ Created % indexes', (
        SELECT COUNT(*) FROM pg_indexes
        WHERE tablename LIKE 'job_%' OR tablename IN ('temp_access_tokens', 'cost_access')
    );
END $$;
