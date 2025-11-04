// Check if invoice tables exist in database using raw SQL
import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Check if tables exist using information_schema
    const { data, error } = await supabaseAdmin.rpc('check_invoice_tables', {});

    if (error) {
      // If function doesn't exist, try direct query
      const { data: tables, error: tableError } = await supabaseAdmin
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .in('table_name', ['invoices', 'suppliers', 'invoice_line_items', 'invoice_corrections', 'invoice_approvals']);

      if (tableError) {
        return res.status(500).json({
          error: 'Cannot query information_schema',
          details: tableError.message,
          suggestion: 'Need to run migration or check database access'
        });
      }

      return res.status(200).json({
        method: 'information_schema',
        tables: tables || [],
        exists: (tables || []).length > 0
      });
    }

    return res.status(200).json({
      method: 'rpc',
      data,
      exists: true
    });
  } catch (err: any) {
    return res.status(500).json({
      error: 'Failed to check tables',
      details: err.message
    });
  }
}
