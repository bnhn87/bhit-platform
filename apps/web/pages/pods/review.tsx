// POD Review Queue
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useRequireAuth } from '../../hooks/useRequireAuth';
import Layout from '../../components/Layout';
import { theme } from '../../lib/theme';
import type { PODNeedingReview } from '../../lib/pod/types';

export default function ReviewQueue() {
  const router = useRouter();
  const { session } = useRequireAuth();
  const [pods, setPods] = useState<PODNeedingReview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session) {
      fetchReviewQueue();
    }
  }, [session]);

  async function fetchReviewQueue() {
    try {
      const res = await fetch('/api/pods/review');
      const data = await res.json();
      if (data.success) {
        setPods(data.pods);
      }
    } catch (error) {
      console.error('Failed to fetch review queue:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <Layout>
        <div style={{ padding: 24, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: 48,
              height: 48,
              border: `3px solid ${theme.colors.border}`,
              borderTop: `3px solid ${theme.colors.accent}`,
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto'
            }}></div>
            <p style={{ marginTop: 16, color: theme.colors.textSubtle }}>Loading review queue...</p>
          </div>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </Layout>
    );
  }

  return (
    <Layout>
      <div style={{ padding: 24 }}>
        <div style={{ maxWidth: 1600, margin: '0 auto' }}>
          {/* Header */}
          <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <h1 style={{ margin: 0, color: theme.colors.text, fontSize: 28, fontWeight: 700 }}>Review Queue</h1>
              <p style={{ margin: '8px 0 0 0', color: theme.colors.textSubtle }}>
                {pods.length} {pods.length === 1 ? 'POD needs' : 'PODs need'} your attention
              </p>
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

          {/* POD Grid */}
          {pods.length === 0 ? (
            <div className="glassmorphic-panel" style={{ padding: 48, textAlign: 'center' }}>
              <span style={{ fontSize: 64, display: 'block', marginBottom: 16 }}>✅</span>
              <h3 style={{ margin: '0 0 8px 0', color: theme.colors.text, fontSize: 20, fontWeight: 700 }}>All Clear!</h3>
              <p style={{ margin: 0, color: theme.colors.textSubtle }}>No PODs need review right now</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
              {pods.map((pod) => (
                <PODCard key={pod.id} pod={pod} onClick={() => router.push(`/pods/${pod.id}`)} />
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

function PODCard({ pod, onClick }: { pod: PODNeedingReview; onClick: () => void }) {
  const confidence = pod.overall_confidence || 0;
  const confidenceColor =
    confidence >= 75 ? '#60a5fa' : confidence >= 50 ? '#fbbf24' : '#ef4444';

  return (
    <div
      onClick={onClick}
      className="glassmorphic-panel"
      style={{
        padding: 20,
        cursor: 'pointer',
        transition: 'all 0.2s',
        border: `1px solid ${theme.colors.border}`
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'scale(1.02)';
        e.currentTarget.style.border = `1px solid ${theme.colors.accent}40`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
        e.currentTarget.style.border = `1px solid ${theme.colors.border}`;
      }}
    >
      {/* Confidence Badge */}
      <div style={{
        fontSize: 13,
        fontWeight: 700,
        color: confidenceColor,
        marginBottom: 12
      }}>
        {Math.round(confidence)}% Confidence
      </div>

      {/* Sales Order Ref */}
      <h3 style={{
        margin: '0 0 8px 0',
        color: theme.colors.text,
        fontSize: 18,
        fontWeight: 700
      }}>
        {pod.sales_order_ref || 'No Reference'}
      </h3>

      {/* Supplier */}
      {pod.supplier_name && (
        <p style={{
          margin: '0 0 6px 0',
          fontSize: 13,
          color: theme.colors.textSubtle
        }}>
          📦 {pod.supplier_name}
        </p>
      )}

      {/* Date */}
      {pod.delivery_date && (
        <p style={{
          margin: '0 0 16px 0',
          fontSize: 13,
          color: theme.colors.textSubtle
        }}>
          📅 {new Date(pod.delivery_date).toLocaleDateString()}
        </p>
      )}

      {/* Validation Flags */}
      {pod.validation_flags && pod.validation_flags.length > 0 && (
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 6,
          marginTop: 12
        }}>
          {pod.validation_flags.slice(0, 2).map((flag, i) => (
            <span
              key={i}
              style={{
                fontSize: 11,
                padding: '3px 8px',
                background: 'rgba(239, 68, 68, 0.15)',
                color: '#ef4444',
                borderRadius: 4,
                border: '1px solid rgba(239, 68, 68, 0.3)',
                fontWeight: 600
              }}
            >
              {flag.replace(/_/g, ' ')}
            </span>
          ))}
          {pod.validation_flags.length > 2 && (
            <span style={{
              fontSize: 11,
              padding: '3px 8px',
              background: theme.colors.muted,
              color: theme.colors.textSubtle,
              borderRadius: 4,
              fontWeight: 600
            }}>
              +{pod.validation_flags.length - 2} more
            </span>
          )}
        </div>
      )}

      {/* Status */}
      <div style={{
        marginTop: 16,
        paddingTop: 16,
        borderTop: `1px solid ${theme.colors.border}`
      }}>
        <span style={{
          fontSize: 11,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
          color: theme.colors.textSubtle,
          fontWeight: 700
        }}>
          {pod.status.replace(/_/g, ' ')}
        </span>
      </div>
    </div>
  );
}
