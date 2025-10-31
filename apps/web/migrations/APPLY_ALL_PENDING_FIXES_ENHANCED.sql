-- ============================================
-- FULL SQL FIX: product_catalogue subcategory error + hardening
-- Idempotent. Safe to re-run.
-- ============================================

-- 0) Ensure required extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1) Ensure product_catalogue exists with full shape
CREATE TABLE IF NOT EXISTS public.product_catalogue (
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
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1.A) If table already existed without columns, add them
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='product_catalogue' AND column_name='category'
  ) THEN
    ALTER TABLE public.product_catalogue ADD COLUMN category TEXT;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='product_catalogue' AND column_name='subcategory'
  ) THEN
    ALTER TABLE public.product_catalogue ADD COLUMN subcategory TEXT;
  END IF;
END $$;

-- 1.B) Indexes for product_catalogue
CREATE INDEX IF NOT EXISTS idx_product_catalogue_code ON public.product_catalogue(product_code);
CREATE INDEX IF NOT EXISTS idx_product_catalogue_category ON public.product_catalogue(category, subcategory);

-- 2) quotes.prepared_by must be UUID with FK to auth.users
DO $$
BEGIN
  -- add column if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='quotes' AND column_name='prepared_by'
  ) THEN
    ALTER TABLE public.quotes ADD COLUMN prepared_by UUID;
  END IF;

  -- if wrong type, convert
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema='public' AND table_name='quotes' AND column_name='prepared_by' AND data_type='text'
  ) THEN
    ALTER TABLE public.quotes
      ALTER COLUMN prepared_by TYPE uuid USING NULLIF(trim(prepared_by), '')::uuid;
  END IF;

  -- add FK if missing
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.quotes'::regclass
      AND contype='f'
      AND conname = 'quotes_prepared_by_fkey'
  ) THEN
    ALTER TABLE public.quotes
      ADD CONSTRAINT quotes_prepared_by_fkey
      FOREIGN KEY (prepared_by) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- 2.A) Ensure quotes.created_by exists and is UUID FK
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='quotes' AND column_name='created_by'
  ) THEN
    ALTER TABLE public.quotes ADD COLUMN created_by UUID;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
     AND tc.table_schema = kcu.table_schema
    WHERE tc.table_schema='public'
      AND tc.table_name='quotes'
      AND tc.constraint_type='FOREIGN KEY'
      AND tc.constraint_name='quotes_created_by_fkey'
  ) IS FALSE THEN
    BEGIN
      ALTER TABLE public.quotes
        ADD CONSTRAINT quotes_created_by_fkey
        FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;
    EXCEPTION WHEN duplicate_object THEN
      -- ignore if concurrently created
      NULL;
    END;
  END IF;
END $$;

-- 2.B) Backfill created_by from prepared_by when missing
UPDATE public.quotes q
SET created_by = q.prepared_by
WHERE q.created_by IS NULL AND q.prepared_by IS NOT NULL;

-- 3) Ensure quote_lines table exists with proper structure
CREATE TABLE IF NOT EXISTS public.quote_lines (
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

-- 3.A) Ensure RLS enabled on quote_lines and policy allows created_by OR prepared_by
ALTER TABLE public.quote_lines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own quote lines" ON public.quote_lines;

CREATE POLICY "Users can manage their own quote lines" ON public.quote_lines
FOR ALL
USING (
  EXISTS (
    SELECT 1
    FROM public.quotes
    WHERE quotes.id = quote_lines.quote_id
      AND (quotes.created_by = auth.uid() OR quotes.prepared_by = auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.quotes
    WHERE quotes.id = quote_lines.quote_id
      AND (quotes.created_by = auth.uid() OR quotes.prepared_by = auth.uid())
  )
);

-- 4) Supporting indexes used by RLS and joins
CREATE INDEX IF NOT EXISTS idx_quotes_created_by_id ON public.quotes(created_by, id);
CREATE INDEX IF NOT EXISTS idx_quotes_prepared_by_id ON public.quotes(prepared_by, id);
CREATE INDEX IF NOT EXISTS idx_quote_lines_quote_id ON public.quote_lines(quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_lines_product_code ON public.quote_lines(product_code);

-- 5) Create activity_log table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.activity_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    activity_type TEXT NOT NULL,
    activity_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5.A) Add activity_type column if missing
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'activity_log' AND column_name = 'activity_type') THEN
        ALTER TABLE activity_log ADD COLUMN activity_type TEXT NOT NULL DEFAULT 'general';
    END IF;
END $$;

-- 5.B) Create indexes for activity_log
CREATE INDEX IF NOT EXISTS idx_activity_log_user_id ON public.activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_activity_type ON public.activity_log(activity_type);
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON public.activity_log(created_at DESC);

-- 5.C) Enable RLS for activity_log
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for activity_log
DROP POLICY IF EXISTS "Users can view their own activity" ON public.activity_log;
CREATE POLICY "Users can view their own activity" ON public.activity_log
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own activity" ON public.activity_log;
CREATE POLICY "Users can insert their own activity" ON public.activity_log
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 6) Create user_profiles table if missing
CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    role TEXT DEFAULT 'user',
    account_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6.A) Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_user_profiles_account_id ON public.user_profiles(account_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON public.user_profiles(role);

-- 6.B) Enable RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- 6.C) Create RLS policies
DROP POLICY IF EXISTS "Users can view their own profile" ON public.user_profiles;
CREATE POLICY "Users can view their own profile" ON public.user_profiles
    FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.user_profiles;
CREATE POLICY "Users can update their own profile" ON public.user_profiles
    FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.user_profiles;
CREATE POLICY "Users can insert their own profile" ON public.user_profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- 6.D) Auto-create profiles for existing users
INSERT INTO public.user_profiles (id, role)
SELECT id, 'user'
FROM auth.users
WHERE id NOT IN (SELECT id FROM user_profiles)
ON CONFLICT (id) DO NOTHING;

-- 7) Add missing columns to quotes table
DO $$
BEGIN
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

-- 8) Optional: keep updated_at fresh on product_catalogue
CREATE OR REPLACE FUNCTION public.set_updated_at_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_product_catalogue_set_updated_at ON public.product_catalogue;
CREATE TRIGGER trg_product_catalogue_set_updated_at
BEFORE UPDATE ON public.product_catalogue
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at_timestamp();

-- 9) Grant necessary permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.product_catalogue TO authenticated;
GRANT SELECT ON public.product_catalogue TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quote_lines TO authenticated;
GRANT SELECT ON public.quote_lines TO anon;
GRANT SELECT, INSERT ON public.activity_log TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_profiles TO authenticated;
GRANT SELECT ON public.user_profiles TO anon;

-- 10) Cleanup orphaned data
DELETE FROM public.quote_lines WHERE quote_id NOT IN (SELECT id FROM public.quotes);
DELETE FROM public.activity_log WHERE user_id NOT IN (SELECT id FROM auth.users);
DELETE FROM public.user_profiles WHERE id NOT IN (SELECT id FROM auth.users);

-- 11) Final verification
DO $$
DECLARE
    missing_tables TEXT := '';
    has_errors BOOLEAN := FALSE;
BEGIN
    -- Check for required tables
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_profiles') THEN
        missing_tables := missing_tables || 'user_profiles, ';
        has_errors := TRUE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'quotes') THEN
        missing_tables := missing_tables || 'quotes, ';
        has_errors := TRUE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'quote_lines') THEN
        missing_tables := missing_tables || 'quote_lines, ';
        has_errors := TRUE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'activity_log') THEN
        missing_tables := missing_tables || 'activity_log, ';
        has_errors := TRUE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'product_catalogue') THEN
        missing_tables := missing_tables || 'product_catalogue, ';
        has_errors := TRUE;
    END IF;

    IF has_errors THEN
        RAISE NOTICE 'Missing tables: %', missing_tables;
    ELSE
        RAISE NOTICE '✅ All required tables exist!';
    END IF;
END $$;

-- Output summary
SELECT
    'SmartQuote Database Setup' as status,
    COUNT(*) as tables_ready
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('user_profiles', 'quotes', 'quote_lines', 'activity_log', 'product_catalogue');

COMMENT ON SCHEMA public IS 'SmartQuote database fixes applied successfully';