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

    // Read the migration file
    const migrationPath = path.join(process.cwd(), 'migrations', '029_add_granular_task_quantities.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    // Execute the migration using a simple approach
    // Split by semicolons and execute each statement
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));

    const results = [];

    for (const statement of statements) {
      try {
        // Use raw SQL execution
        const { error } = await supabaseServiceRole.rpc('exec_sql', { sql: statement });

        if (error) {
          // If the exec_sql function doesn't exist, try a different approach
          if (error.message.includes('function exec_sql')) {
            // Try using a direct query for ALTER TABLE statements
            if (statement.trim().toUpperCase().startsWith('ALTER TABLE')) {
              const { error: _alterError } = await supabaseServiceRole
                .from('generated_tasks')
                .select('id')
                .limit(0); // This will trigger a connection but return no data

              // This won't work for ALTER statements, so we'll need to use a different approach
              results.push({
                statement: statement.substring(0, 50) + '...',
                error: 'Direct ALTER execution not supported via Supabase client',
                needsManualExecution: true
              });
            } else {
              results.push({ statement: statement.substring(0, 50) + '...', error: error.message });
            }
          } else {
            results.push({ statement: statement.substring(0, 50) + '...', error: error.message });
          }
        } else {
          results.push({ statement: statement.substring(0, 50) + '...', success: true });
        }
      } catch (err) {
        results.push({ statement: statement.substring(0, 50) + '...', error: (err as Error).message });
      }
    }

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
      message: 'Granular quantities migration applied',
      results,
      existingColumns,
      addedColumns,
      missingColumns,
      totalStatements: statements.length,
      note: 'If columns were not added automatically, please execute the migration SQL manually in your database'
    });

  } catch (error: unknown) {
    console.error('Migration error:', error);
    return res.status(500).json({
      error: 'Failed to apply migration',
      details: (error as Error).message
    });
  }
}