// POD List/Search Page
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useRequireAuth } from '../../hooks/useRequireAuth';
import Layout from '../../components/Layout';
import { theme } from '../../lib/theme';
import type { DeliveryPOD } from '../../lib/pod/types';

export default function PODList() {
  const router = useRouter();
  const { session } = useRequireAuth();
  const [pods, setPods] = useState<DeliveryPOD[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    if (session) {
      fetchPODs();
    }
  }, [session, search, statusFilter]);

  async function fetchPODs() {
    try {
      const params = new URLSearchParams();
      if (search) params.append('query', search);
      if (statusFilter) params.append('status', statusFilter);

      const res = await fetch(`/api/pods?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setPods(data.pods);
      }
    } catch (error) {
      console.error('Failed to fetch PODs:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Layout>
      <div style={{ padding: 24 }}>
        <div style={{ maxWidth: 1600, margin: '0 auto' }}>
          {/* Header */}
          <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <h1 style={{ margin: 0, color: theme.colors.text, fontSize: 28, fontWeight: 700 }}>All PODs</h1>
              <p style={{ margin: '8px 0 0 0', color: theme.colors.textSubtle }}>Browse and search all delivery documents</p>
            </div>
            <button
              onClick={() => router.push('/pods')}
              style={{
                padding: '10px 20px',
                background: theme.colors.panel,
                border: `1px solid ${theme.colors.border}`,
                borderRadius: 6,
                color: theme.colors.text,
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 600
              }}
            >
              ← Back to Dashboard
            </button>
          </div>

          {/* Filters */}
          <div style={{ marginBottom: 24, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <input
              type="text"
              placeholder="Search by reference, name, address..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                padding: '12px 16px',
                background: theme.colors.panelAlt,
                border: `1px solid ${theme.colors.border}`,
                borderRadius: 6,
                color: theme.colors.text,
                fontSize: 14,
                outline: 'none'
              }}
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                padding: '12px 16px',
                background: theme.colors.panelAlt,
                border: `1px solid ${theme.colors.border}`,
                borderRadius: 6,
                color: theme.colors.text,
                fontSize: 14,
                outline: 'none'
              }}
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="needs_review">Needs Review</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          {/* Table */}
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
              <div style={{
                width: 48,
                height: 48,
                border: `3px solid ${theme.colors.border}`,
                borderTop: `3px solid ${theme.colors.accent}`,
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }}></div>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          ) : pods.length === 0 ? (
            <div className="glassmorphic-panel" style={{ padding: 48, textAlign: 'center' }}>
              <p style={{ color: theme.colors.textSubtle, fontSize: 16 }}>No PODs found</p>
            </div>
          ) : (
            <div className="glassmorphic-panel" style={{ overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ background: theme.colors.panelAlt, borderBottom: `1px solid ${theme.colors.border}` }}>
                  <tr>
                    <th style={{ padding: '14px 20px', textAlign: 'left', fontSize: 13, fontWeight: 700, color: theme.colors.textSubtle, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      Reference
                    </th>
                    <th style={{ padding: '14px 20px', textAlign: 'left', fontSize: 13, fontWeight: 700, color: theme.colors.textSubtle, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      Date
                    </th>
                    <th style={{ padding: '14px 20px', textAlign: 'left', fontSize: 13, fontWeight: 700, color: theme.colors.textSubtle, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      Supplier
                    </th>
                    <th style={{ padding: '14px 20px', textAlign: 'left', fontSize: 13, fontWeight: 700, color: theme.colors.textSubtle, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      Status
                    </th>
                    <th style={{ padding: '14px 20px', textAlign: 'left', fontSize: 13, fontWeight: 700, color: theme.colors.textSubtle, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pods.map((pod) => (
                    <tr
                      key={pod.id}
                      style={{
                        borderBottom: `1px solid ${theme.colors.border}`,
                        cursor: 'pointer',
                        transition: 'background 0.15s'
                      }}
                      onClick={() => router.push(`/pods/${pod.id}`)}
                      onMouseEnter={(e) => (e.currentTarget.style.background = theme.colors.panelAlt)}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td style={{ padding: '16px 20px', color: theme.colors.text, fontFamily: 'monospace', fontSize: 14, fontWeight: 600 }}>
                        {pod.sales_order_ref || 'N/A'}
                      </td>
                      <td style={{ padding: '16px 20px', color: theme.colors.text, fontSize: 14 }}>
                        {pod.delivery_date
                          ? new Date(pod.delivery_date).toLocaleDateString()
                          : 'N/A'}
                      </td>
                      <td style={{ padding: '16px 20px', color: theme.colors.text, fontSize: 14 }}>
                        {(pod as any).supplier?.name || 'Unknown'}
                      </td>
                      <td style={{ padding: '16px 20px' }}>
                        <StatusBadge status={pod.status} />
                      </td>
                      <td style={{ padding: '16px 20px' }}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/pods/${pod.id}`);
                          }}
                          style={{
                            color: theme.colors.accent,
                            fontSize: 13,
                            fontWeight: 600,
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer'
                          }}
                        >
                          View →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, { bg: string; text: string; border: string }> = {
    pending: { bg: 'rgba(59, 130, 246, 0.15)', text: '#60a5fa', border: 'rgba(59, 130, 246, 0.3)' },
    parsing: { bg: 'rgba(168, 85, 247, 0.15)', text: '#c084fc', border: 'rgba(168, 85, 247, 0.3)' },
    needs_review: { bg: 'rgba(251, 191, 36, 0.15)', text: '#fbbf24', border: 'rgba(251, 191, 36, 0.3)' },
    approved: { bg: 'rgba(34, 197, 94, 0.15)', text: '#22c55e', border: 'rgba(34, 197, 94, 0.3)' },
    rejected: { bg: 'rgba(239, 68, 68, 0.15)', text: '#ef4444', border: 'rgba(239, 68, 68, 0.3)' }
  };

  const style = colors[status] || { bg: 'rgba(156, 163, 175, 0.15)', text: '#9ca3af', border: 'rgba(156, 163, 175, 0.3)' };

  return (
    <span style={{
      padding: '4px 10px',
      fontSize: 12,
      fontWeight: 700,
      borderRadius: 999,
      background: style.bg,
      color: style.text,
      border: `1px solid ${style.border}`,
      textTransform: 'uppercase',
      letterSpacing: 0.3
    }}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}
