# Master Database Migration Guide

Complete guide for setting up the BHIT Work OS database from scratch.

## Overview

This guide provides the **correct order** for applying all SQL migrations to build a fully functional database for the BHIT Work OS application.

**Total Migrations:** 33 numbered + 4 support files
**Estimated Time:** 15-20 minutes

---

## 🔴 CRITICAL: Pre-Flight Checks

Before starting, ensure:

1. ✅ You have Supabase project access with SQL Editor permissions
2. ✅ Supabase Auth is enabled (provides `auth.users` table automatically)
3. ✅ You have admin/owner role on the Supabase project
4. ✅ You have backups if applying to existing database

---

## Migration Application Order

### Phase 1: Foundation (MUST RUN FIRST)

These create the core tables that everything else depends on.

#### Step 1: Core Schema
**File:** `migrations/000_create_core_schema.sql`
**Creates:**
- `accounts` - Multi-tenancy/organizations
- `user_profiles` - Extended user data beyond Supabase auth
- `org_settings` - Organization settings (day rates, VAT, guest access)
- `jobs` - Core jobs table with ALL required columns
- `sites` - Physical job locations

**Status:** 🟢 **READY TO APPLY**

```bash
# Run in Supabase SQL Editor
```

---

#### Step 2: Supporting Foundation Tables
**File:** `COMPLETE_SETUP.sql`
**Creates:**
- `quotes` table (if not exists) with all SmartQuote columns
- `quote_shares` - Quote sharing between users

**Status:** 🟢 **READY TO APPLY** (already applied based on earlier work)

---

#### Step 3: Quote Lines and Product Catalogue
**File:** `APPLY_COMPLETE.sql`
**Creates:**
- `quote_lines` - Detailed quote line items
- `product_catalogue` - 132 Rainbow Design products with install times
- `product_aliases` - 54 fuzzy matching aliases

**Status:** 🟢 **READY TO APPLY** (already applied based on earlier work)

---

### Phase 2: Job Features (HIGH PRIORITY)

Core functionality for managing jobs.

#### Step 4: Job-Related Tables
**File:** `migrations/032_create_job_related_tables.sql`
**Creates:**
- `job_documents` - Document uploads
- `job_photos` - Photo galleries
- `job_drawings` - Floor plans and drawings
- `job_notes` - Job notes
- `job_tasks` - Manual task lists
- `job_planning` - Planning metadata
- `job_risk_flags` - Risk tracking
- `job_costs` - Cost calculations
- `job_pins` - Guest access PINs
- `temp_access_tokens` - Temporary access tokens
- `cost_access` - User cost permissions
- `job_items` - Product items per job

**Status:** 🟢 **READY TO APPLY**

---

### Phase 3: Historical & Tracking (Already Applied)

These migrations add columns and features to existing tables.

#### Step 5: Job Edit History
**File:** `migrations/001_add_job_edit_history.sql`
**Adds:** Job edit logging table

**Status:** ✅ Apply if not already done

---

#### Step 6: Task Progress Tracking
**File:** `migrations/005_add_task_progress_columns.sql`
**Adds:** Uplifted/placed/built quantity tracking

**Status:** ✅ Apply if not already done

---

#### Step 7: Generated Tasks Table
**File:** `migrations/006_create_complete_generated_tasks_table.sql`
**Creates:** AI-generated tasks table

**Status:** ✅ Apply if not already done

---

#### Step 8: Job Floorplans
**File:** `migrations/007_create_job_floorplans_table.sql`
**Creates:** Floor plan storage

**Status:** ✅ Apply if not already done

---

#### Step 9: Complete Floorplan & Task Schema
**File:** `migrations/009_complete_floorplan_and_task_schema.sql`
**Enhances:** Floorplan and generated tasks tables

**Status:** ✅ Apply if not already done

---

### Phase 4: Labour Management (Already Applied)

Labour tracking and resource planning.

#### Step 10-12: Labour System
**Files:**
- `migrations/010_labour_matrix_targets.sql`
- `migrations/011_labour_matrix_enhancements.sql`
- `migrations/012_add_labour_summary_to_jobs.sql`

**Creates/Adds:** Labour matrix, targets, job labour summaries

**Status:** ✅ Apply if not already done

---

#### Step 13-17: Job Enhancements
**Files:**
- `migrations/013_add_missing_jobs_columns.sql` - Products, quote details
- `migrations/014_add_quoted_amount_column.sql` - Quoted amount
- `migrations/015_complete_site_schema_check.sql` - Sites, progress tracking
- `migrations/016_minimal_job_creation_fix.sql` - Job creation fixes
- `migrations/017_add_soft_delete_to_jobs.sql` - Soft delete support

**Status:** ✅ Apply if not already done

---

#### Step 18: Labour Tracking System
**File:** `migrations/018_add_labour_tracking_system.sql`
**Creates:**
- `product_progress` - Product install progress
- `daily_closeout_forms` - Daily reports
- `daily_progress_log` - Progress logging
- `project_labour_allocation` - Labour allocation
- `product_labour_rates` - Labour rates per product
- `offline_sync_queue` - Offline sync support

**Status:** ✅ Apply if not already done

---

### Phase 5: Dashboard & Analytics (Already Applied)

#### Step 19: Dashboard Support
**File:** `migrations/020_add_dashboard_support_tables.sql`
**Creates:** crew_usage, buffer_usage, finance_metrics, vehicles, waste_loads, activity_log, etc.

**Status:** ✅ Apply if not already done

---

### Phase 6: Feature Flags (Already Applied)

#### Step 20: Feature Flags System
**File:** `migrations/023_add_feature_flags_system.sql`
**Creates:** feature_flags, user_flag_overrides, feature_flag_analytics, flag_environments

**Status:** ✅ Apply if not already done

---

### Phase 7: Invoicing (Already Applied)

#### Step 21: Invoice System
**File:** `migrations/026_invoice_schedule_permissions.sql`
**Creates:** invoice_schedules, invoice_schedule_items, job_invoice_history, user_permissions

**Status:** ✅ Apply if not already done

---

### Phase 8: Construction Progress (Already Applied)

#### Step 22: Construction Dashboard
**File:** `migrations/027_construction_progress_dashboard.sql`
**Creates:** construction_progress_metrics, construction_milestones, daily_progress_reports, etc.

**Status:** ✅ Apply if not already done

---

### Phase 9: Labour Calendar (Already Applied)

#### Step 23: Labour Calendar System
**File:** `migrations/028_labour_calendar_system.sql`
**Creates:** labour_resources, labour_shifts, labour_assignments, labour_calendar_events, etc.

**Status:** ✅ Apply if not already done

---

### Phase 10: Task Quantities (Already Applied)

#### Step 24: Granular Task Quantities
**File:** `migrations/029_add_granular_task_quantities.sql`
**Adds:** Detailed quantity tracking to generated tasks

**Status:** ✅ Apply if not already done

---

#### Step 25: Lead Installer
**File:** `migrations/030_add_lead_installer_to_jobs.sql`
**Adds:** lead_installer_id to jobs

**Status:** ✅ Apply if not already done

---

### Phase 11: Optimization (NEW - APPLY NOW)

#### Step 26: Views for Performance
**File:** `migrations/033_create_missing_views.sql`
**Creates:**
- `v_jobs_list` - Optimized job listings
- `v_labour_calendar` - Labour calendar view
- `v_active_jobs` - Currently active jobs
- `v_jobs_with_issues` - Jobs with risks
- `v_job_summary` - Comprehensive job summary
- `v_user_workload` - User workload distribution

**Status:** 🟢 **READY TO APPLY**

---

## Quick Start: Apply All New Migrations

If you've already applied the SmartQuote migrations (COMPLETE_SETUP.sql and APPLY_COMPLETE.sql), run these in order:

```sql
-- 1. Foundation (if not already applied)
\i migrations/000_create_core_schema.sql

-- 2. Job Features (NEW - MUST APPLY)
\i migrations/032_create_job_related_tables.sql

-- 3. Views (NEW - MUST APPLY)
\i migrations/033_create_missing_views.sql

-- 4. Then apply any historical migrations you haven't run yet (001-030)
```

---

## Verification Checklist

After applying all migrations, verify:

### Core Tables Exist
```sql
SELECT tablename FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN (
    'accounts',
    'user_profiles',
    'org_settings',
    'jobs',
    'sites',
    'job_documents',
    'job_photos',
    'job_drawings',
    'job_notes',
    'job_tasks',
    'job_planning',
    'quote_lines',
    'product_catalogue'
)
ORDER BY tablename;
```

**Expected:** 13 rows

### Views Exist
```sql
SELECT viewname FROM pg_views
WHERE schemaname = 'public'
AND viewname LIKE 'v_%'
ORDER BY viewname;
```

**Expected:** At least 6 views

### RLS is Enabled
```sql
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('jobs', 'job_documents', 'job_photos', 'accounts')
ORDER BY tablename;
```

**Expected:** All should have `rowsecurity = true`

### Sample Data Inserted
```sql
SELECT COUNT(*) FROM product_catalogue; -- Should be 132+
SELECT COUNT(*) FROM product_aliases;   -- Should be 54+
```

---

## Troubleshooting

### Error: "relation already exists" (ERROR 42P07)
**Cause:** Tables already exist from previous migration runs.

**Solutions:**
1. **RECOMMENDED:** Use the incremental migration script:
   ```sql
   \i migrations/INCREMENTAL_APPLY.sql
   ```
   This uses `CREATE TABLE IF NOT EXISTS` and is safe to run multiple times.

2. **Check current state first:**
   ```sql
   \i migrations/DIAGNOSE_DATABASE_STATE.sql
   ```
   This shows which tables exist vs. missing.

3. **Fresh start (DESTRUCTIVE - only if you want to rebuild from scratch):**
   ```sql
   DROP SCHEMA public CASCADE;
   CREATE SCHEMA public;
   GRANT ALL ON SCHEMA public TO postgres;
   GRANT ALL ON SCHEMA public TO public;
   -- Then run migrations from scratch
   ```

### Error: "column does not exist"
**Solution:** Apply migrations in the correct order. The missing column is added in an earlier migration.

### Error: "permission denied"
**Solution:** Ensure you're running as database owner or have sufficient privileges.

### Error: "cannot alter type of a column used by a view"
**Solution:** This is why we skip the `ALTER TABLE quotes ALTER COLUMN status` in some migrations. The existing column type works fine.

---

## Post-Migration Tasks

After all migrations are applied:

1. **Create Default Account:**
```sql
INSERT INTO accounts (name) VALUES ('Default Organization')
RETURNING id;
```

2. **Create User Profile for Admin:**
```sql
-- Replace <your-auth-user-id> with your actual auth.users id
INSERT INTO user_profiles (id, full_name, role, account_id)
VALUES (
    '<your-auth-user-id>',
    'Admin User',
    'admin',
    '<account-id-from-step-1>'
);
```

3. **Create Org Settings:**
```sql
INSERT INTO org_settings (account_id) VALUES ('<account-id-from-step-1>');
```

4. **Grant Cost Access to Admin:**
```sql
INSERT INTO cost_access (user_id, has_access)
VALUES ('<your-auth-user-id>', true);
```

---

## Migration Summary

| Phase | Migrations | Status | Priority |
|-------|-----------|--------|----------|
| Foundation | 000, COMPLETE_SETUP, APPLY_COMPLETE | 🟢 Ready | 🔴 Critical |
| Job Features | 032 | 🟢 Ready | 🟡 High |
| Historical | 001-017 | ✅ Apply if needed | 🟡 High |
| Labour | 018, 028-030 | ✅ Apply if needed | 🟡 High |
| Dashboard | 020 | ✅ Apply if needed | 🟢 Medium |
| Feature Flags | 023 | ✅ Apply if needed | 🟢 Medium |
| Invoicing | 026 | ✅ Apply if needed | 🟢 Medium |
| Construction | 027 | ✅ Apply if needed | 🟢 Medium |
| Views | 033 | 🟢 Ready | 🟢 Medium |

---

## Support

If you encounter issues:

1. Check the Supabase logs for detailed error messages
2. Verify you're applying migrations in the correct order
3. Ensure all prerequisite tables exist before running dependent migrations
4. Review the comments in each migration file for dependencies

---

**Last Updated:** 2025-10-15
**Total Tables:** 54
**Total Views:** 6+
**Total Migrations:** 33
