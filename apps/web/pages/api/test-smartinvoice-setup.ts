// SmartInvoice Setup Verification API
// Test this endpoint to verify SmartInvoice is configured correctly
// Visit: http://localhost:3000/api/test-smartinvoice-setup

import type { NextApiRequest, NextApiResponse } from 'next';
import { Pool } from 'pg';

import { supabaseAdmin } from '../../lib/supabaseAdmin';

// Create connection pool for direct PostgreSQL access (bypasses PostgREST cache)
let pool: Pool | null = null;

function getPool() {
  if (!pool && process.env.DATABASE_URL) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
  }
  return pool;
}

interface SetupCheck {
  name: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  details?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const checks: SetupCheck[] = [];
  let overallStatus: 'pass' | 'fail' = 'pass';

  // Check 1: Environment Variables
  const hasSupabaseUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
  const hasServiceKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
  const hasDatabaseUrl = !!process.env.DATABASE_URL;
  const hasGeminiKey = !!(process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY);

  if (hasSupabaseUrl && hasServiceKey) {
    checks.push({
      name: 'Supabase Environment Variables',
      status: 'pass',
      message: 'Supabase URL and Service Role Key are configured'
    });
  } else {
    checks.push({
      name: 'Supabase Environment Variables',
      status: 'fail',
      message: 'Missing required Supabase environment variables',
      details: `Missing: ${!hasSupabaseUrl ? 'NEXT_PUBLIC_SUPABASE_URL ' : ''}${!hasServiceKey ? 'SUPABASE_SERVICE_ROLE_KEY' : ''}`
    });
    overallStatus = 'fail';
  }

  if (hasDatabaseUrl) {
    checks.push({
      name: 'Database URL',
      status: 'pass',
      message: 'DATABASE_URL is configured (for better performance)'
    });
  } else {
    checks.push({
      name: 'Database URL',
      status: 'warning',
      message: 'DATABASE_URL not configured (optional, but recommended for performance)'
    });
  }

  if (hasGeminiKey) {
    checks.push({
      name: 'Gemini API Key',
      status: 'pass',
      message: 'Gemini API key is configured'
    });
  } else {
    checks.push({
      name: 'Gemini API Key',
      status: 'fail',
      message: 'GEMINI_API_KEY is missing - AI extraction will not work',
      details: 'Get your key from: https://makersuite.google.com/app/apikey'
    });
    overallStatus = 'fail';
  }

  // Check 2: Database Connection (try DATABASE_URL first to bypass PostgREST cache)
  if (hasSupabaseUrl && hasServiceKey) {
    try {
      let connectionSuccess = false;
      let connectionMethod = '';

      // Try direct PostgreSQL connection first (bypasses PostgREST cache issues)
      if (process.env.DATABASE_URL) {
        try {
          const result = await getPool()?.query('SELECT 1 FROM invoices LIMIT 1');
          connectionSuccess = true;
          connectionMethod = 'Direct PostgreSQL (DATABASE_URL)';
        } catch (pgError) {
          console.warn('Direct PG connection failed, trying Supabase fallback:', pgError);
          // Fall through to Supabase fallback
        }
      }

      // Fallback: Use Supabase Admin client
      if (!connectionSuccess) {
        const { error: connectionError } = await supabaseAdmin
          .from('invoices')
          .select('id')
          .limit(1);

        if (connectionError) {
          if (connectionError.message.includes('relation "invoices" does not exist') ||
              connectionError.message.includes('relation "public.invoices" does not exist') ||
              connectionError.message.includes('schema cache')) {
            checks.push({
              name: 'Database Tables',
              status: 'fail',
              message: 'Invoices table does not exist or PostgREST cache is stale',
              details: 'Run: NOTIFY pgrst, \'reload schema\'; in Supabase SQL Editor, or add DATABASE_URL to .env.local'
            });
            overallStatus = 'fail';
          } else {
            checks.push({
              name: 'Database Connection',
              status: 'fail',
              message: 'Database connection failed',
              details: connectionError.message
            });
            overallStatus = 'fail';
          }
        } else {
          connectionSuccess = true;
          connectionMethod = 'Supabase Admin Client (PostgREST)';
        }
      }

      if (connectionSuccess) {
        checks.push({
          name: 'Database Connection',
          status: 'pass',
          message: `Successfully connected to database via ${connectionMethod}`
        });
      }
    } catch (error) {
      checks.push({
        name: 'Database Connection',
        status: 'fail',
        message: 'Failed to connect to database',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
      overallStatus = 'fail';
    }

    // Check 3: Required Tables (try DATABASE_URL first to bypass PostgREST cache)
    try {
      const requiredTables = [
        'suppliers',
        'invoices',
        'invoice_corrections',
        'document_templates',
        'template_fields',
        'active_learning_requests',
        'learning_patterns',
        'predicted_corrections',
        'anomaly_detections',
        'validation_results'
      ];

      let existingTables: string[] = [];
      let schemaCheckSuccess = false;

      // Try direct PostgreSQL query first (bypasses PostgREST cache)
      if (process.env.DATABASE_URL) {
        try {
          const result = await getPool()?.query(`
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            AND table_name = ANY($1::text[])
          `, [requiredTables]);

          if (result?.rows) {
            existingTables = result.rows.map((row: any) => row.table_name);
            schemaCheckSuccess = true;
          }
        } catch (pgError) {
          console.warn('Direct PG schema check failed, trying Supabase fallback:', pgError);
          // Fall through to Supabase fallback
        }
      }

      // Fallback: Use Supabase Admin client
      if (!schemaCheckSuccess) {
        const { data: tables, error: tablesError } = await supabaseAdmin
          .from('information_schema.tables')
          .select('table_name')
          .eq('table_schema', 'public')
          .in('table_name', requiredTables);

        if (tablesError) {
          checks.push({
            name: 'Database Schema',
            status: 'warning',
            message: 'Could not verify database schema (PostgREST cache may be stale)',
            details: `${tablesError.message}. Try adding DATABASE_URL to .env.local`
          });
          schemaCheckSuccess = false;
        } else if (tables) {
          existingTables = tables.map((t: any) => t.table_name);
          schemaCheckSuccess = true;
        }
      }

      // Analyze results
      if (schemaCheckSuccess) {
        const missingTables = requiredTables.filter(t => !existingTables.includes(t));

        if (missingTables.length === 0) {
          checks.push({
            name: 'Database Schema',
            status: 'pass',
            message: `All ${requiredTables.length} required tables exist`
          });
        } else if (missingTables.length < 5) {
          checks.push({
            name: 'Database Schema',
            status: 'warning',
            message: `Missing ${missingTables.length} tables: ${missingTables.join(', ')}`,
            details: 'Some features may not work. Run DEPLOY_SMARTINVOICE_MIGRATIONS_FIXED.sql'
          });
        } else {
          checks.push({
            name: 'Database Schema',
            status: 'fail',
            message: 'Most tables are missing',
            details: `Missing: ${missingTables.join(', ')}. Run DEPLOY_SMARTINVOICE_MIGRATIONS_FIXED.sql`
          });
          overallStatus = 'fail';
        }
      }
    } catch (error) {
      checks.push({
        name: 'Database Schema',
        status: 'warning',
        message: 'Could not verify schema',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Generate response
  const passCount = checks.filter(c => c.status === 'pass').length;
  const failCount = checks.filter(c => c.status === 'fail').length;
  const warningCount = checks.filter(c => c.status === 'warning').length;

  return res.status(overallStatus === 'pass' ? 200 : 500).json({
    success: overallStatus === 'pass',
    summary: {
      total: checks.length,
      passed: passCount,
      failed: failCount,
      warnings: warningCount
    },
    status: overallStatus === 'pass'
      ? 'SmartInvoice is ready to use! 🎉'
      : 'SmartInvoice requires configuration',
    checks,
    nextSteps: overallStatus === 'pass'
      ? [
          'Navigate to /smart-invoice to start using the system',
          'Upload a test invoice to verify AI extraction',
          'Check the AI Training Dashboard to monitor learning'
        ]
      : [
          'Review failed checks above',
          'See SMARTINVOICE_SETUP_GUIDE.md for detailed instructions',
          'Configure missing environment variables',
          'Run required database migrations',
          'Restart the development server after making changes'
        ]
  });
}
