import { NextApiRequest, NextApiResponse } from 'next';

import { supabase as _supabase } from '../../lib/supabaseClient';

// This endpoint should only be accessible by admins in a real implementation
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // In a real implementation, you would use the Supabase admin client
    // and authenticate that the user is an admin
    // For now, we'll just return the schema that needs to be applied
    
    const schema = `
-- Floor Planner Database Schema for BHIT Work OS
-- Run this in your Supabase SQL editor to add floor planner functionality

-- Create job_floorplans table
CREATE TABLE IF NOT EXISTS job_floorplans (
    id TEXT PRIMARY KEY,
    job_id UUID NOT NULL,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    floor_plan_url TEXT,
    furniture JSONB DEFAULT '[]'::jsonb,
    scale NUMERIC,
    floor_plan_width INTEGER,
    floor_plan_height INTEGER,
    
    -- Ensure one floor plan per job
    UNIQUE(job_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_job_floorplans_job_id ON job_floorplans(job_id);
CREATE INDEX IF NOT EXISTS idx_job_floorplans_created_at ON job_floorplans(created_at);

-- Enable RLS (Row Level Security)
ALTER TABLE job_floorplans ENABLE ROW LEVEL SECURITY;

-- RLS Policies for job_floorplans
CREATE POLICY "Users can view floor plans for authenticated users"
    ON job_floorplans FOR SELECT
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "Directors and ops can manage floor plans"
    ON job_floorplans FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('director', 'ops')
        )
    );

-- Policy for authenticated users to insert their own floor plans
CREATE POLICY "Authenticated users can create floor plans"
    ON job_floorplans FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- Create generated_tasks table for auto-generated installation tasks
CREATE TABLE IF NOT EXISTS generated_tasks (
    id TEXT PRIMARY KEY,
    job_id UUID NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    install_order INTEGER DEFAULT 0,
    room_zone TEXT,
    furniture_ids JSONB DEFAULT '[]'::jsonb,
    estimated_time_minutes INTEGER,
    dependencies JSONB DEFAULT '[]'::jsonb,
    is_generated BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for generated_tasks
CREATE INDEX IF NOT EXISTS idx_generated_tasks_job_id ON generated_tasks(job_id);
CREATE INDEX IF NOT EXISTS idx_generated_tasks_install_order ON generated_tasks(job_id, install_order);

-- Enable RLS for generated_tasks
ALTER TABLE generated_tasks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for generated_tasks
CREATE POLICY "Users can view generated tasks for authenticated users"
    ON generated_tasks FOR SELECT
    USING (auth.uid() IS NOT NULL);

CREATE POLICY "Directors and ops can manage generated tasks"
    ON generated_tasks FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM users 
            WHERE users.id = auth.uid() 
            AND users.role IN ('director', 'ops')
        )
    );

-- Policy for authenticated users to insert generated tasks
CREATE POLICY "Authenticated users can create generated tasks"
    ON generated_tasks FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for automatic timestamp updates
DROP TRIGGER IF EXISTS update_job_floorplans_updated_at ON job_floorplans;
CREATE TRIGGER update_job_floorplans_updated_at
    BEFORE UPDATE ON job_floorplans
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_generated_tasks_updated_at ON generated_tasks;
CREATE TRIGGER update_generated_tasks_updated_at
    BEFORE UPDATE ON generated_tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
`;

    res.status(200).json({
      success: true,
      message: 'Floor planner schema ready to apply',
      schema: schema
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}