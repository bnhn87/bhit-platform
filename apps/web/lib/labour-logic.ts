// Labour Logic - Integration with SmartQuote calculation system
// Bridges the gap between quote estimates and job labour management

import { CalculationResults, CalculatedProduct, QuoteDetails } from '../modules/smartquote/types';

export interface LabourEstimate {
  totalDays: number;
  totalHours: number;
  crewSize: number;
  installationDays: number;
  upliftDays: number;
  products: ProductLabourBreakdown[];
}

export interface ProductLabourBreakdown {
  productCode: string;
  description: string;
  quantity: number;
  hoursPerUnit: number;
  totalHours: number;
  isHeavy: boolean;
  buildPriority: number;
}

export interface JobCreationPayload {
  title: string;
  siteId: string;
  quotedAmount: number;
  labourEstimate: LabourEstimate;
  products: ProductLabourBreakdown[];
  clientDetails: {
    client: string;
    project: string;
    deliveryAddress: string;
  };
  startDate?: Date;
}

/**
 * Converts SmartQuote calculation results into job labour estimates
 */
export function convertQuoteToLabourEstimate(
  results: CalculationResults,
  products: CalculatedProduct[],
  details: QuoteDetails
): LabourEstimate {
  const { crew, labour, pricing: _pricing } = results;
  
  // Calculate installation days (excluding uplift)
  const installationDays = crew.totalProjectDays - (details.customExtendedUpliftDays || 0);
  const upliftDays = details.customExtendedUpliftDays || 0;
  
  // Convert products to labour breakdown
  const productBreakdown: ProductLabourBreakdown[] = products.map((product, index) => ({
    productCode: product.productCode,
    description: product.description || product.cleanDescription,
    quantity: product.quantity,
    hoursPerUnit: product.timePerUnit,
    totalHours: product.totalTime,
    isHeavy: product.isHeavy,
    buildPriority: index + 1 // Sequential build order for now
  }));
  
  // Sort by build priority (heavy items last, complex items first)
  productBreakdown.sort((a, b) => {
    // Heavy items go last
    if (a.isHeavy && !b.isHeavy) return 1;
    if (!a.isHeavy && b.isHeavy) return -1;
    
    // Otherwise sort by hours per unit (complex first)
    return b.hoursPerUnit - a.hoursPerUnit;
  });
  
  // Reassign build priorities after sorting
  productBreakdown.forEach((product, index) => {
    product.buildPriority = index + 1;
  });

  return {
    totalDays: crew.totalProjectDays,
    totalHours: labour.bufferedHours,
    crewSize: crew.crewSize,
    installationDays,
    upliftDays,
    products: productBreakdown
  };
}

/**
 * Sanitizes quote products for job creation
 * Ensures data integrity and removes quote-specific fields
 */
export function sanitizeProductsForJob(
  quoteProducts: CalculatedProduct[],
  _jobContext?: { maxQuantity?: boolean; lockPrices?: boolean }
): unknown[] {
  return quoteProducts.map(product => ({
    productCode: product.productCode,
    description: product.description || product.cleanDescription,
    rawDescription: product.rawDescription,
    cleanDescription: product.cleanDescription,
    quantity: product.quantity,
    timePerUnit: product.timePerUnit,
    totalTime: product.totalTime,
    isHeavy: product.isHeavy,
    source: product.source,
    // Remove quote-specific pricing and calculations
    // Keep only the essential data needed for job management
    lineNumber: product.lineNumber
  }));
}

/**
 * Calculates optimal crew allocation for a job
 */
export function calculateOptimalCrewAllocation(
  labourEstimate: LabourEstimate,
  constraints: {
    maxVanCrews?: number;
    maxFootCrews?: number;
    maxSupervisors?: number;
    preferredStartDate?: Date;
    workDaysPerWeek?: number;
  } = {}
): DailyCrewAllocation[] {
  const {
    maxVanCrews = 2,
    maxFootCrews = 6,
    maxSupervisors: _maxSupervisors = 2,
    workDaysPerWeek = 5
  } = constraints;
  
  const allocations: DailyCrewAllocation[] = [];
  const totalWorkingDays = Math.ceil(labourEstimate.installationDays);
  const hoursPerDay = 8;
  
  // Calculate crew distribution
  const _totalHours = labourEstimate.totalHours;
  const crewSize = Math.min(labourEstimate.crewSize, maxVanCrews + maxFootCrews);
  
  // Distribute crew optimally
  const vanCrews = Math.min(maxVanCrews, Math.ceil(crewSize * 0.4)); // 40% van crews
  const footCrews = Math.min(maxFootCrews, crewSize - vanCrews);
  const supervisors = crewSize > 4 ? 1 : 0;
  
  // Generate daily allocations
  for (let day = 0; day < totalWorkingDays; day++) {
    const workDate = new Date();
    if (constraints.preferredStartDate) {
      workDate.setTime(constraints.preferredStartDate.getTime());
    }
    workDate.setDate(workDate.getDate() + day);
    
    // Skip weekends if 5-day work week
    if (workDaysPerWeek === 5 && (workDate.getDay() === 0 || workDate.getDay() === 6)) {
      continue;
    }
    
    allocations.push({
      workDate: workDate.toISOString().split('T')[0],
      vanCrews,
      footCrews,
      supervisors,
      hoursAllocated: (vanCrews + footCrews) * hoursPerDay,
      crewMode: vanCrews > 0 ? 'mixed' : 'foot',
      notes: `Day ${day + 1} - Installation work`
    });
  }
  
  // Add uplift days if needed
  if (labourEstimate.upliftDays > 0) {
    const upliftStartDay = totalWorkingDays;
    const upliftCrews = Math.min(4, footCrews); // Smaller crew for uplift
    
    for (let day = 0; day < labourEstimate.upliftDays; day++) {
      const workDate = new Date();
      if (constraints.preferredStartDate) {
        workDate.setTime(constraints.preferredStartDate.getTime());
      }
      workDate.setDate(workDate.getDate() + upliftStartDay + day);
      
      allocations.push({
        workDate: workDate.toISOString().split('T')[0],
        vanCrews: 1,
        footCrews: upliftCrews - 1,
        supervisors: 0,
        hoursAllocated: upliftCrews * hoursPerDay,
        crewMode: 'mixed',
        notes: `Uplift day ${day + 1}`
      });
    }
  }
  
  return allocations;
}

export interface DailyCrewAllocation {
  workDate: string; // YYYY-MM-DD format
  vanCrews: number;
  footCrews: number;
  supervisors: number;
  hoursAllocated: number;
  crewMode: 'van' | 'foot' | 'mixed';
  notes?: string;
}

/**
 * Validates labour estimates against business rules
 */
export function validateLabourEstimate(estimate: LabourEstimate): {
  isValid: boolean;
  warnings: string[];
  errors: string[];
} {
  const warnings: string[] = [];
  const errors: string[] = [];
  
  // Validate total hours
  if (estimate.totalHours <= 0) {
    errors.push('Total hours must be greater than zero');
  }
  
  if (estimate.totalHours > 2000) {
    warnings.push('Total hours exceeds 2000 - consider breaking into multiple jobs');
  }
  
  // Validate crew size
  if (estimate.crewSize > 8) {
    warnings.push('Crew size exceeds 8 - may impact productivity');
  }
  
  if (estimate.crewSize === 0) {
    errors.push('Crew size cannot be zero');
  }
  
  // Validate days
  if (estimate.totalDays > 60) {
    warnings.push('Job duration exceeds 60 days - consider project phasing');
  }
  
  // Validate products
  if (estimate.products.length === 0) {
    errors.push('Job must contain at least one product');
  }
  
  const totalProductHours = estimate.products.reduce((sum, p) => sum + p.totalHours, 0);
  if (Math.abs(totalProductHours - estimate.totalHours) > 1) {
    warnings.push('Product hours do not match estimate total');
  }
  
  return {
    isValid: errors.length === 0,
    warnings,
    errors
  };
}

/**
 * Calculates job completion prediction based on current progress
 */
export function predictJobCompletion(
  currentProgress: {
    completedHours: number;
    remainingHours: number;
    daysWorked: number;
    averageHoursPerDay: number;
  }
): {
  predictedCompletionDate: Date;
  daysRemaining: number;
  confidenceLevel: 'high' | 'medium' | 'low';
  suggestedActions: string[];
} {
  const { completedHours, remainingHours, daysWorked, averageHoursPerDay } = currentProgress;
  
  const totalHours = completedHours + remainingHours;
  const completionPercentage = (completedHours / totalHours) * 100;
  
  // Calculate predicted days remaining
  const effectiveHoursPerDay = averageHoursPerDay > 0 ? averageHoursPerDay : 24; // 3 crew * 8 hours
  const daysRemaining = Math.ceil(remainingHours / effectiveHoursPerDay);
  
  // Calculate predicted completion date
  const predictedDate = new Date();
  predictedDate.setDate(predictedDate.getDate() + daysRemaining);
  
  // Determine confidence level
  let confidenceLevel: 'high' | 'medium' | 'low' = 'medium';
  if (daysWorked >= 5 && completionPercentage > 20) {
    confidenceLevel = 'high';
  } else if (daysWorked < 2 || completionPercentage < 10) {
    confidenceLevel = 'low';
  }
  
  // Generate suggested actions
  const suggestedActions: string[] = [];
  
  if (averageHoursPerDay < 20) {
    suggestedActions.push('Consider increasing crew size for faster completion');
  }
  
  if (completionPercentage < 50 && daysWorked > 10) {
    suggestedActions.push('Review project scope and potential delays');
  }
  
  if (daysRemaining > 30) {
    suggestedActions.push('Consider breaking remaining work into phases');
  }
  
  return {
    predictedCompletionDate: predictedDate,
    daysRemaining,
    confidenceLevel,
    suggestedActions
  };
}

/**
 * Optimizes build order based on dependencies and efficiency
 */
export function optimizeBuildOrder(products: ProductLabourBreakdown[]): ProductLabourBreakdown[] {
  return [...products].sort((a, b) => {
    // Heavy items should generally come last
    if (a.isHeavy && !b.isHeavy) return 1;
    if (!a.isHeavy && b.isHeavy) return -1;
    
    // Sort by complexity (hours per unit) - complex items first
    const complexityDiff = b.hoursPerUnit - a.hoursPerUnit;
    if (Math.abs(complexityDiff) > 0.1) return complexityDiff;
    
    // Sort by total hours - larger jobs first
    return b.totalHours - a.totalHours;
  }).map((product, index) => ({
    ...product,
    buildPriority: index + 1
  }));
}