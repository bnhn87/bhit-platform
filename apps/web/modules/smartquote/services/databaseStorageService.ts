import { supabase } from '../../../lib/supabaseClient';
import { SavedQuote, QuoteDetails, CalculationResults, CalculatedProduct } from '../types';

export interface DatabaseQuote {
  id: string;
  reference: string;
  status: string;
  client_name: string | null;
  project_name: string | null;
  delivery_address: string | null;
  prepared_by: string | null;
  total_amount: number | null;
  total_labour_days: number | null;
  quote_details: QuoteDetails | null;
  calculation_results: CalculationResults | null;
  products_data: CalculatedProduct[] | null;
  configuration_snapshot: unknown | null;
  created_at: string;
  updated_at: string;
  sent_at: string | null;
  approved_at: string | null;
  version?: number; // Optional for backward compatibility
}

export interface DatabaseQuoteLine {
  id: string;
  quote_id: string;
  line_number: number;
  product_code: string | null;
  product_description: string;
  quantity: number;
  time_per_unit: number;
  total_time: number;
  waste_per_unit: number;
  total_waste: number;
  is_heavy: boolean;
  is_manually_edited: boolean;
  source: string;
  raw_description: string | null;
  clean_description: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Generate a unique quote reference in format QT-YYYYMMDD-NNN
 */
export const generateQuoteReference = async (): Promise<string> => {
  const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
  const prefix = `QT-${today}`;

  // Find the highest sequence number for today
  const { data: existingQuotes } = await supabase
    .from('quotes')
    .select('reference')
    .like('reference', `${prefix}%`)
    .order('reference', { ascending: false })
    .limit(1);

  let sequenceNumber = 1;
  if (existingQuotes && existingQuotes.length > 0) {
    const lastRef = existingQuotes[0].reference;
    const lastSeq = parseInt(lastRef.split('-')[2] || '0');
    sequenceNumber = lastSeq + 1;
  }

  return `${prefix}-${sequenceNumber.toString().padStart(3, '0')}`;
};

/**
 * Convert database quote to SavedQuote format for compatibility
 */
const convertToSavedQuote = (dbQuote: DatabaseQuote, lines: DatabaseQuoteLine[] = []): SavedQuote => {
  // Convert quote lines to CalculatedProduct format
  const products: CalculatedProduct[] = lines.map(line => ({
    lineNumber: line.line_number,
    productCode: line.product_code || '',
    rawDescription: line.raw_description || line.product_description,
    cleanDescription: line.clean_description || line.product_description,
    description: line.product_description,
    quantity: line.quantity,
    timePerUnit: line.time_per_unit,
    totalTime: line.total_time,
    wastePerUnit: line.waste_per_unit,
    totalWaste: line.total_waste,
    isHeavy: line.is_heavy,
    isManuallyEdited: line.is_manually_edited,
    source: line.source as 'catalogue' | 'user-inputted' | 'default' | 'learned'
  }));

  // Use products from database if calculation_results doesn't have them
  const detailedProducts = dbQuote.calculation_results?.detailedProducts || products;

  return {
    id: dbQuote.id,
    details: dbQuote.quote_details || {
      quoteRef: dbQuote.reference,
      client: dbQuote.client_name || '',
      project: dbQuote.project_name || '',
      deliveryAddress: dbQuote.delivery_address || '',
      preparedBy: '',
      upliftViaStairs: false,
      extendedUplift: false,
      specialistReworking: false
    },
    results: dbQuote.calculation_results || {
      labour: { totalHours: 0, upliftBufferPercentage: 0, hoursAfterUplift: 0, durationBufferPercentage: 0, bufferedHours: 0, totalDays: 0 },
      crew: { crewSize: 0, vanCount: 0, vanFitters: 0, onFootFitters: 0, supervisorCount: 0, specialistCount: 0, daysPerFitter: 0, totalProjectDays: 0, isTwoManVanRequired: false, hourLoadPerPerson: 0 },
      waste: { totalVolumeM3: 0, loadsRequired: 0, isFlagged: false },
      pricing: { totalCost: 0, vanCost: 0, fitterCost: 0, supervisorCost: 0, reworkingCost: 0, parkingCost: 0, transportCost: 0, billableDays: 0 },
      detailedProducts,
      notes: { parking: '', mileage: '', ulez: '', delivery: '' }
    },
    products: detailedProducts,
    savedAt: dbQuote.created_at,
    version: dbQuote.version || 1
  };
};

/**
 * Loads recent quotes from the database for the current user.
 * Optimized to use a join query and limit results.
 */
export const loadQuotesFromDatabase = async (): Promise<SavedQuote[]> => {
  try {
    // Load recent quotes with their lines in a single query
    const { data: quotes, error: quotesError } = await supabase
      .from('quotes')
      .select(`
        *,
        quote_lines (*)
      `)
      .order('created_at', { ascending: false })
      .limit(50); // Only load 50 most recent quotes

    if (quotesError) {
      console.error('Error loading quotes from database:', quotesError);
      return [];
    }

    if (!quotes || quotes.length === 0) {
      return [];
    }

    // Convert to SavedQuote format
    return quotes.map(quote => {
      const lines = quote.quote_lines || [];
      // Sort lines by line_number
      lines.sort((a: DatabaseQuoteLine, b: DatabaseQuoteLine) => a.line_number - b.line_number);
      return convertToSavedQuote(quote, lines);
    });

  } catch (error: unknown) {
    console.error('Failed to load quotes from database:', error);
    return [];
  }
};

/**
 * Saves a quote to the database.
 */
export const saveQuoteToDatabase = async (quoteToSave: SavedQuote): Promise<boolean> => {
  try {
    // Generate reference if it doesn't exist
    let reference = quoteToSave.details.quoteRef;
    if (!reference) {
      reference = await generateQuoteReference();
    }

    // Prepare quote data
    const quoteData = {
      id: quoteToSave.id,
      reference,
      status: 'draft',
      client_name: quoteToSave.details.client,
      project_name: quoteToSave.details.project,
      delivery_address: quoteToSave.details.deliveryAddress,
      total_amount: quoteToSave.results.pricing.totalCost,
      total_labour_days: quoteToSave.results.labour.totalDays,
      quote_details: quoteToSave.details,
      calculation_results: quoteToSave.results,
      products_data: quoteToSave.products,
      updated_at: new Date().toISOString()
    };

    // Save or update the quote
    const { error: quoteError } = await supabase
      .from('quotes')
      .upsert(quoteData, {
        onConflict: 'id',
        ignoreDuplicates: false
      });

    if (quoteError) {
      console.error('Error saving quote to database:', quoteError);
      return false;
    }

    // Delete existing quote lines
    const { error: deleteError } = await supabase
      .from('quote_lines')
      .delete()
      .eq('quote_id', quoteToSave.id);

    if (deleteError) {
      console.error('Error deleting existing quote lines:', deleteError);
    }

    // Save quote lines
    if (quoteToSave.products && quoteToSave.products.length > 0) {
      const quoteLines = quoteToSave.products.map(product => ({
        quote_id: quoteToSave.id,
        line_number: product.lineNumber,
        product_code: product.productCode,
        product_description: product.description,
        quantity: product.quantity,
        time_per_unit: product.timePerUnit,
        total_time: product.totalTime,
        waste_per_unit: product.wastePerUnit,
        total_waste: product.totalWaste,
        is_heavy: product.isHeavy,
        is_manually_edited: product.isManuallyEdited || false,
        source: product.source,
        raw_description: product.rawDescription,
        clean_description: product.cleanDescription
      }));

      const { error: linesError } = await supabase
        .from('quote_lines')
        .insert(quoteLines);

      if (linesError) {
        console.error('Error saving quote lines to database:', linesError);
        return false;
      }
    }

    return true;

  } catch (error: unknown) {
    console.error('Failed to save quote to database:', error);
    return false;
  }
};

/**
 * Deletes a quote from the database.
 */
export const deleteQuoteFromDatabase = async (quoteId: string): Promise<boolean> => {
  try {
    // Quote lines will be deleted automatically due to CASCADE
    const { error } = await supabase
      .from('quotes')
      .delete()
      .eq('id', quoteId);

    if (error) {
      console.error('Error deleting quote from database:', error);
      return false;
    }

    return true;

  } catch (error: unknown) {
    console.error('Failed to delete quote from database:', error);
    return false;
  }
};

/**
 * Hybrid storage service that uses database with localStorage fallback
 */
export const hybridStorageService = {
  async loadQuotes(): Promise<SavedQuote[]> {
    // Try database first
    const dbQuotes = await loadQuotesFromDatabase();

    if (dbQuotes.length > 0) {
      return dbQuotes;
    }

    // Fallback to localStorage
    try {
      const storedData = localStorage.getItem('bhit_saved_quotes');
      if (storedData) {
        const parsed = JSON.parse(storedData);
        if (Array.isArray(parsed)) {
          return parsed.sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());
        }
      }
    } catch (error: unknown) {
      console.error('Failed to load quotes from localStorage:', error);
    }

    return [];
  },

  async saveQuote(quote: SavedQuote): Promise<{ success: boolean; usedFallback: boolean }> {
    // Try database first
    const dbSuccess = await saveQuoteToDatabase(quote);

    if (!dbSuccess) {
      // Fallback to localStorage
      try {
        const existingQuotes = await this.loadQuotes();
        const filteredQuotes = existingQuotes.filter(q => q.id !== quote.id);
        const updatedQuotes = [quote, ...filteredQuotes];
        localStorage.setItem('bhit_saved_quotes', JSON.stringify(updatedQuotes));
        return { success: true, usedFallback: true };
      } catch (error: unknown) {
        console.error('Failed to save quote to localStorage fallback:', error);
        return { success: false, usedFallback: false };
      }
    }

    return { success: true, usedFallback: false };
  },

  async deleteQuote(quoteId: string): Promise<void> {
    // Try database first
    const dbSuccess = await deleteQuoteFromDatabase(quoteId);

    if (!dbSuccess) {
      // Fallback to localStorage
      try {
        const existingQuotes = await this.loadQuotes();
        const updatedQuotes = existingQuotes.filter(q => q.id !== quoteId);
        localStorage.setItem('bhit_saved_quotes', JSON.stringify(updatedQuotes));
      } catch (error: unknown) {
        console.error('Failed to delete quote from localStorage fallback:', error);
      }
    }
  }
};