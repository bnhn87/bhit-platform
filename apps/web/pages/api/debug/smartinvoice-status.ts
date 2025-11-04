// Diagnostic endpoint for SmartInvoice system status
import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const checks = [];

  // Check 1: Invoices table exists
  try {
    const { data, error } = await supabaseAdmin
      .from('invoices')
      .select('id')
      .limit(1);

    checks.push({
      name: 'Invoices Table',
      status: error ? 'ERROR' : 'OK',
      details: error ? error.message : `Can query invoices table`,
      error: error || null
    });
  } catch (err: any) {
    checks.push({
      name: 'Invoices Table',
      status: 'ERROR',
      details: err.message,
      error: err
    });
  }

  // Check 2: Suppliers table exists
  try {
    const { data, error } = await supabaseAdmin
      .from('suppliers')
      .select('id')
      .limit(1);

    checks.push({
      name: 'Suppliers Table',
      status: error ? 'ERROR' : 'OK',
      details: error ? error.message : 'Can query suppliers table',
      error: error || null
    });
  } catch (err: any) {
    checks.push({
      name: 'Suppliers Table',
      status: 'ERROR',
      details: err.message,
      error: err
    });
  }

  // Check 3: Invoice line items table
  try {
    const { data, error } = await supabaseAdmin
      .from('invoice_line_items')
      .select('id')
      .limit(1);

    checks.push({
      name: 'Invoice Line Items Table',
      status: error ? 'ERROR' : 'OK',
      details: error ? error.message : 'Can query line items table',
      error: error || null
    });
  } catch (err: any) {
    checks.push({
      name: 'Invoice Line Items Table',
      status: 'ERROR',
      details: err.message,
      error: err
    });
  }

  // Check 4: Storage bucket
  try {
    const { data, error } = await supabaseAdmin
      .storage
      .from('documents')
      .list('', { limit: 1 });

    checks.push({
      name: 'Documents Storage Bucket',
      status: error ? 'ERROR' : 'OK',
      details: error ? error.message : 'Storage bucket accessible',
      error: error || null
    });
  } catch (err: any) {
    checks.push({
      name: 'Documents Storage Bucket',
      status: 'ERROR',
      details: err.message,
      error: err
    });
  }

  // Check 5: Count invoices
  try {
    const { count, error } = await supabaseAdmin
      .from('invoices')
      .select('*', { count: 'exact', head: true });

    checks.push({
      name: 'Invoice Count',
      status: error ? 'ERROR' : 'OK',
      details: error ? error.message : `${count || 0} invoices in database`,
      error: error || null
    });
  } catch (err: any) {
    checks.push({
      name: 'Invoice Count',
      status: 'ERROR',
      details: err.message,
      error: err
    });
  }

  // Check 6: DATABASE_URL environment variable
  checks.push({
    name: 'DATABASE_URL Environment Variable',
    status: process.env.DATABASE_URL ? 'OK' : 'MISSING',
    details: process.env.DATABASE_URL
      ? 'DATABASE_URL is configured'
      : '❌ DATABASE_URL is not set in .env.local',
    error: null
  });

  // Check 7: GEMINI_API_KEY
  checks.push({
    name: 'GEMINI_API_KEY Environment Variable',
    status: process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY ? 'OK' : 'MISSING',
    details: process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY
      ? 'Gemini API key is configured'
      : '❌ GEMINI_API_KEY is not set',
    error: null
  });

  const allOk = checks.every(check => check.status === 'OK');

  return res.status(200).json({
    overall: allOk ? '✅ READY' : '⚠️ ISSUES FOUND',
    timestamp: new Date().toISOString(),
    checks,
    summary: {
      total: checks.length,
      ok: checks.filter(c => c.status === 'OK').length,
      errors: checks.filter(c => c.status === 'ERROR' || c.status === 'MISSING').length
    }
  });
}
