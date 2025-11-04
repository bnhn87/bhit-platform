import { createClient } from '@supabase/supabase-js';
import { NextApiRequest, NextApiResponse } from 'next';

const supabaseServiceRole = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check feature_flags table structure
    const { data: columns, error } = await supabaseServiceRole
      .rpc('exec_sql', {
        sql: `
          SELECT column_name, data_type, is_nullable, column_default
          FROM information_schema.columns
          WHERE table_name = 'feature_flags'
          ORDER BY ordinal_position;
        `
      });

    if (error) {
      console.error('Error checking schema:', error);
      return res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
    }

    // Also check if tables exist
    const { data: tables, error: _tableError } = await supabaseServiceRole
      .rpc('exec_sql', {
        sql: `
          SELECT table_name
          FROM information_schema.tables
          WHERE table_schema = 'public'
          AND table_name LIKE '%feature%';
        `
      });

    return res.status(200).json({
      success: true,
      columns: columns || [],
      tables: tables || []
    });

  } catch (error: unknown) {
    console.error('Schema check error:', error);
    return res.status(500).json({
      error: 'Failed to check schema',
      details: (error as Error).message
    });
  }
}