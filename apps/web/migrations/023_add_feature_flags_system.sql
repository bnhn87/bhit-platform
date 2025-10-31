-- Migration: Feature Flags System for BHIT Work OS
-- Enables controlled rollout of features, A/B testing, and configuration management

-- Feature flags table
CREATE TABLE IF NOT EXISTS feature_flags (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    flag_key VARCHAR(100) NOT NULL UNIQUE,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    is_enabled BOOLEAN NOT NULL DEFAULT false,
    flag_type VARCHAR(50) NOT NULL DEFAULT 'boolean', -- boolean, percentage, user_list, role_based
    conditions JSONB DEFAULT '{}', -- Storage for complex conditions
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),

    -- Metadata
    category VARCHAR(100) DEFAULT 'general', -- ui, backend, experimental, rollout
    environment VARCHAR(50) DEFAULT 'production', -- development, staging, production
    rollout_percentage DECIMAL(5,2) DEFAULT 0.0, -- 0.0 to 100.0 for gradual rollouts

    CONSTRAINT valid_rollout_percentage CHECK (rollout_percentage >= 0 AND rollout_percentage <= 100),
    CONSTRAINT valid_flag_type CHECK (flag_type IN ('boolean', 'percentage', 'user_list', 'role_based', 'variant'))
);

-- User-specific flag overrides
CREATE TABLE IF NOT EXISTS user_flag_overrides (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    flag_key VARCHAR(100) NOT NULL,
    is_enabled BOOLEAN NOT NULL,
    reason TEXT,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),

    CONSTRAINT unique_user_flag UNIQUE(user_id, flag_key),
    CONSTRAINT fk_flag_key FOREIGN KEY (flag_key) REFERENCES feature_flags(flag_key) ON DELETE CASCADE
);

-- Feature flag analytics/usage tracking
CREATE TABLE IF NOT EXISTS feature_flag_analytics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    flag_key VARCHAR(100) NOT NULL,
    user_id UUID REFERENCES auth.users(id),
    user_role VARCHAR(50),
    event_type VARCHAR(50) NOT NULL, -- 'check', 'enabled', 'disabled'
    session_id VARCHAR(100),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT fk_analytics_flag_key FOREIGN KEY (flag_key) REFERENCES feature_flags(flag_key) ON DELETE CASCADE
);

-- Feature flag environments/configurations
CREATE TABLE IF NOT EXISTS flag_environments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    flag_key VARCHAR(100) NOT NULL,
    environment VARCHAR(50) NOT NULL,
    is_enabled BOOLEAN NOT NULL DEFAULT false,
    rollout_percentage DECIMAL(5,2) DEFAULT 0.0,
    conditions JSONB DEFAULT '{}',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id),

    CONSTRAINT unique_flag_environment UNIQUE(flag_key, environment),
    CONSTRAINT fk_env_flag_key FOREIGN KEY (flag_key) REFERENCES feature_flags(flag_key) ON DELETE CASCADE
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_feature_flags_key ON feature_flags(flag_key);
CREATE INDEX IF NOT EXISTS idx_feature_flags_enabled ON feature_flags(is_enabled);
CREATE INDEX IF NOT EXISTS idx_feature_flags_category ON feature_flags(category);
CREATE INDEX IF NOT EXISTS idx_feature_flags_environment ON feature_flags(environment);
CREATE INDEX IF NOT EXISTS idx_user_flag_overrides_user ON user_flag_overrides(user_id);
CREATE INDEX IF NOT EXISTS idx_user_flag_overrides_flag ON user_flag_overrides(flag_key);
CREATE INDEX IF NOT EXISTS idx_flag_analytics_key ON feature_flag_analytics(flag_key);
CREATE INDEX IF NOT EXISTS idx_flag_analytics_user ON feature_flag_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_flag_analytics_created ON feature_flag_analytics(created_at);
CREATE INDEX IF NOT EXISTS idx_flag_environments_key ON flag_environments(flag_key);

-- ==========================================
-- ROW LEVEL SECURITY POLICIES
-- ==========================================

-- Enable RLS
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_flag_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_flag_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE flag_environments ENABLE ROW LEVEL SECURITY;

-- Feature flags policies (read for all authenticated, write for admins)
CREATE POLICY feature_flags_read_policy ON feature_flags
    FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY feature_flags_write_policy ON feature_flags
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid()
            AND role IN ('admin', 'director')
        )
    );

-- User flag overrides policies
CREATE POLICY user_flag_overrides_read_policy ON user_flag_overrides
    FOR SELECT
    USING (
        user_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid()
            AND role IN ('admin', 'director')
        )
    );

CREATE POLICY user_flag_overrides_write_policy ON user_flag_overrides
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid()
            AND role IN ('admin', 'director')
        )
    );

-- Analytics policies (write for all authenticated, read for admins)
CREATE POLICY flag_analytics_write_policy ON feature_flag_analytics
    FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY flag_analytics_read_policy ON feature_flag_analytics
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid()
            AND role IN ('admin', 'director')
        )
    );

-- Environment policies (admin only)
CREATE POLICY flag_environments_policy ON flag_environments
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid()
            AND role IN ('admin', 'director')
        )
    );

-- ==========================================
-- FUNCTIONS
-- ==========================================

-- Function to check if a feature flag is enabled for a user
CREATE OR REPLACE FUNCTION is_feature_enabled(
    p_flag_key VARCHAR,
    p_user_id UUID DEFAULT auth.uid(),
    p_user_role VARCHAR DEFAULT NULL
) RETURNS BOOLEAN AS $$
DECLARE
    flag_record feature_flags%ROWTYPE;
    override_record user_flag_overrides%ROWTYPE;
    user_role_val VARCHAR;
    random_val DECIMAL;
BEGIN
    -- Get user role if not provided
    IF p_user_role IS NULL AND p_user_id IS NOT NULL THEN
        SELECT role INTO user_role_val FROM users WHERE id = p_user_id;
    ELSE
        user_role_val := p_user_role;
    END IF;

    -- Check for user-specific override first
    SELECT * INTO override_record
    FROM user_flag_overrides
    WHERE user_id = p_user_id
    AND flag_key = p_flag_key
    AND (expires_at IS NULL OR expires_at > NOW());

    IF FOUND THEN
        -- Log analytics
        INSERT INTO feature_flag_analytics (flag_key, user_id, user_role, event_type, metadata)
        VALUES (p_flag_key, p_user_id, user_role_val, 'check', '{"source": "override"}');

        RETURN override_record.is_enabled;
    END IF;

    -- Get feature flag
    SELECT * INTO flag_record FROM feature_flags WHERE flag_key = p_flag_key;

    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;

    -- Check if globally disabled
    IF NOT flag_record.is_enabled THEN
        RETURN FALSE;
    END IF;

    -- Handle different flag types
    CASE flag_record.flag_type
        WHEN 'boolean' THEN
            -- Log analytics
            INSERT INTO feature_flag_analytics (flag_key, user_id, user_role, event_type, metadata)
            VALUES (p_flag_key, p_user_id, user_role_val, 'check', '{"source": "boolean"}');

            RETURN flag_record.is_enabled;

        WHEN 'percentage' THEN
            -- Generate consistent random value based on user and flag
            SELECT (('x' || substr(md5(p_user_id::text || p_flag_key), 1, 8))::bit(32)::int % 10000) / 100.0 INTO random_val;

            -- Log analytics
            INSERT INTO feature_flag_analytics (flag_key, user_id, user_role, event_type, metadata)
            VALUES (p_flag_key, p_user_id, user_role_val, 'check',
                   jsonb_build_object('source', 'percentage', 'random_val', random_val, 'threshold', flag_record.rollout_percentage));

            RETURN random_val < flag_record.rollout_percentage;

        WHEN 'role_based' THEN
            -- Check if user role is in allowed roles
            IF flag_record.conditions ? 'allowed_roles' THEN
                -- Log analytics
                INSERT INTO feature_flag_analytics (flag_key, user_id, user_role, event_type, metadata)
                VALUES (p_flag_key, p_user_id, user_role_val, 'check',
                       jsonb_build_object('source', 'role_based', 'user_role', user_role_val));

                RETURN flag_record.conditions->'allowed_roles' ? user_role_val;
            END IF;

            RETURN FALSE;

        ELSE
            RETURN FALSE;
    END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to track feature flag usage
CREATE OR REPLACE FUNCTION track_feature_usage(
    p_flag_key VARCHAR,
    p_event_type VARCHAR,
    p_metadata JSONB DEFAULT '{}'
) RETURNS VOID AS $$
BEGIN
    INSERT INTO feature_flag_analytics (
        flag_key,
        user_id,
        user_role,
        event_type,
        metadata
    )
    SELECT
        p_flag_key,
        auth.uid(),
        users.role,
        p_event_type,
        p_metadata
    FROM users
    WHERE users.id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update feature flag
CREATE OR REPLACE FUNCTION update_feature_flag(
    p_flag_key VARCHAR,
    p_is_enabled BOOLEAN DEFAULT NULL,
    p_rollout_percentage DECIMAL DEFAULT NULL,
    p_conditions JSONB DEFAULT NULL
) RETURNS BOOLEAN AS $$
BEGIN
    UPDATE feature_flags
    SET
        is_enabled = COALESCE(p_is_enabled, is_enabled),
        rollout_percentage = COALESCE(p_rollout_percentage, rollout_percentage),
        conditions = COALESCE(p_conditions, conditions),
        updated_at = NOW()
    WHERE flag_key = p_flag_key;

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- SEED DEFAULT FEATURE FLAGS
-- ==========================================

INSERT INTO feature_flags (flag_key, name, description, is_enabled, flag_type, category, rollout_percentage) VALUES
    ('product_cross_check', 'Product Cross-Check', 'Enable advanced product validation in SmartQuote', true, 'boolean', 'smartquote', 100.0),
    ('labour_calendar_view', 'Labour Calendar View', 'Interactive calendar for labour allocation', true, 'boolean', 'labour', 100.0),
    ('database_driven_products', 'Database Product Catalogue', 'Use database for product install times', true, 'boolean', 'backend', 100.0),
    ('dashboard_analytics', 'Advanced Dashboard Analytics', 'Enhanced dashboard with real-time data', true, 'boolean', 'dashboard', 100.0),
    ('ai_quote_parsing', 'AI Quote Parsing', 'Use AI for quote document parsing', true, 'boolean', 'smartquote', 100.0),
    ('quote_database_persistence', 'Quote Database Storage', 'Store quotes in database instead of localStorage', true, 'boolean', 'backend', 100.0),
    ('experimental_planning_engine', 'Experimental Planning Engine', 'New planning-driven architecture features', false, 'percentage', 'experimental', 10.0),
    ('beta_floor_planner', 'Beta Floor Planner', 'Next-generation floor planning tools', false, 'role_based', 'experimental', 0.0),
    ('advanced_labour_tracking', 'Advanced Labour Tracking', 'Enhanced labour management features', false, 'percentage', 'labour', 25.0),
    ('cost_optimization', 'Cost Optimization Features', 'Advanced cost analysis and optimization', false, 'role_based', 'costing', 0.0)
ON CONFLICT (flag_key) DO UPDATE SET
    updated_at = NOW();

-- Set role-based conditions for specific flags
UPDATE feature_flags
SET conditions = '{"allowed_roles": ["director", "admin"]}'
WHERE flag_type = 'role_based' AND flag_key IN ('beta_floor_planner', 'cost_optimization');

-- ==========================================
-- AUTOMATED TRIGGERS
-- ==========================================

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_feature_flag_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_feature_flags_updated_at
    BEFORE UPDATE ON feature_flags
    FOR EACH ROW
    EXECUTE FUNCTION update_feature_flag_timestamp();

CREATE TRIGGER update_flag_environments_updated_at
    BEFORE UPDATE ON flag_environments
    FOR EACH ROW
    EXECUTE FUNCTION update_feature_flag_timestamp();