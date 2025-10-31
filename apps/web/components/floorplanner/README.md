# BHIT Work OS Floor Planner

The floor planner is an integrated tool for planning furniture installations within the BHIT Work OS job management system.

## Features

1. **Interactive Floor Planning**: Drag and drop furniture items onto a floor plan
2. **AI-Powered Placement**: Smart algorithms for optimal furniture arrangement
3. **Work Order Import**: Import furniture items from PDFs, CSV, or text files
4. **Automatic Task Generation**: Create installation tasks based on floor plan
5. **SmartQuote Integration**: Predefined furniture catalog with dimensions and installation data
6. **Database Persistence**: Floor plans and tasks stored in Supabase database

## Components

### JobFloorPlanner
Main component that integrates the floor planner into the job system. Handles:
- Loading/saving floor plans from database
- Generating installation tasks
- Managing user interactions

### WorkOrderImport
Component for importing work orders from various sources:
- PDF files (with AI-powered extraction)
- CSV files
- Text files
- Manual input

### SmartQuoteFurniture
Integrated furniture catalog with:
- Product codes and dimensions
- Installation times and weights
- Categories and pricing

## Database Schema

The floor planner uses two main tables:

### job_floorplans
Stores floor plan data for each job:
- ID and job reference
- Floor plan name and metadata
- Furniture placement data (JSON)
- Scale and dimensions

### generated_tasks
Stores auto-generated installation tasks:
- Task details and descriptions
- Installation order
- Furniture item references
- Time estimates

## API Integration

The floor planner integrates with:
- Supabase for database operations
- SmartQuote AI services for PDF parsing
- Google Studio floor planner components

## Setup

1. Apply the database schema from `database/floorplanner-schema.sql`
2. Configure storage bucket for floor plan images (optional)
3. Ensure proper RLS policies are in place
4. Test integration with the test page at `/test-floorplanner`

## Usage

1. Navigate to a job's Floor Plan tab
2. Click "Open Full Planner" to access the interactive planner
3. Create a new project or load an existing one
4. Import work orders or manually add furniture items
5. Arrange furniture on the floor plan
6. Generate installation tasks automatically
7. View and manage tasks in the job's Tasks tab

## Development

### Key Files
- `JobFloorPlanner.tsx` - Main integration component
- `WorkOrderImport.tsx` - Work order import functionality
- `SmartQuoteFurniture.ts` - Furniture catalog
- `types.ts` - TypeScript interfaces
- `floorPlannerDB.ts` - Database utility functions

### Testing
Use the test page at `/test-floorplanner` to verify database integration.