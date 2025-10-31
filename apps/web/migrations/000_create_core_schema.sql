-- ==========================================
-- Migration 000: Core Foundation Schema
-- Creates the foundational tables that all other tables depend on
-- MUST BE RUN FIRST before all other migrations
-- ==========================================

-- ==========================================
-- PART 1: ACCOUNTS TABLE (Multi-tenancy)
-- ==========================================

CREATE TABLE IF NOT EXISTS accounts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- PART 2: EXTEND AUTH.USERS OR CREATE USERS TABLE
-- ==========================================
-- Note: Supabase provides auth.users automatically
-- We'll create a profile extension table instead

CREATE TABLE IF NOT EXISTS user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    role TEXT DEFAULT 'user',
    account_id UUID REFERENCES accounts(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- PART 3: ORGANIZATION SETTINGS
-- ==========================================

CREATE TABLE IF NOT EXISTS org_settings (
    id SERIAL PRIMARY KEY,
    account_id UUID REFERENCES accounts(id),
    day_rates JSONB DEFAULT '{
        "installer": 250,
        "supervisor": 350,
        "vehicle": 50,
        "waste": 100
    }'::jsonb,
    vat_rate DECIMAL(5,2) DEFAULT 20.0,
    guest_enabled BOOLEAN DEFAULT false,
    guest_photos_read BOOLEAN DEFAULT true,
    guest_photos_upload BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(account_id)
);

-- ==========================================
-- PART 4: JOBS TABLE (Core Application Table)
-- ==========================================

CREATE TABLE IF NOT EXISTS jobs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

    -- Basic Info
    title TEXT NOT NULL,
    reference TEXT,
    client_name TEXT,
    end_user TEXT,
    location TEXT,

    -- Status & Progress
    status TEXT DEFAULT 'planned' CHECK (status IN ('planned', 'in_progress', 'snagging', 'completed', 'on_hold', 'cancelled')),
    progress DECIMAL(5,2) DEFAULT 0,
    percent_complete INTEGER DEFAULT 0,

    -- Dates
    start_date TIMESTAMP WITH TIME ZONE,
    end_date TIMESTAMP WITH TIME ZONE,
    estimated_completion_date DATE,

    -- Financial
    quoted_amount DECIMAL(12,2),
    total_invoiced NUMERIC(12,2) DEFAULT 0,
    last_invoice_date DATE,
    invoice_status TEXT,

    -- Data Fields
    products JSONB,
    quote_details JSONB,
    labour_summary JSONB,

    -- Assignments
    lead_installer_id UUID REFERENCES auth.users(id),
    site_id UUID,

    -- Flags
    tasks_generated BOOLEAN DEFAULT false,

    -- Multi-tenancy & Ownership
    account_id UUID REFERENCES accounts(id),
    created_by UUID REFERENCES auth.users(id),

    -- Geolocation
    location_x DECIMAL(10,6),
    location_y DECIMAL(10,6),

    -- Soft Delete
    deleted_at TIMESTAMP WITH TIME ZONE,

    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- PART 5: SITES TABLE (Referenced by jobs)
-- ==========================================

CREATE TABLE IF NOT EXISTS sites (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    address TEXT,
    account_id UUID REFERENCES accounts(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Now add the foreign key for jobs.site_id
ALTER TABLE jobs DROP CONSTRAINT IF EXISTS jobs_site_id_fkey;
ALTER TABLE jobs ADD CONSTRAINT jobs_site_id_fkey FOREIGN KEY (site_id) REFERENCES sites(id);

-- ==========================================
-- PART 6: INDEXES FOR PERFORMANCE
-- ==========================================

-- Accounts indexes
CREATE INDEX IF NOT EXISTS idx_accounts_name ON accounts(name);

-- User profiles indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_account_id ON user_profiles(account_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);

-- Org settings indexes
CREATE INDEX IF NOT EXISTS idx_org_settings_account_id ON org_settings(account_id);

-- Jobs indexes
CREATE INDEX IF NOT EXISTS idx_jobs_account_id ON jobs(account_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_created_by ON jobs(created_by);
CREATE INDEX IF NOT EXISTS idx_jobs_reference ON jobs(reference);
CREATE INDEX IF NOT EXISTS idx_jobs_client_name ON jobs(client_name);
CREATE INDEX IF NOT EXISTS idx_jobs_start_date ON jobs(start_date);
CREATE INDEX IF NOT EXISTS idx_jobs_deleted_at ON jobs(deleted_at);
CREATE INDEX IF NOT EXISTS idx_jobs_lead_installer ON jobs(lead_installer_id);
CREATE INDEX IF NOT EXISTS idx_jobs_site_id ON jobs(site_id);

-- Sites indexes
CREATE INDEX IF NOT EXISTS idx_sites_account_id ON sites(account_id);

-- ==========================================
-- PART 7: ROW LEVEL SECURITY POLICIES
-- ==========================================

-- Enable RLS
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sites ENABLE ROW LEVEL SECURITY;

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

-- ==========================================
-- PART 8: TRIGGERS
-- ==========================================

-- Update timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update triggers
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

DROP TRIGGER IF EXISTS update_jobs_updated_at ON jobs;
CREATE TRIGGER update_jobs_updated_at
    BEFORE UPDATE ON jobs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_sites_updated_at ON sites;
CREATE TRIGGER update_sites_updated_at
    BEFORE UPDATE ON sites
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ==========================================
-- PART 9: COMMENTS
-- ==========================================

COMMENT ON TABLE accounts IS 'Multi-tenancy: Organizations/companies using the system';
COMMENT ON TABLE user_profiles IS 'Extended user profile data beyond Supabase auth.users';
COMMENT ON TABLE org_settings IS 'Organization-specific settings including day rates and guest access';
COMMENT ON TABLE jobs IS 'Core jobs table - main entity of the application';
COMMENT ON TABLE sites IS 'Physical sites/locations where jobs take place';

COMMENT ON COLUMN jobs.status IS 'Job status: planned, in_progress, snagging, completed, on_hold, cancelled';
COMMENT ON COLUMN jobs.deleted_at IS 'Soft delete timestamp - NULL means active job';
COMMENT ON COLUMN jobs.products IS 'JSONB array of products for this job';
COMMENT ON COLUMN jobs.quote_details IS 'JSONB snapshot of quote details from SmartQuote';
COMMENT ON COLUMN jobs.labour_summary IS 'JSONB summary of labour allocation and targets';

-- ==========================================
-- COMPLETION MESSAGE
-- ==========================================

DO $$
BEGIN
    RAISE NOTICE '✓ Core schema migration complete';
    RAISE NOTICE '✓ Created tables: accounts, user_profiles, org_settings, jobs, sites';
    RAISE NOTICE '✓ Created % indexes', (
        SELECT COUNT(*) FROM pg_indexes
        WHERE tablename IN ('accounts', 'user_profiles', 'org_settings', 'jobs', 'sites')
    );
    RAISE NOTICE '✓ Applied RLS policies and triggers';
    RAISE NOTICE '✓ Ready to run subsequent migrations';
END $$;
