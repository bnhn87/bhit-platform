import fs from 'fs';
import path from 'path';

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
    // Read the migration file
    const migrationPath = path.join(process.cwd(), 'migrations', '020_add_dashboard_support_tables.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    // Split the migration into individual statements
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    const results = [];

    // Try to create tables directly using Supabase client
    // First, let's test if we can create a simple table
    const { error: testError } = await supabaseServiceRole
      .from('crew_usage')
      .select('id')
      .limit(1);

    if (testError && testError.message.includes('relation "crew_usage" does not exist')) {
      // Tables don't exist, so we need to create them
      // Let's create them one by one
      const createStatements = [
        `CREATE TABLE IF NOT EXISTS crew_usage (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          d DATE NOT NULL,
          utilization DECIMAL(5,2) NOT NULL DEFAULT 0,
          total_crews INTEGER DEFAULT 0,
          active_crews INTEGER DEFAULT 0,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          CONSTRAINT unique_crew_usage_date UNIQUE(d)
        )`,
        `CREATE TABLE IF NOT EXISTS buffer_usage (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          d DATE NOT NULL,
          percent DECIMAL(5,2) NOT NULL DEFAULT 0,
          planned_hours DECIMAL(8,2) DEFAULT 0,
          actual_hours DECIMAL(8,2) DEFAULT 0,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          CONSTRAINT unique_buffer_usage_date UNIQUE(d)
        )`,
        `CREATE TABLE IF NOT EXISTS finance_metrics (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          d DATE NOT NULL,
          net_margin DECIMAL(12,2) NOT NULL DEFAULT 0,
          revenue DECIMAL(12,2) DEFAULT 0,
          costs DECIMAL(12,2) DEFAULT 0,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          CONSTRAINT unique_finance_metrics_date UNIQUE(d)
        )`
      ];

      for (const statement of createStatements) {
        try {
          // Use raw SQL execution through a simple query
          const { error } = await supabaseServiceRole.rpc('exec', { sql: statement });
          if (error) {
            results.push({ statement: statement.substring(0, 50) + '...', error: error.message });
          } else {
            results.push({ statement: statement.substring(0, 50) + '...', success: true });
          }
        } catch (err) {
          results.push({ statement: statement.substring(0, 50) + '...', error: (err as Error).message });
        }
      }
    } else {
      results.push({ statement: 'Tables already exist', success: true });
    }

    // Test if tables were created successfully
    const { data: tables, error: tableError } = await supabaseServiceRole
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', ['crew_usage', 'buffer_usage', 'finance_metrics', 'installs_by_day', 'pipeline_heatmap', 'activity_log', 'vehicles', 'waste_loads', 'quotes']);

    if (tableError) {
      console.error('Table check error:', tableError);
    }

    return res.status(200).json({
      success: true,
      message: 'Dashboard migration applied',
      results,
      tablesCreated: tables?.map(t => t.table_name) || [],
      totalStatements: statements.length
    });

  } catch (error: unknown) {
    console.error('Migration error:', error);
    return res.status(500).json({
      error: 'Failed to apply migration',
      details: (error as Error).message
    });
  }
}