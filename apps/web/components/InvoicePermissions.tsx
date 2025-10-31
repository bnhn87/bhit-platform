import React, { useState, useEffect, useCallback } from 'react';

import { supabase } from '@/lib/supabaseClient';
import { theme } from '@/lib/theme';

interface User {
  id: string;
  email: string;
  role: string;
}

interface InvoicePermissionsProps {
  isDirector: boolean;
  accountId: string;
}

export function InvoicePermissions({ isDirector, accountId }: InvoicePermissionsProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [permissions, setPermissions] = useState<Map<string, boolean>>(new Map());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);

      // Get all non-director users
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, email, role')
        .eq('account_id', accountId)
        .neq('role', 'director');

      if (usersError) throw usersError;

      setUsers(usersData || []);

      // Check existing permissions
      const { data: perms, error: permsError } = await supabase
        .from('user_permissions')
        .select('user_id')
        .eq('permission_key', 'invoice_schedule')
        .is('revoked_at', null);

      if (permsError) throw permsError;

      const permMap = new Map();
      perms?.forEach(p => permMap.set(p.user_id, true));
      setPermissions(permMap);
    } catch (error) {
      console.error('Error loading users:', error);
      setMessage('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [accountId]);

  useEffect(() => {
    if (isDirector) {
      loadUsers();
    }
  }, [isDirector, loadUsers]);

  async function togglePermission(userId: string, grant: boolean) {
    setSaving(true);
    setMessage(null);

    try {
      if (grant) {
        const { error } = await supabase.rpc('grant_permission', {
          p_target_user_id: userId,
          p_permission: 'invoice_schedule'
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.rpc('revoke_permission', {
          p_target_user_id: userId,
          p_permission: 'invoice_schedule'
        });
        if (error) throw error;
      }

      // Update local state
      const newPermissions = new Map(permissions);
      newPermissions.set(userId, grant);
      setPermissions(newPermissions);

      setMessage(grant ? 'Permission granted successfully' : 'Permission revoked successfully');
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error('Error updating permission:', error);
      setMessage('Failed to update permission');
    } finally {
      setSaving(false);
    }
  }

  if (!isDirector) {
    return (
      <div style={{ padding: 16, opacity: 0.6 }}>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>Invoice Schedule Permissions</div>
        <div style={{ fontSize: 12, color: theme.colors.textSubtle }}>
          Only Directors can manage invoice permissions
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ padding: 16 }}>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>Invoice Schedule Permissions</div>
        <div style={{ fontSize: 12, color: theme.colors.textSubtle }}>Loading...</div>
      </div>
    );
  }

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ fontWeight: 600 }}>Invoice Schedule Permissions</div>
      </div>
      <div style={{ fontSize: 12, color: theme.colors.textSubtle, marginBottom: 16 }}>
        Grant users access to create and manage invoice schedules
      </div>

      {users.length === 0 ? (
        <div style={{ fontSize: 12, color: theme.colors.textSubtle }}>
          No non-director users found
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 12 }}>
          {users.map(user => (
            <div
              key={user.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: 12,
                background: '#111823',
                border: `1px solid ${theme.colors.border}`,
                borderRadius: 8
              }}
            >
              <div>
                <div style={{ fontWeight: 500, color: theme.colors.text }}>
                  {user.email}
                </div>
                <div style={{ fontSize: 12, color: theme.colors.textSubtle, textTransform: 'capitalize' }}>
                  {user.role}
                </div>
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={permissions.get(user.id) || false}
                  onChange={e => togglePermission(user.id, e.target.checked)}
                  disabled={saving}
                  style={{
                    width: 16,
                    height: 16,
                    accentColor: theme.colors.accent
                  }}
                />
                <span style={{ fontSize: 12, color: theme.colors.text }}>
                  Can Access Invoicing
                </span>
              </label>
            </div>
          ))}
        </div>
      )}

      {message && (
        <div
          style={{
            marginTop: 12,
            padding: 8,
            background: message.includes('Failed') ? '#dc2626' : theme.colors.accent,
            color: 'white',
            borderRadius: 6,
            fontSize: 12
          }}
        >
          {message}
        </div>
      )}
    </div>
  );
}