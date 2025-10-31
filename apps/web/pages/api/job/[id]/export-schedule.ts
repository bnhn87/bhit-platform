import { createClient } from '@supabase/supabase-js';
import { NextApiRequest, NextApiResponse } from 'next';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id } = req.query;
  
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Job ID is required' });
  }

  try {
    // Get job information
    const { data: jobData, error: jobError } = await supabase
      .from('jobs')
      .select('id, title, reference, client_name, status, start_date')
      .eq('id', id)
      .single();

    if (jobError) {
      return res.status(404).json({ error: 'Job not found' });
    }

    // Get labour bank data
    const { data: labourBank, error: _bankError } = await supabase
      .from('job_labour_bank')
      .select('*')
      .eq('job_id', id)
      .single();

    // Get labour allocations
    const { data: allocations, error: allocationsError } = await supabase
      .from('labour_allocations')
      .select('*')
      .eq('job_id', id)
      .order('work_date', { ascending: true });

    if (allocationsError) {
      return res.status(500).json({ error: 'Failed to fetch allocations' });
    }

    // Generate HTML content for PDF
    const htmlContent = generateScheduleHTML(jobData, labourBank, allocations || []);
    
    // Return HTML for now (can be enhanced with actual PDF generation)
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Content-Disposition', `inline; filename="labour-schedule-${jobData.reference}.html"`);
    return res.send(htmlContent);
    
  } catch (error) {
    console.error('Error generating schedule export:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

function generateScheduleHTML(jobData: { id: string; title: string; reference: string; client_name: string; status: string; start_date: string }, labourBank: { total_labour_days?: number; allocated_days?: number; remaining_days?: number } | null, allocations: Array<{ work_date: string; hours_allocated?: number; is_closed: boolean; van_crews: number; foot_crews: number; supervisors: number; crew_mode: string; notes?: string }>): string {
  const styles = `
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { 
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
        line-height: 1.4;
        color: #1f2937;
        background: #f9fafb;
        padding: 20px;
      }
      .container { max-width: 800px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
      .header { border-bottom: 2px solid #e5e7eb; padding-bottom: 20px; margin-bottom: 30px; }
      .header h1 { font-size: 24px; font-weight: 700; margin-bottom: 8px; color: #111827; }
      .header .subtitle { font-size: 16px; color: #6b7280; margin-bottom: 4px; }
      .header .meta { font-size: 14px; color: #9ca3af; }
      
      .section { margin-bottom: 30px; }
      .section h2 { font-size: 18px; font-weight: 600; margin-bottom: 15px; color: #374151; }
      
      .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin-bottom: 20px; }
      .summary-card { background: #f3f4f6; padding: 15px; border-radius: 6px; text-align: center; }
      .summary-card .value { font-size: 20px; font-weight: 700; margin-bottom: 4px; }
      .summary-card .label { font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; }
      
      .schedule-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
      .schedule-table th,
      .schedule-table td { padding: 12px 8px; text-align: left; border-bottom: 1px solid #e5e7eb; }
      .schedule-table th { background: #f9fafb; font-weight: 600; font-size: 13px; color: #374151; }
      .schedule-table td { font-size: 14px; }
      .schedule-table tr:hover { background: #fafafa; }
      
      .crew-cell { display: flex; gap: 12px; align-items: center; }
      .crew-badge { 
        background: #ddd6fe; 
        color: #5b21b6; 
        padding: 2px 6px; 
        border-radius: 4px; 
        font-size: 11px; 
        font-weight: 600;
      }
      .crew-badge.van { background: #dbeafe; color: #1e40af; }
      .crew-badge.foot { background: #dcfce7; color: #166534; }
      .crew-badge.supervisor { background: #fed7aa; color: #9a3412; }
      
      .status-closed { color: #059669; font-weight: 600; }
      .status-open { color: #d97706; font-weight: 600; }
      
      .notes { font-style: italic; color: #6b7280; font-size: 13px; }
      .no-data { text-align: center; padding: 40px; color: #9ca3af; font-style: italic; }
      
      .progress-bar { 
        width: 100%; 
        height: 8px; 
        background: #e5e7eb; 
        border-radius: 4px; 
        overflow: hidden; 
        margin: 10px 0;
      }
      .progress-fill { 
        height: 100%; 
        background: #10b981; 
        transition: width 0.3s ease;
      }
      
      .footer { 
        margin-top: 40px; 
        padding-top: 20px; 
        border-top: 1px solid #e5e7eb; 
        text-align: center; 
        font-size: 12px; 
        color: #9ca3af;
      }
      
      @media print {
        body { background: white; padding: 0; }
        .container { box-shadow: none; padding: 20px; }
      }
    </style>
  `;

  const totalAllocatedHours = allocations.reduce((sum, alloc) => sum + (alloc.hours_allocated || 0), 0);
  const completedDays = allocations.filter(alloc => alloc.is_closed).length;
  const totalDays = allocations.length;
  const _progressPercentage = totalDays > 0 ? (completedDays / totalDays) * 100 : 0;

  const scheduleRows = allocations.map(allocation => {
    const workDate = new Date(allocation.work_date).toLocaleDateString('en-GB', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });

    return `
      <tr>
        <td><strong>${workDate}</strong></td>
        <td>
          <div class="crew-cell">
            ${allocation.van_crews > 0 ? `<span class="crew-badge van">${allocation.van_crews}V</span>` : ''}
            ${allocation.foot_crews > 0 ? `<span class="crew-badge foot">${allocation.foot_crews}F</span>` : ''}
            ${allocation.supervisors > 0 ? `<span class="crew-badge supervisor">${allocation.supervisors}S</span>` : ''}
          </div>
        </td>
        <td>${allocation.crew_mode.charAt(0).toUpperCase() + allocation.crew_mode.slice(1)}</td>
        <td><strong>${allocation.hours_allocated}h</strong></td>
        <td class="${allocation.is_closed ? 'status-closed' : 'status-open'}">
          ${allocation.is_closed ? 'COMPLETED' : 'SCHEDULED'}
        </td>
        <td class="notes">${allocation.notes || '—'}</td>
      </tr>
    `;
  }).join('');

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Labour Schedule - ${jobData.reference}</title>
      ${styles}
    </head>
    <body>
      <div class="container">
        <!-- Header -->
        <div class="header">
          <h1>Labour Schedule</h1>
          <div class="subtitle">${jobData.reference} • ${jobData.client_name}</div>
          <div class="subtitle">${jobData.title}</div>
          <div class="meta">
            Generated on ${new Date().toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </div>
        </div>

        <!-- Labour Summary -->
        <div class="section">
          <h2>Labour Overview</h2>
          <div class="summary-grid">
            <div class="summary-card">
              <div class="value">${labourBank?.total_labour_days || '—'}</div>
              <div class="label">Total Days</div>
            </div>
            <div class="summary-card">
              <div class="value">${labourBank?.allocated_days || 0}</div>
              <div class="label">Allocated Days</div>
            </div>
            <div class="summary-card">
              <div class="value">${labourBank?.remaining_days || '—'}</div>
              <div class="label">Remaining Days</div>
            </div>
            <div class="summary-card">
              <div class="value">${totalAllocatedHours}</div>
              <div class="label">Total Hours</div>
            </div>
          </div>
          
          ${labourBank && labourBank.allocated_days !== undefined && labourBank.total_labour_days !== undefined ? `
            <div class="progress-bar">
              <div class="progress-fill" style="width: ${Math.min((labourBank.allocated_days / labourBank.total_labour_days) * 100, 100)}%"></div>
            </div>
            <div style="text-align: center; font-size: 13px; color: #6b7280; margin-top: 5px;">
              ${Math.round((labourBank.allocated_days / labourBank.total_labour_days) * 100)}% of labour bank allocated
            </div>
          ` : ''}
        </div>

        <!-- Work Schedule -->
        <div class="section">
          <h2>Work Schedule (${totalDays} days)</h2>
          <div style="margin-bottom: 10px; font-size: 14px; color: #6b7280;">
            ${completedDays} completed • ${totalDays - completedDays} remaining
          </div>
          
          ${allocations.length > 0 ? `
            <table class="schedule-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Crew</th>
                  <th>Mode</th>
                  <th>Hours</th>
                  <th>Status</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                ${scheduleRows}
              </tbody>
            </table>
          ` : `
            <div class="no-data">
              No work days have been scheduled yet.
            </div>
          `}
        </div>

        <!-- Legend -->
        <div class="section">
          <h2>Legend</h2>
          <div style="display: flex; gap: 20px; flex-wrap: wrap; font-size: 14px;">
            <div><span class="crew-badge van">V</span> Van Crews</div>
            <div><span class="crew-badge foot">F</span> Foot Crews</div>
            <div><span class="crew-badge supervisor">S</span> Supervisors</div>
          </div>
          <div style="margin-top: 10px; font-size: 13px; color: #6b7280;">
            <strong>Crew Modes:</strong> Van (van-based work), Foot (foot-based work), Mixed (combination)
          </div>
        </div>

        <!-- Footer -->
        <div class="footer">
          BHIT Work OS • Labour Schedule Export<br>
          This document contains confidential information and is intended for internal use only.
        </div>
      </div>
    </body>
    </html>
  `;
}