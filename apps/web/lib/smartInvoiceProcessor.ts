// Smart Invoice Processor - Integrates AI extraction with continuous learning
// This orchestrates all AI learning systems during invoice upload

import { processInvoiceWithAI, type ExtractedInvoiceData, type ProcessingResult } from './invoiceAiService';
import {
  detectCorrectionPatterns,
  applyLearnedPatterns,
  createActiveLearningRequest,
  validateExtractedData,
  detectAnomalies,
  predictCorrections,
  type CorrectionPattern,
  type ValidationResult,
  type AnomalyDetection,
  type PredictedCorrection
} from './aiLearningEngine';

export interface EnhancedProcessingResult extends ProcessingResult {
  appliedPatterns?: string[];
  validationResult?: ValidationResult;
  anomalyDetection?: AnomalyDetection;
  predictedCorrections?: PredictedCorrection[];
  activeLearningRequests?: string[];
}

/**
 * Process invoice with AI + all learning systems
 * This is the main entry point for intelligent invoice processing
 */
export async function processInvoiceWithLearning(
  file: File,
  supplierId?: string
): Promise<EnhancedProcessingResult> {
  const startTime = Date.now();

  try {
    // Step 1: Extract data with AI
    console.log('📄 Step 1/5: Extracting data with AI...');
    const aiResult = await processInvoiceWithAI(file);

    if (!aiResult.success || !aiResult.data) {
      return aiResult;
    }

    let extractedData = aiResult.data;
    const appliedPatterns: string[] = [];

    // Step 2: Load and apply learned patterns
    console.log('🧠 Step 2/5: Applying learned patterns...');
    try {
      const patterns = await detectCorrectionPatterns(2); // Min 2 occurrences
      const beforePatterns = JSON.stringify(extractedData);
      extractedData = applyLearnedPatterns(extractedData, patterns);
      const afterPatterns = JSON.stringify(extractedData);

      if (beforePatterns !== afterPatterns) {
        console.log('✅ Learned patterns applied successfully');
        patterns.forEach(p => {
          appliedPatterns.push(`${p.field_name}: ${p.pattern_type} (${p.occurrences}x)`);
        });
      }
    } catch (error) {
      console.error('Pattern application failed (non-critical):', error);
      // Continue processing even if pattern application fails
    }

    // Step 3: Validate extracted data
    console.log('✅ Step 3/5: Validating extracted data...');
    let validationResult: ValidationResult | undefined;
    try {
      validationResult = await validateExtractedData(extractedData, supplierId);

      if (!validationResult.is_valid) {
        console.log(`⚠️ Validation found ${validationResult.warnings.length + validationResult.issues.length} issues`);
      }
    } catch (error) {
      console.error('Validation failed (non-critical):', error);
    }

    // Step 4: Detect anomalies
    console.log('🔍 Step 4/6: Detecting anomalies...');
    let anomalyDetection: AnomalyDetection | undefined;
    try {
      anomalyDetection = await detectAnomalies(extractedData, supplierId);

      if (anomalyDetection.requires_review) {
        console.log(`🚨 Anomaly detected! Score: ${anomalyDetection.anomaly_score}/100`);
      }
    } catch (error) {
      console.error('Anomaly detection failed (non-critical):', error);
    }

    // Step 5: Generate predictive corrections
    console.log('🔮 Step 5/6: Generating predictive corrections...');
    let predictedCorrections: PredictedCorrection[] | undefined;
    try {
      predictedCorrections = await predictCorrections(extractedData, supplierId);

      if (predictedCorrections && predictedCorrections.length > 0) {
        console.log(`💡 Generated ${predictedCorrections.length} predicted corrections`);
        predictedCorrections.forEach(p => {
          console.log(`  - ${p.field_name}: "${p.current_value}" → "${p.predicted_value}" (${p.confidence}%)`);
        });
      }
    } catch (error) {
      console.error('Predictive corrections failed (non-critical):', error);
    }

    // Step 6: Create active learning requests (AFTER invoice is saved)
    // We'll return field confidence data and create requests in the save handler
    console.log('🎓 Step 6/6: Preparing active learning data...');
    const lowConfidenceFields = extractedData.fieldConfidence
      ? Object.entries(extractedData.fieldConfidence)
          .filter(([_, confidence]) => confidence && confidence < 70)
          .map(([field]) => field)
      : [];

    if (lowConfidenceFields.length > 0) {
      console.log(`📝 Found ${lowConfidenceFields.length} low-confidence fields for active learning`);
    }

    const processingTime = Date.now() - startTime;

    return {
      success: true,
      data: extractedData,
      processingTime,
      appliedPatterns: appliedPatterns.length > 0 ? appliedPatterns : undefined,
      validationResult,
      anomalyDetection,
      predictedCorrections: predictedCorrections && predictedCorrections.length > 0 ? predictedCorrections : undefined,
      activeLearningRequests: lowConfidenceFields.length > 0 ? lowConfidenceFields : undefined
    };

  } catch (error) {
    console.error('Smart invoice processing error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      processingTime: Date.now() - startTime
    };
  }
}

/**
 * Create active learning requests for an invoice
 * Call this AFTER the invoice is saved to database
 */
export async function createActiveLearningRequestsForInvoice(
  invoiceId: string,
  extractedData: ExtractedInvoiceData
): Promise<void> {
  if (!extractedData.fieldConfidence) return;

  const promises = Object.entries(extractedData.fieldConfidence)
    .filter(([field, confidence]) => confidence && confidence < 70)
    .map(async ([field, confidence]) => {
      const value = (extractedData as any)[field];
      if (value === null || value === undefined) return;

      try {
        await createActiveLearningRequest(
          invoiceId,
          field,
          String(value),
          confidence || 0,
          `AI is uncertain about this ${field} field. Please verify.`
        );
        console.log(`📝 Created active learning request for ${field} (${confidence}% confidence)`);
      } catch (error) {
        console.error(`Failed to create learning request for ${field}:`, error);
      }
    });

  await Promise.allSettled(promises);
}
