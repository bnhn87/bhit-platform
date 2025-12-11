// POD Detail Page - Production Quality
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

import Layout from '../../components/Layout';
import { useRequireAuth } from '../../hooks/useRequireAuth';
import type { PODDetailResponse, UpdatePODRequest } from '../../lib/pod/types';
import { theme } from '../../lib/theme';

export default function PODDetail() {
  const router = useRouter();
  const { id } = router.query;
  const { session } = useRequireAuth();

  const [data, setData] = useState<PODDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    sales_order_ref: '',
    delivery_date: '',
    delivery_time: '',
    recipient_name: '',
    delivery_address: '',
    vehicle_type: '' as any,
    vehicle_count: 1,
    vehicle_registrations: [] as string[],
    driver_names: [] as string[],
  });

  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    if (id && session) {
      fetchPOD();
    }
  }, [id, session]);

  async function fetchPOD() {
    try {
      setLoading(true);
      setError('');
      const res = await fetch(`/api/pods/${id}`);
      const result = await res.json();

      if (!result.success) {
        throw new Error(result.error || 'Failed to load POD');
      }

      setData(result);

      // Initialize form with POD data
      const pod = result.pod;
      setFormData({
        sales_order_ref: pod.sales_order_ref || '',
        delivery_date: pod.delivery_date || '',
        delivery_time: pod.delivery_time || '',
        recipient_name: pod.recipient_name || '',
        delivery_address: pod.delivery_address || '',
        vehicle_type: pod.vehicle_type || '',
        vehicle_count: pod.vehicle_count || 1,
        vehicle_registrations: pod.vehicle_registrations || [],
        driver_names: pod.driver_names || [],
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    if (!id) return;

    try {
      setSaving(true);
      const updates: UpdatePODRequest = {
        ...formData,
        change_reason: 'Manual correction from UI'
      };

      const res = await fetch(`/api/pods/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });

      const result = await res.json();
      if (!result.success) {
        throw new Error(result.error);
      }

      setEditMode(false);
      await fetchPOD(); // Refresh
    } catch (err: any) {
      alert(`Save failed: ${err.message}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleApprove() {
    if (!id) return;

    try {
      const res = await fetch(`/api/pods/${id}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: '' })
      });

      const result = await res.json();
      if (!result.success) {
        throw new Error(result.error);
      }

      setShowApproveModal(false);
      await fetchPOD();
    } catch (err: any) {
      alert(`Approve failed: ${err.message}`);
    }
  }

  async function handleReject() {
    if (!id || !rejectReason.trim()) return;

    try {
      const res = await fetch(`/api/pods/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectReason })
      });

      const result = await res.json();
      if (!result.success) {
        throw new Error(result.error);
      }

      setShowRejectModal(false);
      setRejectReason('');
      await fetchPOD();
    } catch (err: any) {
      alert(`Reject failed: ${err.message}`);
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
            <p style={{ marginTop: 16, color: theme.colors.textSubtle }}>Loading POD...</p>
          </div>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </Layout>
    );
  }

  if (error || !data) {
    return (
      <Layout>
        <div style={{ padding: 24, minHeight: '100vh' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto' }}>
            <div className="glassmorphic-panel" style={{
              padding: 24,
              textAlign: 'center',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)'
            }}>
              <p style={{ color: '#ef4444', fontSize: 16, marginBottom: 16 }}>{error || 'POD not found'}</p>
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
          </div>
        </div>
      </Layout>
    );
  }

  const { pod, file_url, versions, supplier } = data;
  const overallConfidence = pod.confidence_scores?.overall || 0;
  const canEdit = pod.status !== 'approved' && pod.status !== 'rejected';

  return (
    <Layout>
      <div style={{ padding: 24, minHeight: '100vh' }}>
        <div style={{ maxWidth: 1600, margin: '0 auto' }}>
          {/* Header */}
          <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <button
                onClick={() => router.push('/pods')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: theme.colors.textSubtle,
                  cursor: 'pointer',
                  marginBottom: 8,
                  fontSize: 14
                }}
              >
                ← Back to Dashboard
              </button>
              <h1 style={{ margin: 0, color: theme.colors.text, fontSize: 28, fontWeight: 700 }}>
                {pod.sales_order_ref || 'POD Detail'}
              </h1>
              <p style={{ margin: '8px 0 0 0', color: theme.colors.textSubtle }}>
                Uploaded {new Date(pod.created_at).toLocaleString()}
                {supplier && ` • ${supplier.name}`}
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <StatusBadge status={pod.status} />
              {overallConfidence > 0 && (
                <ConfidenceBadge score={overallConfidence} />
              )}
            </div>
          </div>

          {/* Main Content Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, alignItems: 'start' }}>
            {/* LEFT: Document Viewer */}
            <div className="glassmorphic-panel" style={{ overflow: 'hidden' }}>
              <div style={{ padding: 16, borderBottom: `1px solid ${theme.colors.border}` }}>
                <h2 style={{ margin: 0, color: theme.colors.text, fontSize: 18, fontWeight: 600 }}>Document</h2>
              </div>
              <div style={{ padding: 16 }}>
                {pod.mime_type.includes('pdf') ? (
                  <iframe
                    src={file_url}
                    style={{ width: '100%', height: 600, background: '#fff', borderRadius: 8, border: 'none' }}
                    title="POD Document"
                  />
                ) : (
                  <img
                    src={file_url}
                    alt="POD"
                    style={{ width: '100%', borderRadius: 8 }}
                  />
                )}
                <a
                  href={file_url}
                  download
                  style={{
                    marginTop: 16,
                    display: 'block',
                    textAlign: 'center',
                    padding: '10px 16px',
                    background: 'rgba(29, 145, 255, 0.15)',
                    color: theme.colors.accent,
                    borderRadius: 8,
                    border: `1px solid ${theme.colors.accent}40`,
                    textDecoration: 'none',
                    fontWeight: 600,
                    fontSize: 14
                  }}
                >
                  ⬇ Download Original
                </a>
              </div>
            </div>

            {/* RIGHT: Details & Actions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {/* Validation Flags */}
              {pod.validation_flags && pod.validation_flags.length > 0 && (
                <div className="glassmorphic-panel" style={{
                  padding: 16,
                  background: 'rgba(251, 191, 36, 0.1)',
                  border: '1px solid rgba(251, 191, 36, 0.3)'
                }}>
                  <h3 style={{ color: '#fbbf24', fontWeight: 600, marginBottom: 12, fontSize: 15 }}>⚠️ Issues Detected</h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {pod.validation_flags.map((flag, i) => (
                      <span
                        key={i}
                        style={{
                          fontSize: 12,
                          padding: '4px 8px',
                          background: 'rgba(251, 191, 36, 0.2)',
                          color: '#fcd34d',
                          borderRadius: 4
                        }}
                      >
                        {flag.replace(/_/g, ' ')}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Form */}
              <div className="glassmorphic-panel" style={{ padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <h2 style={{ margin: 0, color: theme.colors.text, fontSize: 18, fontWeight: 600 }}>Details</h2>
                  {canEdit && !editMode && (
                    <button
                      onClick={() => setEditMode(true)}
                      style={{
                        padding: '6px 12px',
                        fontSize: 13,
                        background: 'rgba(29, 145, 255, 0.15)',
                        color: theme.colors.accent,
                        borderRadius: 6,
                        border: `1px solid ${theme.colors.accent}40`,
                        cursor: 'pointer',
                        fontWeight: 600
                      }}
                    >
                      ✏️ Edit
                    </button>
                  )}
                  {editMode && (
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        onClick={handleSave}
                        disabled={saving}
                        style={{
                          padding: '6px 12px',
                          fontSize: 13,
                          background: 'rgba(34, 197, 94, 0.15)',
                          color: '#22c55e',
                          borderRadius: 6,
                          border: '1px solid rgba(34, 197, 94, 0.3)',
                          cursor: saving ? 'not-allowed' : 'pointer',
                          opacity: saving ? 0.5 : 1,
                          fontWeight: 600
                        }}
                      >
                        {saving ? 'Saving...' : '✓ Save'}
                      </button>
                      <button
                        onClick={() => {
                          setEditMode(false);
                          fetchPOD();
                        }}
                        style={{
                          padding: '6px 12px',
                          fontSize: 13,
                          background: theme.colors.muted,
                          color: theme.colors.textSubtle,
                          borderRadius: 6,
                          border: `1px solid ${theme.colors.border}`,
                          cursor: 'pointer',
                          fontWeight: 600
                        }}
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <FormField
                    label="Sales Order Ref"
                    value={formData.sales_order_ref}
                    onChange={(v) => setFormData({ ...formData, sales_order_ref: v })}
                    readOnly={!editMode}
                    confidence={pod.confidence_scores?.sales_order_ref}
                  />

                  <FormField
                    label="Delivery Date"
                    type="date"
                    value={formData.delivery_date}
                    onChange={(v) => setFormData({ ...formData, delivery_date: v })}
                    readOnly={!editMode}
                    confidence={pod.confidence_scores?.delivery_date}
                  />

                  <FormField
                    label="Delivery Time"
                    type="time"
                    value={formData.delivery_time}
                    onChange={(v) => setFormData({ ...formData, delivery_time: v })}
                    readOnly={!editMode}
                    confidence={pod.confidence_scores?.delivery_time}
                  />

                  <FormField
                    label="Recipient Name"
                    value={formData.recipient_name}
                    onChange={(v) => setFormData({ ...formData, recipient_name: v })}
                    readOnly={!editMode}
                    confidence={pod.confidence_scores?.recipient_name}
                  />

                  <FormField
                    label="Delivery Address"
                    value={formData.delivery_address}
                    onChange={(v) => setFormData({ ...formData, delivery_address: v })}
                    readOnly={!editMode}
                    multiline
                    confidence={pod.confidence_scores?.delivery_address}
                  />

                  <FormField
                    label="Vehicle Type"
                    value={formData.vehicle_type}
                    onChange={(v) => setFormData({ ...formData, vehicle_type: v as any })}
                    readOnly={!editMode}
                    confidence={pod.confidence_scores?.vehicle_type}
                    select
                    options={['luton', '7.5t', 'artic', 'van', 'sprinter', 'other']}
                  />
                </div>
              </div>

              {/* Actions */}
              {canEdit && (
                <div className="glassmorphic-panel" style={{ padding: 20 }}>
                  <h3 style={{ margin: '0 0 16px 0', color: theme.colors.text, fontSize: 18, fontWeight: 600 }}>Actions</h3>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <button
                      onClick={() => setShowApproveModal(true)}
                      style={{
                        flex: 1,
                        padding: '12px 16px',
                        background: 'rgba(34, 197, 94, 0.15)',
                        color: '#22c55e',
                        borderRadius: 8,
                        border: '1px solid rgba(34, 197, 94, 0.3)',
                        cursor: 'pointer',
                        fontWeight: 600,
                        fontSize: 14
                      }}
                    >
                      ✓ Approve for Payment
                    </button>
                    <button
                      onClick={() => setShowRejectModal(true)}
                      style={{
                        flex: 1,
                        padding: '12px 16px',
                        background: 'rgba(239, 68, 68, 0.15)',
                        color: '#ef4444',
                        borderRadius: 8,
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        cursor: 'pointer',
                        fontWeight: 600,
                        fontSize: 14
                      }}
                    >
                      ✗ Reject
                    </button>
                  </div>
                </div>
              )}

              {/* Version History */}
              {versions && versions.length > 0 && (
                <div className="glassmorphic-panel" style={{ padding: 20 }}>
                  <h3 style={{ margin: '0 0 16px 0', color: theme.colors.text, fontSize: 18, fontWeight: 600 }}>Version History</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {versions.slice(0, 5).map((v) => (
                      <div key={v.id} style={{ fontSize: 13, color: theme.colors.textSubtle, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span>v{v.version_number} • {v.change_type.replace(/_/g, ' ')}</span>
                        <span>{new Date(v.created_at).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Approve Modal */}
        {showApproveModal && (
          <Modal
            title="Approve POD"
            onClose={() => setShowApproveModal(false)}
            onConfirm={handleApprove}
            confirmText="Approve"
            confirmStyle="green"
          >
            <p style={{ color: theme.colors.text }}>
              Are you sure you want to approve this POD for payment?
            </p>
            <p style={{ fontSize: 13, color: theme.colors.textSubtle, marginTop: 8 }}>
              This will mark the delivery as confirmed and ready for invoicing.
            </p>
          </Modal>
        )}

        {/* Reject Modal */}
        {showRejectModal && (
          <Modal
            title="Reject POD"
            onClose={() => setShowRejectModal(false)}
            onConfirm={handleReject}
            confirmText="Reject"
            confirmStyle="red"
          >
            <p style={{ color: theme.colors.text, marginBottom: 16 }}>
              Please provide a reason for rejecting this POD:
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                background: theme.colors.panelAlt,
                border: `1px solid ${theme.colors.border}`,
                borderRadius: 6,
                color: theme.colors.text,
                fontSize: 14,
                fontFamily: 'inherit'
              }}
              rows={3}
              placeholder="e.g., Signature missing, incorrect date, etc."
            />
          </Modal>
        )}
      </div>
    </Layout>
  );
}

// Components
function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, { bg: string; text: string; border: string }> = {
    pending: { bg: 'rgba(59, 130, 246, 0.15)', text: '#60a5fa', border: 'rgba(59, 130, 246, 0.3)' },
    parsing: { bg: 'rgba(168, 85, 247, 0.15)', text: '#c084fc', border: 'rgba(168, 85, 247, 0.3)' },
    needs_review: { bg: 'rgba(251, 191, 36, 0.15)', text: '#fbbf24', border: 'rgba(251, 191, 36, 0.3)' },
    approved: { bg: 'rgba(34, 197, 94, 0.15)', text: '#22c55e', border: 'rgba(34, 197, 94, 0.3)' },
    rejected: { bg: 'rgba(239, 68, 68, 0.15)', text: '#ef4444', border: 'rgba(239, 68, 68, 0.3)' }
  };

  const style = colors[status] || colors.pending;

  return (
    <span style={{
      padding: '6px 12px',
      fontSize: 13,
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

function ConfidenceBadge({ score }: { score: number }) {
  const colorKey = score >= 90 ? 'green' : score >= 75 ? 'blue' : score >= 50 ? 'amber' : 'red';
  const colors = {
    green: { bg: 'rgba(34, 197, 94, 0.15)', text: '#22c55e', border: 'rgba(34, 197, 94, 0.3)' },
    blue: { bg: 'rgba(59, 130, 246, 0.15)', text: '#60a5fa', border: 'rgba(59, 130, 246, 0.3)' },
    amber: { bg: 'rgba(251, 191, 36, 0.15)', text: '#fbbf24', border: 'rgba(251, 191, 36, 0.3)' },
    red: { bg: 'rgba(239, 68, 68, 0.15)', text: '#ef4444', border: 'rgba(239, 68, 68, 0.3)' }
  };

  const style = colors[colorKey];

  return (
    <span style={{
      padding: '6px 12px',
      fontSize: 13,
      fontWeight: 700,
      borderRadius: 999,
      background: style.bg,
      color: style.text,
      border: `1px solid ${style.border}`
    }}>
      {Math.round(score)}% Confidence
    </span>
  );
}

function FormField({
  label,
  value,
  onChange,
  readOnly,
  confidence,
  type = 'text',
  multiline = false,
  select = false,
  options = []
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  readOnly: boolean;
  confidence?: number;
  type?: string;
  multiline?: boolean;
  select?: boolean;
  options?: string[];
}) {
  const confidenceColor =
    confidence && confidence >= 75 ? '#22c55e' : confidence && confidence >= 50 ? '#fbbf24' : '#ef4444';

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    background: theme.colors.panelAlt,
    border: `1px solid ${theme.colors.border}`,
    borderRadius: 6,
    color: theme.colors.text,
    fontSize: 14,
    outline: 'none',
    opacity: readOnly ? 0.6 : 1,
    cursor: readOnly ? 'not-allowed' : 'text'
  };

  return (
    <div>
      <label style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: 13,
        fontWeight: 600,
        color: theme.colors.textSubtle,
        marginBottom: 6
      }}>
        <span>{label}</span>
        {confidence !== undefined && (
          <span style={{ fontSize: 12, color: confidenceColor }}>{Math.round(confidence)}%</span>
        )}
      </label>
      {select ? (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={readOnly}
          style={inputStyle}
        >
          <option value="">Select...</option>
          {options.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      ) : multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          readOnly={readOnly}
          style={{ ...inputStyle, fontFamily: 'inherit', resize: 'vertical' }}
          rows={3}
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          readOnly={readOnly}
          style={inputStyle}
        />
      )}
    </div>
  );
}

function Modal({
  title,
  children,
  onClose,
  onConfirm,
  confirmText,
  confirmStyle
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  onConfirm: () => void;
  confirmText: string;
  confirmStyle: 'green' | 'red';
}) {
  const buttonStyle = confirmStyle === 'green'
    ? {
        background: 'rgba(34, 197, 94, 0.15)',
        color: '#22c55e',
        border: '1px solid rgba(34, 197, 94, 0.3)'
      }
    : {
        background: 'rgba(239, 68, 68, 0.15)',
        color: '#ef4444',
        border: '1px solid rgba(239, 68, 68, 0.3)'
      };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0, 0, 0, 0.6)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div className="glassmorphic-panel" style={{
        padding: 24,
        maxWidth: 480,
        width: '100%',
        margin: '0 16px',
        background: theme.colors.panel,
        border: `1px solid ${theme.colors.border}`
      }}>
        <h3 style={{ margin: '0 0 16px 0', color: theme.colors.text, fontSize: 20, fontWeight: 700 }}>{title}</h3>
        <div style={{ marginBottom: 24 }}>{children}</div>
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: '10px 16px',
              background: theme.colors.muted,
              color: theme.colors.text,
              borderRadius: 6,
              border: `1px solid ${theme.colors.border}`,
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 600
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{
              flex: 1,
              padding: '10px 16px',
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 600,
              ...buttonStyle
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
