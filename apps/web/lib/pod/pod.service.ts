// POD Service - Core business logic for POD operations
import { supabaseAdmin } from '../supabaseAdmin';
import { supabase } from '../supabaseClient';
import type {
  DeliveryPOD,
  PODVersion, 
  UpdatePODRequest,
  PODStatistics,
  PODNeedingReview,
  PODDetailResponse,
  SearchPODsRequest,
  PODListResponse
} from './types';
 
import crypto from 'crypto';

export class PODService {
  /**
   * Create new POD record
   */
  static async create(data: {
    file: File;
    filePath: string;
    fileHash: string;
    uploadSource?: string;
    originalSender?: string;
    supplierId?: string;
    uploadedBy: string;
  }) {
    // Note: - delivery_pods table exists in DB but not in generated types
    const { data: pod, error } = await (supabaseAdmin
      .from('delivery_pods') as any)
      .insert({
        original_filename: data.file.name,
        file_path: data.filePath,
        file_hash: data.fileHash,
        file_size_bytes: data.file.size,
        mime_type: data.file.type,
        upload_source: data.uploadSource || 'web_dashboard',
        original_sender: data.originalSender,
        supplier_id: data.supplierId,
        uploaded_by: data.uploadedBy,
        status: 'pending'
      })
      .select()
      .single();

    if (error) throw error;
    return pod as DeliveryPOD;
  }

  /**
   * Get POD by ID with file URL
   */
  static async getById(id: string): Promise<PODDetailResponse> {
    // Get POD
    // Note: - delivery_pods table exists in DB but not in generated types
    const { data: pod, error: podError } = await (supabaseAdmin
      .from('delivery_pods') as any)
      .select(`
        *,
        supplier:suppliers(*)
      `)
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (podError) throw podError;

    // Get signed URL for file
    const { data: urlData } = await supabaseAdmin
      .storage
      .from('pods')
      .createSignedUrl(pod.file_path, 3600); // 1 hour

    // Get version history
    // Note: - pod_versions table exists in DB but not in generated types
    const { data: versions } = await supabaseAdmin
      .from('pod_versions')
      .select('*')
      .eq('pod_id', id)
      .order('version_number', { ascending: false });

    return {
      pod: pod as DeliveryPOD,
      file_url: urlData?.signedUrl || '',
      versions: (versions || []) as PODVersion[],
      supplier: pod.supplier
    };
  }

  /**
   * Update POD data
   */
  static async update(id: string, updates: UpdatePODRequest) {
    // Note: - delivery_pods table exists in DB but not in generated types
    const { data, error } = await (supabaseAdmin
      .from('delivery_pods') as any)
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as DeliveryPOD;
  }

  /**
   * Approve POD
   */
  static async approve(id: string, userId: string, notes?: string) {
    // Note: - delivery_pods table exists in DB but not in generated types
    const { data, error } = await (supabaseAdmin
      .from('delivery_pods') as any)
      .update({
        status: 'approved',
        approved_by: userId,
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as DeliveryPOD;
  }

  /**
   * Reject POD
   */
  static async reject(id: string, userId: string, reason: string) {
    // Note: - delivery_pods table exists in DB but not in generated types
    const { data, error } = await (supabaseAdmin
      .from('delivery_pods') as any)
      .update({
        status: 'rejected',
        rejected_by: userId,
        rejected_at: new Date().toISOString(),
        rejection_reason: reason,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as DeliveryPOD;
  }

  /**
   * Get PODs needing review
   */
  static async getReviewQueue(): Promise<PODNeedingReview[]> {
    // Note: - pods_needing_review view exists in DB but not in generated types
    const { data, error } = await supabaseAdmin
      .from('pods_needing_review')
      .select('*')
      .limit(100);

    if (error) throw error;
    return data as PODNeedingReview[];
  }

  /**
   * Get statistics
   */
  static async getStatistics(): Promise<PODStatistics> {
    // Note: - pod_statistics view exists in DB but not in generated types
    const { data, error } = await supabaseAdmin
      .from('pod_statistics')
      .select('*')
      .single();

    if (error) throw error;
    return data as PODStatistics;
  }

  /**
   * Search/filter PODs
   */
  static async search(params: SearchPODsRequest): Promise<PODListResponse> {
    // Note: - delivery_pods table exists in DB but not in generated types
    let query = supabaseAdmin
      .from('delivery_pods')
      .select('*, supplier:suppliers(name)', { count: 'exact' })
      .is('deleted_at', null);

    // Apply filters
    if (params.status) {
      const statuses = Array.isArray(params.status) ? params.status : [params.status];
      query = query.in('status', statuses);
    }

    if (params.supplier_id) {
      query = query.eq('supplier_id', params.supplier_id);
    }

    if (params.date_from) {
      query = query.gte('delivery_date', params.date_from);
    }

    if (params.date_to) {
      query = query.lte('delivery_date', params.date_to);
    }

    if (params.query) {
      query = query.or(`sales_order_ref.ilike.%${params.query}%,recipient_name.ilike.%${params.query}%`);
    }

    // Pagination
    const limit = params.limit || 50;
    const offset = params.offset || 0;

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;

    return {
      pods: data as DeliveryPOD[],
      total: count || 0,
      limit,
      offset
    };
  }

  /**
   * Get recent activity
   */
  static async getRecentActivity(limit = 20) {
    // Note: - recent_pod_activity view exists in DB but not in generated types
    const { data, error } = await supabaseAdmin
      .from('recent_pod_activity')
      .select('*')
      .limit(limit);

    if (error) throw error;
    return data;
  }

  /**
   * Soft delete POD
   */
  static async delete(id: string, userId: string) {
    // Note: - delivery_pods table exists in DB but not in generated types
    const { error } = await (supabaseAdmin
      .from('delivery_pods') as any)
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by: userId
      })
      .eq('id', id);

    if (error) throw error;
    return { success: true };
  }

  /**
   * Generate file hash
   */
  static async generateFileHash(file: File): Promise<string> {
    const buffer = await file.arrayBuffer();
    const hash = crypto.createHash('sha256');
    hash.update(Buffer.from(buffer));
    return hash.digest('hex');
  }

  /**
   * Upload file to Supabase Storage
   */
  static async uploadFile(file: File, userId: string): Promise<string> {
    const timestamp = Date.now();
    const fileName = `${timestamp}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const filePath = `${userId}/${fileName}`;

    const { error } = await supabaseAdmin.storage
      .from('pods')
      .upload(filePath, file, {
        contentType: file.type,
        upsert: false
      });

    if (error) throw error;
    return filePath;
  }
}
