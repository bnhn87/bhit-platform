// API Route to fetch invoices - Uses direct PostgreSQL connection
// This COMPLETELY bypasses PostgREST and its schema cache issues
import type { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';

// Create connection pool (reuses connections for efficiency)
let pool: Pool | null = null;

function getPool() {
  if (!pool) {
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
    // Direct PostgreSQL query - bypasses PostgREST entirely
    const result = await getPool().query(
      'SELECT * FROM invoices ORDER BY invoice_date DESC'
    );

    return res.status(200).json(result.rows);
  } catch (error: unknown) {
    console.error('Invoices API error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
