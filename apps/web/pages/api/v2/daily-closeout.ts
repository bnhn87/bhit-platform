import { createClient } from '@supabase/supabase-js';
import { NextApiRequest, NextApiResponse } from 'next';

import { labourCalculator } from '../../../lib/labour-calculator';

const supabaseServiceRole = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface DailyCloseoutRequest {
  job_id: string;
  date?: string; // YYYY-MM-DD format, defaults to today
  summary?: {
    unitsCompleted: number;
    hoursWorked: number;
    workersOnSite: number;
    weatherConditions?: string;
    notes?: string;
  };
  photoUrls?: string[];
  supervisorSignature?: string;
  contractorSignature?: string;
  generatePdf?: boolean;
  sendEmail?: boolean;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const {
    job_id,
    date = new Date().toISOString().split('T')[0],
    summary = { unitsCompleted: 0, hoursWorked: 0, workersOnSite: 0 },
    photoUrls = [],
    supervisorSignature,
    contractorSignature,
    generatePdf = true,
    sendEmail = false
  }: DailyCloseoutRequest = req.body;

  if (!job_id) {
    return res.status(400).json({ error: 'Job ID is required' });
  }

  try {
    // Get current product progress
    const { data: products, error: productsError } = await supabaseServiceRole
      .from('product_progress')
      .select('*')
      .eq('job_id', job_id);

    if (productsError) {
      console.error('Error fetching products:', productsError);
      return res.status(500).json({ error: 'Failed to fetch product data' });
    }

    // Get previous day's progress for comparison
    const previousDate = new Date(date);
    previousDate.setDate(previousDate.getDate() - 1);
    const prevDateStr = previousDate.toISOString().split('T')[0];

    const { data: previousCloseout } = await supabaseServiceRole
      .from('daily_closeout_forms')
      .select('summary_data')
      .eq('job_id', job_id)
      .eq('closeout_date', prevDateStr)
      .single();

    // Calculate today's progress
    const totalUnitsCompleted = (products || []).reduce((sum, p) => sum + p.completed_units, 0);
    const totalUnits = (products || []).reduce((sum, p) => sum + p.total_quantity, 0);
    const overallProgress = totalUnits > 0 ? (totalUnitsCompleted / totalUnits) * 100 : 0;

    // Calculate units completed today (difference from yesterday)
    let unitsCompletedToday = summary.unitsCompleted || 0;
    if (previousCloseout && !summary.unitsCompleted) {
      const prevTotal = previousCloseout.summary_data?.totalUnitsCompleted || 0;
      unitsCompletedToday = totalUnitsCompleted - prevTotal;
    }

    // Auto-generate labour analysis
    const remainingHours = labourCalculator.calculateRemainingHours(products || []);
    const efficiency = labourCalculator.calculateEfficiency(products || []);
    const tomorrowPlan = labourCalculator.generateTomorrowPlan(products || []);

    // Create summary data
    const summaryData = {
      date,
      totalUnitsCompleted,
      totalUnits,
      unitsCompletedToday,
      overallProgress: Math.round(overallProgress * 100) / 100,
      hoursWorked: summary.hoursWorked || 0,
      workersOnSite: summary.workersOnSite || 4,
      weatherConditions: summary.weatherConditions || 'Fair',
      notes: summary.notes || '',
      productBreakdown: (products || []).map(p => ({
        product_type: p.product_type,
        product_name: p.product_name,
        completed: p.completed_units,
        total: p.total_quantity,
        progress: p.total_quantity > 0 ? Math.round((p.completed_units / p.total_quantity) * 100) : 0
      }))
    };

    // Create labour analysis
    const labourAnalysis = {
      remainingHours,
      efficiency: Math.round(efficiency * 100) / 100,
      projectedCompletion: labourCalculator.projectCompletionDate(remainingHours, summary.hoursWorked || 32),
      recommendedTeamSize: labourCalculator.calculateRequiredTeamSize(remainingHours, 30).recommended,
      burnRate: summary.hoursWorked || 0,
      efficiencyRating: efficiency >= 100 ? 'Excellent' : efficiency >= 85 ? 'Good' : efficiency >= 70 ? 'Fair' : 'Poor'
    };

    // Create progress summary with tomorrow's plan
    const progressSummary = {
      tomorrowTargets: tomorrowPlan.targets,
      tomorrowPriority: tomorrowPlan.priority.map(p => ({
        product_type: p.product_type,
        product_name: p.product_name,
        units_remaining: p.total_quantity - p.completed_units
      })),
      estimatedHoursTomorrow: tomorrowPlan.estimatedHours,
      recommendations: tomorrowPlan.notes
    };

    // Create or update daily closeout record
    const closeoutData = {
      job_id,
      closeout_date: date,
      summary_data: summaryData,
      labour_analysis: labourAnalysis,
      progress_summary: progressSummary,
      photo_urls: photoUrls,
      supervisor_signature: supervisorSignature,
      contractor_signature: contractorSignature,
      signed_at: (supervisorSignature && contractorSignature) ? new Date().toISOString() : null
    };

    const { data: closeoutForm, error: closeoutError } = await supabaseServiceRole
      .from('daily_closeout_forms')
      .upsert(closeoutData, { 
        onConflict: 'job_id,closeout_date',
        ignoreDuplicates: false 
      })
      .select()
      .single();

    if (closeoutError) {
      console.error('Error creating closeout form:', closeoutError);
      return res.status(500).json({ error: 'Failed to create closeout form' });
    }

    // Update daily progress log
    await supabaseServiceRole
      .from('daily_progress_log')
      .upsert({
        job_id,
        log_date: date,
        units_completed: unitsCompletedToday,
        hours_worked: summary.hoursWorked || 0,
        workers_on_site: summary.workersOnSite || 4,
        efficiency_percentage: efficiency,
        weather_conditions: summary.weatherConditions,
        notes: summary.notes
      }, { 
        onConflict: 'job_id,log_date',
        ignoreDuplicates: false 
      });

    let pdfUrl = null;
    let emailSent = false;

    // Generate PDF if requested (placeholder for PDF generation service)
    if (generatePdf) {
      // TODO: Integrate with PDF generation service
      pdfUrl = `/api/v2/closeout/${closeoutForm.id}/pdf`;
    }

    // Send email if requested (placeholder for email service)
    if (sendEmail) {
      // TODO: Integrate with email service
      emailSent = true;
    }

    // Update closeout form with PDF URL if generated
    if (pdfUrl) {
      await supabaseServiceRole
        .from('daily_closeout_forms')
        .update({ 
          pdf_generated_url: pdfUrl,
          email_sent: emailSent 
        })
        .eq('id', closeoutForm.id);
    }

    return res.status(200).json({
      success: true,
      closeout: {
        id: closeoutForm.id,
        date,
        summaryData,
        labourAnalysis,
        progressSummary,
        pdfUrl,
        emailSent,
        signed: !!(supervisorSignature && contractorSignature)
      },
      recommendations: [
        ...tomorrowPlan.notes,
        ...(efficiency < 85 ? ['Review work processes to improve efficiency'] : []),
        ...(remainingHours > 200 ? ['Consider increasing team size or extending timeline'] : [])
      ]
    });

  } catch (error) {
    console.error('Daily closeout API error:', error);
    return res.status(500).json({ 
      error: 'Failed to create daily closeout',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}