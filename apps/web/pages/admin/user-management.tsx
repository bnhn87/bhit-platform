import { useState, useEffect } from 'react';
import { useRequireAuth } from '@/hooks/useRequireAuth';
import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/lib/supabaseClient';

interface User {
  id: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at: string;
  full_name?: string;
  last_sign_in_at?: string;
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

export default function UserManagement() {
  useRequireAuth();
  const { role, loading: roleLoading } = useUserRole();

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [showViewPermissionsModal, setShowViewPermissionsModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingPermissions, setEditingPermissions] = useState<Partial<User>>({});

  // Form states
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    full_name: '',
    role: 'user'
  });

  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    if (role && !roleLoading) {
      // Allow both 'admin' and 'director' roles
      if (role === 'admin' || role === 'director') {
        fetchUsers();
      } else {
        setLoading(false);
      }
    }
  }, [role, roleLoading]);

  const fetchUsers = async () => {
    try {
      setLoading(true);

      // Get current session
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setError('Not authenticated');
        setLoading(false);
        return;
      }

      const response = await fetch('/api/admin/users/list', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      const data = await response.json();

      if (data.success) {
        setUsers(data.users);
      } else {
        setError(data.error || 'Failed to fetch users');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      // Get current session
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setError('Not authenticated');
        return;
      }

      const response = await fetch('/api/admin/users/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          email: newUser.email,
          password: newUser.password,
          full_name: newUser.full_name,
          role: newUser.role
        })
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('User created successfully!');
        setShowCreateModal(false);
        setNewUser({ email: '', password: '', full_name: '', role: 'user' });
        fetchUsers();
      } else {
        setError(data.error || 'Failed to create user');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create user');
      console.error('Create user error:', err);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!selectedUser) return;

    try {
      // Get current session
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setError('Not authenticated');
        return;
      }

      const response = await fetch('/api/admin/users/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          user_id: selectedUser.id,
          new_password: newPassword
        })
      });

      const data = await response.json();

      if (data.success) {
        setSuccess('Password reset successfully!');
        setShowResetPasswordModal(false);
        setNewPassword('');
        setSelectedUser(null);
      } else {
        setError(data.error || 'Failed to reset password');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to reset password');
    }
  };

  const handleToggleActive = async (user: User) => {
    try {
      setError('');
      setSuccess('');

      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setError('Not authenticated');
        return;
      }

      const newStatus = !user.is_active;

      const response = await fetch('/api/admin/users/toggle-active', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          user_id: user.id,
          is_active: newStatus
        })
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(`User ${newStatus ? 'activated' : 'deactivated'} successfully!`);
        fetchUsers();
      } else {
        setError(data.error || 'Failed to toggle user status');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to toggle user status');
    }
  };

  const handleSavePermissions = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!selectedUser) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.access_token) {
        setError('Not authenticated');
        return;
      }

      console.log('Saving permissions for user:', selectedUser.id, editingPermissions);

      const response = await fetch('/api/admin/users/update-permissions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          user_id: selectedUser.id,
          permissions: {
            can_create_jobs: editingPermissions.can_create_jobs ?? false,
            can_edit_jobs: editingPermissions.can_edit_jobs ?? false,
            can_delete_jobs: editingPermissions.can_delete_jobs ?? false,
            can_hard_delete_jobs: editingPermissions.can_hard_delete_jobs ?? false,
            can_view_costs: editingPermissions.can_view_costs ?? false,
            can_edit_costs: editingPermissions.can_edit_costs ?? false,
            can_view_invoices: editingPermissions.can_view_invoices ?? false,
            can_create_invoices: editingPermissions.can_create_invoices ?? false,
            can_edit_invoices: editingPermissions.can_edit_invoices ?? false,
            can_manage_users: editingPermissions.can_manage_users ?? false,
            can_edit_org_settings: editingPermissions.can_edit_org_settings ?? false,
            can_view_reports: editingPermissions.can_view_reports ?? false,
            can_export_data: editingPermissions.can_export_data ?? false
          }
        })
      });

      console.log('Response status:', response.status);
      const data = await response.json();
      console.log('Response data:', data);

      if (data.success) {
        setSuccess('Permissions updated successfully!');
        // Close modal after showing success message
        setTimeout(() => {
          setShowPermissionsModal(false);
          setEditingPermissions({});
          setSelectedUser(null);
          fetchUsers();
        }, 1500);
      } else {
        setError(data.error || 'Failed to update permissions');
        console.error('Permission update failed:', data);
      }
    } catch (err: any) {
      console.error('Exception saving permissions:', err);
      setError(err.message || 'Failed to update permissions');
    }
  };

  if (roleLoading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '80vh',
        color: '#e8eef6'
      }}>
        <div style={{ fontSize: '1.25rem' }}>Loading...</div>
      </div>
    );
  }

  if (role !== 'admin' && role !== 'director') {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '80vh',
        color: '#ff6b6b'
      }}>
        <div style={{ fontSize: '1.25rem' }}>
          Access Denied: Admin or Director privileges required
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '2rem'
      }}>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 'bold', color: '#e8eef6', margin: 0 }}>
          User Management
        </h1>
        <button
          onClick={() => setShowCreateModal(true)}
          style={{
            padding: '0.75rem 1.5rem',
            background: '#1d91ff',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '0.875rem'
          }}
        >
          Create New User
        </button>
      </div>

      {error && (
        <div style={{
          marginBottom: '1rem',
          padding: '1rem',
          background: '#2b1a1a',
          border: '1px solid #ff6b6b',
          borderRadius: '8px',
          color: '#ff6b6b'
        }}>
          {error}
        </div>
      )}

      {success && (
        <div style={{
          marginBottom: '1rem',
          padding: '1rem',
          background: '#1a2b1a',
          border: '1px solid #4ade80',
          borderRadius: '8px',
          color: '#4ade80'
        }}>
          {success}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: '#8b949e' }}>
          Loading users...
        </div>
      ) : (
        <div style={{
          background: '#0f151c',
          border: '1px solid #1d2733',
          borderRadius: '12px',
          overflow: 'hidden'
        }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#14202b', borderBottom: '1px solid #1d2733' }}>
                  <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: '#8b949e', textTransform: 'uppercase' }}>Name</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: '#8b949e', textTransform: 'uppercase' }}>Email</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: '#8b949e', textTransform: 'uppercase' }}>Role</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: '#8b949e', textTransform: 'uppercase' }}>Status</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: '#8b949e', textTransform: 'uppercase' }}>Last Login</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: '#8b949e', textTransform: 'uppercase' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} style={{ borderBottom: '1px solid #1d2733' }}>
                    <td style={{ padding: '1rem', color: '#e8eef6', fontSize: '0.875rem', fontWeight: 500 }}>
                      {user.full_name}
                    </td>
                    <td style={{ padding: '1rem', color: '#8b949e', fontSize: '0.875rem' }}>
                      {user.email}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{
                        padding: '0.25rem 0.75rem',
                        borderRadius: '999px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        background: user.role?.toLowerCase() === 'admin' || user.role?.toLowerCase() === 'director' ? '#2d1b4e' :
                                   user.role?.toLowerCase() === 'manager' ? '#1a3854' :
                                   user.role?.toLowerCase() === 'installer' ? '#1a3d2e' : '#1d2733',
                        color: user.role?.toLowerCase() === 'admin' || user.role?.toLowerCase() === 'director' ? '#c084fc' :
                               user.role?.toLowerCase() === 'manager' ? '#60a5fa' :
                               user.role?.toLowerCase() === 'installer' ? '#4ade80' : '#8b949e'
                      }}>
                        {user.role}
                      </span>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{
                        padding: '0.25rem 0.75rem',
                        borderRadius: '999px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        background: user.is_active ? '#1a3d2e' : '#2b1a1a',
                        color: user.is_active ? '#4ade80' : '#ff6b6b'
                      }}>
                        {user.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', color: '#8b949e', fontSize: '0.875rem' }}>
                      {user.last_sign_in_at
                        ? new Date(user.last_sign_in_at).toLocaleDateString()
                        : 'Never'}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setShowViewPermissionsModal(true);
                          }}
                          style={{
                            padding: '0.5rem 1rem',
                            background: '#1a3854',
                            color: '#60a5fa',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '0.75rem',
                            fontWeight: 600
                          }}
                        >
                          View Permissions
                        </button>
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setEditingPermissions({
                              can_create_jobs: user.can_create_jobs,
                              can_edit_jobs: user.can_edit_jobs,
                              can_delete_jobs: user.can_delete_jobs,
                              can_view_costs: user.can_view_costs,
                              can_edit_costs: user.can_edit_costs,
                              can_view_invoices: user.can_view_invoices,
                              can_create_invoices: user.can_create_invoices,
                              can_edit_invoices: user.can_edit_invoices,
                              can_manage_users: user.can_manage_users,
                              can_edit_org_settings: user.can_edit_org_settings,
                              can_view_reports: user.can_view_reports,
                              can_export_data: user.can_export_data
                            });
                            setShowPermissionsModal(true);
                          }}
                          style={{
                            padding: '0.5rem 1rem',
                            background: '#2d1b4e',
                            color: '#c084fc',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '0.75rem',
                            fontWeight: 600
                          }}
                        >
                          Edit Permissions
                        </button>
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setShowResetPasswordModal(true);
                          }}
                          style={{
                            padding: '0.5rem 1rem',
                            background: '#1a3854',
                            color: '#60a5fa',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '0.75rem',
                            fontWeight: 600
                          }}
                        >
                          Reset Password
                        </button>
                        <button
                          onClick={() => handleToggleActive(user)}
                          style={{
                            padding: '0.5rem 1rem',
                            background: user.is_active ? '#2b1a1a' : '#1a3d2e',
                            color: user.is_active ? '#ff6b6b' : '#4ade80',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '0.75rem',
                            fontWeight: 600
                          }}
                        >
                          {user.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create User Modal */}
      {showCreateModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: '#0f151c',
            border: '1px solid #1d2733',
            borderRadius: '12px',
            padding: '2rem',
            width: '100%',
            maxWidth: '500px',
            margin: '1rem'
          }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#e8eef6', marginBottom: '1.5rem' }}>
              Create New User
            </h3>
            <form onSubmit={handleCreateUser}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#8b949e', marginBottom: '0.5rem' }}>
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: '#14202b',
                    border: '1px solid #1d2733',
                    borderRadius: '8px',
                    color: '#e8eef6',
                    fontSize: '0.875rem'
                  }}
                />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#8b949e', marginBottom: '0.5rem' }}>
                  Password (min 8 characters)
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: '#14202b',
                    border: '1px solid #1d2733',
                    borderRadius: '8px',
                    color: '#e8eef6',
                    fontSize: '0.875rem'
                  }}
                />
              </div>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#8b949e', marginBottom: '0.5rem' }}>
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={newUser.full_name}
                  onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: '#14202b',
                    border: '1px solid #1d2733',
                    borderRadius: '8px',
                    color: '#e8eef6',
                    fontSize: '0.875rem'
                  }}
                />
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#8b949e', marginBottom: '0.5rem' }}>
                  Role
                </label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: '#14202b',
                    border: '1px solid #1d2733',
                    borderRadius: '8px',
                    color: '#e8eef6',
                    fontSize: '0.875rem'
                  }}
                >
                  <option value="user">User</option>
                  <option value="installer">Installer</option>
                  <option value="manager">Manager</option>
                  <option value="director">Director</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: '#1d2733',
                    color: '#8b949e',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '0.875rem'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: '#1d91ff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '0.875rem'
                  }}
                >
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showResetPasswordModal && selectedUser && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: '#0f151c',
            border: '1px solid #1d2733',
            borderRadius: '12px',
            padding: '2rem',
            width: '100%',
            maxWidth: '500px',
            margin: '1rem'
          }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#e8eef6', marginBottom: '0.5rem' }}>
              Reset Password
            </h3>
            <p style={{ fontSize: '0.875rem', color: '#8b949e', marginBottom: '1.5rem' }}>
              for {selectedUser.full_name}
            </p>
            <form onSubmit={handleResetPassword}>
              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, color: '#8b949e', marginBottom: '0.5rem' }}>
                  New Password (min 8 characters)
                </label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    background: '#14202b',
                    border: '1px solid #1d2733',
                    borderRadius: '8px',
                    color: '#e8eef6',
                    fontSize: '0.875rem'
                  }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowResetPasswordModal(false);
                    setNewPassword('');
                    setSelectedUser(null);
                  }}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: '#1d2733',
                    color: '#8b949e',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '0.875rem'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: '#dc2626',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '0.875rem'
                  }}
                >
                  Reset Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Permissions Modal */}
      {showPermissionsModal && selectedUser && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem'
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #0f151c 0%, #14202b 100%)',
            border: '1px solid rgba(29, 144, 255, 0.2)',
            borderRadius: '16px',
            padding: '2rem',
            width: '100%',
            maxWidth: '700px',
            maxHeight: '90vh',
            overflow: 'auto',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)'
          }}>
            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#e8eef6', marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>
                🔐 Permissions
              </h3>
              <div style={{
                display: 'inline-block',
                padding: '0.5rem 1rem',
                background: 'rgba(29, 144, 255, 0.1)',
                border: '1px solid rgba(29, 144, 255, 0.3)',
                borderRadius: '8px',
                fontSize: '0.875rem',
                color: '#60a5fa'
              }}>
                {selectedUser.full_name} · {selectedUser.role}
              </div>
            </div>

            <form onSubmit={handleSavePermissions}>
              {/* Master Toggle All Permissions */}
              {(() => {
                const permissionSections = [
                  { category: '💼 Job Management', items: [
                    { key: 'can_create_jobs', label: 'Create Jobs', desc: 'Add new jobs to the system' },
                    { key: 'can_edit_jobs', label: 'Edit Jobs', desc: 'Modify existing job details' },
                    { key: 'can_delete_jobs', label: 'Delete Jobs', desc: 'Remove jobs from the system' },
                    { key: 'can_hard_delete_jobs', label: 'Hard Delete Jobs', desc: 'Permanently delete jobs (cannot be undone)' }
                  ]},
                  { category: '💰 Costs & Financial', items: [
                    { key: 'can_view_costs', label: 'View Costs', desc: 'See financial information' },
                    { key: 'can_edit_costs', label: 'Edit Costs', desc: 'Modify cost details' }
                  ]},
                  { category: '📄 Invoicing', items: [
                    { key: 'can_view_invoices', label: 'View Invoices', desc: 'Access invoice details' },
                    { key: 'can_create_invoices', label: 'Create Invoices', desc: 'Generate new invoices' },
                    { key: 'can_edit_invoices', label: 'Edit Invoices', desc: 'Modify invoice details' }
                  ]},
                  { category: '⚙️ Administration', items: [
                    { key: 'can_manage_users', label: 'Manage Users', desc: 'Add, edit, remove users' },
                    { key: 'can_edit_org_settings', label: 'Organization Settings', desc: 'Modify company settings' }
                  ]},
                  { category: '📊 Reports & Data', items: [
                    { key: 'can_view_reports', label: 'View Reports', desc: 'Access analytics and reports' },
                    { key: 'can_export_data', label: 'Export Data', desc: 'Download data exports' }
                  ]}
                ];

                const allPermissionKeys = permissionSections.flatMap(s => s.items.map(i => i.key));
                const allEnabled = allPermissionKeys.every(key => (editingPermissions as any)[key] === true);

                const toggleAllPermissions = () => {
                  const newState: any = {};
                  allPermissionKeys.forEach(key => {
                    newState[key] = !allEnabled;
                  });
                  setEditingPermissions(newState);
                };

                return (
                  <>
                    <div style={{
                      background: 'rgba(29, 144, 255, 0.08)',
                      border: '1px solid rgba(29, 144, 255, 0.3)',
                      borderRadius: '12px',
                      padding: '1rem',
                      marginBottom: '1.5rem',
                      cursor: 'pointer'
                    }}
                    onClick={toggleAllPermissions}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div>
                          <div style={{ fontSize: '1rem', fontWeight: 600, color: '#60a5fa', marginBottom: '0.25rem' }}>
                            ⚡ All Permissions
                          </div>
                          <div style={{ fontSize: '0.75rem', color: '#8b949e' }}>
                            {allEnabled ? 'Disable all permissions' : 'Enable all permissions'}
                          </div>
                        </div>
                        <div style={{
                          position: 'relative',
                          width: '56px',
                          height: '30px',
                          background: allEnabled ? '#1d90ff' : '#1d2733',
                          borderRadius: '15px',
                          transition: 'background 0.2s ease',
                          boxShadow: allEnabled ? '0 0 16px rgba(29, 144, 255, 0.5)' : 'none'
                        }}>
                          <div style={{
                            position: 'absolute',
                            top: '3px',
                            left: allEnabled ? '29px' : '3px',
                            width: '24px',
                            height: '24px',
                            background: 'white',
                            borderRadius: '50%',
                            transition: 'left 0.2s ease',
                            boxShadow: '0 2px 6px rgba(0, 0, 0, 0.4)'
                          }} />
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gap: '1.25rem', marginBottom: '2rem' }}>
                      {permissionSections.map((section, idx) => {
                        const sectionKeys = section.items.map(i => i.key);
                        const allSectionEnabled = sectionKeys.every(key => (editingPermissions as any)[key] === true);

                        const toggleSection = () => {
                          const newState: any = { ...editingPermissions };
                          sectionKeys.forEach(key => {
                            newState[key] = !allSectionEnabled;
                          });
                          setEditingPermissions(newState);
                        };

                        return (
                          <div key={idx} style={{
                            background: 'rgba(20, 32, 43, 0.4)',
                            border: '1px solid rgba(29, 39, 51, 0.6)',
                            borderRadius: '12px',
                            padding: '1.25rem'
                          }}>
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              marginBottom: '1rem',
                              cursor: 'pointer',
                              padding: '0.5rem',
                              borderRadius: '8px',
                              background: 'rgba(0, 0, 0, 0.2)'
                            }}
                            onClick={toggleSection}>
                              <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: '#c9d1d9', margin: 0 }}>
                                {section.category}
                              </h4>
                              <div style={{
                                position: 'relative',
                                width: '44px',
                                height: '24px',
                                background: allSectionEnabled ? '#1d90ff' : '#1d2733',
                                borderRadius: '12px',
                                transition: 'background 0.2s ease',
                                boxShadow: allSectionEnabled ? '0 0 10px rgba(29, 144, 255, 0.4)' : 'none'
                              }}>
                                <div style={{
                                  position: 'absolute',
                                  top: '3px',
                                  left: allSectionEnabled ? '23px' : '3px',
                                  width: '18px',
                                  height: '18px',
                                  background: 'white',
                                  borderRadius: '50%',
                                  transition: 'left 0.2s ease',
                                  boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)'
                                }} />
                              </div>
                            </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {section.items.map((item) => {
                        const isChecked = (editingPermissions as any)[item.key] ?? false;
                        return (
                          <div key={item.key} style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '0.75rem',
                            background: isChecked ? 'rgba(29, 144, 255, 0.08)' : 'rgba(0, 0, 0, 0.2)',
                            border: `1px solid ${isChecked ? 'rgba(29, 144, 255, 0.3)' : 'rgba(29, 39, 51, 0.4)'}`,
                            borderRadius: '8px',
                            transition: 'all 0.2s ease',
                            cursor: 'pointer'
                          }}
                          onClick={() => setEditingPermissions({ ...editingPermissions, [item.key]: !isChecked })}>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: '0.875rem', fontWeight: 500, color: isChecked ? '#60a5fa' : '#e8eef6', marginBottom: '0.25rem' }}>
                                {item.label}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: '#8b949e' }}>
                                {item.desc}
                              </div>
                            </div>
                            <div style={{
                              position: 'relative',
                              width: '48px',
                              height: '26px',
                              background: isChecked ? '#1d90ff' : '#1d2733',
                              borderRadius: '13px',
                              transition: 'background 0.2s ease',
                              boxShadow: isChecked ? '0 0 12px rgba(29, 144, 255, 0.4)' : 'none'
                            }}>
                              <div style={{
                                position: 'absolute',
                                top: '3px',
                                left: isChecked ? '25px' : '3px',
                                width: '20px',
                                height: '20px',
                                background: 'white',
                                borderRadius: '50%',
                                transition: 'left 0.2s ease',
                                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)'
                              }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
                    </div>
                  </>
                );
              })()}

              {/* Error/Success Messages */}
              {error && (
                <div style={{
                  padding: '1rem',
                  background: 'rgba(220, 38, 38, 0.1)',
                  border: '1px solid rgba(220, 38, 38, 0.3)',
                  borderRadius: '8px',
                  color: '#fca5a5',
                  fontSize: '0.875rem',
                  marginBottom: '1rem'
                }}>
                  ⚠️ {error}
                </div>
              )}

              {success && (
                <div style={{
                  padding: '1rem',
                  background: 'rgba(34, 197, 94, 0.1)',
                  border: '1px solid rgba(34, 197, 94, 0.3)',
                  borderRadius: '8px',
                  color: '#86efac',
                  fontSize: '0.875rem',
                  marginBottom: '1rem'
                }}>
                  ✓ {success}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowPermissionsModal(false);
                    setEditingPermissions({});
                    setSelectedUser(null);
                  }}
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: '#1d2733',
                    color: '#8b949e',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '0.875rem'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '0.75rem 1.5rem',
                    background: '#2d1b4e',
                    color: '#c084fc',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: '0.875rem'
                  }}
                >
                  Save Permissions
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Permissions Modal (Read-only) */}
      {showViewPermissionsModal && selectedUser && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem'
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #0f151c 0%, #14202b 100%)',
            border: '1px solid rgba(29, 144, 255, 0.2)',
            borderRadius: '16px',
            padding: '2rem',
            width: '100%',
            maxWidth: '600px',
            maxHeight: '90vh',
            overflow: 'auto',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)'
          }}>
            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#e8eef6', marginBottom: '0.5rem', letterSpacing: '-0.02em' }}>
                👁️ View Permissions
              </h3>
              <div style={{
                display: 'inline-block',
                padding: '0.5rem 1rem',
                background: 'rgba(29, 144, 255, 0.1)',
                border: '1px solid rgba(29, 144, 255, 0.3)',
                borderRadius: '8px',
                fontSize: '0.875rem',
                color: '#60a5fa'
              }}>
                {selectedUser.full_name} · {selectedUser.role}
              </div>
            </div>

            {(() => {
              const permissionSections = [
                { category: '💼 Job Management', items: [
                  { key: 'can_create_jobs', label: 'Create Jobs', desc: 'Add new jobs to the system' },
                  { key: 'can_edit_jobs', label: 'Edit Jobs', desc: 'Modify existing job details' },
                  { key: 'can_delete_jobs', label: 'Delete Jobs', desc: 'Remove jobs from the system' },
                  { key: 'can_hard_delete_jobs', label: 'Hard Delete Jobs', desc: 'Permanently delete jobs (cannot be undone)' }
                ]},
                { category: '💰 Costs & Financial', items: [
                  { key: 'can_view_costs', label: 'View Costs', desc: 'See financial information' },
                  { key: 'can_edit_costs', label: 'Edit Costs', desc: 'Modify cost details' }
                ]},
                { category: '📄 Invoicing', items: [
                  { key: 'can_view_invoices', label: 'View Invoices', desc: 'Access invoice details' },
                  { key: 'can_create_invoices', label: 'Create Invoices', desc: 'Generate new invoices' },
                  { key: 'can_edit_invoices', label: 'Edit Invoices', desc: 'Modify invoice details' }
                ]},
                { category: '⚙️ Administration', items: [
                  { key: 'can_manage_users', label: 'Manage Users', desc: 'Add, edit, remove users' },
                  { key: 'can_edit_org_settings', label: 'Organization Settings', desc: 'Modify company settings' }
                ]},
                { category: '📊 Reports & Data', items: [
                  { key: 'can_view_reports', label: 'View Reports', desc: 'Access analytics and reports' },
                  { key: 'can_export_data', label: 'Export Data', desc: 'Download data exports' }
                ]}
              ];

              return (
                <div style={{ display: 'grid', gap: '1.25rem', marginBottom: '2rem' }}>
                  {permissionSections.map((section, idx) => (
                    <div key={idx}>
                      <h4 style={{
                        fontSize: '0.875rem',
                        fontWeight: 700,
                        color: '#60a5fa',
                        marginBottom: '0.75rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                      }}>
                        {section.category}
                      </h4>
                      <div style={{ display: 'grid', gap: '0.5rem' }}>
                        {section.items.map((item, itemIdx) => {
                          const isEnabled = (selectedUser as any)[item.key] === true;
                          return (
                            <div key={itemIdx} style={{
                              background: isEnabled ? 'rgba(74, 222, 128, 0.05)' : 'rgba(239, 68, 68, 0.05)',
                              border: `1px solid ${isEnabled ? 'rgba(74, 222, 128, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                              borderRadius: '8px',
                              padding: '0.75rem',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between'
                            }}>
                              <div style={{ flex: 1 }}>
                                <div style={{
                                  fontSize: '0.875rem',
                                  fontWeight: 600,
                                  color: '#e8eef6',
                                  marginBottom: '0.25rem'
                                }}>
                                  {item.label}
                                </div>
                                <div style={{
                                  fontSize: '0.75rem',
                                  color: '#8b949e'
                                }}>
                                  {item.desc}
                                </div>
                              </div>
                              <div style={{
                                padding: '0.25rem 0.75rem',
                                background: isEnabled ? 'rgba(74, 222, 128, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                                color: isEnabled ? '#4ade80' : '#ef4444',
                                borderRadius: '12px',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em'
                              }}>
                                {isEnabled ? '✓ Yes' : '✗ No'}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowViewPermissionsModal(false);
                  setSelectedUser(null);
                }}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: '#1d2733',
                  color: '#8b949e',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: '0.875rem'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
