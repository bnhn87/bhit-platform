// API Route to fetch invoices
// Falls back gracefully: DATABASE_URL (direct PG) → Supabase Admin client
import type { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

// Create connection pool (reuses connections for efficiency)
let pool: Pool | null = null;

function getPool() {
  if (!pool && process.env.DATABASE_URL) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 20, // Maximum number of clients in the pool
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
  }
  return pool;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Try direct PostgreSQL connection first (if DATABASE_URL is configured)
    if (process.env.DATABASE_URL) {
      try {
        const result = await getPool()?.query(
          'SELECT * FROM invoices ORDER BY invoice_date DESC'
        );
        return res.status(200).json(result?.rows || []);
      } catch (pgError) {
        console.warn('Direct PG connection failed, falling back to Supabase:', pgError);
        // Fall through to Supabase fallback
      }
    }

    // Fallback: Use Supabase Admin client (bypasses RLS, uses service role)
    const { data, error } = await supabaseAdmin
      .from('invoices')
      .select('*')
      .order('invoice_date', { ascending: false });

    if (error) {
      console.error('Supabase query error:', error);
      throw new Error(error.message);
    }

    return res.status(200).json(data || []);
  } catch (error) {
    console.error('Invoices API error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
