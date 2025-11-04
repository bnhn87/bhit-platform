/**
 * Supabase-related type definitions
 */

export interface UserPermissions {
  can_create_jobs?: boolean;
  can_edit_jobs?: boolean;
  can_delete_jobs?: boolean;
  can_hard_delete_jobs?: boolean;
  can_view_costs?: boolean;
  can_edit_costs?: boolean;
  can_view_invoices?: boolean;
  can_create_invoices?: boolean;
  can_edit_invoices?: boolean;
  can_manage_users?: boolean;
  can_edit_org_settings?: boolean;
  can_view_reports?: boolean;
  can_export_data?: boolean;
}

export interface UserProfile {
  id: string;
  email: string;
  role?: string;
  full_name?: string;
  created_at?: string;
  updated_at?: string;
}

export interface AuthUserMetadata {
  full_name?: string;
  permissions?: UserPermissions;
  [key: string]: unknown;
}

export interface AuthUser {
  id: string;
  email?: string;
  user_metadata?: AuthUserMetadata;
  last_sign_in_at?: string;
  banned_until?: string;
  [key: string]: unknown;
}

export interface EnrichedUserProfile extends UserProfile, UserPermissions {
  is_active: boolean;
  last_sign_in_at?: string | null;
  full_name: string;
}

export interface SupabaseError {
  message: string;
  details?: string;
  hint?: string;
  code?: string;
}

export interface DatabaseResponse<T> {
  data: T | null;
  error: SupabaseError | null;
}
