import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

import { useRequireAuth } from '../../hooks/useRequireAuth';
import { supabase } from '../../lib/supabaseClient';
import { theme } from '../../lib/theme';

type DeletedJob = {
  id: string;
  reference: string | null;
  title: string;
  client_name: string | null;
  status: string;
  created_at: string;
  deleted_at: string;
};

export default function DeletedJobs() {
  useRequireAuth();
  const router = useRouter();

  const [jobs, setJobs] = useState<DeletedJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [canHardDelete, setCanHardDelete] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [selectedJobs, setSelectedJobs] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  useEffect(() => {
    loadDeletedJobs();
    checkPermissions();
  }, []);

  async function loadDeletedJobs() {
    setLoading(true);

    const { data, error } = await supabase
      .from('jobs')
      .select('id, reference, title, client_name, status, created_at, deleted_at')
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false });

    if (error) {
      console.error('Error loading deleted jobs:', error);
    } else {
      setJobs((data as DeletedJob[]) || []);
    }

    setLoading(false);
  }

  async function checkPermissions() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    // Check if user has hard delete permission
    const permissions = session.user.user_metadata?.permissions;
    setCanHardDelete(permissions?.can_hard_delete_jobs === true);
  }

  async function handleHardDelete(jobId: string, jobTitle: string) {
    const confirmed = confirm(
      `⚠️ WARNING: Permanent Deletion\n\n` +
      `This will PERMANENTLY delete "${jobTitle}" from the database.\n\n` +
      `This action CANNOT be undone.\n\n` +
      `Are you absolutely sure you want to continue?`
    );

    if (!confirmed) return;

    setDeleting(jobId);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const response = await fetch(`/api/jobs/${jobId}/hard-delete`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete job');
      }

      // Remove from list
      setJobs(prev => prev.filter(j => j.id !== jobId));

      alert('✓ Job permanently deleted');

    } catch (error: unknown) {
      console.error('Hard delete error:', error);
      alert(`Failed to delete job: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setDeleting(null);
    }
  }

  async function handleRestore(jobId: string) {
    try {
      const { error } = await supabase
        .from('jobs')
        .update({ deleted_at: null })
        .eq('id', jobId);

      if (error) throw error;

      // Remove from deleted list
      setJobs(prev => prev.filter(j => j.id !== jobId));

      alert('✓ Job restored successfully');

    } catch (error: unknown) {
      console.error('Restore error:', error);
      alert(`Failed to restore job: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  function toggleSelectJob(jobId: string) {
    setSelectedJobs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(jobId)) {
        newSet.delete(jobId);
      } else {
        newSet.add(jobId);
      }
      return newSet;
    });
  }

  function toggleSelectAll() {
    if (selectedJobs.size === jobs.length) {
      setSelectedJobs(new Set());
    } else {
      setSelectedJobs(new Set(jobs.map(j => j.id)));
    }
  }

  async function handleBulkDelete() {
    if (selectedJobs.size === 0) return;

    const confirmed = confirm(
      `⚠️ WARNING: Permanent Deletion\n\n` +
      `This will PERMANENTLY delete ${selectedJobs.size} job(s) from the database.\n\n` +
      `This action CANNOT be undone.\n\n` +
      `Are you absolutely sure you want to continue?`
    );

    if (!confirmed) return;

    setBulkDeleting(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      let successCount = 0;
      let failCount = 0;

      for (const jobId of selectedJobs) {
        try {
          const response = await fetch(`/api/jobs/${jobId}/hard-delete`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json'
            }
          });

          const result = await response.json();

          if (response.ok) {
            successCount++;
          } else {
            failCount++;
            console.error(`Failed to delete job ${jobId}:`, result.error);
          }
        } catch (error: unknown) {
          failCount++;
          console.error(`Error deleting job ${jobId}:`, error);
        }
      }

      // Remove successfully deleted jobs from list
      setJobs(prev => prev.filter(j => !selectedJobs.has(j.id)));
      setSelectedJobs(new Set());

      if (failCount === 0) {
        alert(`✓ ${successCount} job(s) permanently deleted`);
      } else {
        alert(`⚠️ ${successCount} job(s) deleted, ${failCount} failed`);
      }

    } catch (error: unknown) {
      console.error('Bulk delete error:', error);
      alert(`Failed to delete jobs: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setBulkDeleting(false);
    }
  }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: '20px' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700 }}>
            Deleted Jobs
          </h1>
          {selectedJobs.size > 0 && (
            <span style={{ fontSize: 14, color: theme.colors.textSubtle }}>
              ({selectedJobs.size} selected)
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          {canHardDelete && selectedJobs.size > 0 && (
            <button
              onClick={handleBulkDelete}
              disabled={bulkDeleting}
              style={{
                background: bulkDeleting ? '#666' : '#dc2626',
                border: 'none',
                color: '#fff',
                padding: '8px 16px',
                borderRadius: 8,
                cursor: bulkDeleting ? 'not-allowed' : 'pointer',
                fontSize: 14,
                fontWeight: 600,
                opacity: bulkDeleting ? 0.5 : 1
              }}
            >
              {bulkDeleting ? 'Deleting...' : `Delete ${selectedJobs.size} Forever`}
            </button>
          )}
          <button
            onClick={() => router.push('/jobs')}
            style={{
              background: 'transparent',
              border: `1px solid ${theme.colors.border}`,
              color: theme.colors.text,
              padding: '8px 16px',
              borderRadius: 8,
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 500
            }}
          >
            ← Back to Jobs
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{ color: theme.colors.textSubtle, padding: 20, textAlign: 'center' }}>
          Loading deleted jobs...
        </div>
      ) : jobs.length === 0 ? (
        <div style={{
          padding: 40,
          textAlign: 'center',
          color: theme.colors.textSubtle,
          border: `1px solid ${theme.colors.border}`,
          borderRadius: 12
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🗑️</div>
          <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
            No deleted jobs
          </div>
          <div style={{ fontSize: 14 }}>
            Deleted jobs will appear here
          </div>
        </div>
      ) : (
        <>
          {canHardDelete && jobs.length > 0 && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: 12,
              padding: '8px 16px',
              background: 'rgba(29, 144, 255, 0.05)',
              border: `1px solid ${theme.colors.border}`,
              borderRadius: 8
            }}>
              <input
                type="checkbox"
                checked={selectedJobs.size === jobs.length && jobs.length > 0}
                onChange={toggleSelectAll}
                style={{ cursor: 'pointer', width: 16, height: 16 }}
              />
              <span style={{ fontSize: 14, fontWeight: 500 }}>
                Select All ({jobs.length})
              </span>
            </div>
          )}
          <div style={{ display: 'grid', gap: 12 }}>
            {jobs.map((job) => (
              <div
                key={job.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: canHardDelete ? 'auto minmax(200px, 1fr) 1fr auto auto' : 'minmax(200px, 1fr) 1fr auto auto',
                  gap: 16,
                  alignItems: 'center',
                  padding: 16,
                  border: `1px solid ${theme.colors.border}`,
                  borderRadius: 12,
                  background: selectedJobs.has(job.id) ? 'rgba(29, 144, 255, 0.05)' : 'rgba(255, 0, 0, 0.02)'
                }}
              >
                {canHardDelete && (
                  <input
                    type="checkbox"
                    checked={selectedJobs.has(job.id)}
                    onChange={() => toggleSelectJob(job.id)}
                    style={{ cursor: 'pointer', width: 18, height: 18 }}
                  />
                )}
                <div>
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>
                    {job.reference ? `${job.reference} — ` : ''}
                    {job.title}
                  </div>
                  <div style={{ fontSize: 12, color: theme.colors.textSubtle }}>
                    {job.client_name || '-'}
                  </div>
                </div>

              <div style={{ fontSize: 12, color: theme.colors.textSubtle }}>
                Deleted {new Date(job.deleted_at).toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>

              <button
                onClick={() => handleRestore(job.id)}
                style={{
                  background: theme.colors.accent,
                  border: 'none',
                  color: '#fff',
                  padding: '8px 16px',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 600
                }}
              >
                Restore
              </button>

              {canHardDelete && (
                <button
                  onClick={() => handleHardDelete(job.id, job.reference || job.title)}
                  disabled={deleting === job.id}
                  style={{
                    background: deleting === job.id ? '#666' : '#dc2626',
                    border: 'none',
                    color: '#fff',
                    padding: '8px 16px',
                    borderRadius: 8,
                    cursor: deleting === job.id ? 'not-allowed' : 'pointer',
                    fontSize: 13,
                    fontWeight: 600,
                    opacity: deleting === job.id ? 0.5 : 1
                  }}
                >
                  {deleting === job.id ? 'Deleting...' : 'Delete Forever'}
                </button>
              )}
            </div>
          ))}
        </div>
        </>
      )}

      {!loading && jobs.length > 0 && (
        <div style={{
          marginTop: 20,
          padding: 16,
          background: 'rgba(255, 0, 0, 0.05)',
          border: '1px solid rgba(255, 0, 0, 0.2)',
          borderRadius: 8,
          fontSize: 13,
          color: '#dc2626'
        }}>
          <strong>⚠️ Warning:</strong> Hard deletion permanently removes jobs from the database and cannot be undone.
          {!canHardDelete && ' You do not have permission to permanently delete jobs.'}
        </div>
      )}
    </div>
  );
}
