// =====================================================
// BHIT POD Manager - TypeScript Type Definitions
// Matching database schema exactly
// =====================================================

// =====================================================
// ENUMS
// =====================================================

export type PODStatus =
  | 'pending'               // Uploaded, parsing not started
  | 'parsing'              // AI parsing in progress
  | 'needs_review'         // Low confidence or validation issues
  | 'approved'             // Approved for payment
  | 'rejected'             // Rejected, won't pay
  | 'whatsapp_requested'   // Requested clearer POD via WhatsApp
  | 'replacement_required' // Waiting for replacement POD
  | 'payment_held';        // Approved but payment on hold

export type VehicleType =
  | 'luton'
  | '7.5t'
  | 'artic'
  | 'van'
  | 'sprinter'
  | 'other';

export type UploadSource =
  | 'email'
  | 'mobile_app'
  | 'web_dashboard'
  | 'whatsapp';

export type ChangeType =
  | 'initial_parse'
  | 'manual_correction'
  | 'reparse'
  | 'field_update'
  | 'status_change'
  | 'approval'
  | 'rejection';

export type EditReason =
  | 'ai_low_confidence'
  | 'user_correction'
  | 'missing_data'
  | 'validation_failed'
  | 'supplier_update';

export type AccessType =
  | 'view'
  | 'download'
  | 'edit'
  | 'approve'
  | 'reject'
  | 'delete';

export type BackupType =
  | 'dropbox'
  | 'supabase_storage'
  | 's3';

export type BackupStatus =
  | 'pending'
  | 'success'
  | 'failed';

export type IssueType =
  | 'signature_unclear'
  | 'signature_missing'
  | 'date_missing'
  | 'poor_quality'
  | 'vehicle_missing'
  | 'items_not_visible'
  | 'custom';

export type SupplierType =
  | 'subcontractor'
  | 'supplier'
  | 'haulier';

// =====================================================
// SUB-TYPES
// =====================================================

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
  whatsapp_number?: string;
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

// =====================================================
// MAIN ENTITIES
// =====================================================

export interface Supplier {
  id: string;
  name: string;
  type: SupplierType | null;
  primary_contact_name: string | null;
  primary_email: string | null;
  primary_phone: string | null;
  whatsapp_enabled: boolean;
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

  // Upload metadata
  upload_source: UploadSource | null;
  uploaded_by: string | null;
  original_sender: string | null;
  original_filename: string;

  // File storage
  file_path: string;
  file_hash: string;
  file_size_bytes: number;
  mime_type: string;

  // Dropbox backup
  dropbox_path: string | null;
  dropbox_synced_at: string | null;
  dropbox_file_id: string | null;

  // Relationships
  supplier_id: string | null;
  job_id: string | null;
  client_id: string | null;
  invoice_id: string | null;

  // Parsed delivery data
  sales_order_ref: string | null;
  delivery_date: string | null;
  delivery_time: string | null;
  recipient_name: string | null;
  recipient_signature_path: string | null;
  delivery_address: string | null;
  items_delivered: PODItem[];

  // Vehicle info
  vehicle_type: VehicleType | null;
  vehicle_count: number;
  vehicle_registrations: string[] | null;
  driver_names: string[] | null;

  // AI parsing metadata
  current_version: number;
  ai_model_version: string | null;
  confidence_scores: ConfidenceScores | null;
  parsing_completed_at: string | null;

  // Status and approval
  status: PODStatus;
  approved_by: string | null;
  approved_at: string | null;
  rejected_by: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;

  // Validation flags
  validation_flags: string[];

  // Soft delete
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
  data: DeliveryPOD; // Full snapshot
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
  client_access: boolean;
}

export interface PODBackupStatus {
  id: string;
  pod_id: string;
  backup_type: BackupType;
  backup_path: string;
  backed_up_at: string;
  verified_at: string | null;
  verification_hash: string | null;
  backup_size_bytes: number | null;
  status: BackupStatus;
  error_message: string | null;
}

export interface PODWhatsAppRequest {
  id: string;
  pod_id: string;
  requested_at: string;
  requested_by: string | null;
  supplier_id: string | null;
  phone_number: string;
  contact_name: string | null;
  message_template: string;
  message_sent: string;
  issue_type: IssueType;
  response_received_at: string | null;
  replacement_pod_id: string | null;
  escalated: boolean;
  escalated_at: string | null;
  escalation_reason: string | null;
  reminder_sent_at: string | null;
  reminder_count: number;
}

// =====================================================
// VIEW TYPES (from database views)
// =====================================================

export interface PODStatistics {
  pending_count: number;
  needs_review_count: number;
  approved_count: number;
  rejected_count: number;
  whatsapp_requested_count: number;
  avg_confidence: number | null;
  missing_date_count: number;
  backed_up_count: number;
}

export interface PODNeedingReview extends DeliveryPOD {
  supplier_name: string | null;
  overall_confidence: number;
}

export interface RecentPODActivity extends DeliveryPOD {
  supplier_name: string | null;
  uploaded_by_email: string | null;
  overall_confidence: number;
  needs_review: boolean;
}

// =====================================================
// REQUEST/RESPONSE TYPES (for API)
// =====================================================

export interface CreatePODRequest {
  file: File;
  upload_source?: UploadSource;
  original_sender?: string;
  supplier_id?: string;
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

export interface SendWhatsAppRequest {
  pod_id: string;
  phone_number: string;
  contact_name?: string;
  issue_type: IssueType;
  custom_message?: string;
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

// =====================================================
// API RESPONSE TYPES
// =====================================================

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

export interface WhatsAppLinkResponse {
  whatsapp_link: string;
  request_id: string;
  message: string;
}

// =====================================================
// PARSED POD DATA (from AI)
// =====================================================

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

// =====================================================
// UI COMPONENT TYPES
// =====================================================

export interface PODCardProps {
  pod: DeliveryPOD | PODNeedingReview | RecentPODActivity;
  onClick?: () => void;
  showConfidence?: boolean;
  compact?: boolean;
}

export interface ConfidenceIndicatorProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export interface ValidationFlagProps {
  flags: string[];
  maxVisible?: number;
}

// =====================================================
// WHATSAPP MESSAGE TEMPLATES
// =====================================================

export const WHATSAPP_TEMPLATES: Record<IssueType, string> = {
  signature_unclear: "Hi {contact_name}, we've received your POD for {sales_order_ref} but the signature is unclear. Could you please send a clearer photo? Thanks, BHIT Team",
  signature_missing: "Hi {contact_name}, we've received your POD for {sales_order_ref} but there's no signature. Could you please send a signed copy? Thanks, BHIT Team",
  date_missing: "Hi {contact_name}, we've received your POD for {sales_order_ref} but the delivery date is missing. Could you please confirm the date? Thanks, BHIT Team",
  poor_quality: "Hi {contact_name}, we've received your POD for {sales_order_ref} but the image quality is too low to read. Could you please send a clearer photo? Thanks, BHIT Team",
  vehicle_missing: "Hi {contact_name}, we've received your POD for {sales_order_ref} but vehicle details are missing. Could you please provide this information? Thanks, BHIT Team",
  items_not_visible: "Hi {contact_name}, we've received your POD for {sales_order_ref} but the items list isn't visible. Could you please send a clearer photo? Thanks, BHIT Team",
  custom: "{custom_message}"
};

// =====================================================
// HELPER TYPES
// =====================================================

export type PODWithSupplier = DeliveryPOD & {
  supplier?: Supplier;
};

export type PODWithConfidence = DeliveryPOD & {
  overall_confidence: number;
};

// Export everything
export default {
  WHATSAPP_TEMPLATES
};
