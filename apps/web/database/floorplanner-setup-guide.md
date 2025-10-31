# Floor Planner Database Setup Guide

This guide explains how to set up the database schema for the BHIT Work OS Floor Planner functionality.

## Prerequisites

- Access to your Supabase project dashboard
- Supabase project URL and service role key

## Setup Instructions

### 1. Apply the Database Schema

1. Navigate to your Supabase project dashboard
2. Go to the SQL Editor section
3. Copy and paste the contents of `floorplanner-schema.sql` into the editor
4. Run the SQL script

This will create:
- `job_floorplans` table for storing floor plan data
- `generated_tasks` table for storing auto-generated installation tasks
- Required indexes for performance
- Row Level Security (RLS) policies
- Automatic timestamp update triggers

### 2. Verify the Setup

After running the schema, you can verify the tables were created:

1. Go to the Table Editor in your Supabase dashboard
2. You should see the `job_floorplans` and `generated_tasks` tables
3. Check that the RLS policies are enabled on both tables

### 3. Storage Setup (Optional)

If you plan to store floor plan images:

1. Go to the Storage section in your Supabase dashboard
2. Create a new bucket called `job-assets`
3. Set the bucket to public access
4. Configure the storage policies as shown in the schema file

## API Endpoints for Testing

The system includes two API endpoints for testing:

- `/api/test-floorplanner-db` - Tests if the required tables exist
- `/api/setup-floorplanner` - Returns the schema that needs to be applied

## Integration with BHIT Work OS

The floor planner is integrated into the job system through:

1. `JobFloorPlanner` component - Handles the UI and database operations
2. `floorPlannerDB.ts` - Utility functions for database operations
3. `FloorPlanTab` - Tab in the job view for accessing the floor planner
4. `WorkOrderImport` - Component for importing work orders from PDF/text

## Troubleshooting

### Common Issues

1. **Tables not found**: Ensure you've run the SQL schema script
2. **Permission errors**: Check that RLS policies are properly configured
3. **Data not saving**: Verify that the user has the correct role (director or ops)

### Testing the Integration

1. Create a new job in the system
2. Navigate to the Floor Plan tab
3. Create a new floor plan project
4. Add some furniture items
5. Check that the data is saved to the `job_floorplans` table

## Next Steps

1. Test the work order import functionality with PDF files
2. Verify that generated tasks are properly created
3. Test the integration with different user roles
4. Customize the SmartQuote furniture catalog as needed