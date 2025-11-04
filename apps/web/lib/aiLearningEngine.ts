// AI Learning Engine - Continuous improvement system
// Learns from every correction, detects patterns, suggests fixes, and improves autonomously

import { supabaseAdmin } from './supabaseAdmin';
import { recordCorrection, getCorrectionsByField, getCorrectionsBySupplier, type InvoiceCorrection } from './invoiceDbService';
import { findBestTemplate, getTemplate, createTemplate, saveTemplateFields, type DocumentTemplate, type TemplateField } from './templateService';
import type { ExtractedInvoiceData } from './invoiceAiService';

// ============================================================================
// PATTERN DETECTION - Learn common correction patterns
// ============================================================================

export interface CorrectionPattern {
  pattern_type: string;
  field_name: string;
  original_pattern: string;
  corrected_pattern: string;
  occurrences: number;
  confidence: number;
  example_original: string;
  example_corrected: string;
}

/**
 * Analyze corrections to detect patterns
 */
export async function detectCorrectionPatterns(
  minOccurrences: number = 3
): Promise<CorrectionPattern[]> {
  try {
    const { data: corrections, error } = await supabaseAdmin
      .from('invoice_corrections')
      .select('*')
      .order('corrected_at', { ascending: false })
      .limit(1000);

    if (error) throw error;

    const patterns: Map<string, CorrectionPattern> = new Map();

    corrections?.forEach((correction: InvoiceCorrection) => {
      const original = correction.original_value || '';
      const corrected = correction.corrected_value || '';

      // Detect common OCR mistakes
      const ocrPatterns = [
        { from: 'O', to: '0', type: 'ocr_o_to_0' },
        { from: '0', to: 'O', type: 'ocr_0_to_o' },
        { from: 'I', to: '1', type: 'ocr_i_to_1' },
        { from: '1', to: 'I', type: 'ocr_1_to_i' },
        { from: 'l', to: '1', type: 'ocr_l_to_1' },
        { from: 'S', to: '5', type: 'ocr_s_to_5' },
        { from: '5', to: 'S', type: 'ocr_5_to_s' },
      ];

      ocrPatterns.forEach(({ from, to, type }) => {
        if (original.includes(from) && corrected.includes(to)) {
          const key = `${correction.field_name}_${type}`;
          const existing = patterns.get(key) || {
            pattern_type: type,
            field_name: correction.field_name,
            original_pattern: from,
            corrected_pattern: to,
            occurrences: 0,
            confidence: 0,
            example_original: original,
            example_corrected: corrected,
          };
          existing.occurrences++;
          patterns.set(key, existing);
        }
      });

      // Detect date format corrections
      const datePatterns = [
        { from: /(\d{2})\/(\d{2})\/(\d{4})/, to: /(\d{4})-(\d{2})-(\d{2})/, type: 'date_dmy_to_ymd' },
        { from: /(\d{4})-(\d{2})-(\d{2})/, to: /(\d{2})\/(\d{2})\/(\d{4})/, type: 'date_ymd_to_dmy' },
      ];

      datePatterns.forEach(({ from, to, type }) => {
        if (from.test(original) && to.test(corrected)) {
          const key = `${correction.field_name}_${type}`;
          const existing = patterns.get(key) || {
            pattern_type: type,
            field_name: correction.field_name,
            original_pattern: 'Date format change',
            corrected_pattern: 'Date format change',
            occurrences: 0,
            confidence: 0,
            example_original: original,
            example_corrected: corrected,
          };
          existing.occurrences++;
          patterns.set(key, existing);
        }
      });

      // Detect amount format corrections
      if (correction.field_name.includes('amount') || correction.field_name.includes('Amount')) {
        // Missing decimal point
        if (/^\d+$/.test(original) && /^\d+\.\d{2}$/.test(corrected)) {
          const key = `${correction.field_name}_missing_decimal`;
          const existing = patterns.get(key) || {
            pattern_type: 'missing_decimal',
            field_name: correction.field_name,
            original_pattern: 'No decimal point',
            corrected_pattern: 'With decimal point',
            occurrences: 0,
            confidence: 0,
            example_original: original,
            example_corrected: corrected,
          };
          existing.occurrences++;
          patterns.set(key, existing);
        }
      }
    });

    // Filter by minimum occurrences and calculate confidence
    const detectedPatterns = Array.from(patterns.values())
      .filter(p => p.occurrences >= minOccurrences)
      .map(p => ({
        ...p,
        confidence: Math.min(95, 50 + (p.occurrences * 5)), // More occurrences = higher confidence
      }))
      .sort((a, b) => b.occurrences - a.occurrences);

    return detectedPatterns;
  } catch (error) {
    console.error('detectCorrectionPatterns error:', error);
    return [];
  }
}

/**
 * Apply learned patterns to auto-correct data
 */
export function applyLearnedPatterns(
  data: ExtractedInvoiceData,
  patterns: CorrectionPattern[]
): ExtractedInvoiceData {
  const corrected = { ...data };
  const appliedCorrections: string[] = [];

  patterns.forEach(pattern => {
    const fieldValue = (corrected as any)[pattern.field_name];
    if (!fieldValue) return;

    let newValue = fieldValue;
    let wasApplied = false;

    // Apply OCR corrections
    if (pattern.pattern_type.startsWith('ocr_')) {
      newValue = fieldValue.toString().replace(
        new RegExp(pattern.original_pattern, 'g'),
        pattern.corrected_pattern
      );
      wasApplied = newValue !== fieldValue;
    }

    // Apply date format corrections
    if (pattern.pattern_type.startsWith('date_')) {
      // Only apply if confidence is high
      if (pattern.confidence > 80) {
        // Implementation would go here
      }
    }

    if (wasApplied) {
      (corrected as any)[pattern.field_name] = newValue;
      appliedCorrections.push(`${pattern.field_name}: ${pattern.pattern_type}`);
    }
  });

  if (appliedCorrections.length > 0) {
    console.log('Applied learned patterns:', appliedCorrections);
  }

  return corrected;
}

// ============================================================================
// ACTIVE LEARNING - AI requests human help for uncertain extractions
// ============================================================================

export interface ActiveLearningRequest {
  id: string;
  invoice_id: string;
  field_name: string;
  extracted_value: string;
  confidence: number;
  context: string;
  alternatives?: string[];
  created_at: string;
  resolved: boolean;
  user_correction?: string;
}

/**
 * Create active learning request for low-confidence field
 */
export async function createActiveLearningRequest(
  invoiceId: string,
  fieldName: string,
  extractedValue: string,
  confidence: number,
  context?: string,
  alternatives?: string[]
): Promise<ActiveLearningRequest> {
  try {
    const { data, error } = await supabaseAdmin
      .from('active_learning_requests')
      .insert({
        invoice_id: invoiceId,
        field_name: fieldName,
        extracted_value: extractedValue,
        confidence,
        context,
        alternatives,
        resolved: false,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('createActiveLearningRequest error:', error);
    throw error;
  }
}

/**
 * Get pending active learning requests
 */
export async function getPendingLearningRequests(
  limit: number = 10
): Promise<ActiveLearningRequest[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from('active_learning_requests')
      .select('*')
      .eq('resolved', false)
      .order('confidence', { ascending: true }) // Lowest confidence first
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('getPendingLearningRequests error:', error);
    return [];
  }
}

/**
 * Resolve active learning request with user correction
 */
export async function resolveActiveLearningRequest(
  requestId: string,
  userCorrection: string
): Promise<void> {
  try {
    const { error } = await supabaseAdmin
      .from('active_learning_requests')
      .update({
        resolved: true,
        user_correction: userCorrection,
      })
      .eq('id', requestId);

    if (error) throw error;
  } catch (error) {
    console.error('resolveActiveLearningRequest error:', error);
    throw error;
  }
}

// ============================================================================
// AUTO-TEMPLATE GENERATION - Create templates from corrections
// ============================================================================

/**
 * Generate template from correction history for a supplier
 */
export async function generateTemplateFromCorrections(
  supplierId: string,
  documentType: string = 'invoice',
  minSamples: number = 5
): Promise<DocumentTemplate | null> {
  try {
    // Get all corrections for this supplier
    const corrections = await getCorrectionsBySupplier(supplierId);

    if (corrections.length < minSamples) {
      console.log(`Not enough corrections (${corrections.length} < ${minSamples}) to generate template`);
      return null;
    }

    // Group corrections by field
    const fieldCorrections = new Map<string, InvoiceCorrection[]>();
    corrections.forEach(c => {
      if (!fieldCorrections.has(c.field_name)) {
        fieldCorrections.set(c.field_name, []);
      }
      fieldCorrections.get(c.field_name)!.push(c);
    });

    // Identify frequently corrected fields (these need templates)
    const frequentFields = Array.from(fieldCorrections.entries())
      .filter(([_, corrs]) => corrs.length >= 3) // Field corrected 3+ times
      .map(([fieldName, corrs]) => ({
        field_name: fieldName,
        occurrences: corrs.length,
        confidence_level: corrs.length >= 10 ? 'always' : corrs.length >= 5 ? 'usually' : 'sometimes',
      }));

    if (frequentFields.length === 0) {
      console.log('No frequently corrected fields found');
      return null;
    }

    // Get supplier name
    const { data: supplier } = await supabaseAdmin
      .from('suppliers')
      .select('name')
      .eq('id', supplierId)
      .single();

    // Create template
    const templateName = `${supplier?.name || 'Unknown'} ${documentType} (Auto-generated)`;

    console.log(`Generating template "${templateName}" with ${frequentFields.length} fields`);

    const template = await createTemplate({
      name: templateName,
      description: `Auto-generated from ${corrections.length} corrections`,
      document_type: documentType as any,
      supplier_id: supplierId,
      is_generic: false,
      page_count: 1,
      is_active: true,
    } as any);

    // Note: We don't have coordinate data from corrections
    // This template serves as a marker that this supplier needs manual template creation
    // Could be enhanced with ML to predict field locations

    return template;
  } catch (error) {
    console.error('generateTemplateFromCorrections error:', error);
    return null;
  }
}

// ============================================================================
// SMART VALIDATION - Validate extracted data against patterns
// ============================================================================

export interface ValidationResult {
  is_valid: boolean;
  issues: ValidationIssue[];
  warnings: ValidationWarning[];
  suggestions: string[];
}

export interface ValidationIssue {
  field_name: string;
  issue_type: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  suggested_fix?: string;
}

export interface ValidationWarning {
  field_name: string;
  warning_type: string;
  description: string;
  confidence: number;
}

/**
 * Validate extracted invoice data using historical patterns
 */
export async function validateExtractedData(
  data: ExtractedInvoiceData,
  supplierId?: string
): Promise<ValidationResult> {
  const issues: ValidationIssue[] = [];
  const warnings: ValidationWarning[] = [];
  const suggestions: string[] = [];

  // 1. Validate invoice number format
  if (data.invoiceNumber) {
    // Check if it looks like a valid invoice number
    if (data.invoiceNumber.length < 3) {
      issues.push({
        field_name: 'invoiceNumber',
        issue_type: 'too_short',
        description: 'Invoice number seems too short',
        severity: 'high',
        suggested_fix: 'Verify the invoice number is complete',
      });
    }

    // Check for suspicious characters
    if (/[^\w\-\/]/.test(data.invoiceNumber)) {
      warnings.push({
        field_name: 'invoiceNumber',
        warning_type: 'unusual_characters',
        description: 'Invoice number contains unusual characters',
        confidence: 70,
      });
    }
  }

  // 2. Validate amounts
  if (data.netAmount !== null && data.vatAmount !== null && data.grossAmount !== null) {
    const calculatedGross = data.netAmount + data.vatAmount;
    const difference = Math.abs(calculatedGross - data.grossAmount);

    if (difference > 0.02) { // More than 2p difference
      issues.push({
        field_name: 'grossAmount',
        issue_type: 'amount_mismatch',
        description: `Gross amount (£${data.grossAmount}) doesn't match Net + VAT (£${calculatedGross.toFixed(2)})`,
        severity: 'critical',
        suggested_fix: `Should be £${calculatedGross.toFixed(2)}`,
      });
    }

    // Check VAT rate
    if (data.netAmount > 0) {
      const vatRate = (data.vatAmount / data.netAmount) * 100;
      if (Math.abs(vatRate - 20) > 0.5 && Math.abs(vatRate - 5) > 0.5 && Math.abs(vatRate) > 0.1) {
        warnings.push({
          field_name: 'vatAmount',
          warning_type: 'unusual_vat_rate',
          description: `VAT rate is ${vatRate.toFixed(1)}% (expected 20%, 5%, or 0%)`,
          confidence: 80,
        });
      }
    }
  }

  // 3. Validate date
  if (data.date) {
    const invoiceDate = new Date(data.date);
    const today = new Date();
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(today.getFullYear() - 1);
    const oneMonthFuture = new Date();
    oneMonthFuture.setMonth(today.getMonth() + 1);

    if (invoiceDate < oneYearAgo) {
      warnings.push({
        field_name: 'date',
        warning_type: 'old_invoice',
        description: 'Invoice is more than 1 year old',
        confidence: 90,
      });
    }

    if (invoiceDate > oneMonthFuture) {
      issues.push({
        field_name: 'date',
        issue_type: 'future_date',
        description: 'Invoice date is in the future',
        severity: 'high',
        suggested_fix: 'Check the date format (might be DD/MM/YYYY vs MM/DD/YYYY)',
      });
    }
  }

  // 4. Validate due date
  if (data.date && data.dueDate) {
    const invoiceDate = new Date(data.date);
    const dueDate = new Date(data.dueDate);

    if (dueDate < invoiceDate) {
      issues.push({
        field_name: 'dueDate',
        issue_type: 'due_before_invoice',
        description: 'Due date is before invoice date',
        severity: 'high',
      });
    }

    const daysDiff = Math.floor((dueDate.getTime() - invoiceDate.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff > 90) {
      warnings.push({
        field_name: 'dueDate',
        warning_type: 'unusual_payment_terms',
        description: `Payment terms are ${daysDiff} days (unusually long)`,
        confidence: 75,
      });
    }
  }

  // 5. Check for duplicate (simple check)
  if (data.invoiceNumber && data.supplier) {
    // This would check against database
    suggestions.push('Check for duplicate invoice before saving');
  }

  // 6. Validate supplier-specific patterns (if we have historical data)
  if (supplierId) {
    // Get historical invoices from this supplier
    const { data: historicalInvoices } = await supabaseAdmin
      .from('invoices')
      .select('invoice_number, net_amount, gross_amount')
      .eq('supplier_id', supplierId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (historicalInvoices && historicalInvoices.length > 0) {
      // Check invoice number pattern
      const numberPatterns = historicalInvoices
        .map(inv => inv.invoice_number)
        .filter(Boolean)
        .map(num => num.replace(/\d/g, '#')); // Extract pattern

      const currentPattern = data.invoiceNumber?.replace(/\d/g, '#');
      if (currentPattern && !numberPatterns.includes(currentPattern)) {
        warnings.push({
          field_name: 'invoiceNumber',
          warning_type: 'unusual_format',
          description: 'Invoice number format differs from supplier\'s usual pattern',
          confidence: 65,
        });
      }

      // Check amount range
      const amounts = historicalInvoices.map(inv => inv.gross_amount || 0).filter(a => a > 0);
      if (amounts.length > 5 && data.grossAmount) {
        const avg = amounts.reduce((sum, a) => sum + a, 0) / amounts.length;
        const max = Math.max(...amounts);

        if (data.grossAmount > max * 3) {
          warnings.push({
            field_name: 'grossAmount',
            warning_type: 'unusually_high',
            description: `Amount is significantly higher than supplier's usual invoices (avg: £${avg.toFixed(2)})`,
            confidence: 85,
          });
        }
      }
    }
  }

  return {
    is_valid: issues.filter(i => i.severity === 'critical' || i.severity === 'high').length === 0,
    issues,
    warnings,
    suggestions,
  };
}

// ============================================================================
// ANOMALY DETECTION - Detect suspicious patterns
// ============================================================================

export interface AnomalyDetection {
  is_anomaly: boolean;
  anomaly_score: number; // 0-100, higher = more suspicious
  anomalies: Anomaly[];
  requires_review: boolean;
}

export interface Anomaly {
  type: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  evidence: string;
}

/**
 * Detect anomalies in extracted invoice data
 */
export async function detectAnomalies(
  data: ExtractedInvoiceData,
  supplierId?: string
): Promise<AnomalyDetection> {
  const anomalies: Anomaly[] = [];
  let anomalyScore = 0;

  // 1. Round number detection (possible fabrication)
  if (data.grossAmount && data.grossAmount % 100 === 0 && data.grossAmount > 500) {
    anomalies.push({
      type: 'round_number',
      description: 'Invoice amount is a round number (£' + data.grossAmount + ')',
      severity: 'low',
      evidence: 'Legitimate invoices rarely have exactly round amounts',
    });
    anomalyScore += 15;
  }

  // 2. Weekend invoice date
  if (data.date) {
    const date = new Date(data.date);
    const day = date.getDay();
    if (day === 0 || day === 6) {
      anomalies.push({
        type: 'weekend_invoice',
        description: 'Invoice dated on weekend',
        severity: 'low',
        evidence: 'Most businesses do not issue invoices on weekends',
      });
      anomalyScore += 10;
    }
  }

  // 3. Missing critical fields
  const criticalFields = ['invoiceNumber', 'date', 'supplier', 'grossAmount'];
  const missingFields = criticalFields.filter(field => !(data as any)[field]);
  if (missingFields.length > 0) {
    anomalies.push({
      type: 'missing_critical_fields',
      description: `Missing critical fields: ${missingFields.join(', ')}`,
      severity: 'high',
      evidence: 'Legitimate invoices should have all critical fields',
    });
    anomalyScore += 30 * missingFields.length;
  }

  // 4. Very low confidence across all fields
  if (data.confidence && data.confidence < 40) {
    anomalies.push({
      type: 'low_overall_confidence',
      description: `Very low extraction confidence (${data.confidence}%)`,
      severity: 'medium',
      evidence: 'Poor quality scan or non-standard invoice format',
    });
    anomalyScore += 20;
  }

  // 5. Supplier-specific anomalies
  if (supplierId) {
    const { data: recentInvoices } = await supabaseAdmin
      .from('invoices')
      .select('gross_amount, invoice_date, invoice_number')
      .eq('supplier_id', supplierId)
      .order('created_at', { ascending: false })
      .limit(20);

    if (recentInvoices && recentInvoices.length > 0) {
      // Check for duplicate invoice number
      const duplicate = recentInvoices.find(
        inv => inv.invoice_number === data.invoiceNumber
      );

      if (duplicate) {
        anomalies.push({
          type: 'duplicate_invoice_number',
          description: 'Invoice number already exists for this supplier',
          severity: 'critical',
          evidence: 'Possible duplicate payment or fraud attempt',
        });
        anomalyScore += 80;
      }

      // Check for unusual amount spike
      const amounts = recentInvoices.map(inv => inv.gross_amount || 0).filter(a => a > 0);
      if (amounts.length >= 5 && data.grossAmount) {
        const avg = amounts.reduce((sum, a) => sum + a, 0) / amounts.length;
        const stdDev = Math.sqrt(
          amounts.reduce((sum, a) => sum + Math.pow(a - avg, 2), 0) / amounts.length
        );

        if (data.grossAmount > avg + (3 * stdDev)) {
          anomalies.push({
            type: 'amount_spike',
            description: `Amount (£${data.grossAmount}) is significantly higher than normal (avg: £${avg.toFixed(2)})`,
            severity: 'high',
            evidence: 'Amount is more than 3 standard deviations above average',
          });
          anomalyScore += 40;
        }
      }
    }
  }

  // Cap anomaly score at 100
  anomalyScore = Math.min(100, anomalyScore);

  return {
    is_anomaly: anomalyScore >= 50,
    anomaly_score: anomalyScore,
    anomalies,
    requires_review: anomalyScore >= 30 || anomalies.some(a => a.severity === 'critical' || a.severity === 'high'),
  };
}

// ============================================================================
// PREDICTIVE CORRECTIONS - Suggest fixes before user sees them
// ============================================================================

export interface PredictedCorrection {
  field_name: string;
  current_value: string;
  predicted_value: string;
  confidence: number;
  reason: string;
  pattern_based: boolean;
}

/**
 * Predict corrections based on learned patterns
 */
export async function predictCorrections(
  data: ExtractedInvoiceData,
  supplierId?: string
): Promise<PredictedCorrection[]> {
  const predictions: PredictedCorrection[] = [];

  // Get learned patterns
  const patterns = await detectCorrectionPatterns(2);

  // Apply patterns to predict corrections
  Object.entries(data).forEach(([field, value]) => {
    if (!value || typeof value !== 'string') return;

    // Find applicable patterns for this field
    const fieldPatterns = patterns.filter(p =>
      p.field_name === field && p.confidence > 70
    );

    fieldPatterns.forEach(pattern => {
      let predictedValue = value;

      // Apply OCR corrections
      if (pattern.pattern_type.startsWith('ocr_')) {
        predictedValue = value.replace(
          new RegExp(pattern.original_pattern, 'g'),
          pattern.corrected_pattern
        );

        if (predictedValue !== value) {
          predictions.push({
            field_name: field,
            current_value: value,
            predicted_value: predictedValue,
            confidence: pattern.confidence,
            reason: `Common OCR mistake: "${pattern.original_pattern}" → "${pattern.corrected_pattern}" (${pattern.occurrences} times)`,
            pattern_based: true,
          });
        }
      }
    });
  });

  // Supplier-specific predictions
  if (supplierId) {
    const supplierCorrections = await getCorrectionsBySupplier(supplierId);

    // Find most common corrections for this supplier
    const fieldCorrections = new Map<string, Map<string, number>>();
    supplierCorrections.forEach(c => {
      if (!fieldCorrections.has(c.field_name)) {
        fieldCorrections.set(c.field_name, new Map());
      }
      const corrections = fieldCorrections.get(c.field_name)!;
      const key = `${c.original_value}→${c.corrected_value}`;
      corrections.set(key, (corrections.get(key) || 0) + 1);
    });

    // Predict based on supplier history
    fieldCorrections.forEach((corrections, fieldName) => {
      const currentValue = (data as any)[fieldName];
      if (!currentValue) return;

      corrections.forEach((count, key) => {
        const [original, corrected] = key.split('→');
        if (original === currentValue && count >= 3) {
          predictions.push({
            field_name: fieldName,
            current_value: currentValue,
            predicted_value: corrected,
            confidence: Math.min(95, 60 + (count * 10)),
            reason: `You've corrected this ${count} times for this supplier`,
            pattern_based: false,
          });
        }
      });
    });
  }

  return predictions.sort((a, b) => b.confidence - a.confidence);
}

// ============================================================================
// CONTINUOUS LEARNING SUMMARY
// ============================================================================

export interface LearningInsights {
  total_corrections: number;
  patterns_detected: number;
  active_learning_pending: number;
  templates_generated: number;
  accuracy_trend: 'improving' | 'stable' | 'declining';
  top_problem_fields: Array<{ field: string; corrections: number }>;
  top_problem_suppliers: Array<{ supplier_name: string; corrections: number }>;
  recommendations: string[];
}

/**
 * Get overall learning insights
 */
export async function getLearningInsights(): Promise<LearningInsights> {
  try {
    // Get correction count
    const { count: totalCorrections } = await supabaseAdmin
      .from('invoice_corrections')
      .select('*', { count: 'exact', head: true });

    // Get patterns
    const patterns = await detectCorrectionPatterns(2);

    // Get pending active learning requests
    const pendingRequests = await getPendingLearningRequests(100);

    // Get top problem fields
    const correctionsByField = await getCorrectionsByField();
    const topProblemFields = Object.entries(correctionsByField)
      .map(([field, count]) => ({ field, corrections: count }))
      .sort((a, b) => b.corrections - a.corrections)
      .slice(0, 5);

    // Get recent corrections to determine trend
    const { data: recentCorrections } = await supabaseAdmin
      .from('invoice_corrections')
      .select('corrected_at')
      .order('corrected_at', { ascending: false })
      .limit(100);

    let accuracyTrend: 'improving' | 'stable' | 'declining' = 'stable';
    if (recentCorrections && recentCorrections.length >= 20) {
      const recent = recentCorrections.slice(0, 10).length;
      const older = recentCorrections.slice(10, 20).length;
      if (recent < older * 0.7) accuracyTrend = 'improving';
      if (recent > older * 1.3) accuracyTrend = 'declining';
    }

    // Generate recommendations
    const recommendations: string[] = [];

    if (pendingRequests.length > 10) {
      recommendations.push(`${pendingRequests.length} fields need human review - AI is requesting help`);
    }

    if (patterns.length > 5) {
      recommendations.push(`${patterns.length} correction patterns detected - AI can auto-fix these going forward`);
    }

    if (topProblemFields.length > 0 && topProblemFields[0].corrections > 20) {
      recommendations.push(`"${topProblemFields[0].field}" is frequently corrected - consider creating a template`);
    }

    if (accuracyTrend === 'declining') {
      recommendations.push('⚠️ Accuracy is declining - review recent invoices for format changes');
    } else if (accuracyTrend === 'improving') {
      recommendations.push('✅ Accuracy is improving! AI is learning from your corrections');
    }

    return {
      total_corrections: totalCorrections || 0,
      patterns_detected: patterns.length,
      active_learning_pending: pendingRequests.length,
      templates_generated: 0, // Would track this separately
      accuracy_trend: accuracyTrend,
      top_problem_fields: topProblemFields,
      top_problem_suppliers: [], // Would calculate this
      recommendations,
    };
  } catch (error) {
    console.error('getLearningInsights error:', error);
    return {
      total_corrections: 0,
      patterns_detected: 0,
      active_learning_pending: 0,
      templates_generated: 0,
      accuracy_trend: 'stable',
      top_problem_fields: [],
      top_problem_suppliers: [],
      recommendations: [],
    };
  }
}
