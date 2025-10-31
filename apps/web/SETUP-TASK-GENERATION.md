# Task Generation System Setup

This document explains how to set up the database schema for the task generation system.

## Required Tables

The task generation system requires two tables:
1. `job_floorplans` - Stores floor plan information for jobs
2. `generated_tasks` - Stores auto-generated tasks based on floor plans

## Setup Instructions

### Option 1: Using Supabase SQL Editor (Recommended)

1. Go to your Supabase dashboard
2. Navigate to the SQL Editor
3. Copy and paste the contents of `create-tables.sql` into the editor
4. Run the SQL script

### Option 2: Using Simplified SQL Script

If the full version causes errors, try the simplified version:

1. Go to your Supabase dashboard
2. Navigate to the SQL Editor
3. Copy and paste the contents of `create-tables-simple.sql` into the editor
4. Run the SQL script

### Option 3: Using Supabase CLI

If you have the Supabase CLI installed:

1. Make sure you're in the project directory
2. Run: `npx supabase db push`

### Option 4: Manual Table Creation

If the above methods don't work, you can create the tables manually:

1. Go to your Supabase dashboard
2. Navigate to Table Editor
3. Create the `job_floorplans` table with the following columns:
   - id (TEXT, Primary Key)
   - job_id (UUID)
   - name (TEXT)
   - created_at (TIMESTAMPTZ)
   - updated_at (TIMESTAMPTZ)
   - floor_plan_url (TEXT)
   - furniture (JSONB)
   - scale (NUMERIC)
   - floor_plan_width (INTEGER)
   - floor_plan_height (INTEGER)

4. Create the `generated_tasks` table with the following columns:
   - id (TEXT, Primary Key)
   - job_id (UUID)
   - title (TEXT)
   - description (TEXT)
   - install_order (INTEGER)
   - room_zone (TEXT)
   - furniture_ids (JSONB)
   - estimated_time_minutes (INTEGER)
   - dependencies (JSONB)
   - is_generated (BOOLEAN)
   - created_at (TIMESTAMPTZ)
   - updated_at (TIMESTAMPTZ)
   - status (TEXT)
   - completed_qty (INTEGER)
   - total_qty (INTEGER)
   - missing_notes (TEXT)

## Troubleshooting

If you continue to see the "Could not find the table" error:

1. Make sure you've run the SQL script
2. Check that the tables exist in your Supabase dashboard
3. Verify that your Supabase credentials in `.env.local` are correct
4. Restart your development server

If you encounter SQL syntax errors:

1. Try using the simplified version (`create-tables-simple.sql`)
2. Check your Supabase PostgreSQL version compatibility
3. Manually create the tables using the Table Editor