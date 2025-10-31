# Task Generation Feature

## Overview

The Task Generation feature allows users to automatically generate installation tasks based on floor plans, similar to how SmartQuote parses products. Tasks are grouped by floor, with quantity tracking and progress monitoring.

## Features

1. **Floor-based Task Grouping**: Tasks are automatically grouped by room/zone (floor)
2. **Quantity Tracking**: Each task has a total quantity and completed quantity
3. **Progress Status**: Tasks can be marked with one of five statuses:
   - Uplift
   - Placed
   - Built
   - Incomplete
   - Missing (with notes popup)
4. **KPI Tracking**: Overall job completion percentage is calculated and displayed
5. **Missing Items**: Detailed notes can be added for missing components

## How It Works

### 1. Generate Tasks
- Click the "Generate Tasks" button to create tasks based on floor plan furniture
- In a real implementation, this would parse the actual floor plan data
- For demonstration, sample tasks are created across different floors

### 2. Track Progress
- Update the completed quantity using the number input
- Mark tasks with appropriate status using the status buttons
- View progress percentage for each floor and overall job

### 3. Handle Missing Items
- Click the "Missing" button to open the missing item modal
- Enter the quantity of missing items
- Add detailed notes about what is missing
- Save to update the task status to "Missing"

## Database Schema

The feature uses the `generated_tasks` table with these additional columns:

- `status`: Task status (Uplift, Placed, Built, Incomplete, Missing)
- `completed_qty`: Number of items completed
- `total_qty`: Total number of items
- `missing_notes`: Notes about missing items

## Implementation Details

### Frontend Components
- `TaskGenerationTab`: Main component for viewing and managing generated tasks
- Tab integration in job detail page

### Backend
- Database schema updates in migrations
- Supabase RLS policies for access control
- Constraints to ensure data integrity

## Usage Instructions

1. Navigate to a job detail page
2. Click on the "Task Generation" tab
3. Click "Generate Tasks" to create sample tasks
4. Update quantities and statuses as work progresses
5. Use the "Missing" button to report missing components
6. Monitor overall progress percentage

## Future Enhancements

1. Integration with actual floor plan parsing
2. Task dependencies and scheduling
3. Export functionality for progress reports
4. Mobile-friendly interface
5. Real-time collaboration features