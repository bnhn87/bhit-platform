# Database Setup Required

## Issue Found
The task generation system isn't working because the required database tables don't exist.

**Error:** `generated_tasks` and `job_floorplans` tables are missing from your Supabase database.

## Quick Fix

### Option 1: Supabase Dashboard (Recommended)
1. Go to your **Supabase Dashboard**
2. Navigate to **SQL Editor** 
3. Copy and paste the contents of `apps/web/create-tables.sql`
4. Click **Run** to execute the SQL

### Option 2: Simple Version
If the full script fails, try the simpler version:
1. Copy and paste the contents of `apps/web/create-tables-simple.sql` 
2. Run it in the SQL Editor

## What These Tables Do
- `generated_tasks` - Stores installation tasks created from SmartQuote products
- `job_floorplans` - Stores floor plan layouts (optional)

## After Setup
1. Refresh your browser
2. Go to any job → Task Generation tab
3. Tasks from SmartQuote should now appear
4. The "Generate Tasks" button will work

## Test the Fix
Visit: `http://localhost:3001/api/debug/test-tasks?jobId=YOUR_JOB_ID`

This will test the database setup and create a sample task.