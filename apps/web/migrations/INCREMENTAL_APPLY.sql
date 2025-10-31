-- ==========================================
-- INCREMENTAL MIGRATION APPLICATION
-- Only creates tables that don't exist yet
-- Safe to run on existing database
-- ==========================================

-- ==========================================
-- INSTRUCTIONS:
-- 1. Run DIAGNOSE_DATABASE_STATE.sql first to see what's missing
-- 2. Run this script to create only missing tables
-- 3. This uses IF NOT EXISTS so it's safe to run multiple times
-- ==========================================

-- ==========================================
-- PART 1: FOUNDATION TABLES (if missing)
-- ==========================================

CREATE TABLE IF NOT EXISTS accounts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    role TEXT DEFAULT 'user',
    account_id UUID REFERENCES accounts(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS org_settings (
    id SERIAL PRIMARY KEY,
    account_id UUID REFERENCES accounts(id),
    day_rates JSONB DEFAULT '{"installer": 250, "supervisor": 350, "vehicle": 50, "waste": 100}'::jsonb,
    vat_rate DECIMAL(5,2) DEFAULT 20.0,
    guest_enabled BOOLEAN DEFAULT false,
    guest_photos_read BOOLEAN DEFAULT true,
    guest_photos_upload BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(account_id)
);

CREATE TABLE IF NOT EXISTS sites (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    address TEXT,
    account_id UUID REFERENCES accounts(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Jobs table - critical foundation table
CREATE TABLE IF NOT EXISTS jobs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    reference TEXT,
    client_name TEXT,
    end_user TEXT,
    location TEXT,
    status TEXT DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'snagging', 'completed', 'on_hold', 'cancelled')),
    progress DECIMAL(5,2) DEFAULT 0,
    percent_complete INTEGER DEFAULT 0,
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    estimated_completion_date DATE,
    quoted_amount DECIMAL(12,2),
    total_invoiced NUMERIC(12,2) DEFAULT 0,
    last_invoice_date DATE,
    invoice_status TEXT,
    products JSONB,
    quote_details JSONB,
    labour_summary JSONB,
    lead_installer_id UUID REFERENCES auth.users(id),
    site_id UUID REFERENCES sites(id),
    tasks_generated BOOLEAN DEFAULT false,
    account_id UUID REFERENCES accounts(id),
    created_by UUID REFERENCES auth.users(id),
    location_x DECIMAL(10,6),
    location_y DECIMAL(10,6),
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- PART 2: JOB-RELATED TABLES (if missing)
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

CREATE TABLE IF NOT EXISTS job_notes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

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

CREATE TABLE IF NOT EXISTS job_planning (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
    planning_data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(job_id)
);

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

CREATE TABLE IF NOT EXISTS job_costs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
    labour_days DECIMAL(8,2) DEFAULT 0,
    crew_size INTEGER DEFAULT 2,
    installers_per_day INTEGER DEFAULT 2,
    supervisors_per_day INTEGER DEFAULT 0,
    buffer_percent DECIMAL(5,2) DEFAULT 0,
    vehicle_days INTEGER DEFAULT 0,
    waste_loads INTEGER DEFAULT 0,
    total_labour_cost DECIMAL(12,2),
    total_vehicle_cost DECIMAL(12,2),
    total_waste_cost DECIMAL(12,2),
    total_cost DECIMAL(12,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(job_id)
);

CREATE TABLE IF NOT EXISTS job_pins (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
    pin VARCHAR(10) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(job_id)
);

CREATE TABLE IF NOT EXISTS temp_access_tokens (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    pin VARCHAR(10),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cost_access (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    has_access BOOLEAN DEFAULT false,
    granted_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

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

-- ==========================================
-- PART 3: ADD MISSING INDEXES
-- ==========================================

CREATE INDEX IF NOT EXISTS idx_accounts_name ON accounts(name);
CREATE INDEX IF NOT EXISTS idx_user_profiles_account_id ON user_profiles(account_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_org_settings_account_id ON org_settings(account_id);
CREATE INDEX IF NOT EXISTS idx_sites_account_id ON sites(account_id);

CREATE INDEX IF NOT EXISTS idx_jobs_account_id ON jobs(account_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_created_by ON jobs(created_by);
CREATE INDEX IF NOT EXISTS idx_jobs_reference ON jobs(reference);
CREATE INDEX IF NOT EXISTS idx_jobs_client_name ON jobs(client_name);
CREATE INDEX IF NOT EXISTS idx_jobs_start_date ON jobs(start_date);
CREATE INDEX IF NOT EXISTS idx_jobs_deleted_at ON jobs(deleted_at);
CREATE INDEX IF NOT EXISTS idx_jobs_lead_installer ON jobs(lead_installer_id);
CREATE INDEX IF NOT EXISTS idx_jobs_site_id ON jobs(site_id);

CREATE INDEX IF NOT EXISTS idx_job_documents_job_id ON job_documents(job_id);
CREATE INDEX IF NOT EXISTS idx_job_photos_job_id ON job_photos(job_id);
CREATE INDEX IF NOT EXISTS idx_job_drawings_job_id ON job_drawings(job_id);
CREATE INDEX IF NOT EXISTS idx_job_notes_job_id ON job_notes(job_id);
CREATE INDEX IF NOT EXISTS idx_job_tasks_job_id ON job_tasks(job_id);
CREATE INDEX IF NOT EXISTS idx_job_planning_job_id ON job_planning(job_id);
CREATE INDEX IF NOT EXISTS idx_job_risk_flags_job_id ON job_risk_flags(job_id);
CREATE INDEX IF NOT EXISTS idx_job_costs_job_id ON job_costs(job_id);
CREATE INDEX IF NOT EXISTS idx_job_pins_job_id ON job_pins(job_id);
CREATE INDEX IF NOT EXISTS idx_cost_access_user_id ON cost_access(user_id);
CREATE INDEX IF NOT EXISTS idx_job_items_job_id ON job_items(job_id);

-- ==========================================
-- PART 4: CREATE HELPER FUNCTIONS (if missing)
-- ==========================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

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

-- ==========================================
-- PART 5: CREATE TRIGGERS (if missing)
-- ==========================================

DROP TRIGGER IF EXISTS update_accounts_updated_at ON accounts;
CREATE TRIGGER update_accounts_updated_at
    BEFORE UPDATE ON accounts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_org_settings_updated_at ON org_settings;
CREATE TRIGGER update_org_settings_updated_at
    BEFORE UPDATE ON org_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_sites_updated_at ON sites;
CREATE TRIGGER update_sites_updated_at
    BEFORE UPDATE ON sites
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_jobs_updated_at ON jobs;
CREATE TRIGGER update_jobs_updated_at
    BEFORE UPDATE ON jobs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

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
-- PART 6: ENABLE RLS (if not already enabled)
-- ==========================================

ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
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

-- ==========================================
-- PART 7: CREATE RLS POLICIES (if missing)
-- ==========================================

-- Accounts policies
DROP POLICY IF EXISTS accounts_access_policy ON accounts;
CREATE POLICY accounts_access_policy ON accounts
    FOR ALL
    USING (
        id IN (
            SELECT account_id FROM user_profiles
            WHERE id = auth.uid()
        )
    );

-- User profiles policies
DROP POLICY IF EXISTS user_profiles_read_policy ON user_profiles;
CREATE POLICY user_profiles_read_policy ON user_profiles
    FOR SELECT
    USING (
        account_id IN (
            SELECT account_id FROM user_profiles
            WHERE id = auth.uid()
        )
    );

DROP POLICY IF EXISTS user_profiles_update_policy ON user_profiles;
CREATE POLICY user_profiles_update_policy ON user_profiles
    FOR UPDATE
    USING (id = auth.uid());

-- Org settings policies
DROP POLICY IF EXISTS org_settings_access_policy ON org_settings;
CREATE POLICY org_settings_access_policy ON org_settings
    FOR ALL
    USING (
        account_id IN (
            SELECT account_id FROM user_profiles
            WHERE id = auth.uid()
        )
    );

-- Sites policies
DROP POLICY IF EXISTS sites_access_policy ON sites;
CREATE POLICY sites_access_policy ON sites
    FOR ALL
    USING (
        account_id IN (
            SELECT account_id FROM user_profiles
            WHERE id = auth.uid()
        )
    );

-- Jobs policies
DROP POLICY IF EXISTS jobs_access_policy ON jobs;
CREATE POLICY jobs_access_policy ON jobs
    FOR ALL
    USING (
        deleted_at IS NULL
        AND (
            account_id IN (
                SELECT account_id FROM user_profiles
                WHERE id = auth.uid()
            )
            OR created_by = auth.uid()
        )
    );

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

-- Job costs policies (with cost_access restriction)
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
-- COMPLETION MESSAGE
-- ==========================================

DO $$
BEGIN
    RAISE NOTICE '✓ Incremental migration complete';
    RAISE NOTICE '✓ Created only missing tables using IF NOT EXISTS';
    RAISE NOTICE '✓ All indexes, triggers, and RLS policies applied';
    RAISE NOTICE '✓ Safe to run multiple times';
END $$;
