-- Test script to verify floor plan schema creation
-- Run this in your Supabase SQL editor to test the schema

-- Check if tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('job_floorplans', 'generated_tasks');

-- Try to create the tables
\ir ../database/floorplanner-schema.sql

-- Check again if tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('job_floorplans', 'generated_tasks');

-- Check table structure
\d job_floorplans
\d generated_tasks