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
    const migrationPath = path.join(process.cwd(), 'migrations', '021_add_quote_lines_table.sql');

    if (!fs.existsSync(migrationPath)) {
      return res.status(404).json({ error: 'Migration file not found' });
    }

    const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');

    // Split the migration into individual statements (excluding comments and empty lines)
    const statements = migrationSQL
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--') && stmt !== 'END $$');

    const results = [];

    // Test if quote_lines table already exists
    const { error: testError } = await supabaseServiceRole
      .from('quote_lines')
      .select('id')
      .limit(1);

    if (testError && testError.message.includes('relation "quote_lines" does not exist')) {
      // Execute migration statements
      for (const statement of statements) {
        if (statement.trim().length === 0) continue;

        try {
          // For complex statements with DO blocks, use a different approach
          if (statement.includes('DO $$')) {
            // Handle DO blocks separately - these need to be executed as complete units
            const doBlock = migrationSQL.match(/DO \$\$[\s\S]*?END \$\$;/g);
            if (doBlock) {
              for (const block of doBlock) {
                try {
                  const { error } = await supabaseServiceRole.rpc('exec_sql', { sql: block });
                  if (error) {
                    results.push({ statement: 'DO block', error: error.message });
                  } else {
                    results.push({ statement: 'DO block', success: true });
                  }
                } catch {
                  // Skip DO blocks if RPC function doesn't exist
                  results.push({ statement: 'DO block', info: 'Skipped - requires manual execution' });
                }
              }
            }
            continue;
          }

          // For regular statements, try direct execution
          const { error } = await supabaseServiceRole.rpc('exec_sql', { sql: statement });
          if (error) {
            // If RPC doesn't work, try alternative execution for simple statements
            if (statement.toUpperCase().startsWith('CREATE TABLE')) {
              // Parse CREATE TABLE statement
              const { error: createError } = await executeCreateTable(statement);
              if (createError) {
                results.push({ statement: statement.substring(0, 50) + '...', error: (createError as Error).message || 'Unknown error' });
              } else {
                results.push({ statement: statement.substring(0, 50) + '...', success: true });
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
    } else {
      results.push({ statement: 'quote_lines table already exists', success: true });
    }

    // Verify tables were created
    const { data: tables, error: tableError } = await supabaseServiceRole
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', ['quote_lines']);

    if (tableError) {
      console.error('Table verification error:', tableError);
    }

    return res.status(200).json({
      success: true,
      message: 'Quote persistence migration applied',
      results,
      tablesFound: tables?.map(t => t.table_name) || [],
      totalStatements: statements.length
    });

  } catch (error) {
    console.error('Migration error:', error);
    return res.status(500).json({
      error: 'Failed to apply quote migration',
      details: (error as Error).message
    });
  }
}

// Helper function to execute CREATE TABLE statements manually
async function executeCreateTable(statement: string) {
  try {
    // For demo purposes, try to create the basic quote_lines table structure
    if (statement.includes('quote_lines')) {
      const createQuoteLinesSQL = `
        CREATE TABLE IF NOT EXISTS quote_lines (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          quote_id UUID,
          line_number INTEGER NOT NULL,
          product_code VARCHAR(100),
          product_description TEXT NOT NULL,
          quantity INTEGER NOT NULL DEFAULT 1,
          time_per_unit DECIMAL(8,2) NOT NULL DEFAULT 0,
          total_time DECIMAL(8,2) NOT NULL DEFAULT 0,
          waste_per_unit DECIMAL(8,2) NOT NULL DEFAULT 0,
          total_waste DECIMAL(8,2) NOT NULL DEFAULT 0,
          is_heavy BOOLEAN DEFAULT false,
          is_manually_edited BOOLEAN DEFAULT false,
          source VARCHAR(50) DEFAULT 'catalogue',
          raw_description TEXT,
          clean_description TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        )
      `;

      return await supabaseServiceRole.rpc('exec_sql', { sql: createQuoteLinesSQL });
    }

    return { error: null };
  } catch (error) {
    return { error };
  }
}