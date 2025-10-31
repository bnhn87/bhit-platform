import { createClient } from '@supabase/supabase-js';
import { NextApiRequest, NextApiResponse } from 'next';

import { labourCalculator } from '../../../../../lib/labour-calculator';

const supabaseServiceRole = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id: jobId } = req.query;

  if (!jobId || typeof jobId !== 'string') {
    return res.status(400).json({ error: 'Job ID is required' });
  }

  try {
    // Fetch product progress
    const { data: products, error: productsError } = await supabaseServiceRole
      .from('product_progress')
      .select('*')
      .eq('job_id', jobId)
      .order('product_type');

    if (productsError) {
      console.error('Error fetching products:', productsError);
      return res.status(500).json({ error: 'Failed to fetch product data' });
    }

    // Fetch daily progress logs
    const { data: dailyLogs, error: logsError } = await supabaseServiceRole
      .from('daily_progress_log')
      .select('*')
      .eq('job_id', jobId)
      .order('log_date', { ascending: false })
      .limit(30); // Last 30 days

    if (logsError) {
      console.error('Error fetching daily logs:', logsError);
      return res.status(500).json({ error: 'Failed to fetch progress logs' });
    }

    // Fetch labour allocation
    const { data: labourAllocation, error: allocationError } = await supabaseServiceRole
      .from('project_labour_allocation')
      .select('*')
      .eq('job_id', jobId)
      .single();

    if (allocationError && allocationError.code !== 'PGRST116') {
      console.error('Error fetching labour allocation:', allocationError);
      return res.status(500).json({ error: 'Failed to fetch labour allocation' });
    }

    // Calculate basic metrics
    const remainingHours = labourCalculator.calculateRemainingHours(products || []);
    const efficiency = labourCalculator.calculateEfficiency(products || []);
    
    // Convert daily logs to format expected by calculator
    const dailyProgress = (dailyLogs || []).map(log => ({
      date: log.log_date,
      unitsCompleted: log.units_completed,
      hoursWorked: log.hours_worked,
      workersOnSite: log.workers_on_site,
      efficiency: log.efficiency_percentage,
      cumulativeProgress: 0, // Calculate if needed
      targetProgress: 0, // Calculate if needed
      variance: 0 // Calculate if needed
    }));

    const burnRate = labourCalculator.calculateBurnRate(dailyProgress);

    // Calculate target completion date (assume 30 days from now if not set)
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 30);

    // Get comprehensive metrics
    const metrics = labourCalculator.calculateLabourMetrics(
      products || [],
      dailyProgress,
      targetDate
    );

    // Calculate team recommendation
    const daysUntilTarget = Math.ceil(
      (targetDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );
    const teamRecommendation = labourCalculator.calculateRequiredTeamSize(
      remainingHours,
      daysUntilTarget,
      efficiency
    );

    // Identify bottlenecks
    const bottlenecks = labourCalculator.identifyBottlenecks(products || []);

    // Generate tomorrow's plan
    const tomorrowPlan = labourCalculator.generateTomorrowPlan(products || []);

    // Calculate cost implications if labour allocation exists
    let costAnalysis = null;
    if (labourAllocation) {
      const originalEstimate = {
        totalDays: labourAllocation.planned_days,
        totalHours: labourAllocation.total_man_hours,
        crewSize: labourAllocation.planned_team_size,
        installationDays: labourAllocation.planned_days,
        upliftDays: 0,
        products: []
      };

      costAnalysis = labourCalculator.calculateCostImplications(
        originalEstimate,
        products || [],
        labourAllocation.hourly_rate || 45
      );
    }

    // Progress summary
    const overallProgress = {
      completed: (products || []).reduce((sum, p) => sum + p.completed_units, 0),
      total: (products || []).reduce((sum, p) => sum + p.total_quantity, 0),
      percentage: 0
    };
    
    if (overallProgress.total > 0) {
      overallProgress.percentage = (overallProgress.completed / overallProgress.total) * 100;
    }

    return res.status(200).json({
      success: true,
      analysis: {
        hoursRemaining: remainingHours,
        requiredTeamSize: teamRecommendation.recommended,
        projectedCompletion: metrics.projectedCompletion,
        efficiency: efficiency,
        burnRate: burnRate,
        daysAhead: metrics.daysAhead,
        overallProgress,
        teamRecommendation,
        bottlenecks: bottlenecks.slice(0, 3), // Top 3 bottlenecks
        tomorrowPlan,
        alerts: metrics.alerts,
        costAnalysis,
        dailyTrends: {
          last7Days: dailyProgress.slice(0, 7),
          averageEfficiency: dailyProgress.length > 0 
            ? dailyProgress.reduce((sum, day) => sum + day.efficiency, 0) / dailyProgress.length 
            : 100,
          averageWorkersOnSite: dailyProgress.length > 0 
            ? dailyProgress.reduce((sum, day) => sum + day.workersOnSite, 0) / dailyProgress.length 
            : 4
        }
      },
      metadata: {
        calculatedAt: new Date().toISOString(),
        productsAnalyzed: (products || []).length,
        daysOfDataAnalyzed: dailyProgress.length
      }
    });

  } catch (error) {
    console.error('Labour analysis API error:', error);
    return res.status(500).json({ 
      error: 'Failed to generate labour analysis',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}