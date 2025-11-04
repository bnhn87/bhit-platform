// Simplified Invoice Database Service - NO ORGANIZATION REQUIRED
// Use this version if organization_id column issues persist

import { supabase } from './supabaseClient';
import type { ExtractedInvoiceData } from './invoiceAiService';
import type { Invoice, Supplier } from './invoiceDbService';

/**
 * Fetch all invoices (simplified - no organization filtering)
 */
export async function fetchInvoices(filters?: {
  status?: string;
  category?: string;
  dateFrom?: string;
  dateTo?: string;
  supplierId?: string;
}): Promise<Invoice[]> {
  try {
    // Just fetch invoices directly without organization check
    let query = supabase
      .from('invoices')
      .select('*')
      .order('invoice_date', { ascending: false });

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.category) {
      query = query.eq('category', filters.category);
    }

    if (filters?.dateFrom) {
      query = query.gte('invoice_date', filters.dateFrom);
    }

    if (filters?.dateTo) {
      query = query.lte('invoice_date', filters.dateTo);
    }

    if (filters?.supplierId) {
      query = query.eq('supplier_id', filters.supplierId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching invoices:', error);
      throw error;
    }

    return data || [];
  } catch (error: unknown) {
    console.error('fetchInvoices error:', error);
    throw error;
  }
}

/**
 * Test database connection
 */
export async function testConnection(): Promise<{
  success: boolean;
  details: string;
}> {
  try {
    // Test auth
    const { data: authData, error: authError } = await supabase.auth.getUser();
    if (authError || !authData.user) {
      return { success: false, details: 'Auth failed: ' + (authError?.message || 'No user') };
    }

    // Test users table read (without organization_id)
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, role')
      .eq('id', authData.user.id)
      .single();

    if (userError) {
      return { success: false, details: 'Users table error: ' + userError.message };
    }

    // Test invoices table
    const { error: invoicesError } = await supabase
      .from('invoices')
      .select('id')
      .limit(1);

    if (invoicesError) {
      return { success: false, details: 'Invoices table error: ' + invoicesError.message };
    }

    return {
      success: true,
      details: `Connected as user ${userData?.id} with role ${userData?.role}`
    };
  } catch (error: unknown) {
    return {
      success: false,
      details: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
