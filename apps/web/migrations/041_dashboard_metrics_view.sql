-- ==========================================
-- MIGRATION 041: CONSTRUCTION DASHBOARD VIEW
-- Purpose: Aggregate metrics from Targets, Labour, and Financials
-- for the Construction Metrics Dashboard.
-- ==========================================

BEGIN;

-- Drop if exists to allow clean recreate
DROP VIEW IF EXISTS v_construction_dashboard;

CREATE OR REPLACE VIEW v_construction_dashboard AS
SELECT 
    j.id,
    j.reference,
    COALESCE(j.title, j.address, 'Unknown Location') as location,
    j.client_name,
    j.status,
    j.start_date,
    j.end_date,
    
    -- Financials (from Quotes/Jobs)
    COALESCE(j.quoted_amount, j.total_cost, 0) as total_budget,
    
    -- Progress (from Build Targets Page)
    -- If no targets exist, fall back to status-based (Completed=100%, else 0%)
    COALESCE(
        jc.completion_percentage, 
        CASE 
            WHEN j.status = 'completed' THEN 100 
            WHEN j.status = 'snagging' THEN 95
            ELSE 0 
        END
    ) as completion,

    -- Labour Usage (from Labour Page)
    -- percentage of allocated days vs budget days
    COALESCE(jlb.allocated_days, 0) as labour_days_used,
    COALESCE(jlb.total_labour_days, 0) as labour_days_total,
    
    CASE 
        WHEN COALESCE(jlb.total_labour_days, 0) > 0 
        THEN ROUND((COALESCE(jlb.allocated_days, 0) / jlb.total_labour_days) * 100, 1)
        ELSE 0 
    END as labour_utilization,

    -- Risk Assessment (Calculated)
    CASE 
        -- High Risk: Over budget on labour OR Behind schedule
        WHEN (
            COALESCE(jlb.total_labour_days, 0) > 0 
            AND COALESCE(jlb.allocated_days, 0) > jlb.total_labour_days
        ) THEN 'high'
        
        WHEN (
            j.end_date IS NOT NULL 
            AND j.end_date < CURRENT_DATE 
            AND j.status NOT IN ('completed', 'snagging')
        ) THEN 'high'

        -- Medium Risk: >80% labour used but <50% targets complete
        WHEN (
            COALESCE(jlb.total_labour_days, 0) > 0 
            AND (COALESCE(jlb.allocated_days, 0) / NULLIF(jlb.total_labour_days, 0)) > 0.8
            AND COALESCE(jc.completion_percentage, 0) < 50
        ) THEN 'medium'
        
        ELSE 'low'
    END as risk_level

FROM jobs j
LEFT JOIN v_job_completion jc ON jc.job_id = j.id
LEFT JOIN job_labour_bank jlb ON jlb.job_id = j.id
WHERE 
    j.deleted_at IS NULL 
    AND j.status IN ('in_progress', 'active', 'started', 'snagging', 'scheduled');

-- Grant access
GRANT SELECT ON v_construction_dashboard TO authenticated;

COMMIT;
