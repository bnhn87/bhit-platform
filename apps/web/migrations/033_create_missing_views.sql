-- ==========================================
-- Migration 033: Create Missing Views
-- Creates views for optimized queries and reporting
-- Depends on: 000_create_core_schema.sql, 032_create_job_related_tables.sql
-- ==========================================

-- ==========================================
-- PART 1: V_JOBS_LIST VIEW
-- Optimized view for job listings with aggregated data
-- ==========================================

CREATE OR REPLACE VIEW v_jobs_list AS
SELECT
    j.id,
    j.title,
    j.reference,
    j.client_name,
    j.end_user,
    j.status,
    j.progress,
    j.percent_complete,
    j.location,
    j.start_date,
    j.end_date,
    j.estimated_completion_date,
    j.quoted_amount,
    j.total_invoiced,
    j.invoice_status,
    j.lead_installer_id,
    j.account_id,
    j.created_by,
    j.created_at,
    j.updated_at,

    -- Aggregated counts
    (SELECT COUNT(*) FROM job_documents WHERE job_id = j.id) AS documents_count,
    (SELECT COUNT(*) FROM job_photos WHERE job_id = j.id) AS photos_count,
    (SELECT COUNT(*) FROM job_drawings WHERE job_id = j.id) AS drawings_count,
    (SELECT COUNT(*) FROM job_notes WHERE job_id = j.id) AS notes_count,
    (SELECT COUNT(*) FROM job_tasks WHERE job_id = j.id AND is_done = false) AS open_tasks_count,
    (SELECT COUNT(*) FROM job_tasks WHERE job_id = j.id AND is_done = true) AS completed_tasks_count,

    -- Lead installer info
    up.full_name AS lead_installer_name,

    -- Cost summary (if user has access)
    jc.labour_days,
    jc.total_cost,

    -- Latest activity
    (
        SELECT MAX(greatest_date) FROM (
            SELECT GREATEST(
                COALESCE(MAX(created_at), j.created_at),
                COALESCE((SELECT MAX(created_at) FROM job_documents WHERE job_id = j.id), j.created_at),
                COALESCE((SELECT MAX(created_at) FROM job_photos WHERE job_id = j.id), j.created_at),
                COALESCE((SELECT MAX(created_at) FROM job_notes WHERE job_id = j.id), j.created_at)
            ) AS greatest_date
            FROM jobs WHERE id = j.id
        ) AS dates
    ) AS last_activity_at

FROM jobs j
LEFT JOIN user_profiles up ON j.lead_installer_id = up.id
LEFT JOIN job_costs jc ON j.id = jc.job_id
WHERE j.deleted_at IS NULL;

-- ==========================================
-- PART 2: V_LABOUR_CALENDAR VIEW
-- Aggregated view for labour calendar and resource planning
-- ==========================================

CREATE OR REPLACE VIEW v_labour_calendar AS
SELECT
    lce.id,
    lce.event_date,
    lce.job_id,
    lce.resource_id,
    lce.shift_type,
    lce.hours_allocated,
    lce.status,

    -- Job info
    j.title AS job_title,
    j.reference AS job_reference,
    j.status AS job_status,
    j.location AS job_location,

    -- Resource info
    lr.name AS resource_name,
    lr.role AS resource_role,
    lr.hourly_rate,

    -- Calculated fields
    (lce.hours_allocated * lr.hourly_rate) AS estimated_cost,

    -- Time tracking if exists
    ltt.actual_hours,
    ltt.actual_cost,

    -- Timestamps
    lce.created_at,
    lce.updated_at

FROM labour_calendar_events lce
LEFT JOIN jobs j ON lce.job_id = j.id
LEFT JOIN labour_resources lr ON lce.resource_id = lr.id
LEFT JOIN labour_time_tracking ltt ON lce.id = ltt.event_id
WHERE j.deleted_at IS NULL;

-- ==========================================
-- PART 3: V_ACTIVE_JOBS VIEW
-- Quick view of currently active jobs
-- ==========================================

CREATE OR REPLACE VIEW v_active_jobs AS
SELECT
    j.*,
    up.full_name AS lead_installer_name,
    (SELECT COUNT(*) FROM job_tasks WHERE job_id = j.id AND is_done = false) AS open_tasks
FROM jobs j
LEFT JOIN user_profiles up ON j.lead_installer_id = up.id
WHERE j.status = 'in_progress'
AND j.deleted_at IS NULL
ORDER BY j.start_date DESC;

-- ==========================================
-- PART 4: V_JOBS_WITH_ISSUES VIEW
-- Jobs with risk flags or delays
-- ==========================================

CREATE OR REPLACE VIEW v_jobs_with_issues AS
SELECT DISTINCT
    j.id,
    j.title,
    j.reference,
    j.status,

    -- Risk summary
    (SELECT COUNT(*) FROM job_risk_flags WHERE job_id = j.id AND is_resolved = false) AS unresolved_risks,
    (SELECT COUNT(*) FROM job_risk_flags WHERE job_id = j.id AND severity = 'critical') AS critical_risks,

    -- Latest risk
    (
        SELECT risk_type
        FROM job_risk_flags
        WHERE job_id = j.id AND is_resolved = false
        ORDER BY severity DESC, created_at DESC
        LIMIT 1
    ) AS latest_risk_type,

    -- Progress indicator
    CASE
        WHEN j.end_date < NOW() AND j.status != 'completed' THEN 'overdue'
        WHEN j.progress < 50 AND j.start_date < NOW() - INTERVAL '7 days' THEN 'behind_schedule'
        ELSE 'on_track'
    END AS schedule_status

FROM jobs j
WHERE j.deleted_at IS NULL
AND (
    EXISTS (SELECT 1 FROM job_risk_flags WHERE job_id = j.id AND is_resolved = false)
    OR (j.end_date < NOW() AND j.status != 'completed')
);

-- ==========================================
-- PART 5: V_JOB_SUMMARY VIEW
-- Comprehensive job summary with all related data
-- ==========================================

CREATE OR REPLACE VIEW v_job_summary AS
SELECT
    j.id,
    j.title,
    j.reference,
    j.client_name,
    j.status,
    j.progress,
    j.quoted_amount,

    -- Counts
    (SELECT COUNT(*) FROM job_documents WHERE job_id = j.id) AS documents_count,
    (SELECT COUNT(*) FROM job_photos WHERE job_id = j.id) AS photos_count,
    (SELECT COUNT(*) FROM job_drawings WHERE job_id = j.id) AS drawings_count,
    (SELECT COUNT(*) FROM job_notes WHERE job_id = j.id) AS notes_count,
    (SELECT COUNT(*) FROM job_tasks WHERE job_id = j.id) AS total_tasks,
    (SELECT COUNT(*) FROM job_tasks WHERE job_id = j.id AND is_done = true) AS completed_tasks,
    (SELECT COUNT(*) FROM job_risk_flags WHERE job_id = j.id AND is_resolved = false) AS active_risks,
    (SELECT COUNT(*) FROM job_items WHERE job_id = j.id) AS items_count,

    -- Financial summary
    jc.labour_days,
    jc.total_cost AS estimated_cost,
    j.total_invoiced,
    (j.quoted_amount - COALESCE(j.total_invoiced, 0)) AS remaining_to_invoice,

    -- Progress metrics
    CASE
        WHEN (SELECT COUNT(*) FROM job_tasks WHERE job_id = j.id) > 0
        THEN ROUND(
            (SELECT COUNT(*)::numeric FROM job_tasks WHERE job_id = j.id AND is_done = true) /
            (SELECT COUNT(*)::numeric FROM job_tasks WHERE job_id = j.id) * 100,
            2
        )
        ELSE 0
    END AS task_completion_percent,

    -- Dates
    j.start_date,
    j.end_date,
    j.estimated_completion_date,
    j.created_at,
    j.updated_at,

    -- Team
    up.full_name AS lead_installer_name,

    -- Account
    j.account_id

FROM jobs j
LEFT JOIN user_profiles up ON j.lead_installer_id = up.id
LEFT JOIN job_costs jc ON j.id = jc.job_id
WHERE j.deleted_at IS NULL;

-- ==========================================
-- PART 6: V_USER_WORKLOAD VIEW
-- Shows workload distribution across users
-- ==========================================

CREATE OR REPLACE VIEW v_user_workload AS
SELECT
    up.id AS user_id,
    up.full_name,
    up.role,

    -- Job counts
    COUNT(DISTINCT j.id) AS total_jobs,
    COUNT(DISTINCT CASE WHEN j.status = 'in_progress' THEN j.id END) AS active_jobs,
    COUNT(DISTINCT CASE WHEN j.status = 'planned' THEN j.id END) AS planned_jobs,

    -- Task counts
    (SELECT COUNT(*) FROM job_tasks jt
     INNER JOIN jobs j2 ON jt.job_id = j2.id
     WHERE j2.lead_installer_id = up.id
     AND jt.is_done = false
     AND j2.deleted_at IS NULL) AS open_tasks,

    -- Labour allocation
    (SELECT SUM(hours_allocated) FROM labour_calendar_events lce
     WHERE lce.resource_id = up.id
     AND lce.event_date >= CURRENT_DATE
     AND lce.event_date <= CURRENT_DATE + INTERVAL '30 days') AS hours_next_30_days

FROM user_profiles up
LEFT JOIN jobs j ON j.lead_installer_id = up.id AND j.deleted_at IS NULL
GROUP BY up.id, up.full_name, up.role;

-- ==========================================
-- PART 7: COMMENTS
-- ==========================================

COMMENT ON VIEW v_jobs_list IS 'Optimized view of jobs with aggregated counts and latest activity';
COMMENT ON VIEW v_labour_calendar IS 'Labour calendar events with job and resource details';
COMMENT ON VIEW v_active_jobs IS 'Currently active (in-progress) jobs';
COMMENT ON VIEW v_jobs_with_issues IS 'Jobs with unresolved risks or schedule issues';
COMMENT ON VIEW v_job_summary IS 'Comprehensive summary of job data including financial and progress metrics';
COMMENT ON VIEW v_user_workload IS 'User workload distribution and capacity planning';

-- ==========================================
-- COMPLETION MESSAGE
-- ==========================================

DO $$
BEGIN
    RAISE NOTICE '✓ Views migration complete';
    RAISE NOTICE '✓ Created 6 views: v_jobs_list, v_labour_calendar, v_active_jobs, v_jobs_with_issues, v_job_summary, v_user_workload';
    RAISE NOTICE '✓ Views provide optimized queries for common data access patterns';
END $$;
