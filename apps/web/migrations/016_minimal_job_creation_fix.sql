-- Minimal Migration - Just add the essential columns for job creation
-- This focuses only on what's needed for "Create Job from Quote" to work

-- Add missing columns to jobs table
ALTER TABLE jobs 
ADD COLUMN IF NOT EXISTS products JSONB DEFAULT '[]'::jsonb;

ALTER TABLE jobs 
ADD COLUMN IF NOT EXISTS quote_details JSONB;

ALTER TABLE jobs 
ADD COLUMN IF NOT EXISTS labour_summary JSONB;

ALTER TABLE jobs 
ADD COLUMN IF NOT EXISTS quoted_amount DECIMAL(12,2) DEFAULT 0;

-- Create sites table if needed (jobs may reference it)
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

-- Create basic labour management tables (essential for job creation)
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

-- Essential functions for job creation
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

-- Basic RLS for essential tables
ALTER TABLE job_labour_bank ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_build_targets ENABLE ROW LEVEL SECURITY;

-- Everyone can read, authenticated users can modify
DROP POLICY IF EXISTS "job_labour_bank_select" ON job_labour_bank;
CREATE POLICY "job_labour_bank_select" ON job_labour_bank FOR SELECT USING (true);

DROP POLICY IF EXISTS "job_labour_bank_insert" ON job_labour_bank;
CREATE POLICY "job_labour_bank_insert" ON job_labour_bank FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "job_build_targets_select" ON job_build_targets;
CREATE POLICY "job_build_targets_select" ON job_build_targets FOR SELECT USING (true);

DROP POLICY IF EXISTS "job_build_targets_insert" ON job_build_targets;
CREATE POLICY "job_build_targets_insert" ON job_build_targets FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Basic indexes for performance
CREATE INDEX IF NOT EXISTS idx_jobs_products ON jobs USING GIN (products);
CREATE INDEX IF NOT EXISTS idx_job_labour_bank_job_id ON job_labour_bank(job_id);
CREATE INDEX IF NOT EXISTS idx_job_build_targets_job_id ON job_build_targets(job_id);

SELECT 'Minimal Job Creation Migration - SUCCESS' as status;