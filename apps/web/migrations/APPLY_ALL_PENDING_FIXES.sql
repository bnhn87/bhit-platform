-- ============================================
-- COMPREHENSIVE DATABASE FIX
-- Apply this script to fix all current issues
-- ============================================

-- 1. FIX USER PROFILES TABLE (if missing)
-- ============================================
CREATE TABLE IF NOT EXISTS accounts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
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

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_user_profiles_account_id ON user_profiles(account_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON user_profiles TO authenticated;
GRANT SELECT ON user_profiles TO anon;

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_profiles' AND policyname = 'Users can view their own profile') THEN
        CREATE POLICY "Users can view their own profile" ON user_profiles
            FOR SELECT USING (auth.uid() = id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_profiles' AND policyname = 'Users can update their own profile') THEN
        CREATE POLICY "Users can update their own profile" ON user_profiles
            FOR UPDATE USING (auth.uid() = id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_profiles' AND policyname = 'Users can insert their own profile') THEN
        CREATE POLICY "Users can insert their own profile" ON user_profiles
            FOR INSERT WITH CHECK (auth.uid() = id);
    END IF;
END $$;

-- Auto-create profiles for existing users
INSERT INTO user_profiles (id, role)
SELECT id, 'user'
FROM auth.users
WHERE id NOT IN (SELECT id FROM user_profiles)
ON CONFLICT (id) DO NOTHING;

-- 2. FIX QUOTES AND QUOTE_LINES TABLES
-- ============================================

-- Add missing columns to quotes table if they don't exist
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quotes' AND column_name = 'prepared_by') THEN
        ALTER TABLE quotes ADD COLUMN prepared_by TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quotes' AND column_name = 'delivery_address') THEN
        ALTER TABLE quotes ADD COLUMN delivery_address TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quotes' AND column_name = 'project_name') THEN
        ALTER TABLE quotes ADD COLUMN project_name TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quotes' AND column_name = 'quote_details') THEN
        ALTER TABLE quotes ADD COLUMN quote_details JSONB;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quotes' AND column_name = 'calculation_results') THEN
        ALTER TABLE quotes ADD COLUMN calculation_results JSONB;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quotes' AND column_name = 'products_data') THEN
        ALTER TABLE quotes ADD COLUMN products_data JSONB;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quotes' AND column_name = 'configuration_snapshot') THEN
        ALTER TABLE quotes ADD COLUMN configuration_snapshot JSONB;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quotes' AND column_name = 'version') THEN
        ALTER TABLE quotes ADD COLUMN version INTEGER DEFAULT 1;
    END IF;
END $$;

-- Create quote_lines table
CREATE TABLE IF NOT EXISTS quote_lines (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    quote_id UUID REFERENCES quotes(id) ON DELETE CASCADE,
    line_number INTEGER NOT NULL,
    product_code TEXT,
    product_description TEXT NOT NULL,
    quantity NUMERIC(10, 2) NOT NULL DEFAULT 0,
    time_per_unit NUMERIC(10, 2) DEFAULT 0,
    total_time NUMERIC(10, 2) DEFAULT 0,
    waste_per_unit NUMERIC(10, 2) DEFAULT 0,
    total_waste NUMERIC(10, 2) DEFAULT 0,
    is_heavy BOOLEAN DEFAULT FALSE,
    is_manually_edited BOOLEAN DEFAULT FALSE,
    source TEXT CHECK (source IN ('catalogue', 'user-inputted', 'default', 'learned')),
    raw_description TEXT,
    clean_description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    UNIQUE(quote_id, line_number)
);

-- Create indexes for quote_lines
CREATE INDEX IF NOT EXISTS idx_quote_lines_quote_id ON quote_lines(quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_lines_product_code ON quote_lines(product_code);

-- Grant permissions for quote_lines
GRANT SELECT, INSERT, UPDATE, DELETE ON quote_lines TO authenticated;
GRANT SELECT ON quote_lines TO anon;

-- Enable RLS for quote_lines
ALTER TABLE quote_lines ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for quote_lines
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'quote_lines' AND policyname = 'Users can manage their own quote lines') THEN
        CREATE POLICY "Users can manage their own quote lines" ON quote_lines
            FOR ALL USING (
                EXISTS (
                    SELECT 1 FROM quotes
                    WHERE quotes.id = quote_lines.quote_id
                    AND quotes.created_by = auth.uid()
                )
            );
    END IF;
END $$;

-- 3. FIX ACTIVITY LOG TABLE
-- ============================================

-- Create activity_log table if it doesn't exist
CREATE TABLE IF NOT EXISTS activity_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    activity_type TEXT NOT NULL,
    activity_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add activity_type column if missing
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activity_log' AND column_name = 'activity_type') THEN
        ALTER TABLE activity_log ADD COLUMN activity_type TEXT NOT NULL DEFAULT 'general';
    END IF;
END $$;

-- Create indexes for activity_log
CREATE INDEX IF NOT EXISTS idx_activity_log_user_id ON activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_activity_type ON activity_log(activity_type);
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON activity_log(created_at DESC);

-- Grant permissions for activity_log
GRANT SELECT, INSERT ON activity_log TO authenticated;

-- Enable RLS for activity_log
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for activity_log
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'activity_log' AND policyname = 'Users can view their own activity') THEN
        CREATE POLICY "Users can view their own activity" ON activity_log
            FOR SELECT USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'activity_log' AND policyname = 'Users can insert their own activity') THEN
        CREATE POLICY "Users can insert their own activity" ON activity_log
            FOR INSERT WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

-- 4. CREATE PRODUCT CATALOGUE TABLE (for SmartQuote)
-- ============================================

CREATE TABLE IF NOT EXISTS product_catalogue (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_code TEXT UNIQUE NOT NULL,
    product_name TEXT NOT NULL,
    install_time_hours NUMERIC(10, 2) NOT NULL DEFAULT 0,
    is_heavy BOOLEAN DEFAULT FALSE,
    waste_volume_m3 NUMERIC(10, 2) DEFAULT 0,
    category TEXT,
    subcategory TEXT,
    notes TEXT,
    learned_count INTEGER DEFAULT 0,
    last_updated_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_product_catalogue_code ON product_catalogue(product_code);
CREATE INDEX IF NOT EXISTS idx_product_catalogue_category ON product_catalogue(category, subcategory);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON product_catalogue TO authenticated;
GRANT SELECT ON product_catalogue TO anon;

-- 5. FIX QUOTES TABLE OWNER REFERENCE
-- ============================================

-- Add created_by column if missing
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quotes' AND column_name = 'created_by') THEN
        ALTER TABLE quotes ADD COLUMN created_by UUID REFERENCES auth.users(id);
        -- Set existing quotes to the first user (you may want to adjust this)
        UPDATE quotes SET created_by = (SELECT id FROM auth.users LIMIT 1) WHERE created_by IS NULL;
    END IF;
END $$;

-- 6. CREATE HELPER FUNCTIONS
-- ============================================

-- Function to clean up orphaned data
CREATE OR REPLACE FUNCTION cleanup_orphaned_data() RETURNS void AS $$
BEGIN
    -- Delete quote_lines without parent quotes
    DELETE FROM quote_lines WHERE quote_id NOT IN (SELECT id FROM quotes);

    -- Delete activity_log entries for deleted users
    DELETE FROM activity_log WHERE user_id NOT IN (SELECT id FROM auth.users);

    -- Delete user_profiles for deleted users
    DELETE FROM user_profiles WHERE id NOT IN (SELECT id FROM auth.users);
END;
$$ LANGUAGE plpgsql;

-- 7. RUN CLEANUP
-- ============================================
SELECT cleanup_orphaned_data();

-- 8. VERIFY INSTALLATION
-- ============================================
DO $$
DECLARE
    missing_tables TEXT := '';
    has_errors BOOLEAN := FALSE;
BEGIN
    -- Check for required tables
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_profiles') THEN
        missing_tables := missing_tables || 'user_profiles, ';
        has_errors := TRUE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'quotes') THEN
        missing_tables := missing_tables || 'quotes, ';
        has_errors := TRUE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'quote_lines') THEN
        missing_tables := missing_tables || 'quote_lines, ';
        has_errors := TRUE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'activity_log') THEN
        missing_tables := missing_tables || 'activity_log, ';
        has_errors := TRUE;
    END IF;

    IF has_errors THEN
        RAISE NOTICE 'Missing tables: %', missing_tables;
    ELSE
        RAISE NOTICE 'All required tables exist!';
    END IF;
END $$;

-- Output summary
SELECT
    'Tables Created/Fixed' as status,
    COUNT(*) as count
FROM information_schema.tables
WHERE table_name IN ('user_profiles', 'quotes', 'quote_lines', 'activity_log', 'product_catalogue');

COMMENT ON SCHEMA public IS 'Database fixes applied successfully';