import { supabase } from './supabaseClient';

export interface UserPermissions {
  role: string;
  permissions: string[];
}

export async function getUserPermissions(): Promise<UserPermissions | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: userData } = await supabase
    .from('users')
    .select('role')
    .eq('account_id', user.id)
    .single();

  const { data: permissions } = await supabase
    .from('user_permissions')
    .select('permission_key')
    .eq('user_id', user.id)
    .is('revoked_at', null);

  return {
    role: userData?.role || '',
    permissions: permissions?.map(p => p.permission_key) || []
  };
}

export function canAccessInvoicing(permissions: UserPermissions | null): boolean {
  if (!permissions) return false;
  return permissions.role === 'director' ||
         permissions.permissions.includes('invoice_schedule');
}

export function canEditInvoices(permissions: UserPermissions | null): boolean {
  if (!permissions) return false;
  return permissions.role === 'director' ||
         permissions.permissions.includes('invoice_edit');
}

export async function checkInvoiceAccess(): Promise<boolean> {
  const { data } = await supabase
    .rpc('can_access_invoicing', { p_user_id: (await supabase.auth.getUser()).data.user?.id });

  return data === true;
}