-- Migration: Product Catalogue with Aliases System
-- Purpose: Allow permanent storage of product times and multiple aliases/names per product

-- Create the main product catalogue table if it doesn't exist
CREATE TABLE IF NOT EXISTS product_catalogue_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    canonical_name TEXT NOT NULL, -- The official display name (e.g., "FLX 4P")
    canonical_code TEXT UNIQUE NOT NULL, -- Primary product code
    install_time_hours DECIMAL(5,2) NOT NULL,
    waste_volume_m3 DECIMAL(6,4) DEFAULT 0.035,

    -- Normalized dimensions for matching
    dimensions_format TEXT, -- 'rect' or 'round'
    dimension_l INTEGER, -- Length in mm
    dimension_w INTEGER, -- Width in mm
    dimension_h INTEGER, -- Height in mm
    dimension_d INTEGER, -- Diameter in mm (for round products)

    -- Metadata
    category TEXT, -- 'desk', 'chair', 'storage', 'power', etc.
    source TEXT DEFAULT 'manual', -- 'catalogue', 'manual', 'learned', 'imported'
    locked BOOLEAN DEFAULT false, -- If true, cannot be auto-updated

    -- User tracking
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Search optimization
    search_tokens TEXT[], -- Array of searchable tokens

    CONSTRAINT valid_dimensions CHECK (
        (dimensions_format = 'rect' AND dimension_l IS NOT NULL AND dimension_w IS NOT NULL AND dimension_h IS NOT NULL) OR
        (dimensions_format = 'round' AND dimension_d IS NOT NULL AND dimension_h IS NOT NULL) OR
        dimensions_format IS NULL
    )
);

-- Create product aliases table for alternate codes/names
CREATE TABLE IF NOT EXISTS product_aliases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES product_catalogue_items(id) ON DELETE CASCADE,
    alias_code TEXT NOT NULL, -- Alternate product code (e.g., "FLX-4P-2816-A")
    alias_name TEXT, -- Alternate description/name
    alias_type TEXT DEFAULT 'code', -- 'code', 'name', 'description'

    -- Tracking
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    learned_from_quote TEXT, -- Track which quote this was learned from
    usage_count INTEGER DEFAULT 0, -- Track how often this alias is used

    -- Ensure unique aliases
    CONSTRAINT unique_alias UNIQUE(alias_code)
);

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_alias_code ON product_aliases(alias_code);
CREATE INDEX IF NOT EXISTS idx_product_id ON product_aliases(product_id);

-- Create a session learning table to track temporary learnings
CREATE TABLE IF NOT EXISTS product_learning_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id TEXT NOT NULL,
    product_code TEXT NOT NULL,
    product_name TEXT,
    install_time_hours DECIMAL(5,2) NOT NULL,
    waste_volume_m3 DECIMAL(6,4) DEFAULT 0.035,

    -- Link to permanent catalogue if promoted
    promoted_to_catalogue_id UUID REFERENCES product_catalogue_items(id),
    promoted_at TIMESTAMPTZ,

    -- Tracking
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    quote_id TEXT, -- Reference to the quote it came from

    -- Unique per session
    CONSTRAINT unique_session_product UNIQUE(session_id, product_code)
);

-- Create index for fast product lookups
CREATE INDEX IF NOT EXISTS idx_catalogue_canonical_code ON product_catalogue_items(canonical_code);
CREATE INDEX IF NOT EXISTS idx_catalogue_search_tokens ON product_catalogue_items USING GIN(search_tokens);
CREATE INDEX IF NOT EXISTS idx_catalogue_dimensions ON product_catalogue_items(dimension_l, dimension_w, dimension_h);

-- Function to normalize product codes for matching
CREATE OR REPLACE FUNCTION normalize_product_code(code TEXT)
RETURNS TEXT AS $$
BEGIN
    -- Convert to uppercase and remove spaces, hyphens, underscores, parentheses
    RETURN UPPER(REGEXP_REPLACE(code, '[\s\-_()]+', '', 'g'));
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to extract tokens from product name/code for searching
CREATE OR REPLACE FUNCTION extract_search_tokens(product_name TEXT, product_code TEXT)
RETURNS TEXT[] AS $$
DECLARE
    tokens TEXT[];
BEGIN
    -- Split by common delimiters and filter
    tokens := STRING_TO_ARRAY(
        UPPER(product_name || ' ' || product_code),
        ' '
    );

    -- Add normalized versions
    tokens := tokens || ARRAY[
        normalize_product_code(product_code),
        REGEXP_REPLACE(UPPER(product_name), '[^A-Z0-9]+', '', 'g')
    ];

    -- Remove empty strings and duplicates
    RETURN ARRAY(
        SELECT DISTINCT unnest(tokens)
        WHERE LENGTH(unnest(tokens)) > 0
    );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to find best matching product including aliases
CREATE OR REPLACE FUNCTION find_product_match(search_code TEXT)
RETURNS UUID AS $$
DECLARE
    normalized_search TEXT;
    matched_id UUID;
BEGIN
    normalized_search := normalize_product_code(search_code);

    -- First try exact match on canonical code
    SELECT id INTO matched_id
    FROM product_catalogue_items
    WHERE normalize_product_code(canonical_code) = normalized_search
    LIMIT 1;

    IF matched_id IS NOT NULL THEN
        RETURN matched_id;
    END IF;

    -- Then try aliases
    SELECT product_id INTO matched_id
    FROM product_aliases
    WHERE normalize_product_code(alias_code) = normalized_search
    LIMIT 1;

    IF matched_id IS NOT NULL THEN
        -- Increment usage count for this alias
        UPDATE product_aliases
        SET usage_count = usage_count + 1
        WHERE normalize_product_code(alias_code) = normalized_search;

        RETURN matched_id;
    END IF;

    -- Try token-based fuzzy matching as last resort
    SELECT id INTO matched_id
    FROM product_catalogue_items
    WHERE search_tokens && extract_search_tokens(search_code, search_code)
    ORDER BY cardinality(search_tokens && extract_search_tokens(search_code, search_code)) DESC
    LIMIT 1;

    RETURN matched_id;
END;
$$ LANGUAGE plpgsql;

-- Seed initial FLX products based on the spec
INSERT INTO product_catalogue_items (
    canonical_name, canonical_code, install_time_hours, waste_volume_m3,
    dimensions_format, dimension_l, dimension_w, dimension_h, dimension_d,
    category, source, locked
) VALUES
    ('FLX 4P', 'FLX-4P', 1.45, 0.075, 'rect', 2400, 1600, 750, NULL, 'desk', 'catalogue', true),
    ('FLX 6P', 'FLX-6P', 1.9, 0.090, 'rect', 3600, 1600, 750, NULL, 'desk', 'catalogue', true),
    ('FLX 6P', 'FLX-6P-L4200', 1.9, 0.090, 'rect', 4200, 1600, 750, NULL, 'desk', 'catalogue', true),
    ('FLX 8P', 'FLX-8P', 2.0, 0.120, 'rect', 4800, 1600, 750, NULL, 'desk', 'catalogue', true),
    ('FLX Single', 'FLX-SINGLE', 0.6, 0.035, NULL, NULL, NULL, NULL, NULL, 'desk', 'catalogue', true),
    ('Hi-Lo Single', 'HILO-S', 1.3, 0.040, NULL, NULL, NULL, NULL, NULL, 'desk', 'catalogue', true),
    ('Hi-Lo Duo', 'HILO-D', 1.65, 0.055, NULL, NULL, NULL, NULL, NULL, 'desk', 'catalogue', true),
    ('Just A Chair', 'JAC', 0.3, 0.015, NULL, NULL, NULL, NULL, NULL, 'chair', 'catalogue', true),
    ('Glow Lamp', 'GLOW', 0.35, 0.005, NULL, NULL, NULL, NULL, NULL, 'lighting', 'catalogue', true),
    ('Frank', 'FRANK-2400', 1.6, 0.070, 'rect', 2400, 1200, 750, NULL, 'desk', 'catalogue', true),
    ('Bass Rectangular', 'BASS-2000', 1.6, 0.065, 'rect', 2000, 1200, 750, NULL, 'desk', 'catalogue', true),
    ('Bass Rectangular', 'BASS-2400', 1.6, 0.070, 'rect', 2400, 1200, 750, NULL, 'desk', 'catalogue', true),
    ('Arne Coffee', 'ARNE-1200', 1.2, 0.050, 'rect', 1200, 1200, 390, NULL, 'table', 'catalogue', true),
    ('Workaround Circular', 'WA-RND-1000', 0.7, 0.035, 'round', NULL, NULL, 750, 1000, 'desk', 'catalogue', true)
ON CONFLICT (canonical_code) DO UPDATE
    SET install_time_hours = EXCLUDED.install_time_hours,
        waste_volume_m3 = EXCLUDED.waste_volume_m3;

-- Add common aliases for FLX products
INSERT INTO product_aliases (product_id, alias_code, alias_type)
SELECT id, unnest(ARRAY[
    'FLX-4P-2816-A',
    'FLX-4P-2800',
    'FLX_4P_2816_A',
    'FLX-COWORK-4P',
    '4P FLX'
]), 'code'
FROM product_catalogue_items
WHERE canonical_code = 'FLX-4P'
ON CONFLICT (alias_code) DO NOTHING;

INSERT INTO product_aliases (product_id, alias_code, alias_type)
SELECT id, unnest(ARRAY[
    'FLX-6P-3600',
    'FLX_6P_3600',
    'FLX-COWORK-6P',
    '6P FLX'
]), 'code'
FROM product_catalogue_items
WHERE canonical_code = 'FLX-6P' AND dimension_l = 3600
ON CONFLICT (alias_code) DO NOTHING;

INSERT INTO product_aliases (product_id, alias_code, alias_type)
SELECT id, unnest(ARRAY[
    'FLX-8P-4800',
    'FLX_8P_4800',
    'FLX-COWORK-8P',
    '8P FLX'
]), 'code'
FROM product_catalogue_items
WHERE canonical_code = 'FLX-8P'
ON CONFLICT (alias_code) DO NOTHING;

-- Add aliases for chairs
INSERT INTO product_aliases (product_id, alias_code, alias_type)
SELECT id, unnest(ARRAY[
    'R-JAC',
    'JAC-B',
    'JAC BLACK',
    'JUST A CHAIR'
]), 'code'
FROM product_catalogue_items
WHERE canonical_code = 'JAC'
ON CONFLICT (alias_code) DO NOTHING;

-- RLS Policies
ALTER TABLE product_catalogue_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_learning_sessions ENABLE ROW LEVEL SECURITY;

-- Everyone can read the catalogue
CREATE POLICY "Public read access" ON product_catalogue_items
    FOR SELECT USING (true);

CREATE POLICY "Public read access" ON product_aliases
    FOR SELECT USING (true);

-- Only authenticated users can add/update
CREATE POLICY "Authenticated users can insert" ON product_catalogue_items
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update unlocked items" ON product_catalogue_items
    FOR UPDATE USING (auth.uid() IS NOT NULL AND NOT locked);

CREATE POLICY "Authenticated users can manage aliases" ON product_aliases
    FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can manage their session learnings" ON product_learning_sessions
    FOR ALL USING (auth.uid() = created_by OR auth.uid() IS NOT NULL);

-- Create view for easy product lookup with all aliases
CREATE OR REPLACE VIEW product_catalogue_view AS
SELECT
    p.id,
    p.canonical_name,
    p.canonical_code,
    p.install_time_hours,
    p.waste_volume_m3,
    p.dimensions_format,
    p.dimension_l,
    p.dimension_w,
    p.dimension_h,
    p.dimension_d,
    p.category,
    p.locked,
    p.source,
    COALESCE(
        ARRAY_AGG(
            DISTINCT a.alias_code
            ORDER BY a.alias_code
        ) FILTER (WHERE a.alias_code IS NOT NULL),
        ARRAY[]::TEXT[]
    ) AS aliases,
    COUNT(DISTINCT a.id) AS alias_count,
    SUM(a.usage_count) AS total_alias_usage
FROM product_catalogue_items p
LEFT JOIN product_aliases a ON a.product_id = p.id
GROUP BY p.id;

-- Update search tokens when products are inserted or updated
CREATE OR REPLACE FUNCTION update_search_tokens()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_tokens := extract_search_tokens(NEW.canonical_name, NEW.canonical_code);
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_product_search_tokens
    BEFORE INSERT OR UPDATE ON product_catalogue_items
    FOR EACH ROW
    EXECUTE FUNCTION update_search_tokens();

-- Grant permissions
GRANT ALL ON product_catalogue_items TO authenticated;
GRANT ALL ON product_aliases TO authenticated;
GRANT ALL ON product_learning_sessions TO authenticated;
GRANT SELECT ON product_catalogue_view TO authenticated;
GRANT EXECUTE ON FUNCTION find_product_match TO authenticated;
GRANT EXECUTE ON FUNCTION normalize_product_code TO authenticated;
GRANT EXECUTE ON FUNCTION extract_search_tokens TO authenticated;