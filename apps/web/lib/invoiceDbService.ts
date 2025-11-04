// Invoice Database Service
// Handles all database operations for SmartInvoice feature

import type { ExtractedInvoiceData } from './invoiceAiService';
import { supabase } from './supabaseClient';
import { supabaseAdmin } from './supabaseAdmin';

export interface Invoice {
  id: string;
  created_at: string;
  updated_at: string;
  organization_id?: string;
  job_id?: string;
  supplier_id?: string;
  invoice_number: string;
  invoice_date: string;
  due_date?: string;
  supplier_name: string;
  description?: string;
  category: 'Vehicle' | 'Labour' | 'Materials' | 'Other';
  vehicle_reg?: string;
  job_reference?: string;
  net_amount: number;
  vat_amount: number;
  gross_amount: number;
  payment_terms?: string;
  status: 'pending' | 'approved' | 'paid' | 'rejected';
  approval_status?: 'pending' | 'approved' | 'rejected';
  approved_by?: string;
  approved_at?: string;
  paid_date?: string;
  file_path?: string;
  extracted_text?: string;
  confidence_score?: number;
  created_by: string;
  notes?: string;
}

export interface Supplier {
  id: string;
  name: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  payment_terms?: string;
  vat_number?: string;
  account_number?: string;
  sort_code?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface InvoiceCorrection {
  id: string;
  invoice_id: string;
  field_name: string;
  original_value: string;
  corrected_value: string;
  corrected_by: string;
  corrected_at: string;
  supplier_id?: string;
}

/**
 * Fetch all invoices for the current organization
 */
export async function fetchInvoices(filters?: {
  status?: string;
  category?: string;
  dateFrom?: string;
  dateTo?: string;
  supplierId?: string;
}): Promise<Invoice[]> {
  try {
    // Verify user is authenticated
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) {
      throw new Error('User not authenticated');
    }

    // Use API route instead of direct Supabase call (bypasses PostgREST cache issue)
    const response = await fetch('/api/invoices/list');

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch invoices');
    }

    let data: Invoice[] = await response.json();

    // Apply client-side filters
    if (filters?.status) {
      data = data.filter(inv => inv.status === filters.status);
    }

    if (filters?.category) {
      data = data.filter(inv => inv.category === filters.category);
    }

    if (filters?.dateFrom) {
      data = data.filter(inv => inv.invoice_date >= filters.dateFrom!);
    }

    if (filters?.dateTo) {
      data = data.filter(inv => inv.invoice_date <= filters.dateTo!);
    }

    if (filters?.supplierId) {
      data = data.filter(inv => inv.supplier_id === filters.supplierId);
    }

    return data || [];
  } catch (error) {
    console.error('fetchInvoices error:', error);
    throw error;
  }
}

/**
 * Check for duplicate invoices
 */
export async function checkDuplicateInvoice(
  invoiceNumber: string,
  supplier: string,
  grossAmount?: number
): Promise<Invoice | null> {
  try {
    const invoices = await fetchInvoices();

    // Look for exact invoice number + supplier match
    const exactMatch = invoices.find(
      inv => inv.invoice_number?.toLowerCase() === invoiceNumber?.toLowerCase() &&
             inv.supplier_name?.toLowerCase() === supplier?.toLowerCase()
    );

    if (exactMatch) {
      return exactMatch;
    }

    // Look for similar amount + supplier + date (fuzzy match)
    if (grossAmount) {
      const similarMatch = invoices.find(
        inv => inv.supplier_name?.toLowerCase() === supplier?.toLowerCase() &&
               inv.gross_amount &&
               Math.abs(inv.gross_amount - grossAmount) < 0.01  // Within 1 penny
      );

      if (similarMatch) {
        return similarMatch;
      }
    }

    return null;
  } catch (error) {
    console.error('Error checking duplicate:', error);
    return null;
  }
}

/**
 * Create a new invoice from AI-extracted data
 */
export async function createInvoiceFromExtraction(
  extractedData: ExtractedInvoiceData,
  filePath?: string,
  skipDuplicateCheck: boolean = false
): Promise<Invoice> {
  try {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      throw new Error('User not authenticated');
    }

    // Check for duplicates (unless explicitly skipped)
    if (!skipDuplicateCheck && extractedData.invoiceNumber && extractedData.supplier) {
      const duplicate = await checkDuplicateInvoice(
        extractedData.invoiceNumber,
        extractedData.supplier,
        extractedData.grossAmount || undefined
      );

      if (duplicate) {
        throw new Error(`DUPLICATE: Similar invoice found (${duplicate.invoice_number}) from ${duplicate.supplier_name}`);
      }
    }

    // Check if supplier exists, create if not
    let supplierId: string | undefined;
    if (extractedData.supplier) {
      const { data: existingSupplier } = await supabaseAdmin
        .from('suppliers')
        .select('id')
        .eq('name', extractedData.supplier)
        .maybeSingle();

      if (existingSupplier) {
        supplierId = existingSupplier.id;
      } else {
        // Create new supplier
        const { data: newSupplier, error: supplierError } = await supabaseAdmin
          .from('suppliers')
          .insert({
            name: extractedData.supplier,
            payment_terms: extractedData.paymentTerms,
          })
          .select()
          .single();

        if (supplierError) {
          console.error('Error creating supplier:', supplierError);
        } else {
          supplierId = newSupplier.id;
        }
      }
    }

    // Create invoice
    const invoiceData = {
      supplier_id: supplierId,
      invoice_number: extractedData.invoiceNumber || 'PENDING',
      invoice_date: extractedData.date || new Date().toISOString().split('T')[0],
      due_date: extractedData.dueDate,
      supplier_name: extractedData.supplier || 'Unknown',
      description: extractedData.description || '',
      category: extractedData.category || 'Other',
      vehicle_reg: extractedData.vehicleReg,
      job_reference: extractedData.jobReference,
      net_amount: extractedData.netAmount || 0,
      vat_amount: extractedData.vatAmount || 0,
      gross_amount: extractedData.grossAmount || 0,
      payment_terms: extractedData.paymentTerms,
      status: 'pending' as const,
      file_path: filePath,
      extracted_text: extractedData.extractedText,
      confidence_score: extractedData.confidence,
      created_by: user.user.id,
    };

    const { data, error } = await supabaseAdmin
      .from('invoices')
      .insert(invoiceData)
      .select()
      .single();

    if (error) {
      console.error('Error creating invoice:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('createInvoiceFromExtraction error:', error);
    throw error;
  }
}

/**
 * Update an invoice
 */
export async function updateInvoice(
  invoiceId: string,
  updates: Partial<Invoice>
): Promise<Invoice> {
  try {
    const { data, error } = await supabaseAdmin
      .from('invoices')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', invoiceId)
      .select()
      .single();

    if (error) {
      console.error('Error updating invoice:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('updateInvoice error:', error);
    throw error;
  }
}

/**
 * Delete an invoice
 */
export async function deleteInvoice(invoiceId: string): Promise<void> {
  try {
    const { error } = await supabaseAdmin
      .from('invoices')
      .delete()
      .eq('id', invoiceId);

    if (error) {
      console.error('Error deleting invoice:', error);
      throw error;
    }
  } catch (error) {
    console.error('deleteInvoice error:', error);
    throw error;
  }
}

/**
 * Approve an invoice
 */
export async function approveInvoice(invoiceId: string): Promise<Invoice> {
  try {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabaseAdmin
      .from('invoices')
      .update({
        approval_status: 'approved',
        approved_by: user.user.id,
        approved_at: new Date().toISOString(),
      })
      .eq('id', invoiceId)
      .select()
      .single();

    if (error) {
      console.error('Error approving invoice:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('approveInvoice error:', error);
    throw error;
  }
}

/**
 * Mark invoice as paid
 */
export async function markInvoicePaid(
  invoiceId: string,
  paidDate?: string
): Promise<Invoice> {
  try {
    const { data, error } = await supabaseAdmin
      .from('invoices')
      .update({
        status: 'paid',
        paid_date: paidDate || new Date().toISOString().split('T')[0],
      })
      .eq('id', invoiceId)
      .select()
      .single();

    if (error) {
      console.error('Error marking invoice as paid:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('markInvoicePaid error:', error);
    throw error;
  }
}

/**
 * Record a correction to learn from
 */
export async function recordCorrection(
  invoiceId: string,
  fieldName: string,
  originalValue: any,
  correctedValue: any,
  supplierId?: string
): Promise<void> {
  try {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      throw new Error('User not authenticated');
    }

    const { error } = await supabaseAdmin
      .from('invoice_corrections')
      .insert({
        invoice_id: invoiceId,
        field_name: fieldName,
        original_value: String(originalValue),
        corrected_value: String(correctedValue),
        corrected_by: user.user.id,
        supplier_id: supplierId,
      });

    if (error) {
      console.error('Error recording correction:', error);
      throw error;
    }
  } catch (error) {
    console.error('recordCorrection error:', error);
    throw error;
  }
}

/**
 * Fetch suppliers
 */
export async function fetchSuppliers(): Promise<Supplier[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from('suppliers')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error fetching suppliers:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('fetchSuppliers error:', error);
    throw error;
  }
}

/**
 * Create or update a supplier
 */
export async function upsertSupplier(supplier: Partial<Supplier>): Promise<Supplier> {
  try {
    const { data, error } = await supabaseAdmin
      .from('suppliers')
      .upsert({
        ...supplier,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Error upserting supplier:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('upsertSupplier error:', error);
    throw error;
  }
}

/**
 * Get invoice statistics
 */
export async function getInvoiceStats(): Promise<{
  totalPending: number;
  totalApproved: number;
  totalPaid: number;
  totalAmount: number;
  pendingAmount: number;
  paidAmount: number;
}> {
  try {
    const { data, error } = await supabaseAdmin
      .from('invoices')
      .select('status, gross_amount');

    if (error) {
      console.error('Error fetching invoice stats:', error);
      throw error;
    }

    const stats = {
      totalPending: 0,
      totalApproved: 0,
      totalPaid: 0,
      totalAmount: 0,
      pendingAmount: 0,
      paidAmount: 0,
    };

    data?.forEach((invoice) => {
      stats.totalAmount += invoice.gross_amount || 0;

      switch (invoice.status) {
        case 'pending':
          stats.totalPending++;
          stats.pendingAmount += invoice.gross_amount || 0;
          break;
        case 'approved':
          stats.totalApproved++;
          stats.pendingAmount += invoice.gross_amount || 0;
          break;
        case 'paid':
          stats.totalPaid++;
          stats.paidAmount += invoice.gross_amount || 0;
          break;
      }
    });

    return stats;
  } catch (error) {
    console.error('getInvoiceStats error:', error);
    throw error;
  }
}

/**
 * Upload invoice file to Supabase Storage
 */
export async function uploadInvoiceFile(
  file: File,
  invoiceNumber: string
): Promise<string> {
  try {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      throw new Error('User not authenticated');
    }

    const timestamp = Date.now();
    const fileName = `${invoiceNumber}_${timestamp}_${file.name}`;
    const filePath = `invoices/${fileName}`;

    const { data, error } = await supabaseAdmin.storage
      .from('documents')
      .upload(filePath, file);

    if (error) {
      console.error('Error uploading file:', error);
      throw error;
    }

    return data.path;
  } catch (error) {
    console.error('uploadInvoiceFile error:', error);
    throw error;
  }
}

/**
 * Get signed URL for invoice file
 */
export async function getInvoiceFileUrl(filePath: string): Promise<string> {
  try {
    const { data, error } = await supabaseAdmin.storage
      .from('documents')
      .createSignedUrl(filePath, 3600); // 1 hour expiry

    if (error) {
      console.error('Error getting signed URL:', error);
      throw error;
    }

    return data.signedUrl;
  } catch (error) {
    console.error('getInvoiceFileUrl error:', error);
    throw error;
  }
}

/**
 * Subscribe to invoice changes in real-time
 */
export function subscribeToInvoices(
  callback: (payload: any) => void
): () => void {
  const subscription = supabase
    .channel('invoices-channel')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'invoices',
      },
      callback
    )
    .subscribe();

  return () => {
    subscription.unsubscribe();
  };
}
