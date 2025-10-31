-- Migration: Create product_catalogue table for database-driven install times
-- This replaces the localStorage-based productCatalogue system

-- Product catalogue table for install times and product specifications
CREATE TABLE IF NOT EXISTS product_catalogue (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    product_code VARCHAR(200) NOT NULL UNIQUE,
    product_name VARCHAR(500),
    category VARCHAR(100) DEFAULT 'furniture',
    install_time_hours DECIMAL(6,3) NOT NULL DEFAULT 0.33,
    waste_volume_m3 DECIMAL(6,3) NOT NULL DEFAULT 0.035,
    is_heavy BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    source VARCHAR(50) DEFAULT 'manual', -- manual, learned, imported, ai-generated
    confidence_score DECIMAL(3,2) DEFAULT 1.0, -- 0.0 to 1.0 for AI-learned products
    usage_count INTEGER DEFAULT 0, -- Track how often this product is used
    last_used TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    notes TEXT,

    -- Additional metadata for advanced features
    manufacturer VARCHAR(200),
    model VARCHAR(200),
    dimensions JSONB, -- {"width": 120, "height": 75, "depth": 60}
    weight_kg DECIMAL(8,2),
    material VARCHAR(100),
    color VARCHAR(100),

    -- Configuration flags
    requires_specialist BOOLEAN DEFAULT false,
    requires_two_person BOOLEAN DEFAULT false,
    fragile BOOLEAN DEFAULT false,

    CONSTRAINT valid_install_time CHECK (install_time_hours >= 0),
    CONSTRAINT valid_waste_volume CHECK (waste_volume_m3 >= 0),
    CONSTRAINT valid_confidence CHECK (confidence_score >= 0 AND confidence_score <= 1)
);

-- Product aliases table for handling different product codes that map to same base product
CREATE TABLE IF NOT EXISTS product_aliases (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    alias_code VARCHAR(200) NOT NULL,
    master_product_code VARCHAR(200) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT fk_master_product FOREIGN KEY (master_product_code) REFERENCES product_catalogue(product_code) ON DELETE CASCADE,
    CONSTRAINT unique_alias UNIQUE(alias_code)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_product_catalogue_code ON product_catalogue(product_code);
CREATE INDEX IF NOT EXISTS idx_product_catalogue_category ON product_catalogue(category);
CREATE INDEX IF NOT EXISTS idx_product_catalogue_active ON product_catalogue(is_active);
CREATE INDEX IF NOT EXISTS idx_product_catalogue_install_time ON product_catalogue(install_time_hours);
CREATE INDEX IF NOT EXISTS idx_product_catalogue_usage_count ON product_catalogue(usage_count DESC);
CREATE INDEX IF NOT EXISTS idx_product_catalogue_last_used ON product_catalogue(last_used);
CREATE INDEX IF NOT EXISTS idx_product_aliases_alias ON product_aliases(alias_code);
CREATE INDEX IF NOT EXISTS idx_product_aliases_master ON product_aliases(master_product_code);

-- ==========================================
-- ROW LEVEL SECURITY POLICIES
-- ==========================================

-- Enable RLS
ALTER TABLE product_catalogue ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_aliases ENABLE ROW LEVEL SECURITY;

-- Policy: All authenticated users can read the product catalogue
CREATE POLICY product_catalogue_read_policy ON product_catalogue
    FOR SELECT
    USING (auth.role() = 'authenticated');

-- Policy: Only authenticated users can insert/update/delete products
CREATE POLICY product_catalogue_write_policy ON product_catalogue
    FOR ALL
    USING (auth.role() = 'authenticated');

-- Policy: All authenticated users can read product aliases
CREATE POLICY product_aliases_read_policy ON product_aliases
    FOR SELECT
    USING (auth.role() = 'authenticated');

-- Policy: Only authenticated users can manage aliases
CREATE POLICY product_aliases_write_policy ON product_aliases
    FOR ALL
    USING (auth.role() = 'authenticated');

-- ==========================================
-- MIGRATE DEFAULT PRODUCT DATA
-- ==========================================

-- Insert default product catalogue from the current SmartQuote system
INSERT INTO product_catalogue (product_code, product_name, install_time_hours, waste_volume_m3, is_heavy, source) VALUES
    ('T9b', 'Standard Office Desk T9b', 0.42, 0.035, false, 'default'),
    ('D1', 'Office Drawer Unit D1', 0.33, 0.035, false, 'default'),
    ('D2a', 'Heavy Drawer Unit D2a', 0.50, 0.035, true, 'default'),
    ('WK-S1', 'Workstation Screen WK-S1', 0.25, 0.035, false, 'default'),
    ('CH-01', 'Office Chair CH-01', 0.17, 0.035, false, 'default'),
    ('CH-05', 'Ergonomic Chair CH-05', 0.20, 0.035, false, 'default'),
    ('SOFA-3', '3-Seater Sofa', 0.75, 0.035, true, 'default'),
    ('ST-P1', 'Storage Unit ST-P1', 0.58, 0.035, false, 'default'),
    ('ST-L2', 'Large Storage Unit ST-L2', 1.00, 0.035, true, 'default'),
    ('DEFAULT', 'Standard Office Item', 0.33, 0.035, false, 'default')
ON CONFLICT (product_code) DO UPDATE SET
    product_name = EXCLUDED.product_name,
    install_time_hours = EXCLUDED.install_time_hours,
    waste_volume_m3 = EXCLUDED.waste_volume_m3,
    is_heavy = EXCLUDED.is_heavy,
    updated_at = NOW();

-- Add some common aliases for fuzzy matching
INSERT INTO product_aliases (alias_code, master_product_code) VALUES
    ('DESK', 'T9b'),
    ('TABLE', 'T9b'),
    ('WORKSTATION', 'T9b'),
    ('CHAIR', 'CH-01'),
    ('SEAT', 'CH-01'),
    ('DRAWER', 'D1'),
    ('CABINET', 'ST-P1'),
    ('STORAGE', 'ST-P1'),
    ('SOFA', 'SOFA-3'),
    ('COUCH', 'SOFA-3')
ON CONFLICT (alias_code) DO NOTHING;

-- ==========================================
-- UPDATE TRACKING FUNCTIONS
-- ==========================================

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_product_catalogue_updated_at
    BEFORE UPDATE ON product_catalogue
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to track product usage
CREATE OR REPLACE FUNCTION track_product_usage(p_product_code VARCHAR)
RETURNS VOID AS $$
BEGIN
    UPDATE product_catalogue
    SET
        usage_count = usage_count + 1,
        last_used = NOW()
    WHERE product_code = p_product_code;
END;
$$ LANGUAGE plpgsql;