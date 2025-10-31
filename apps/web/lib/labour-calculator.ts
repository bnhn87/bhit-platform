/**
 * Enhanced Labour Calculator for Real-Time Progress Tracking
 * Extends the existing labour-logic.ts with construction site management
 */

import { LabourEstimate } from './labour-logic';

export interface ProductProgress {
  id: string;
  job_id: string;
  product_type: string;
  product_name: string;
  total_quantity: number;
  completed_units: number;
  in_progress_units: number;
  status: 'not_started' | 'in_progress' | 'completed' | 'on_hold' | 'blocked';
  estimated_hours_per_unit: number;
  actual_hours_spent: number;
  last_updated: string;
  notes?: string;
}

export interface LabourMetrics {
  hoursRemaining: number;
  requiredTeamSize: number;
  projectedCompletion: Date;
  efficiency: number;
  burnRate: number;
  daysAhead: number;
  alerts: LabourAlert[];
}

export interface LabourAlert {
  type: 'warning' | 'error' | 'info';
  message: string;
  action?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export interface DailyProgressSummary {
  date: string;
  unitsCompleted: number;
  hoursWorked: number;
  workersOnSite: number;
  efficiency: number;
  cumulativeProgress: number;
  targetProgress: number;
  variance: number;
}

export interface TeamRecommendation {
  current: number;
  recommended: number;
  reasoning: string;
  urgency: 'low' | 'medium' | 'high';
  costImpact: number;
}

/**
 * Enhanced Labour Calculator Class
 * Provides real-time calculations for construction project management
 */
export class LabourCalculator {
  private readonly HOURS_PER_DAY = 8;
  private readonly EFFICIENCY_BUFFER = 0.85; // 85% efficiency target
  private readonly OVERTIME_THRESHOLD = 1.2; // 20% overtime limit

  /**
   * Calculate remaining hours based on current progress
   */
  calculateRemainingHours(products: ProductProgress[]): number {
    return products.reduce((total, product) => {
      const remaining = Math.max(0, product.total_quantity - product.completed_units);
      return total + (remaining * product.estimated_hours_per_unit);
    }, 0);
  }

  /**
   * Calculate actual vs planned efficiency
   */
  calculateEfficiency(products: ProductProgress[]): number {
    let totalPlannedHours = 0;
    let totalActualHours = 0;
    let completedUnits = 0;
    let _totalUnits = 0;

    products.forEach(product => {
      const completed = product.completed_units;
      const plannedHoursForCompleted = completed * product.estimated_hours_per_unit;
      
      totalPlannedHours += plannedHoursForCompleted;
      totalActualHours += product.actual_hours_spent;
      completedUnits += completed;
      _totalUnits += product.total_quantity;
    });

    if (totalActualHours === 0) return 100;
    if (completedUnits === 0) return 100;

    // Efficiency = (planned hours / actual hours) * 100
    const efficiency = (totalPlannedHours / totalActualHours) * 100;
    return Math.min(999, Math.max(0, efficiency));
  }

  /**
   * Calculate required team size to meet deadlines
   */
  calculateRequiredTeamSize(
    remainingHours: number, 
    daysAvailable: number,
    currentEfficiency: number = 85
  ): TeamRecommendation {
    const effectiveHours = remainingHours / (currentEfficiency / 100);
    const totalManDays = effectiveHours / this.HOURS_PER_DAY;
    const requiredTeamSize = Math.ceil(totalManDays / daysAvailable);

    let reasoning = '';
    let urgency: 'low' | 'medium' | 'high' = 'low';
    let costImpact = 0;

    if (requiredTeamSize <= 4) {
      reasoning = 'Standard team size suitable for timeline';
      urgency = 'low';
    } else if (requiredTeamSize <= 8) {
      reasoning = 'Larger team needed to meet deadline';
      urgency = 'medium';
      costImpact = (requiredTeamSize - 4) * 500; // Extra crew cost per day
    } else {
      reasoning = 'Critical: Very large team or overtime required';
      urgency = 'high';
      costImpact = (requiredTeamSize - 4) * 800;
    }

    return {
      current: 4, // Assume current standard team
      recommended: Math.min(requiredTeamSize, 12), // Cap at 12 workers
      reasoning,
      urgency,
      costImpact
    };
  }

  /**
   * Calculate current burn rate (hours per day)
   */
  calculateBurnRate(
    dailyProgress: DailyProgressSummary[],
    windowDays: number = 7
  ): number {
    if (dailyProgress.length === 0) return 0;

    const recentProgress = dailyProgress.slice(-windowDays);
    const totalHours = recentProgress.reduce((sum, day) => sum + day.hoursWorked, 0);
    const totalDays = recentProgress.length;

    return totalDays > 0 ? totalHours / totalDays : 0;
  }

  /**
   * Project completion date based on current progress
   */
  projectCompletionDate(
    remainingHours: number,
    burnRate: number,
    workDaysPerWeek: number = 5
  ): Date {
    if (burnRate <= 0) {
      // If no progress, use standard estimation
      const standardRate = 4 * this.HOURS_PER_DAY; // 4 workers * 8 hours
      burnRate = standardRate;
    }

    const daysNeeded = Math.ceil(remainingHours / burnRate);
    const calendarDays = Math.ceil(daysNeeded * (7 / workDaysPerWeek));

    const projectedDate = new Date();
    projectedDate.setDate(projectedDate.getDate() + calendarDays);
    
    return projectedDate;
  }

  /**
   * Generate comprehensive labour metrics
   */
  calculateLabourMetrics(
    products: ProductProgress[],
    dailyProgress: DailyProgressSummary[],
    targetCompletionDate: Date
  ): LabourMetrics {
    const remainingHours = this.calculateRemainingHours(products);
    const efficiency = this.calculateEfficiency(products);
    const burnRate = this.calculateBurnRate(dailyProgress);
    
    const daysUntilDeadline = Math.ceil(
      (targetCompletionDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
    );

    const projectedCompletion = this.projectCompletionDate(remainingHours, burnRate);
    const teamRecommendation = this.calculateRequiredTeamSize(remainingHours, daysUntilDeadline, efficiency);
    
    const daysAhead = Math.ceil(
      (targetCompletionDate.getTime() - projectedCompletion.getTime()) / (1000 * 60 * 60 * 24)
    );

    const alerts = this.generateAlerts(
      remainingHours,
      efficiency,
      daysUntilDeadline,
      burnRate,
      teamRecommendation
    );

    return {
      hoursRemaining: remainingHours,
      requiredTeamSize: teamRecommendation.recommended,
      projectedCompletion,
      efficiency,
      burnRate,
      daysAhead,
      alerts
    };
  }

  /**
   * Generate smart alerts and recommendations
   */
  private generateAlerts(
    remainingHours: number,
    efficiency: number,
    daysUntilDeadline: number,
    burnRate: number,
    teamRecommendation: TeamRecommendation
  ): LabourAlert[] {
    const alerts: LabourAlert[] = [];

    // Behind schedule alerts
    if (teamRecommendation.urgency === 'high') {
      alerts.push({
        type: 'error',
        message: 'Critical: Project significantly behind schedule',
        action: `Increase team to ${teamRecommendation.recommended} workers immediately`,
        priority: 'critical'
      });
    } else if (teamRecommendation.urgency === 'medium') {
      alerts.push({
        type: 'warning',
        message: 'Project behind schedule',
        action: `Consider increasing team to ${teamRecommendation.recommended} workers`,
        priority: 'high'
      });
    }

    // Efficiency alerts
    if (efficiency < 70) {
      alerts.push({
        type: 'warning',
        message: `Efficiency at ${efficiency.toFixed(1)}% - below target`,
        action: 'Review work processes and identify bottlenecks',
        priority: 'medium'
      });
    } else if (efficiency > 120) {
      alerts.push({
        type: 'info',
        message: `Excellent efficiency at ${efficiency.toFixed(1)}%`,
        priority: 'low'
      });
    }

    // Burn rate alerts
    if (burnRate < 20) {
      alerts.push({
        type: 'warning',
        message: 'Low daily progress rate',
        action: 'Check team attendance and work allocation',
        priority: 'medium'
      });
    }

    // Deadline alerts
    if (daysUntilDeadline <= 5 && remainingHours > 40) {
      alerts.push({
        type: 'error',
        message: 'Deadline approaching with significant work remaining',
        action: 'Consider overtime or additional resources',
        priority: 'critical'
      });
    }

    return alerts;
  }

  /**
   * Calculate optimal daily targets
   */
  calculateDailyTargets(
    products: ProductProgress[],
    daysRemaining: number,
    _currentTeamSize: number = 4
  ): { [productType: string]: number } {
    const targets: { [productType: string]: number } = {};
    
    products.forEach(product => {
      const remaining = product.total_quantity - product.completed_units;
      if (remaining > 0) {
        const dailyTarget = Math.ceil(remaining / daysRemaining);
        targets[product.product_type] = Math.max(1, dailyTarget);
      }
    });

    return targets;
  }

  /**
   * Identify bottleneck products
   */
  identifyBottlenecks(products: ProductProgress[]): ProductProgress[] {
    return products
      .filter(product => {
        const completionRate = product.completed_units / product.total_quantity;
        const efficiency = product.estimated_hours_per_unit > 0 
          ? (product.completed_units * product.estimated_hours_per_unit) / Math.max(0.1, product.actual_hours_spent)
          : 1;
        
        return completionRate < 0.5 && efficiency < 0.8;
      })
      .sort((a, b) => {
        const aRemaining = (a.total_quantity - a.completed_units) * a.estimated_hours_per_unit;
        const bRemaining = (b.total_quantity - b.completed_units) * b.estimated_hours_per_unit;
        return bRemaining - aRemaining;
      });
  }

  /**
   * Generate tomorrow's work plan
   */
  generateTomorrowPlan(
    products: ProductProgress[],
    teamSize: number = 4
  ): {
    priority: ProductProgress[];
    targets: { [productType: string]: number };
    estimatedHours: number;
    notes: string[];
  } {
    const bottlenecks = this.identifyBottlenecks(products);
    const inProgress = products.filter(p => p.status === 'in_progress');
    const notStarted = products.filter(p => p.status === 'not_started');

    // Prioritize: bottlenecks first, then in-progress, then new items
    const priority = [
      ...bottlenecks.slice(0, 2), // Top 2 bottlenecks
      ...inProgress.filter(p => !bottlenecks.includes(p)).slice(0, 2),
      ...notStarted.slice(0, 1)
    ];

    const targets = this.calculateDailyTargets(priority, 1, teamSize);
    
    const estimatedHours = priority.reduce((total, product) => {
      const targetUnits = targets[product.product_type] || 1;
      return total + (targetUnits * product.estimated_hours_per_unit);
    }, 0);

    const notes: string[] = [];
    if (bottlenecks.length > 0) {
      notes.push(`Focus on ${bottlenecks[0].product_name} - behind schedule`);
    }
    if (estimatedHours > teamSize * this.HOURS_PER_DAY) {
      notes.push('Ambitious target - consider overtime or additional crew');
    }

    return {
      priority,
      targets,
      estimatedHours,
      notes
    };
  }

  /**
   * Calculate cost implications of current progress
   */
  calculateCostImplications(
    originalEstimate: LabourEstimate,
    currentProgress: ProductProgress[],
    hourlyRate: number = 45
  ): {
    originalCost: number;
    projectedCost: number;
    variance: number;
    variancePercentage: number;
  } {
    const originalCost = originalEstimate.totalHours * hourlyRate;
    
    const actualHoursSpent = currentProgress.reduce((sum, p) => sum + p.actual_hours_spent, 0);
    const remainingHours = this.calculateRemainingHours(currentProgress);
    const projectedTotalHours = actualHoursSpent + remainingHours;
    
    const projectedCost = projectedTotalHours * hourlyRate;
    const variance = projectedCost - originalCost;
    const variancePercentage = (variance / originalCost) * 100;

    return {
      originalCost,
      projectedCost,
      variance,
      variancePercentage
    };
  }
}

/**
 * Singleton instance for use across the application
 */
export const labourCalculator = new LabourCalculator();