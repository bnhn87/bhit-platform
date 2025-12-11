import { createClient } from '@supabase/supabase-js';
import { NextApiRequest, NextApiResponse } from 'next';

const supabaseServiceRole = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {

    // Create the tables using SQL
    const createTablesSQL = `
      -- Create job_floorplans table
      CREATE TABLE IF NOT EXISTS job_floorplans (
          id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
          job_id UUID NOT NULL,
          name TEXT NOT NULL,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          floor_plan_url TEXT,
          furniture JSONB DEFAULT '[]'::jsonb,
          scale NUMERIC,
          floor_plan_width INTEGER,
          floor_plan_height INTEGER
      );

      -- Create generated_tasks table
      CREATE TABLE IF NOT EXISTS generated_tasks (
          id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
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
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          status TEXT DEFAULT 'Uplift',
          completed_qty INTEGER DEFAULT 0,
          total_qty INTEGER DEFAULT 1,
          missing_notes TEXT
      );

      -- Create indexes for performance
      CREATE INDEX IF NOT EXISTS idx_job_floorplans_job_id ON job_floorplans(job_id);
      CREATE INDEX IF NOT EXISTS idx_generated_tasks_job_id ON generated_tasks(job_id);
      CREATE INDEX IF NOT EXISTS idx_generated_tasks_install_order ON generated_tasks(job_id, install_order);
    `;


    // Execute the SQL using rpc (raw SQL execution)
    const { data: _data, error } = await supabaseServiceRole.rpc('exec_sql', { 
      sql: createTablesSQL 
    });

    if (error) {
      console.error('❌ Database setup failed with RPC:', error);
      
      // Try alternative approach - using manual queries
      
      // Create job_floorplans table
      const { error: floorplansError } = await supabaseServiceRole
        .from('job_floorplans')
        .select('count(*)')
        .limit(1);
      
      // Create generated_tasks table  
      const { error: tasksError } = await supabaseServiceRole
        .from('generated_tasks')
        .select('count(*)')
        .limit(1);

      if (floorplansError || tasksError) {
        return res.status(500).json({ 
          error: 'Database tables do not exist and cannot be created via API',
          details: 'Please run the SQL script manually in Supabase dashboard',
          floorplansError: floorplansError?.message,
          tasksError: tasksError?.message,
          instructions: [
            '1. Go to your Supabase dashboard',
            '2. Navigate to the SQL Editor', 
            '3. Copy and paste the contents of apps/web/create-tables.sql',
            '4. Run the SQL script',
            '5. Refresh this page to try again'
          ]
        });
      }
    }


    // Test that tables are working
    const { data: _testFloorplans, error: floorplansTestError } = await supabaseServiceRole
      .from('job_floorplans')
      .select('count(*)')
      .limit(1);

    const { data: _testTasks, error: tasksTestError } = await supabaseServiceRole
      .from('generated_tasks')
      .select('count(*)')
      .limit(1);

    if (floorplansTestError || tasksTestError) {
      return res.status(500).json({
        error: 'Tables may have been created but are not accessible',
        floorplansTestError: floorplansTestError?.message,
        tasksTestError: tasksTestError?.message
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Database tables created successfully',
      tables: ['job_floorplans', 'generated_tasks'],
      indexes: ['idx_job_floorplans_job_id', 'idx_generated_tasks_job_id', 'idx_generated_tasks_install_order']
    });

  } catch (error: unknown) {
    console.error('❌ Database setup error:', error);
    return res.status(500).json({ 
      error: 'Database setup failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      instructions: [
        'Please create the tables manually:',
        '1. Go to your Supabase dashboard',
        '2. Navigate to the SQL Editor', 
        '3. Copy and paste the contents of apps/web/create-tables.sql',
        '4. Run the SQL script'
      ]
    });
  }
}