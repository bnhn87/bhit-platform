// SmartInvoice Setup Verification API
// Test this endpoint to verify SmartInvoice is configured correctly
// Visit: http://localhost:3000/api/test-smartinvoice-setup

import type { NextApiRequest, NextApiResponse } from 'next';
import { supabaseAdmin } from '../../lib/supabaseAdmin';

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

  // Check 2: Database Connection
  if (hasSupabaseUrl && hasServiceKey) {
    try {
      const { error: connectionError } = await supabaseAdmin
        .from('invoices')
        .select('id')
        .limit(1);

      if (connectionError) {
        if (connectionError.message.includes('relation "invoices" does not exist') ||
            connectionError.message.includes('relation "public.invoices" does not exist')) {
          checks.push({
            name: 'Database Tables',
            status: 'fail',
            message: 'Invoices table does not exist',
            details: 'Run migrations: 041_invoice_system.sql, 042_document_templates.sql, 043_active_learning.sql'
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
        checks.push({
          name: 'Database Connection',
          status: 'pass',
          message: 'Successfully connected to database'
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

    // Check 3: Required Tables
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

      const { data: tables, error: tablesError } = await supabaseAdmin
        .from('information_schema.tables')
        .select('table_name')
        .eq('table_schema', 'public')
        .in('table_name', requiredTables);

      if (tablesError) {
        checks.push({
          name: 'Database Schema',
          status: 'warning',
          message: 'Could not verify database schema',
          details: tablesError.message
        });
      } else if (tables) {
        const existingTables = tables.map((t: any) => t.table_name);
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
            details: 'Some features may not work. Run the corresponding migrations.'
          });
        } else {
          checks.push({
            name: 'Database Schema',
            status: 'fail',
            message: 'Most tables are missing',
            details: `Missing: ${missingTables.join(', ')}`
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
