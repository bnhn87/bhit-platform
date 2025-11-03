-- Migration: Create Client Contacts System with Multiple Addresses
-- Purpose: Allow clients to have multiple addresses (sites, warehouses, etc.) for logistics planning
-- Author: BHIT Development
-- Date: 2025-01-02

-- Create clients table if not exists
CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    company_name VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    is_active BOOLEAN DEFAULT true,
    UNIQUE(email)
);

-- Create client addresses table (multiple addresses per client)
CREATE TABLE IF NOT EXISTS client_addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
    address_type VARCHAR(50) NOT NULL, -- 'main', 'site', 'collection', 'warehouse', 'billing', 'other'
    label VARCHAR(255) NOT NULL, -- e.g., "Main Office", "Birmingham Warehouse", "WeWork Leeds"
    address_line1 VARCHAR(255) NOT NULL,
    address_line2 VARCHAR(255),
    city VARCHAR(100) NOT NULL,
    postcode VARCHAR(10) NOT NULL, -- UK postcode format
    country VARCHAR(2) DEFAULT 'GB',

    -- Additional logistics information
    has_loading_bay BOOLEAN DEFAULT false,
    access_restrictions TEXT, -- e.g., "Goods lift max 2000kg", "No access before 9am"
    contact_name VARCHAR(255), -- Site-specific contact
    contact_phone VARCHAR(50), -- Site-specific phone

    -- ULEZ and congestion zone flags
    in_ulez_zone BOOLEAN DEFAULT false,
    in_congestion_zone BOOLEAN DEFAULT false,

    -- Distance cache (from BHIT base)
    distance_from_base_miles NUMERIC(6,2),
    travel_time_minutes INTEGER,

    is_default BOOLEAN DEFAULT false, -- Default address for this type
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT unique_default_per_type UNIQUE (client_id, address_type, is_default)
);

-- Create index for fast lookups
CREATE INDEX idx_client_addresses_client_id ON client_addresses(client_id);
CREATE INDEX idx_client_addresses_postcode ON client_addresses(postcode);
CREATE INDEX idx_clients_email ON clients(email);
CREATE INDEX idx_clients_company ON clients(company_name);

-- Create quotes_clients link table
CREATE TABLE IF NOT EXISTS quote_clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_id VARCHAR(255) NOT NULL, -- SmartQuote ID
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    site_address_id UUID REFERENCES client_addresses(id) ON DELETE SET NULL,
    collection_address_id UUID REFERENCES client_addresses(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_quote_clients_quote_id ON quote_clients(quote_id);

-- Function to calculate distance between postcodes (placeholder - would integrate with real API)
CREATE OR REPLACE FUNCTION calculate_postcode_distance(
    postcode1 VARCHAR(10),
    postcode2 VARCHAR(10)
)
RETURNS TABLE(
    distance_miles NUMERIC(6,2),
    travel_time_minutes INTEGER
) AS $$
BEGIN
    -- This is a placeholder function
    -- In production, this would call an external API like Google Maps or Mapbox
    -- For now, return mock data based on postcode areas

    RETURN QUERY
    SELECT
        CASE
            -- Same area
            WHEN LEFT(postcode1, 2) = LEFT(postcode2, 2) THEN 5.0::NUMERIC(6,2)
            -- London to Birmingham
            WHEN LEFT(postcode1, 2) IN ('SE', 'SW', 'EC', 'WC') AND LEFT(postcode2, 2) LIKE 'B%' THEN 120.0::NUMERIC(6,2)
            -- London to Leeds
            WHEN LEFT(postcode1, 2) IN ('SE', 'SW', 'EC', 'WC') AND LEFT(postcode2, 2) LIKE 'LS%' THEN 195.0::NUMERIC(6,2)
            -- Default
            ELSE 50.0::NUMERIC(6,2)
        END as distance_miles,
        CASE
            -- Same area
            WHEN LEFT(postcode1, 2) = LEFT(postcode2, 2) THEN 15
            -- London to Birmingham
            WHEN LEFT(postcode1, 2) IN ('SE', 'SW', 'EC', 'WC') AND LEFT(postcode2, 2) LIKE 'B%' THEN 150
            -- London to Leeds
            WHEN LEFT(postcode1, 2) IN ('SE', 'SW', 'EC', 'WC') AND LEFT(postcode2, 2) LIKE 'LS%' THEN 240
            -- Default
            ELSE 60
        END as travel_time_minutes;
END;
$$ LANGUAGE plpgsql;

-- Function to check if postcode is in ULEZ zone
CREATE OR REPLACE FUNCTION is_in_ulez_zone(postcode VARCHAR(10))
RETURNS BOOLEAN AS $$
BEGIN
    -- Central London postcodes typically in ULEZ
    RETURN LEFT(postcode, 2) IN ('EC', 'WC', 'E1', 'SE1', 'SW1', 'N1', 'NW1', 'W1');
END;
$$ LANGUAGE plpgsql;

-- Function to check if postcode is in congestion zone
CREATE OR REPLACE FUNCTION is_in_congestion_zone(postcode VARCHAR(10))
RETURNS BOOLEAN AS $$
BEGIN
    -- Central London postcodes in congestion zone
    RETURN LEFT(postcode, 2) IN ('EC', 'WC', 'SW1', 'W1');
END;
$$ LANGUAGE plpgsql;

-- Trigger to update zone flags when address is inserted/updated
CREATE OR REPLACE FUNCTION update_address_zones()
RETURNS TRIGGER AS $$
BEGIN
    NEW.in_ulez_zone := is_in_ulez_zone(NEW.postcode);
    NEW.in_congestion_zone := is_in_congestion_zone(NEW.postcode);

    -- Calculate distance from BHIT base (example: SE1 4AA)
    SELECT distance_miles, travel_time_minutes
    INTO NEW.distance_from_base_miles, NEW.travel_time_minutes
    FROM calculate_postcode_distance('SE1 4AA', NEW.postcode);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_address_zones
BEFORE INSERT OR UPDATE ON client_addresses
FOR EACH ROW
EXECUTE FUNCTION update_address_zones();

-- Function to get client's recent addresses (for quick selection)
CREATE OR REPLACE FUNCTION get_client_recent_addresses(
    p_client_email VARCHAR(255),
    p_limit INTEGER DEFAULT 5
)
RETURNS TABLE(
    address_id UUID,
    client_name VARCHAR(255),
    address_type VARCHAR(50),
    label VARCHAR(255),
    full_address TEXT,
    postcode VARCHAR(10),
    in_ulez_zone BOOLEAN,
    distance_miles NUMERIC(6,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        ca.id as address_id,
        c.name as client_name,
        ca.address_type,
        ca.label,
        CONCAT_WS(E'\n',
            ca.address_line1,
            ca.address_line2,
            ca.city,
            ca.postcode
        ) as full_address,
        ca.postcode,
        ca.in_ulez_zone,
        ca.distance_from_base_miles as distance_miles
    FROM clients c
    JOIN client_addresses ca ON c.id = ca.client_id
    WHERE c.email = p_client_email
        AND ca.is_active = true
    ORDER BY ca.updated_at DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Insert sample data for testing
INSERT INTO clients (name, company_name, email, phone) VALUES
    ('John Smith', 'Global Tech Solutions Ltd', 'john@globaltech.com', '020 7123 4567'),
    ('Sarah Jones', 'Construction Corp', 'sarah@construction.co.uk', '0121 456 7890'),
    ('Mike Wilson', 'Tech Startup Ltd', 'mike@techstartup.io', '0113 234 5678')
ON CONFLICT (email) DO NOTHING;

-- Add sample addresses
DO $$
DECLARE
    v_client_id UUID;
BEGIN
    -- Global Tech Solutions addresses
    SELECT id INTO v_client_id FROM clients WHERE email = 'john@globaltech.com';
    IF v_client_id IS NOT NULL THEN
        INSERT INTO client_addresses (
            client_id, address_type, label, address_line1, address_line2, city, postcode,
            has_loading_bay, access_restrictions, is_default
        ) VALUES
            (v_client_id, 'billing', 'Head Office', '1 Corporate Plaza', 'Finance Department', 'London', 'EC1V 9HX', false, NULL, true),
            (v_client_id, 'site', 'Birmingham Office', 'Floor 3-5, The Mailbox', 'Commercial Street', 'Birmingham', 'B1 1RS', true, 'Goods lift available, max 2000kg', false),
            (v_client_id, 'warehouse', 'External Warehouse', 'Unit 12, Industrial Estate', 'Park Road', 'Bristol', 'BS2 0YQ', true, 'Loading bay at rear', false);
    END IF;

    -- Construction Corp addresses
    SELECT id INTO v_client_id FROM clients WHERE email = 'sarah@construction.co.uk';
    IF v_client_id IS NOT NULL THEN
        INSERT INTO client_addresses (
            client_id, address_type, label, address_line1, city, postcode,
            has_loading_bay, access_restrictions, is_default
        ) VALUES
            (v_client_id, 'main', 'Head Office', 'Construction House', 'London', 'W1A 1AA', false, NULL, true),
            (v_client_id, 'site', 'Bristol Development', 'Building Site, Plot 5', 'Bristol', 'BS1 4DJ', false, 'Site access 7am-6pm only', false);
    END IF;

    -- Tech Startup addresses
    SELECT id INTO v_client_id FROM clients WHERE email = 'mike@techstartup.io';
    IF v_client_id IS NOT NULL THEN
        INSERT INTO client_addresses (
            client_id, address_type, label, address_line1, address_line2, city, postcode,
            contact_name, contact_phone, is_default
        ) VALUES
            (v_client_id, 'main', 'WeWork Leeds', 'WeWork Building', 'Floor 3', 'Leeds', 'LS1 4AP', 'Reception', '0113 111 2222', true),
            (v_client_id, 'billing', 'Finance Office', '10 High Street', NULL, 'Manchester', 'M1 1AA', 'Accounts Dept', '0161 222 3333', false);
    END IF;
END $$;

-- Create RLS policies
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_clients ENABLE ROW LEVEL SECURITY;

-- Clients: Anyone can read, authenticated users can insert/update
CREATE POLICY "Clients are viewable by all authenticated users"
ON clients FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can create clients"
ON clients FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Users can update their created clients"
ON clients FOR UPDATE
TO authenticated
USING (created_by = auth.uid() OR auth.uid() IN (
    SELECT id FROM auth.users WHERE raw_user_meta_data->>'role' = 'admin'
));

-- Client addresses: Follow client permissions
CREATE POLICY "Client addresses viewable with client access"
ON client_addresses FOR SELECT
TO authenticated
USING (
    client_id IN (SELECT id FROM clients)
);

CREATE POLICY "Can manage addresses for accessible clients"
ON client_addresses FOR ALL
TO authenticated
USING (
    client_id IN (SELECT id FROM clients WHERE
        created_by = auth.uid() OR
        auth.uid() IN (SELECT id FROM auth.users WHERE raw_user_meta_data->>'role' = 'admin')
    )
);

-- Quote clients: Accessible to authenticated users
CREATE POLICY "Quote clients viewable by authenticated users"
ON quote_clients FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON clients TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON client_addresses TO authenticated;
GRANT SELECT, INSERT, UPDATE ON quote_clients TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_postcode_distance TO authenticated;
GRANT EXECUTE ON FUNCTION is_in_ulez_zone TO authenticated;
GRANT EXECUTE ON FUNCTION is_in_congestion_zone TO authenticated;
GRANT EXECUTE ON FUNCTION get_client_recent_addresses TO authenticated;