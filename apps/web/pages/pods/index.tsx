// POD Manager Dashboard
import Head from 'next/head';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useRequireAuth } from '../../hooks/useRequireAuth';
import { theme } from '../../lib/theme';
import type { PODStatistics } from '../../lib/pod/types';

export default function PODDashboard() {
  const router = useRouter();
  const { session } = useRequireAuth();
  const [stats, setStats] = useState<PODStatistics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session) {
      fetchStats();
    }
  }, [session]);

  async function fetchStats() {
    try {
      const res = await fetch('/api/pods/stats');
      const data = await res.json();
      if (data.success) {
        setStats(data.statistics);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div style={{ padding: 24, color: theme.colors.text }}>Loading...</div>;
  }

  return (
    <>
      <Head>
        <title>POD Manager • BHIT Work OS</title>
      </Head>

      <div style={{ padding: 24 }}>
        <header style={{ marginBottom: 24 }}>
          <h1 style={{ margin: 0, color: theme.colors.text, fontSize: 28, fontWeight: 700 }}>POD Manager</h1>
          <p style={{ margin: '8px 0 0 0', color: theme.colors.textSubtle }}>Proof of Delivery Management</p>
        </header>

        {/* Quick Actions */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 32 }}>
          <button
            onClick={() => router.push('/pods/upload')}
            className="glassmorphic-panel"
            style={{
              padding: 20,
              textAlign: 'left',
              cursor: 'pointer',
              border: `1px solid ${theme.colors.border}`,
              background: theme.colors.panel
            }}
          >
            <div style={{ fontSize: 24, marginBottom: 8 }}>📤</div>
            <div style={{ color: theme.colors.text, fontWeight: 600, marginBottom: 4 }}>Upload POD</div>
            <div style={{ color: theme.colors.textSubtle, fontSize: 13 }}>Add new delivery document</div>
          </button>

          <button
            onClick={() => router.push('/pods/review')}
            className="glassmorphic-panel"
            style={{
              padding: 20,
              textAlign: 'left',
              cursor: 'pointer',
              border: `1px solid ${theme.colors.border}`,
              background: theme.colors.panel
            }}
          >
            <div style={{ fontSize: 24, marginBottom: 8 }}>🔍</div>
            <div style={{ color: theme.colors.text, fontWeight: 600, marginBottom: 4 }}>Review Queue</div>
            <div style={{ color: theme.colors.textSubtle, fontSize: 13 }}>{stats?.needs_review_count || 0} need attention</div>
          </button>

          <button
            onClick={() => router.push('/pods/list')}
            className="glassmorphic-panel"
            style={{
              padding: 20,
              textAlign: 'left',
              cursor: 'pointer',
              border: `1px solid ${theme.colors.border}`,
              background: theme.colors.panel
            }}
          >
            <div style={{ fontSize: 24, marginBottom: 8 }}>📋</div>
            <div style={{ color: theme.colors.text, fontWeight: 600, marginBottom: 4 }}>All PODs</div>
            <div style={{ color: theme.colors.textSubtle, fontSize: 13 }}>View all documents</div>
          </button>
        </div>

        {/* Statistics */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 16 }}>
          <div className="glassmorphic-panel" style={{ padding: 20, textAlign: 'center' }}>
            <div style={{ fontSize: 32, fontWeight: 700, color: theme.colors.accent }}>{stats?.needs_review_count || 0}</div>
            <div style={{ fontSize: 12, color: theme.colors.textSubtle, textTransform: 'uppercase', letterSpacing: 0.5 }}>Needs Review</div>
          </div>

          <div className="glassmorphic-panel" style={{ padding: 20, textAlign: 'center' }}>
            <div style={{ fontSize: 32, fontWeight: 700, color: theme.colors.text }}>{stats?.pending_count || 0}</div>
            <div style={{ fontSize: 12, color: theme.colors.textSubtle, textTransform: 'uppercase', letterSpacing: 0.5 }}>Pending</div>
          </div>

          <div className="glassmorphic-panel" style={{ padding: 20, textAlign: 'center' }}>
            <div style={{ fontSize: 32, fontWeight: 700, color: theme.colors.text }}>{stats?.approved_count || 0}</div>
            <div style={{ fontSize: 12, color: theme.colors.textSubtle, textTransform: 'uppercase', letterSpacing: 0.5 }}>Approved</div>
          </div>

          <div className="glassmorphic-panel" style={{ padding: 20, textAlign: 'center' }}>
            <div style={{ fontSize: 32, fontWeight: 700, color: theme.colors.text }}>{stats?.rejected_count || 0}</div>
            <div style={{ fontSize: 12, color: theme.colors.textSubtle, textTransform: 'uppercase', letterSpacing: 0.5 }}>Rejected</div>
          </div>

          <div className="glassmorphic-panel" style={{ padding: 20, textAlign: 'center' }}>
            <div style={{ fontSize: 32, fontWeight: 700, color: theme.colors.text }}>{stats?.avg_confidence ? `${Math.round(stats.avg_confidence)}%` : 'N/A'}</div>
            <div style={{ fontSize: 12, color: theme.colors.textSubtle, textTransform: 'uppercase', letterSpacing: 0.5 }}>Avg Confidence</div>
          </div>
        </div>
      </div>
    </>
  );
}
