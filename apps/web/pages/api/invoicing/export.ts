import { NextApiRequest, NextApiResponse } from 'next';

import { supabase } from '@/lib/supabaseClient';

// Helper function to escape CSV values
function escapeCSV(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// Helper function to create Excel-compatible CSV
function createExcelCSV(data: Array<Array<string | number>>, headers: string[]): string {
  const rows = [headers, ...data];
  return rows.map(row => row.map(cell => escapeCSV(cell)).join(',')).join('\n');
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { scheduleId, format = 'csv', selectedJobs = [] } = req.body;

    let scheduleData;
    let filename;

    if (scheduleId) {
      // Export existing schedule
      const { data: schedule, error: scheduleError } = await supabase
        .from('invoice_schedules')
        .select(`
          *,
          invoice_schedule_items (
            *,
            jobs (
              reference,
              location,
              client_name,
              end_user
            )
          )
        `)
        .eq('id', scheduleId)
        .single();

      if (scheduleError) throw scheduleError;
      if (!schedule) {
        return res.status(404).json({ error: 'Schedule not found' });
      }

      scheduleData = schedule;
      filename = `invoice-schedule-${schedule.week_commencing}`;
    } else if (selectedJobs.length > 0) {
      // Export selected jobs directly (for preview/draft)
      const { data: jobs, error: jobsError } = await supabase
        .from('v_invoiceable_jobs')
        .select('*')
        .in('id', selectedJobs);

      if (jobsError) throw jobsError;

      // Transform jobs to match schedule format
      scheduleData = {
        week_commencing: new Date().toISOString().split('T')[0],
        total_amount: jobs?.reduce((sum, job) => sum + job.remaining_to_invoice, 0) || 0,
        job_count: jobs?.length || 0,
        status: 'draft',
        invoice_schedule_items: jobs?.map(job => ({
          jobs: {
            reference: job.reference,
            location: job.location,
            client_name: job.client_name,
            end_user: job.end_user
          },
          invoice_type: job.percent_complete === 100 ? 'full' : 'partial',
          percentage: job.percent_complete,
          quoted_amount: job.quoted_amount,
          additions_amount: job.additions_amount,
          invoice_amount: job.remaining_to_invoice,
          notes: `${job.percent_complete}% complete`
        })) || []
      };
      filename = `invoice-export-${new Date().toISOString().split('T')[0]}`;
    } else {
      return res.status(400).json({ error: 'Either scheduleId or selectedJobs is required' });
    }

    if (format === 'csv' || format === 'excel') {
      // Enhanced headers for Excel compatibility
      const headers = [
        'Job Reference',
        'Location',
        'Client Name',
        'End User',
        'Invoice Type',
        'Progress %',
        'Quoted Amount (£)',
        'Additions (£)',
        'Invoice Amount (£)',
        'VAT Amount (£)',
        'Total Inc VAT (£)',
        'Notes',
        'Date Created'
      ];

      const rows = scheduleData.invoice_schedule_items.map((item: {
        jobs: {
          reference?: string;
          location?: string;
          client_name?: string;
          end_user?: string;
        };
        invoice_type: string;
        percentage?: number;
        quoted_amount?: number;
        additions_amount?: number;
        invoice_amount: string | number;
        notes?: string;
      }) => {
        const invoiceAmount = typeof item.invoice_amount === 'number'
          ? item.invoice_amount
          : parseFloat(item.invoice_amount) || 0;
        const vatRate = 0.20; // 20% VAT
        const vatAmount = invoiceAmount * vatRate;
        const totalIncVat = invoiceAmount + vatAmount;

        return [
          item.jobs.reference || '',
          item.jobs.location || '',
          item.jobs.client_name || '',
          item.jobs.end_user || '',
          item.invoice_type === 'full' ? 'Final Invoice' : 'Progress Invoice',
          item.percentage || '',
          item.quoted_amount || 0,
          item.additions_amount || 0,
          invoiceAmount.toFixed(2),
          vatAmount.toFixed(2),
          totalIncVat.toFixed(2),
          item.notes || '',
          new Date().toLocaleDateString('en-GB')
        ];
      });

      // Add summary row
      const totalInvoiceAmount = rows.reduce((sum: number, row: (string | number)[]) => sum + parseFloat(String(row[8])), 0);
      const totalVatAmount = rows.reduce((sum: number, row: (string | number)[]) => sum + parseFloat(String(row[9])), 0);
      const totalIncVat = rows.reduce((sum: number, row: (string | number)[]) => sum + parseFloat(String(row[10])), 0);

      rows.push([
        '', '', '', '', '', '', '', '',
        totalInvoiceAmount.toFixed(2),
        totalVatAmount.toFixed(2),
        totalIncVat.toFixed(2),
        'TOTAL',
        ''
      ]);

      const csvContent = createExcelCSV(rows, headers);

      // Set headers for Excel compatibility
      if (format === 'excel') {
        res.setHeader('Content-Type', 'application/vnd.ms-excel');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
      } else {
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
      }

      // Add BOM for Excel UTF-8 compatibility
      const bom = '\uFEFF';
      return res.status(200).send(bom + csvContent);
    }

    if (format === 'json') {
      return res.status(200).json({
        success: true,
        data: {
          schedule: {
            id: scheduleData.id,
            week_commencing: scheduleData.week_commencing,
            total_amount: scheduleData.total_amount,
            job_count: scheduleData.job_count,
            status: scheduleData.status,
            created_at: scheduleData.created_at
          },
          items: scheduleData.invoice_schedule_items.map((item: {
            jobs: {
              reference?: string;
              location?: string;
              client_name?: string;
              end_user?: string;
            };
            invoice_type: string;
            percentage?: number;
            quoted_amount?: number;
            additions_amount?: number;
            invoice_amount: string | number;
            notes?: string;
          }) => {
            const invoiceAmount = typeof item.invoice_amount === 'number'
              ? item.invoice_amount
              : parseFloat(item.invoice_amount) || 0;
            const vatAmount = invoiceAmount * 0.20;
            const totalIncVat = invoiceAmount + vatAmount;

            return {
              job_reference: item.jobs.reference,
              location: item.jobs.location,
              client_name: item.jobs.client_name,
              end_user: item.jobs.end_user,
              invoice_type: item.invoice_type,
              percentage: item.percentage,
              quoted_amount: item.quoted_amount,
              additions_amount: item.additions_amount,
              invoice_amount: invoiceAmount,
              vat_amount: vatAmount,
              total_inc_vat: totalIncVat,
              notes: item.notes
            };
          }),
          summary: {
            total_jobs: scheduleData.job_count,
            total_net_amount: scheduleData.invoice_schedule_items.reduce((sum: number, item: { invoice_amount: string | number }) =>
              sum + (parseFloat(String(item.invoice_amount)) || 0), 0),
            total_vat_amount: scheduleData.invoice_schedule_items.reduce((sum: number, item: { invoice_amount: string | number }) =>
              sum + ((parseFloat(String(item.invoice_amount)) || 0) * 0.20), 0),
            total_gross_amount: scheduleData.invoice_schedule_items.reduce((sum: number, item: { invoice_amount: string | number }) =>
              sum + ((parseFloat(String(item.invoice_amount)) || 0) * 1.20), 0)
          }
        }
      });
    }

    return res.status(400).json({ error: 'Invalid format. Supported formats: csv, excel, json' });

  } catch (error) {
    console.error('Error exporting invoice schedule:', error);
    return res.status(500).json({
      error: 'Failed to export schedule',
      details: (error as Error).message
    });
  }
}