-- ==========================================
-- DATABASE STATE DIAGNOSTIC
-- Run this in Supabase SQL Editor to check current schema state
-- ==========================================

-- ==========================================
-- PART 1: CHECK WHICH CORE TABLES EXIST
-- ==========================================

SELECT
    'Core Foundation Tables' as category,
    tablename,
    CASE
        WHEN tablename IN (
            SELECT tablename FROM pg_tables
            WHERE schemaname = 'public'
        ) THEN '✅ EXISTS'
        ELSE '❌ MISSING'
    END as status
FROM (
    VALUES
        ('accounts'),
        ('user_profiles'),
        ('org_settings'),
        ('sites'),
        ('jobs')
) AS expected_tables(tablename)
ORDER BY tablename;

-- ==========================================
-- PART 2: CHECK JOB-RELATED TABLES
-- ==========================================

SELECT
    'Job-Related Tables' as category,
    tablename,
    CASE
        WHEN tablename IN (
            SELECT tablename FROM pg_tables
            WHERE schemaname = 'public'
        ) THEN '✅ EXISTS'
        ELSE '❌ MISSING'
    END as status
FROM (
    VALUES
        ('job_documents'),
        ('job_photos'),
        ('job_drawings'),
        ('job_notes'),
        ('job_tasks'),
        ('job_planning'),
        ('job_risk_flags'),
        ('job_costs'),
        ('job_pins'),
        ('temp_access_tokens'),
        ('cost_access'),
        ('job_items')
) AS expected_tables(tablename)
ORDER BY tablename;

-- ==========================================
-- PART 3: CHECK QUOTE & PRODUCT TABLES
-- ==========================================

SELECT
    'Quote & Product Tables' as category,
    tablename,
    CASE
        WHEN tablename IN (
            SELECT tablename FROM pg_tables
            WHERE schemaname = 'public'
        ) THEN '✅ EXISTS'
        ELSE '❌ MISSING'
    END as status
FROM (
    VALUES
        ('quotes'),
        ('quote_shares'),
        ('quote_lines'),
        ('product_catalogue'),
        ('product_aliases')
) AS expected_tables(tablename)
ORDER BY tablename;

-- ==========================================
-- PART 4: CHECK LABOUR TRACKING TABLES
-- ==========================================

SELECT
    'Labour Tracking Tables' as category,
    tablename,
    CASE
        WHEN tablename IN (
            SELECT tablename FROM pg_tables
            WHERE schemaname = 'public'
        ) THEN '✅ EXISTS'
        ELSE '❌ MISSING'
    END as status
FROM (
    VALUES
        ('labour_resources'),
        ('labour_shifts'),
        ('labour_assignments'),
        ('labour_calendar_events'),
        ('labour_time_tracking'),
        ('project_labour_allocation'),
        ('product_labour_rates'),
        ('labour_matrix_targets'),
        ('labour_planning_overrides')
) AS expected_tables(tablename)
ORDER BY tablename;

-- ==========================================
-- PART 5: CHECK TASK & PROGRESS TABLES
-- ==========================================

SELECT
    'Task & Progress Tables' as category,
    tablename,
    CASE
        WHEN tablename IN (
            SELECT tablename FROM pg_tables
            WHERE schemaname = 'public'
        ) THEN '✅ EXISTS'
        ELSE '❌ MISSING'
    END as status
FROM (
    VALUES
        ('generated_tasks'),
        ('job_floorplans'),
        ('job_edit_history'),
        ('product_progress'),
        ('daily_closeout_forms'),
        ('daily_progress_log'),
        ('offline_sync_queue')
) AS expected_tables(tablename)
ORDER BY tablename;

-- ==========================================
-- PART 6: CHECK DASHBOARD & ANALYTICS TABLES
-- ==========================================

SELECT
    'Dashboard & Analytics Tables' as category,
    tablename,
    CASE
        WHEN tablename IN (
            SELECT tablename FROM pg_tables
            WHERE schemaname = 'public'
        ) THEN '✅ EXISTS'
        ELSE '❌ MISSING'
    END as status
FROM (
    VALUES
        ('crew_usage'),
        ('buffer_usage'),
        ('finance_metrics'),
        ('vehicles'),
        ('waste_loads'),
        ('activity_log'),
        ('construction_progress_metrics'),
        ('construction_milestones'),
        ('daily_progress_reports'),
        ('quality_inspections'),
        ('safety_incidents'),
        ('resource_utilization')
) AS expected_tables(tablename)
ORDER BY tablename;

-- ==========================================
-- PART 7: CHECK INVOICING & FEATURE FLAGS
-- ==========================================

SELECT
    'Invoicing & Feature Flags' as category,
    tablename,
    CASE
        WHEN tablename IN (
            SELECT tablename FROM pg_tables
            WHERE schemaname = 'public'
        ) THEN '✅ EXISTS'
        ELSE '❌ MISSING'
    END as status
FROM (
    VALUES
        ('invoice_schedules'),
        ('invoice_schedule_items'),
        ('job_invoice_history'),
        ('user_permissions'),
        ('feature_flags'),
        ('user_flag_overrides'),
        ('feature_flag_analytics'),
        ('flag_environments')
) AS expected_tables(tablename)
ORDER BY tablename;

-- ==========================================
-- PART 8: CHECK VIEWS
-- ==========================================

SELECT
    'Views' as category,
    viewname as tablename,
    '✅ EXISTS' as status
FROM pg_views
WHERE schemaname = 'public'
AND viewname LIKE 'v_%'
ORDER BY viewname;

-- ==========================================
-- PART 9: SUMMARY COUNT
-- ==========================================

SELECT
    '📊 SUMMARY' as report,
    COUNT(*) as existing_tables
FROM pg_tables
WHERE schemaname = 'public';

SELECT
    '📊 EXPECTED TOTAL' as report,
    58 as total_tables;

-- ==========================================
-- PART 10: LIST MISSING TABLES
-- ==========================================

SELECT
    '❌ MISSING TABLES' as status,
    expected_table
FROM (
    VALUES
        ('accounts'), ('user_profiles'), ('org_settings'), ('sites'), ('jobs'),
        ('job_documents'), ('job_photos'), ('job_drawings'), ('job_notes'), ('job_tasks'),
        ('job_planning'), ('job_risk_flags'), ('job_costs'), ('job_pins'), ('temp_access_tokens'),
        ('cost_access'), ('job_items'), ('quotes'), ('quote_shares'), ('quote_lines'),
        ('product_catalogue'), ('product_aliases'), ('labour_resources'), ('labour_shifts'),
        ('labour_assignments'), ('labour_calendar_events'), ('labour_time_tracking'),
        ('project_labour_allocation'), ('product_labour_rates'), ('labour_matrix_targets'),
        ('labour_planning_overrides'), ('generated_tasks'), ('job_floorplans'), ('job_edit_history'),
        ('product_progress'), ('daily_closeout_forms'), ('daily_progress_log'), ('offline_sync_queue'),
        ('crew_usage'), ('buffer_usage'), ('finance_metrics'), ('vehicles'), ('waste_loads'),
        ('activity_log'), ('construction_progress_metrics'), ('construction_milestones'),
        ('daily_progress_reports'), ('quality_inspections'), ('safety_incidents'),
        ('resource_utilization'), ('invoice_schedules'), ('invoice_schedule_items'),
        ('job_invoice_history'), ('user_permissions'), ('feature_flags'), ('user_flag_overrides'),
        ('feature_flag_analytics'), ('flag_environments')
) AS expected(expected_table)
WHERE expected_table NOT IN (
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
)
ORDER BY expected_table;

-- ==========================================
-- PART 11: LIST UNEXPECTED TABLES
-- ==========================================

SELECT
    '⚠️  UNEXPECTED TABLES (not in schema)' as status,
    tablename
FROM pg_tables
WHERE schemaname = 'public'
AND tablename NOT IN (
    'accounts', 'user_profiles', 'org_settings', 'sites', 'jobs',
    'job_documents', 'job_photos', 'job_drawings', 'job_notes', 'job_tasks',
    'job_planning', 'job_risk_flags', 'job_costs', 'job_pins', 'temp_access_tokens',
    'cost_access', 'job_items', 'quotes', 'quote_shares', 'quote_lines',
    'product_catalogue', 'product_aliases', 'labour_resources', 'labour_shifts',
    'labour_assignments', 'labour_calendar_events', 'labour_time_tracking',
    'project_labour_allocation', 'product_labour_rates', 'labour_matrix_targets',
    'labour_planning_overrides', 'generated_tasks', 'job_floorplans', 'job_edit_history',
    'product_progress', 'daily_closeout_forms', 'daily_progress_log', 'offline_sync_queue',
    'crew_usage', 'buffer_usage', 'finance_metrics', 'vehicles', 'waste_loads',
    'activity_log', 'construction_progress_metrics', 'construction_milestones',
    'daily_progress_reports', 'quality_inspections', 'safety_incidents',
    'resource_utilization', 'invoice_schedules', 'invoice_schedule_items',
    'job_invoice_history', 'user_permissions', 'feature_flags', 'user_flag_overrides',
    'feature_flag_analytics', 'flag_environments'
)
ORDER BY tablename;

-- ==========================================
-- PART 12: CHECK CRITICAL COLUMNS ON JOBS TABLE
-- ==========================================

SELECT
    'Jobs Table Columns' as check_type,
    column_name,
    data_type,
    '✅ EXISTS' as status
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'jobs'
AND column_name IN (
    'id', 'title', 'reference', 'client_name', 'status', 'progress',
    'start_date', 'end_date', 'quoted_amount', 'account_id', 'created_by',
    'deleted_at', 'lead_installer_id', 'products', 'quote_details', 'labour_summary'
)
ORDER BY column_name;

-- ==========================================
-- COMPLETION MESSAGE
-- ==========================================

DO $$
BEGIN
    RAISE NOTICE '✓ Diagnostic complete';
    RAISE NOTICE 'Review the output above to see:';
    RAISE NOTICE '  - Which tables exist vs missing';
    RAISE NOTICE '  - Total count vs expected (58 tables)';
    RAISE NOTICE '  - Any unexpected tables';
    RAISE NOTICE '  - Critical columns on jobs table';
END $$;
