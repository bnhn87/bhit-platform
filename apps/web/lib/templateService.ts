// Document Template Service
// Handles template creation, storage, and application for AI training

import { supabase } from './supabaseClient';
import { supabaseAdmin } from './supabaseAdmin';

export interface DocumentTemplate {
  id: string;
  name: string;
  description?: string;
  document_type: 'invoice' | 'pod' | 'quote' | 'receipt' | 'timesheet' | 'custom';
  supplier_id?: string;
  is_generic: boolean;
  created_by: string;
  organization_id: string;
  created_at: string;
  updated_at: string;
  version: number;
  page_count: number;
  sample_file_path?: string;
  match_rate: number;
  usage_count: number;
  is_active: boolean;
}

export interface TemplateField {
  id: string;
  template_id: string;
  field_name: string;
  field_label: string;
  page_number: number;
  x: number;
  y: number;
  width: number;
  height: number;
  confidence_level: 'always' | 'usually' | 'sometimes' | 'fallback';
  priority: number;
  validation_regex?: string;
  expected_format?: string;
  notes?: string;
  created_at: string;
}

export interface TemplateUsage {
  id: string;
  template_id: string;
  invoice_id?: string;
  document_type: string;
  used_at: string;
  match_rate?: number;
  fields_matched?: number;
  fields_total?: number;
  avg_confidence?: number;
  extraction_time_ms?: number;
  had_errors: boolean;
}

/**
 * Fetch all templates for current organization
 */
export async function fetchTemplates(filters?: {
  document_type?: string;
  supplier_id?: string;
  is_generic?: boolean;
  is_active?: boolean;
}): Promise<DocumentTemplate[]> {
  try {
    let query = (supabaseAdmin
      .from('document_templates') as any)
      .select('*')
      .order('created_at', { ascending: false });

    if (filters?.document_type) {
      query = query.eq('document_type', filters.document_type);
    }
    if (filters?.supplier_id) {
      query = query.eq('supplier_id', filters.supplier_id);
    }
    if (filters?.is_generic !== undefined) {
      query = query.eq('is_generic', filters.is_generic);
    }
    if (filters?.is_active !== undefined) {
      query = query.eq('is_active', filters.is_active);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching templates:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('fetchTemplates error:', error);
    throw error;
  }
}

/**
 * Get template by ID with all fields
 */
export async function getTemplate(templateId: string): Promise<{
  template: DocumentTemplate;
  fields: TemplateField[];
}> {
  try {
    const [templateResult, fieldsResult] = await Promise.all([
      (supabaseAdmin
        .from('document_templates') as any)
        .select('*')
        .eq('id', templateId)
        .single(),
      (supabaseAdmin
        .from('template_fields') as any)
        .select('*')
        .eq('template_id', templateId)
        .order('priority', { ascending: true })
    ]);

    if (templateResult.error) throw templateResult.error;
    if (fieldsResult.error) throw fieldsResult.error;

    return {
      template: templateResult.data,
      fields: fieldsResult.data || []
    };
  } catch (error) {
    console.error('getTemplate error:', error);
    throw error;
  }
}

/**
 * Create new template
 */
export async function createTemplate(
  template: Omit<DocumentTemplate, 'id' | 'created_at' | 'updated_at' | 'version' | 'match_rate' | 'usage_count'>
): Promise<DocumentTemplate> {
  try {
    const { data: user } = await supabase.auth.getUser();
    if (!user.user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await (supabaseAdmin
      .from('document_templates') as any)
      .insert({
        ...template,
        created_by: user.user.id,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating template:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('createTemplate error:', error);
    throw error;
  }
}

/**
 * Update template
 */
export async function updateTemplate(
  templateId: string,
  updates: Partial<DocumentTemplate>
): Promise<DocumentTemplate> {
  try {
    const { data, error } = await (supabaseAdmin
      .from('document_templates') as any)
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', templateId)
      .select()
      .single();

    if (error) {
      console.error('Error updating template:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('updateTemplate error:', error);
    throw error;
  }
}

/**
 * Save template fields (replaces all existing fields)
 */
export async function saveTemplateFields(
  templateId: string,
  fields: Omit<TemplateField, 'id' | 'template_id' | 'created_at'>[]
): Promise<TemplateField[]> {
  try {
    // Delete existing fields
    await (supabaseAdmin
      .from('template_fields') as any)
      .delete()
      .eq('template_id', templateId);

    // Insert new fields
    const { data, error } = await (supabaseAdmin
      .from('template_fields') as any)
      .insert(
        fields.map(field => ({
          ...field,
          template_id: templateId,
        }))
      )
      .select();

    if (error) {
      console.error('Error saving template fields:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('saveTemplateFields error:', error);
    throw error;
  }
}

/**
 * Delete template (soft delete - set is_active = false)
 */
export async function deleteTemplate(templateId: string): Promise<void> {
  try {
    const { error } = await (supabaseAdmin
      .from('document_templates') as any)
      .update({ is_active: false })
      .eq('id', templateId);

    if (error) {
      console.error('Error deleting template:', error);
      throw error;
    }
  } catch (error) {
    console.error('deleteTemplate error:', error);
    throw error;
  }
}

/**
 * Duplicate template
 */
export async function duplicateTemplate(
  templateId: string,
  newName: string
): Promise<DocumentTemplate> {
  try {
    const { template, fields } = await getTemplate(templateId);

    // Create new template
    const newTemplate = await createTemplate({
      ...template,
      name: newName,
      version: 1,
      is_active: true,
    } as any);

    // Copy fields
    if (fields.length > 0) {
      await saveTemplateFields(
        newTemplate.id,
        fields.map(({ id, template_id, created_at, ...field }) => field)
      );
    }

    return newTemplate;
  } catch (error) {
    console.error('duplicateTemplate error:', error);
    throw error;
  }
}

/**
 * Record template usage
 */
export async function recordTemplateUsage(
  usage: Omit<TemplateUsage, 'id' | 'used_at'>
): Promise<void> {
  try {
    const { error } = await (supabaseAdmin
      .from('template_usage') as any)
      .insert(usage);

    if (error) {
      console.error('Error recording template usage:', error);
      throw error;
    }
  } catch (error) {
    console.error('recordTemplateUsage error:', error);
    throw error;
  }
}

/**
 * Get template performance stats
 */
export async function getTemplatePerformance(templateId: string): Promise<{
  usage_count: number;
  avg_match_rate: number;
  avg_confidence: number;
  avg_extraction_time_ms: number;
  error_rate: number;
  recent_uses: TemplateUsage[];
}> {
  try {
    const { data: usages, error } = await (supabaseAdmin
      .from('template_usage') as any)
      .select('*')
      .eq('template_id', templateId)
      .order('used_at', { ascending: false })
      .limit(100);

    if (error) throw error;

    const stats = {
      usage_count: usages?.length || 0,
      avg_match_rate: 0,
      avg_confidence: 0,
      avg_extraction_time_ms: 0,
      error_rate: 0,
      recent_uses: usages?.slice(0, 10) || [],
    };

    if (usages && usages.length > 0) {
      const validMatchRates = usages.filter((u: any) => u.match_rate !== null);
      const validConfidences = usages.filter((u: any) => u.avg_confidence !== null);
      const validTimes = usages.filter((u: any) => u.extraction_time_ms !== null);
      const errors = usages.filter((u: any) => u.had_errors);

      stats.avg_match_rate = validMatchRates.length > 0
        ? validMatchRates.reduce((sum: number, u: any) => sum + (u.match_rate || 0), 0) / validMatchRates.length
        : 0;

      stats.avg_confidence = validConfidences.length > 0
        ? validConfidences.reduce((sum: number, u: any) => sum + (u.avg_confidence || 0), 0) / validConfidences.length
        : 0;

      stats.avg_extraction_time_ms = validTimes.length > 0
        ? validTimes.reduce((sum: number, u: any) => sum + (u.extraction_time_ms || 0), 0) / validTimes.length
        : 0;

      stats.error_rate = (errors.length / usages.length) * 100;
    }

    return stats;
  } catch (error) {
    console.error('getTemplatePerformance error:', error);
    throw error;
  }
}

/**
 * Find best template for document
 */
export async function findBestTemplate(
  documentType: string,
  supplierId?: string
): Promise<DocumentTemplate | null> {
  try {
    let query = (supabaseAdmin
      .from('document_templates') as any)
      .select('*')
      .eq('document_type', documentType)
      .eq('is_active', true)
      .order('match_rate', { ascending: false })
      .order('usage_count', { ascending: false });

    // Prefer supplier-specific templates
    if (supplierId) {
      const { data: supplierTemplate } = await query
        .eq('supplier_id', supplierId)
        .limit(1)
        .single();

      if (supplierTemplate) {
        return supplierTemplate;
      }
    }

    // Fall back to generic template
    const { data: genericTemplate } = await query
      .eq('is_generic', true)
      .limit(1)
      .single();

    return genericTemplate || null;
  } catch (error) {
    console.error('findBestTemplate error:', error);
    return null;
  }
}

/**
 * Upload template sample file
 */
export async function uploadTemplateSample(
  file: File,
  templateName: string
): Promise<string> {
  try {
    const timestamp = Date.now();
    const fileName = `${templateName.replace(/[^a-z0-9]/gi, '_')}_${timestamp}_${file.name}`;
    const filePath = `templates/${fileName}`;

    const { data, error } = await supabaseAdmin.storage
      .from('documents')
      .upload(filePath, file);

    if (error) {
      console.error('Error uploading template sample:', error);
      throw error;
    }

    return data.path;
  } catch (error) {
    console.error('uploadTemplateSample error:', error);
    throw error;
  }
}

/**
 * Get signed URL for template sample file
 */
export async function getTemplateSampleUrl(filePath: string): Promise<string> {
  try {
    const { data, error } = await supabaseAdmin.storage
      .from('documents')
      .createSignedUrl(filePath, 3600); // 1 hour expiry

    if (error) {
      console.error('Error getting template sample URL:', error);
      throw error;
    }

    return data.signedUrl;
  } catch (error) {
    console.error('getTemplateSampleUrl error:', error);
    throw error;
  }
}
