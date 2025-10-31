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
    // Check if columns already exist
    const { data: columns, error: columnError } = await supabaseServiceRole
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_name', 'generated_tasks')
      .eq('table_schema', 'public')
      .in('column_name', ['uplifted_qty', 'placed_qty', 'built_qty', 'missing_qty', 'damaged_qty', 'damage_notes']);

    if (columnError) {
      console.error('Column check error:', columnError);
    }

    const existingColumns = columns?.map(c => c.column_name) || [];
    const allColumns = ['uplifted_qty', 'placed_qty', 'built_qty', 'missing_qty', 'damaged_qty', 'damage_notes'];
    const missingColumns = allColumns.filter(col => !existingColumns.includes(col));

    if (missingColumns.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'All granular quantity columns already exist',
        existingColumns
      });
    }

    // Try to use a function that might exist in the database to execute raw SQL
    // First, let's try creating a temporary function to execute our ALTER statements
    const _createFunctionSQL = `
      CREATE OR REPLACE FUNCTION temp_add_columns()
      RETURNS text AS $$
      BEGIN
        -- Add columns if they don't exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='generated_tasks' AND column_name='uplifted_qty') THEN
          ALTER TABLE generated_tasks ADD COLUMN uplifted_qty INTEGER DEFAULT 0;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='generated_tasks' AND column_name='placed_qty') THEN
          ALTER TABLE generated_tasks ADD COLUMN placed_qty INTEGER DEFAULT 0;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='generated_tasks' AND column_name='built_qty') THEN
          ALTER TABLE generated_tasks ADD COLUMN built_qty INTEGER DEFAULT 0;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='generated_tasks' AND column_name='missing_qty') THEN
          ALTER TABLE generated_tasks ADD COLUMN missing_qty INTEGER DEFAULT 0;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='generated_tasks' AND column_name='damaged_qty') THEN
          ALTER TABLE generated_tasks ADD COLUMN damaged_qty INTEGER DEFAULT 0;
        END IF;

        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='generated_tasks' AND column_name='damage_notes') THEN
          ALTER TABLE generated_tasks ADD COLUMN damage_notes TEXT;
        END IF;

        RETURN 'Columns added successfully';
      END;
      $$ LANGUAGE plpgsql;
    `;

    // Since Supabase client doesn't allow direct DDL execution, provide SQL for manual execution
    return res.status(200).json({
      success: false,
      requiresManualExecution: true,
      message: 'Please execute the SQL migration manually in your database admin panel',
      sqlToExecute: `-- Add granular quantity columns to generated_tasks table
ALTER TABLE generated_tasks
ADD COLUMN IF NOT EXISTS uplifted_qty INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS placed_qty INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS built_qty INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS missing_qty INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS damaged_qty INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS damage_notes TEXT;`,
      missingColumns,
      instructions: [
        '1. Open your Supabase dashboard',
        '2. Go to the SQL Editor',
        '3. Execute the provided SQL statement',
        '4. Refresh this page to verify the columns were added'
      ]
    });

    // Execute the function
    const { data: execResult, error: execError } = await supabaseServiceRole.rpc('temp_add_columns');

    if (execError) {
      return res.status(500).json({
        error: 'Failed to execute column addition',
        details: execError?.message || 'Unknown error'
      });
    }

    // Clean up the temporary function
    await supabaseServiceRole.rpc('exec_sql', { sql: 'DROP FUNCTION IF EXISTS temp_add_columns();' });

    // Check if columns were added successfully
    const { data: updatedColumns, error: updatedColumnError } = await supabaseServiceRole
      .from('information_schema.columns')
      .select('column_name')
      .eq('table_name', 'generated_tasks')
      .eq('table_schema', 'public')
      .in('column_name', allColumns);

    if (updatedColumnError) {
      console.error('Updated column check error:', updatedColumnError);
    }

    const addedColumns = updatedColumns?.map(c => c.column_name) || [];

    return res.status(200).json({
      success: true,
      message: 'Granular quantity columns added successfully',
      existingColumns,
      addedColumns,
      missingColumns,
      result: execResult
    });

  } catch (error) {
    console.error('Migration error:', error);
    return res.status(500).json({
      error: 'Failed to add columns',
      details: (error as Error).message
    });
  }
}