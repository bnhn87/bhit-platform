// AI Parsing Service - Production Quality Gemini Integration
import { GoogleGenerativeAI } from '@google/generative-ai';

import { supabase } from '../supabaseClient';

import type { ParsedPODData, PODItem, ConfidenceScores, VehicleType } from './types';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = 'gemini-2.0-flash-exp';

export class AIParsingService {
  /**
   * Parse POD document using Gemini AI
   */
  static async parsePOD(podId: string, filePath: string): Promise<ParsedPODData> {
    if (!GEMINI_API_KEY) {
      console.warn('GEMINI_API_KEY not configured - using mock data');
      return this.getMockParsedData();
    }

    try {
      // Update status to parsing
      // Note: delivery_pods table exists in DB but not in generated types
      await supabase
        .from('delivery_pods')
        .update({ status: 'parsing' })
        .eq('id', podId);

      // Download file from Supabase Storage
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('pods')
        .download(filePath);

      if (downloadError || !fileData) {
        throw new Error(`Failed to download file: ${downloadError?.message}`);
      }

      // Convert file to base64
      const arrayBuffer = await fileData.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString('base64');

      // Determine MIME type from file extension
      const mimeType = this.getMimeType(filePath);

      // Initialize Gemini
      const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

      // Create extraction prompt
      const prompt = this.createExtractionPrompt();

      // Call Gemini API
      const result = await model.generateContent([
        {
          inlineData: {
            mimeType,
            data: base64
          }
        },
        { text: prompt }
      ]);

      const response = await result.response;
      const text = response.text();

      // Parse JSON response
      const parsedData = this.parseGeminiResponse(text);

      // Calculate validation flags
      parsedData.validation_flags = this.calculateValidationFlags(parsedData);

      // Update POD with parsing status
      // Note: delivery_pods table exists in DB but not in generated types
      await supabase
        .from('delivery_pods')
        .update({
          status: parsedData.validation_flags.length > 0 ? 'needs_review' : 'pending',
          parsing_completed_at: new Date().toISOString(),
          ai_model_version: GEMINI_MODEL
        })
        .eq('id', podId);

      return parsedData;
    } catch (error: any) {
      console.error('AI Parsing error:', error);

      // Update status to needs_review on error
      // Note: delivery_pods table exists in DB but not in generated types
      await supabase
        .from('delivery_pods')
        .update({
          status: 'needs_review',
          validation_flags: ['ai_parsing_failed']
        })
        .eq('id', podId);

      // Return empty data structure on error
      return {
        confidence_scores: { overall: 0 },
        validation_flags: ['ai_parsing_failed'],
        raw_extracted_text: error.message
      };
    }
  }

  /**
   * Create comprehensive extraction prompt for Gemini
   */
  private static createExtractionPrompt(): string {
    return `You are a document extraction expert analyzing a Proof of Delivery (POD) document for a UK construction materials haulage company.

Extract the following information from this document and return it as a JSON object. For each field, also provide a confidence score (0-100%) indicating how certain you are about the extracted value.

Required fields:
1. sales_order_ref - The sales order or delivery reference number
2. delivery_date - Date of delivery (YYYY-MM-DD format)
3. delivery_time - Time of delivery (HH:MM format, 24-hour)
4. recipient_name - Name of person who received the delivery
5. delivery_address - Full delivery address
6. vehicle_type - Type of vehicle used (one of: luton, 7.5t, artic, van, sprinter, other)
7. vehicle_count - Number of vehicles used
8. vehicle_registrations - Array of vehicle registration plates (UK format)
9. driver_names - Array of driver names
10. items_delivered - Array of items with: product (string), quantity (number), unit (string), notes (optional)

Return ONLY valid JSON in this exact format:
{
  "sales_order_ref": "string or null",
  "delivery_date": "YYYY-MM-DD or null",
  "delivery_time": "HH:MM or null",
  "recipient_name": "string or null",
  "delivery_address": "string or null",
  "vehicle_type": "luton|7.5t|artic|van|sprinter|other or null",
  "vehicle_count": number,
  "vehicle_registrations": ["string"],
  "driver_names": ["string"],
  "items_delivered": [
    {
      "product": "string",
      "quantity": number,
      "unit": "string",
      "notes": "string or null"
    }
  ],
  "confidence_scores": {
    "sales_order_ref": 0-100,
    "delivery_date": 0-100,
    "delivery_time": 0-100,
    "recipient_name": 0-100,
    "delivery_address": 0-100,
    "vehicle_type": 0-100,
    "vehicle_registrations": 0-100,
    "driver_names": 0-100,
    "items_delivered": 0-100
  }
}

Important:
- Use null for fields you cannot find
- Be conservative with confidence scores
- Look for common UK POD formats: supplier name at top, delivery details in middle, signature at bottom
- Vehicle registrations are usually in format: AA11 AAA or A1 AAA
- Dates may be in DD/MM/YYYY or DD-MM-YYYY format (convert to YYYY-MM-DD)
- Items may be in a table format with columns for product, quantity, unit
- Return ONLY the JSON object, no additional text or explanation`;
  }

  /**
   * Parse Gemini response and extract structured data
   */
  private static parseGeminiResponse(text: string): ParsedPODData {
    try {
      // Remove markdown code blocks if present
      let jsonText = text.trim();
      if (jsonText.startsWith('```json')) {
        jsonText = jsonText.replace(/^```json\n/, '').replace(/\n```$/, '');
      } else if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/^```\n/, '').replace(/\n```$/, '');
      }

      const parsed = JSON.parse(jsonText);

      // Calculate overall confidence
      const scores = parsed.confidence_scores || {};
      const confidenceValues = Object.values(scores).filter((v): v is number => typeof v === 'number');
      const overall = confidenceValues.length > 0
        ? Math.round(confidenceValues.reduce((a: number, b: number) => a + b, 0) / confidenceValues.length)
        : 0;

      return {
        sales_order_ref: parsed.sales_order_ref || undefined,
        delivery_date: parsed.delivery_date || undefined,
        delivery_time: parsed.delivery_time || undefined,
        recipient_name: parsed.recipient_name || undefined,
        delivery_address: parsed.delivery_address || undefined,
        vehicle_type: parsed.vehicle_type as VehicleType || undefined,
        vehicle_count: parsed.vehicle_count || 1,
        vehicle_registrations: parsed.vehicle_registrations || [],
        driver_names: parsed.driver_names || [],
        items_delivered: parsed.items_delivered || [],
        confidence_scores: {
          overall,
          ...scores
        },
        validation_flags: [],
        raw_extracted_text: jsonText
      };
    } catch (error) {
      console.error('Failed to parse Gemini response:', error);
      throw new Error('Invalid JSON response from AI model');
    }
  }

  /**
   * Calculate validation flags based on extracted data
   */
  private static calculateValidationFlags(data: ParsedPODData): string[] {
    const flags: string[] = [];

    // Check overall confidence
    if ((data.confidence_scores.overall || 0) < 75) {
      flags.push('low_overall_confidence');
    }

    // Check critical missing fields
    if (!data.sales_order_ref) {
      flags.push('missing_sales_order_ref');
    }
    if (!data.delivery_date) {
      flags.push('missing_delivery_date');
    }

    // Check low confidence on specific fields
    if ((data.confidence_scores.delivery_address || 0) < 50) {
      flags.push('low_confidence_address');
    }
    if ((data.confidence_scores.items_delivered || 0) < 50) {
      flags.push('low_confidence_items');
    }

    // Check for unusual values
    if (data.vehicle_count && data.vehicle_count > 5) {
      flags.push('unusual_vehicle_count');
    }

    return flags;
  }

  /**
   * Get MIME type from file path
   */
  private static getMimeType(filePath: string): string {
    const extension = filePath.split('.').pop()?.toLowerCase();
    const mimeTypes: Record<string, string> = {
      pdf: 'application/pdf',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      webp: 'image/webp'
    };
    return mimeTypes[extension || ''] || 'application/pdf';
  }

  /**
   * Get mock parsed data for testing when API key is not configured
   */
  private static getMockParsedData(): ParsedPODData {
    return {
      sales_order_ref: 'SO-' + Math.random().toString(36).substr(2, 9).toUpperCase(),
      delivery_date: new Date().toISOString().split('T')[0],
      delivery_time: '14:30',
      recipient_name: 'John Smith',
      delivery_address: '123 Construction Site, London, SW1A 1AA',
      vehicle_type: 'luton',
      vehicle_count: 1,
      vehicle_registrations: ['AB12 CDE'],
      driver_names: ['Mike Driver'],
      items_delivered: [
        { product: 'Plasterboard 12.5mm', quantity: 50, unit: 'sheets' },
        { product: 'Insulation Rolls', quantity: 20, unit: 'rolls' }
      ],
      confidence_scores: {
        overall: 85,
        sales_order_ref: 90,
        delivery_date: 95,
        delivery_time: 80,
        recipient_name: 75,
        delivery_address: 88,
        vehicle_type: 92,
        vehicle_registrations: 85,
        driver_names: 78,
        items_delivered: 82
      },
      validation_flags: []
    };
  }
}
