// BHIT POD Manager - TypeScript Types (Production)
// NO WhatsApp features

export type PODStatus =
  | 'pending'
  | 'parsing'
  | 'needs_review'
  | 'approved'
  | 'rejected';

export type VehicleType = 'luton' | '7.5t' | 'artic' | 'van' | 'sprinter' | 'other';
export type UploadSource = 'email' | 'mobile_app' | 'web_dashboard';
export type ChangeType = 'initial_parse' | 'manual_correction' | 'reparse' | 'field_update' | 'status_change' | 'approval' | 'rejection';
export type EditReason = 'ai_low_confidence' | 'user_correction' | 'missing_data' | 'validation_failed';
export type AccessType = 'view' | 'download' | 'edit' | 'approve' | 'reject' | 'delete';
export type SupplierType = 'subcontractor' | 'supplier' | 'haulier';

export interface PODItem {
  product: string;
  quantity: number;
  unit?: string;
  notes?: string;
}

export interface SupplierContact {
  name: string;
  phone?: string;
  email?: string;
  role?: string;
}

export interface ConfidenceScores {
  overall?: number;
  sales_order_ref?: number;
  delivery_date?: number;
  delivery_time?: number;
  recipient_name?: number;
  delivery_address?: number;
  vehicle_type?: number;
  vehicle_registrations?: number;
  driver_names?: number;
  items_delivered?: number;
  [key: string]: number | undefined;
}

export interface Supplier {
  id: string;
  name: string;
  type: SupplierType | null;
  primary_contact_name: string | null;
  primary_email: string | null;
  primary_phone: string | null;
  address_line_1: string | null;
  address_line_2: string | null;
  city: string | null;
  postcode: string | null;
  country: string;
  contacts: SupplierContact[];
  active: boolean;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  notes: string | null;
}

export interface DeliveryPOD {
  id: string;
  created_at: string;
  updated_at: string;
  upload_source: UploadSource | null;
  uploaded_by: string | null;
  original_sender: string | null;
  original_filename: string;
  file_path: string;
  file_hash: string;
  file_size_bytes: number;
  mime_type: string;
  dropbox_path: string | null;
  dropbox_synced_at: string | null;
  dropbox_file_id: string | null;
  supplier_id: string | null;
  job_id: string | null;
  client_id: string | null;
  invoice_id: string | null;
  sales_order_ref: string | null;
  delivery_date: string | null;
  delivery_time: string | null;
  recipient_name: string | null;
  recipient_signature_path: string | null;
  delivery_address: string | null;
  items_delivered: PODItem[];
  vehicle_type: VehicleType | null;
  vehicle_count: number;
  vehicle_registrations: string[] | null;
  driver_names: string[] | null;
  current_version: number;
  ai_model_version: string | null;
  confidence_scores: ConfidenceScores | null;
  parsing_completed_at: string | null;
  status: PODStatus;
  approved_by: string | null;
  approved_at: string | null;
  rejected_by: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  validation_flags: string[];
  deleted_at: string | null;
  deleted_by: string | null;
}

export interface PODVersion {
  id: string;
  pod_id: string;
  version_number: number;
  created_at: string;
  created_by: string | null;
  change_type: ChangeType;
  data: DeliveryPOD;
  changed_fields: string[] | null;
  change_reason: string | null;
  ai_model_version: string | null;
  confidence_scores: ConfidenceScores | null;
}

export interface PODEditHistory {
  id: string;
  pod_id: string;
  version_id: string | null;
  edited_at: string;
  edited_by: string | null;
  field_name: string;
  old_value: string | null;
  new_value: string | null;
  confidence_before: number | null;
  confidence_after: number | null;
  edit_reason: EditReason | null;
  ip_address: string | null;
  user_agent: string | null;
}

export interface PODAccessLog {
  id: string;
  pod_id: string;
  accessed_at: string;
  accessed_by: string | null;
  access_type: AccessType;
  ip_address: string | null;
  user_agent: string | null;
}

export interface PODStatistics {
  pending_count: number;
  needs_review_count: number;
  approved_count: number;
  rejected_count: number;
  avg_confidence: number | null;
  missing_date_count: number;
  backed_up_count: number;
  total_count: number;
}

export interface PODNeedingReview extends DeliveryPOD {
  supplier_name: string | null;
  overall_confidence: number;
}
export interface CreatePODRequest {
  sales_order_ref?: string;
  delivery_date?: string;
  delivery_time?: string;
  recipient_name?: string;
  delivery_address?: string;
  vehicle_type?: VehicleType;
  vehicle_count?: number;
  vehicle_registrations?: string[];
  driver_names?: string[];
  items_delivered?: PODItem[];
}


export interface UpdatePODRequest {
  sales_order_ref?: string;
  delivery_date?: string;
  delivery_time?: string;
  recipient_name?: string;
  delivery_address?: string;
  vehicle_type?: VehicleType;
  vehicle_count?: number;
  vehicle_registrations?: string[];
  driver_names?: string[];
  items_delivered?: PODItem[];
  change_reason?: string;
}

export interface ApprovePODRequest {
  notes?: string;
}

export interface RejectPODRequest {
  reason: string;
}

export interface SearchPODsRequest {
  query?: string;
  status?: PODStatus | PODStatus[];
  supplier_id?: string;
  date_from?: string;
  date_to?: string;
  limit?: number;
  offset?: number;
}

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PODListResponse {
  pods: DeliveryPOD[];
  total: number;
  limit: number;
  offset: number;
}

export interface PODDetailResponse {
  pod: DeliveryPOD;
  file_url: string;
  versions: PODVersion[];
  supplier?: Supplier;
}

export interface ParsedPODData {
  sales_order_ref?: string;
  delivery_date?: string;
  delivery_time?: string;
  recipient_name?: string;
  delivery_address?: string;
  vehicle_type?: VehicleType;
  vehicle_count?: number;
  vehicle_registrations?: string[];
  driver_names?: string[];
  items_delivered?: PODItem[];
  confidence_scores: ConfidenceScores;
  validation_flags: string[];
  raw_extracted_text?: string;
}
