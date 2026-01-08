/**
 * Job Detail — header + StatusPill wired to real data from Supabase.
 * Reads public.v_jobs_list for header (reference/title/client),
 * reads/writes status directly to public.jobs by id.
 */

import Head from "next/head";
import { useRouter } from "next/router";
import Script from "next/script";
import React from "react";

import StatusPill from "@/components/jobs/StatusPill";
import DocumentsTab from "@/components/tabs/DocumentsTab";
import EditHistoryTab from "@/components/tabs/EditHistoryTab";
import FloorPlanTab from "@/components/tabs/FloorPlanTab";
import LabourTab from "@/components/tabs/LabourTab";
import NotesTab from "@/components/tabs/NotesTab";
import PhotosTab from "@/components/tabs/PhotosTab";
import TasksTab from "@/components/tabs/TasksTab";
import { useUserRole } from "@/hooks/useUserRole";
import { logJobEdit } from "@/lib/jobEditLogger";
import { supabase } from "@/lib/supabaseClient";
import { theme } from "@/lib/theme";

// Define JobStatus locally since the jobs StatusPill has different interface
export type JobStatus = "planned" | "in_progress" | "delayed" | "on_hold" | "completed";

// Job status type that matches the database
type DbJobStatus = "planned" | "in_progress" | "snagging" | "completed";

// Status mapping for UI display
const getStatusVariant = (status: string | null): DbJobStatus => {
  if (!status) return 'planned';
  switch (status) {
    case 'planned': return 'planned';
    case 'in_progress': return 'in_progress';
    case 'installing': return 'in_progress';
    case 'snagging': return 'snagging';
    case 'completed': return 'completed';
    default: return 'planned';
  }
};

// Human-readable status labels
const getStatusLabel = (status: string | null): string => {
  if (!status) return 'Planned';
  switch (status) {
    case 'planned': return 'Planned';
    case 'in_progress': return 'In Progress';
    case 'installing': return 'In Progress';
    case 'snagging': return 'Snagging';
    case 'completed': return 'Completed';
    default: return 'Planned';
  }
};

type HeaderRow = {
  id: string;
  reference: string | null;
  title: string | null;
  client_name: string | null;
  status: DbJobStatus;
};

type TabType = "overview" | "tasks" | "documents" | "notes" | "photos" | "labour" | "floorplan" | "editHistory";

const TAB_LABELS: Record<TabType, string> = {
  overview: "Overview",
  tasks: "Tasks",
  documents: "Documents",
  notes: "Notes",
  photos: "Photos",
  labour: "Labour",
  floorplan: "Floor Plan",
  editHistory: "Edit History"
};

// Roles that can edit jobs
const canEditJob = (role?: string): boolean => {
  return role === "admin" || role === "director" || role === "ops";
};

// Roles that can upload documents (more permissive for task generation)
const canUploadDocuments = (role?: string): boolean => {
  return role === "admin" || role === "director" || role === "ops" || role === "supervisor" || role === "installer" || role === "guest";
};

// Roles that can view edit history
const canViewEditHistory = (role?: string): boolean => {
  return role === "admin" || role === "director" || role === "ops";
};


export default function JobDetailPage() {
  const router = useRouter();
  const { id } = router.query as { id?: string };
  const { role, userId } = useUserRole();
  const canManage = canEditJob(role);
  const canUpload = canUploadDocuments(role);
  const canViewHistory = canViewEditHistory(role);


  const [row, setRow] = React.useState<HeaderRow | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState<string | null>(null);
  const [activeTab, setActiveTab] = React.useState<TabType>("overview");

  // Lead installer state
  const [leadInstaller, setLeadInstaller] = React.useState<string | null>(null);
  const [_users, setUsers] = React.useState<Array<{ id: string, name: string, email: string }>>([]);
  const [_loadingUsers, setLoadingUsers] = React.useState(false);

  // Products state
  const [products, setProducts] = React.useState<Array<{
    id: string | number;
    name: string;
    code: string | null;
    quantity: number;
    source: string;
    estimatedTime?: number;
    totalTime?: number;
    description?: string;
    rawDescription?: string;
    cleanDescription?: string;
  }>>([]);
  const [loadingProducts, setLoadingProducts] = React.useState(false);

  // Task progress state for products
  const [taskProgress, setTaskProgress] = React.useState<Record<string, {
    uplifted_qty: number;
    placed_qty: number;
    built_qty: number;
    total_qty: number;
  }>>({});


  // Editable fields
  const [isEditing, setIsEditing] = React.useState(false);
  const [editData, setEditData] = React.useState({
    title: "",
    client_name: "",
    reference: ""
  });

  async function load() {
    if (!id) {
      return;
    }
    setLoading(true);
    setErr(null);

    // Try to load from v_jobs_list view first, with fallback to jobs table
    let data, error;

    // First attempt: use v_jobs_list view
    const viewResult = await supabase
      .from("v_jobs_list")
      .select("id, reference, title, client_name, status")
      .eq("id", id)
      .limit(1)
      .maybeSingle();

    if (!viewResult.error && viewResult.data) {
      data = viewResult.data;
      error = null;
    } else {
      // Fallback: query jobs table directly
      // eslint-disable-next-line no-console
      const tableResult = await supabase
        .from("jobs")
        .select("id, reference, title, client_name, status")
        .eq("id", id)
        .limit(1)
        .maybeSingle();

      data = tableResult.data;
      error = tableResult.error;
    }

    if (error) {
      setErr(error.message);
      setRow(null);
    } else if (!data) {
      setErr("Job not found");
      setRow(null);
    } else {
      // Map database status to our status type
      const status = getStatusVariant(data?.status);
      setRow(data ? { ...data, status } : null);

      // Initialize edit data
      setEditData({
        title: data?.title || "",
        client_name: data?.client_name || "",
        reference: data?.reference || ""
      });
    }
    setLoading(false);
  }

  React.useEffect(() => {
    // Only load when router is ready and we have an id
    if (router.isReady && id) {
      load();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady, id]);

  // Load users for lead installer dropdown
  React.useEffect(() => {
    if (!canManage) return; // Only load users if user can manage

    setLoadingUsers(true);
    supabase
      .from("users")
      .select("id, name, email")
      .order("name")
      .then(({ data, error }) => {
        if (error) {
          console.error("Failed to load users:", error);
        } else {
          setUsers(data || []);
        }
        setLoadingUsers(false);
      });
  }, [canManage]);

  // Load products and task progress for overview
  React.useEffect(() => {
    if (!id) return;

    setLoadingProducts(true);

    // Fetch products
    const productsPromise = fetch(`/api/jobs/${id}/products`)
      .then(response => response.json());

    // Fetch task progress
    const tasksPromise = supabase
      .from('generated_tasks')
      .select('id, title, uplifted_qty, placed_qty, built_qty, total_qty')
      .eq('job_id', id);

    Promise.all([productsPromise, tasksPromise])
      .then(([productsResult, tasksResult]) => {
        // Set products
        if (productsResult.data) {
          setProducts(productsResult.data);
        } else {
          setProducts([]);
        }

        // Set task progress
        if (tasksResult.data) {
          const progressMap: Record<string, {
            uplifted_qty: number;
            placed_qty: number;
            built_qty: number;
            total_qty: number;
          }> = {};
          tasksResult.data.forEach(task => {
            // Create a key based on the task title to match with products
            const taskKey = task.title.toLowerCase();
            progressMap[taskKey] = {
              uplifted_qty: task.uplifted_qty || 0,
              placed_qty: task.placed_qty || 0,
              built_qty: task.built_qty || 0,
              total_qty: task.total_qty || 0
            };
          });
          setTaskProgress(progressMap);
        }

        setLoadingProducts(false);
      })
      .catch(err => {
        console.error('Error fetching products and tasks:', err);
        setProducts([]);
        setTaskProgress({});
        setLoadingProducts(false);
      });
  }, [id]);

  // Helper function to get product status and progress based on task data
  const getProductStatusAndProgress = (product: typeof products[0]) => {
    // Try to find matching task progress
    const productKey = product.name.toLowerCase();
    const taskKey = Object.keys(taskProgress).find(key =>
      key.includes(productKey) || productKey.includes(key.replace(/install\s+\d+x?\s*/i, '').trim())
    );

    if (taskKey && taskProgress[taskKey]) {
      const progress = taskProgress[taskKey];
      const totalQty = progress.total_qty;

      if (totalQty === 0) {
        return { status: 'NOT STARTED', percentage: 0, phase: 'pending' };
      }

      // Calculate progress percentages
      const upliftedPct = Math.round((progress.uplifted_qty / totalQty) * 100);
      const placedPct = Math.round((progress.placed_qty / totalQty) * 100);
      const builtPct = Math.round((progress.built_qty / totalQty) * 100);

      // Determine primary status based on highest completion
      if (builtPct === 100) {
        return { status: 'COMPLETE', percentage: 100, phase: 'built' };
      } else if (builtPct > 0) {
        return { status: `BUILDING ${builtPct}%`, percentage: builtPct, phase: 'building' };
      } else if (placedPct === 100) {
        return { status: 'PLACED', percentage: 100, phase: 'placed' };
      } else if (placedPct > 0) {
        return { status: `PLACING ${placedPct}%`, percentage: placedPct, phase: 'placing' };
      } else if (upliftedPct === 100) {
        return { status: 'UPLIFTED', percentage: 100, phase: 'uplifted' };
      } else if (upliftedPct > 0) {
        return { status: `UPLIFTING ${upliftedPct}%`, percentage: upliftedPct, phase: 'uplifting' };
      } else {
        return { status: 'PENDING', percentage: 0, phase: 'pending' };
      }
    }

    // Fallback for products without task data
    if (product.source === 'quote') {
      return { status: 'ORDERED', percentage: 0, phase: 'ordered' };
    }

    return { status: 'PENDING', percentage: 0, phase: 'pending' };
  };

  async function updateJobStatus(next: DbJobStatus) {
    if (!row || !userId) return;

    // eslint-disable-next-line no-console

    // Log the status change
    await logJobEdit(row.id, userId, "status", row.status, next);

    // Write to base table; RLS must permit update for current user in your setup.
    const { error } = await supabase
      .from("jobs")
      .update({ status: next })
      .eq("id", row.id);

    if (error) {
      // console.error('Failed to update job status:', error);
      setErr(`Failed to update status: ${error instanceof Error ? error.message : "Unknown error"}`);
      return;
    }

    // Update local state
    setRow({ ...row, status: next });
    // eslint-disable-next-line no-console
  }

  async function _updateLeadInstaller(userId: string | null) {
    if (!row || !canManage) return;

    const { error } = await supabase
      .from("jobs")
      .update({ lead_installer_id: userId })
      .eq("id", row.id);

    if (error) {
      console.error('Failed to update lead installer:', error);
      setErr(`Failed to update lead installer: ${error instanceof Error ? error.message : "Unknown error"}`);
      return;
    }

    // Update local state
    setLeadInstaller(userId);

    // Log the change
    const win = window as unknown as { userId?: string };
    if (win.userId) {
      const oldValue = leadInstaller || "none";
      const newValue = userId || "none";
      await logJobEdit(row.id, win.userId, "lead_installer", oldValue, newValue);
    }
  }

  // Save edited job details
  async function saveEdit() {
    if (!row || !id || !userId) return;

    try {
      // Log changes for each field
      if (editData.title !== (row.title || "")) {
        await logJobEdit(id, userId, "title", row.title, editData.title);
      }

      if (editData.client_name !== (row.client_name || "")) {
        await logJobEdit(id, userId, "client_name", row.client_name, editData.client_name);
      }

      if (editData.reference !== (row.reference || "")) {
        await logJobEdit(id, userId, "reference", row.reference, editData.reference);
      }

      // Update job in database
      const { error } = await supabase
        .from("jobs")
        .update({
          title: editData.title,
          client_name: editData.client_name,
          reference: editData.reference
        })
        .eq("id", id);

      if (error) {
        setErr(`Failed to update job: ${error instanceof Error ? error.message : "Unknown error"}`);
        return;
      }

      // Update local state
      setRow({
        ...row,
        title: editData.title,
        client_name: editData.client_name,
        reference: editData.reference
      });

      setIsEditing(false);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to save changes";
      setErr(errorMessage);
    }
  }

  return (
    <>
      <Head>
        <title>{row ? `Job ${row.reference} • BHIT Work OS` : "Job • BHIT Work OS"}</title>
      </Head>

      {/* Load PDF.js for task generation from documents */}
      <Script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js" strategy="lazyOnload" />
      <Script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js" strategy="lazyOnload" />

      <main style={{
        padding: 16,
        minHeight: '100vh',
        background: '#0f1419',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, sans-serif'
      }}>
        {err && (
          <div style={{ marginBottom: 12, color: "#ff6b6b" }}>
            Error: {err} <button onClick={load}>Retry</button>
          </div>
        )}

        {loading && <div>Loading...</div>}

        {!loading && !row && !err && (
          <div style={{ marginBottom: 12, color: "#ff6b6b" }}>
            Job not found. The job may have been deleted or you may not have permission to view it.
            <div style={{ marginTop: 8 }}>
              <button onClick={load} style={{ marginRight: 8 }}>Retry</button>
              <button onClick={() => router.push('/jobs')}>Back to Jobs</button>
            </div>
          </div>
        )}

        {!loading && row && (
          <>
            {/* Header */}
            <section
              style={{
                display: "grid",
                gridTemplateColumns: "1fr auto",
                alignItems: "center",
                gap: 12,
                maxWidth: 1200,
                margin: "0 auto",
                padding: "12px 16px",
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.08)",
                background: "rgba(255,255,255,0.03)",
                backdropFilter: "blur(6px)",
              }}
            >
              <div>
                {isEditing ? (
                  <div style={{ display: "grid", gap: 8 }}>
                    <input
                      value={editData.reference}
                      onChange={(e) => setEditData({ ...editData, reference: e.target.value })}
                      placeholder="Reference"
                      style={{
                        padding: "6px 10px",
                        borderRadius: 8,
                        border: `1px solid ${theme.colors.border}`,
                        background: "rgba(255,255,255,0.05)",
                        color: theme.colors.text,
                        fontSize: 14
                      }}
                    />
                    <input
                      value={editData.title}
                      onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                      placeholder="Title"
                      style={{
                        padding: "6px 10px",
                        borderRadius: 8,
                        border: `1px solid ${theme.colors.border}`,
                        background: "rgba(255,255,255,0.05)",
                        color: theme.colors.text,
                        fontSize: 18,
                        fontWeight: "bold"
                      }}
                    />
                    <input
                      value={editData.client_name}
                      onChange={(e) => setEditData({ ...editData, client_name: e.target.value })}
                      placeholder="Client Name"
                      style={{
                        padding: "6px 10px",
                        borderRadius: 8,
                        border: `1px solid ${theme.colors.border}`,
                        background: "rgba(255,255,255,0.05)",
                        color: theme.colors.text,
                        fontSize: 14
                      }}
                    />
                  </div>
                ) : (
                  <div>
                    <div style={{ opacity: 0.75, fontSize: 12, marginBottom: 4 }}>Reference</div>
                    <h1 style={{ margin: 0, fontSize: 22, lineHeight: 1.2 }}>
                      {row.reference ?? "—"} — {row.title ?? "—"}
                      <span style={{ opacity: 0.65 }}> • {row.client_name ?? "—"}</span>
                    </h1>
                  </div>
                )}
              </div>

              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <button
                  onClick={() => router.push('/today')}
                  style={{
                    border: `1px solid ${theme.colors.border}`,
                    background: theme.colors.panel,
                    padding: "8px 12px",
                    borderRadius: theme.radii.sm,
                    cursor: "pointer",
                    color: theme.colors.text,
                  }}
                >
                  Today
                </button>
                <button
                  onClick={() => router.push('/jobs')}
                  style={{
                    border: `1px solid ${theme.colors.border}`,
                    background: theme.colors.panel,
                    padding: "8px 12px",
                    borderRadius: theme.radii.sm,
                    cursor: "pointer",
                    color: theme.colors.text,
                  }}
                >
                  All Jobs
                </button>

                {canManage && (
                  isEditing ? (
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        onClick={() => setIsEditing(false)}
                        style={{
                          border: `1px solid ${theme.colors.border}`,
                          background: theme.colors.panel,
                          padding: "8px 12px",
                          borderRadius: theme.radii.sm,
                          cursor: "pointer",
                          color: theme.colors.text,
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={saveEdit}
                        style={{
                          border: `1px solid ${theme.colors.accent}`,
                          background: theme.colors.accent,
                          padding: "8px 12px",
                          borderRadius: theme.radii.sm,
                          cursor: "pointer",
                          color: "#000",
                          fontWeight: "bold"
                        }}
                      >
                        Save
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setIsEditing(true)}
                      style={{
                        border: `1px solid ${theme.colors.accent}`,
                        background: theme.colors.panel,
                        padding: "8px 12px",
                        borderRadius: theme.radii.sm,
                        cursor: "pointer",
                        color: theme.colors.accent,
                      }}
                    >
                      Edit
                    </button>
                  )
                )}

                <StatusPill
                  status={row.status}
                  jobId={row.id}
                  canManage={canManage}
                  onStatusChange={canManage ? updateJobStatus : undefined}
                />

                {canManage && (
                  <button
                    onClick={async () => {
                      if (confirm(`Are you sure you want to delete job "${row.title || row.reference}"? This action cannot be undone.`)) {
                        try {

                          const response = await fetch(`/api/jobs/${row.id}/delete`, {
                            method: 'DELETE',
                            headers: {
                              'Content-Type': 'application/json'
                            }
                          });

                          const result = await response.json();

                          if (!response.ok) {
                            throw new Error(result.error || 'Failed to delete job');
                          }

                          alert('Job deleted successfully');

                          // Force navigation to jobs page
                          window.location.href = '/jobs';
                        } catch (error: unknown) {
                          // console.error('❌ Delete error:', error);
                          alert('Failed to delete job: ' + (error instanceof Error ? error.message : 'Unknown error'));
                        }
                      }
                    }}
                    style={{
                      border: `1px solid ${theme.colors.danger}`,
                      background: 'transparent',
                      padding: "6px 10px",
                      borderRadius: theme.radii.sm,
                      cursor: "pointer",
                      color: theme.colors.danger,
                      fontSize: '12px',
                      fontWeight: 600
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = theme.colors.danger;
                      e.currentTarget.style.color = 'white';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = theme.colors.danger;
                    }}
                  >
                    Delete Job
                  </button>
                )}
              </div>
            </section>

            {/* Tab Navigation */}
            <section style={{ maxWidth: 1200, margin: "16px auto" }}>
              <div style={{
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
                marginBottom: 20,
                background: 'linear-gradient(135deg, #1a1f2e 0%, #242938 100%)',
                borderRadius: '16px',
                padding: '20px',
                border: '1px solid rgba(255,255,255,0.05)',
                boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                overflowX: 'auto',
                WebkitOverflowScrolling: 'touch'
              }}>
                {(Object.keys(TAB_LABELS) as TabType[]).map((tab) => {
                  // Hide edit history tab if user can't view it
                  if (tab === "editHistory" && !canViewHistory) return null;

                  return (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      style={{
                        minHeight: '50px',
                        padding: "12px 20px",
                        borderRadius: 12,
                        border: activeTab === tab ? "2px solid #2196F3" : "2px solid rgba(255,255,255,0.05)",
                        background: activeTab === tab
                          ? "linear-gradient(135deg, rgba(33, 150, 243, 0.2) 0%, rgba(33, 203, 243, 0.1) 100%)"
                          : "rgba(255,255,255,0.03)",
                        color: activeTab === tab ? "#2196F3" : "#ffffff",
                        textDecoration: "none",
                        fontWeight: activeTab === tab ? 700 : 600,
                        cursor: "pointer",
                        transition: "all 0.3s ease",
                        fontSize: '14px',
                        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, sans-serif',
                        flexShrink: 0,
                        whiteSpace: 'nowrap'
                      }}
                      onMouseEnter={(e) => {
                        if (activeTab !== tab) {
                          e.currentTarget.style.background = "rgba(33, 150, 243, 0.1)";
                          e.currentTarget.style.borderColor = "rgba(33, 150, 243, 0.3)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (activeTab !== tab) {
                          e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                          e.currentTarget.style.borderColor = "rgba(255,255,255,0.05)";
                        }
                      }}
                      onTouchStart={() => { }}
                    >
                      {TAB_LABELS[tab]}
                    </button>
                  );
                })}

                <span style={{ marginLeft: "auto" }} />

                <button
                  onClick={async () => {
                    const url = `${window.location.origin}/jobs/${id}`;
                    try {
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      const nav = navigator as unknown as { share?: (data: { title: string; url: string }) => Promise<void>; clipboard: { writeText: (text: string) => Promise<void> } };
                      if ('share' in navigator && nav.share) {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        await nav.share({ title: `Job ${row?.reference}`, url });
                      } else {
                        await nav.clipboard.writeText(url);
                        alert("Link copied.");
                      }
                    } catch {
                      const nav = navigator as unknown as { clipboard: { writeText: (text: string) => Promise<void> } };
                      await nav.clipboard.writeText(url);
                      alert("Link copied.");
                    }
                  }}
                  style={{
                    padding: "8px 12px",
                    borderRadius: 8,
                    border: "1px solid rgba(255,255,255,0.12)",
                    background: "rgba(255,255,255,0.03)",
                    color: theme.colors.text,
                    cursor: "pointer",
                    fontWeight: 600
                  }}
                >
                  Share
                </button>
              </div>

              {/* Tab Content */}
              <div style={{
                background: "rgba(255,255,255,0.02)",
                border: `1px solid ${theme.colors.border}`,
                borderRadius: 12,
                padding: 20,
                minHeight: 400
              }}>
                {activeTab === "tasks" && <TasksTab jobId={id!} />}
                {activeTab === "notes" && <NotesTab jobId={id!} />}
                {activeTab === "photos" && <PhotosTab jobId={id!} />}
                {activeTab === "labour" && <LabourTab jobId={id!} />}
                {activeTab === "overview" && (
                  <div dangerouslySetInnerHTML={{
                    __html: `
                      <style>
                        /* Comprehensive Overview Styles */
                        .overview-container {
                          background: #0f1419;
                          color: #e1e8ed;
                          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, sans-serif;
                          line-height: 1.6;
                          margin: -20px;
                          padding: 0;
                        }

                        .progress-banner {
                          background: linear-gradient(135deg, #16202a 0%, #1a2530 100%);
                          border-bottom: 1px solid #2f3640;
                          padding: 10px 20px;
                          box-shadow:
                            0 4px 20px rgba(0, 0, 0, 0.3),
                            0 0 40px rgba(147, 51, 234, 0.15),
                            inset 0 1px 0 rgba(147, 51, 234, 0.1);
                          position: relative;
                        }

                        .progress-banner::after {
                          content: '';
                          position: absolute;
                          bottom: 0;
                          left: 0;
                          right: 0;
                          height: 1px;
                          background: linear-gradient(90deg, transparent, rgba(147, 51, 234, 0.4), transparent);
                          animation: shimmerPurple 4s infinite;
                        }

                        @keyframes shimmerPurple {
                          0% { transform: translateX(-100%); }
                          100% { transform: translateX(100%); }
                        }

                        .progress-top-row {
                          display: flex;
                          gap: 20px;
                          align-items: stretch;
                          margin-bottom: 10px;
                          width: 100%;
                        }

                        .progress-main {
                          display: flex;
                          flex-direction: column;
                          gap: 6px;
                          align-items: center;
                          min-width: 180px;
                        }

                        .progress-title {
                          font-size: 11px;
                          color: #8899a6;
                          font-weight: 500;
                          text-transform: uppercase;
                          letter-spacing: 0.5px;
                          align-self: flex-start;
                        }

                        .progress-bar-wrapper {
                          display: flex;
                          align-items: center;
                          gap: 12px;
                          width: 100%;
                        }

                        .progress-bar-container {
                          position: relative;
                          height: 12px;
                          flex: 1;
                          background: rgba(255, 255, 255, 0.05);
                          border-radius: 6px;
                          overflow: visible;
                          box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.3);
                        }

                        .progress-bar {
                          position: absolute;
                          top: 0;
                          left: 0;
                          height: 100%;
                          width: 68%;
                          border-radius: 6px;
                          background: linear-gradient(90deg,
                            #ff0000 0%,
                            #ff4444 10%,
                            #ff6600 25%,
                            #ff9900 40%,
                            #ffcc00 55%,
                            #ccff00 70%,
                            #66ff00 85%,
                            #00ff00 100%);
                          box-shadow:
                            0 0 20px rgba(255, 200, 0, 0.5),
                            inset 0 1px 0 rgba(255, 255, 255, 0.3);
                          transition: width 0.3s ease;
                        }

                        .progress-bar::after {
                          content: '';
                          position: absolute;
                          top: 0;
                          left: 0;
                          right: 0;
                          bottom: 0;
                          background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%);
                          animation: shimmer 2s infinite;
                        }

                        @keyframes shimmer {
                          0% { transform: translateX(-100%); }
                          100% { transform: translateX(100%); }
                        }

                        .progress-percentage {
                          font-size: 20px;
                          font-weight: 700;
                          color: #fff;
                          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
                        }

                        .progress-metric {
                          display: flex;
                          flex-direction: column;
                          justify-content: center;
                          padding: 10px 16px;
                          min-width: 130px;
                          height: 65px;
                          background: rgba(255, 255, 255, 0.03);
                          backdrop-filter: blur(10px);
                          -webkit-backdrop-filter: blur(10px);
                          border: 1px solid rgba(255, 255, 255, 0.08);
                          border-radius: 8px;
                          position: relative;
                          overflow: hidden;
                          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                        }

                        .progress-metric.status-critical {
                          animation: pulseCritical 2s infinite;
                          border-color: rgba(244, 33, 46, 0.3);
                        }

                        @keyframes pulseCritical {
                          0%, 100% {
                            box-shadow:
                              0 0 30px rgba(244, 33, 46, 0.4),
                              0 0 60px rgba(244, 33, 46, 0.2),
                              inset 0 1px 0 rgba(255, 255, 255, 0.1);
                          }
                          50% {
                            box-shadow:
                              0 0 40px rgba(244, 33, 46, 0.5),
                              0 0 80px rgba(244, 33, 46, 0.25),
                              inset 0 1px 0 rgba(255, 255, 255, 0.15);
                          }
                        }

                        .metric-status-dot {
                          position: absolute;
                          top: 6px;
                          right: 6px;
                          width: 6px;
                          height: 6px;
                          border-radius: 50%;
                          animation: dotPulse 2s infinite;
                        }

                        .metric-status-dot.critical {
                          background: #f4212e;
                          box-shadow: 0 0 10px rgba(244, 33, 46, 0.8);
                        }

                        @keyframes dotPulse {
                          0%, 100% { transform: scale(1); opacity: 1; }
                          50% { transform: scale(1.3); opacity: 0.7; }
                        }

                        .metric-label {
                          font-size: 10px;
                          color: #8899a6;
                          text-transform: uppercase;
                          letter-spacing: 0.5px;
                        }

                        .metric-value {
                          font-size: 16px;
                          font-weight: 600;
                          color: #fff;
                          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
                        }

                        .quick-actions-row {
                          display: flex;
                          gap: 12px;
                          justify-content: space-between;
                          width: 100%;
                        }

                        .quick-action-btn {
                          flex: 1;
                          padding: 6px 12px;
                          background: rgba(255, 255, 255, 0.05);
                          backdrop-filter: blur(10px);
                          border: 1px solid rgba(255, 255, 255, 0.1);
                          border-radius: 6px;
                          color: #cbd5e0;
                          cursor: pointer;
                          font-size: 11px;
                          font-weight: 500;
                          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                          display: flex;
                          align-items: center;
                          justify-content: center;
                          gap: 6px;
                          position: relative;
                          overflow: hidden;
                          box-shadow:
                            0 4px 6px rgba(0, 0, 0, 0.1),
                            inset 0 1px 0 rgba(255, 255, 255, 0.1);
                        }

                        .quick-action-btn:hover {
                          background: rgba(255, 255, 255, 0.08);
                          border-color: rgba(29, 155, 240, 0.3);
                          color: #4db8ff;
                          transform: translateY(-2px);
                          box-shadow:
                            0 8px 16px rgba(29, 155, 240, 0.15),
                            inset 0 1px 0 rgba(255, 255, 255, 0.2);
                        }

                        .container {
                          padding: 24px;
                        }

                        .dynamic-grid {
                          display: grid;
                          grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
                          gap: 24px;
                          grid-auto-flow: dense;
                        }

                        .card {
                          background: #16202a;
                          border: 1px solid #2f3640;
                          border-radius: 12px;
                          padding: 20px;
                        }

                        .card.wide {
                          grid-column: span 2;
                        }

                        .card-title {
                          font-size: 16px;
                          font-weight: 600;
                          margin-bottom: 20px;
                          color: #fff;
                          display: flex;
                          align-items: center;
                          justify-content: space-between;
                        }

                        .edit-details-btn {
                          padding: 4px 10px;
                          background: transparent;
                          border: 1px solid #3f4650;
                          border-radius: 4px;
                          color: #8899a6;
                          cursor: pointer;
                          font-size: 11px;
                          transition: all 0.2s;
                        }

                        .edit-details-btn:hover {
                          border-color: #1d9bf0;
                          color: #1d9bf0;
                          background: #1d9bf010;
                        }

                        .detail-row {
                          display: flex;
                          justify-content: space-between;
                          align-items: center;
                          padding: 10px 0;
                          border-bottom: 1px solid #253341;
                        }

                        .detail-row:last-child {
                          border-bottom: none;
                        }

                        .detail-label {
                          color: #8899a6;
                          font-size: 14px;
                        }

                        .detail-value {
                          color: #e1e8ed;
                          font-size: 14px;
                          font-weight: 500;
                        }

                        .dropdown-select {
                          background: #253341;
                          color: #e1e8ed;
                          border: 1px solid #3f4650;
                          border-radius: 6px;
                          padding: 6px 12px;
                          font-size: 13px;
                          cursor: pointer;
                          min-width: 150px;
                        }

                        .dropdown-select:hover {
                          border-color: #1d9bf0;
                        }

                        .contacts-container {
                          width: 100%;
                          margin-top: 8px;
                        }

                        .contact-item {
                          display: flex;
                          justify-content: space-between;
                          align-items: center;
                          padding: 8px 12px;
                          background: #0f1419;
                          border-radius: 4px;
                          margin-bottom: 6px;
                        }

                        .contact-info {
                          font-size: 13px;
                          color: #e1e8ed;
                        }

                        .contact-role {
                          font-size: 11px;
                          color: #8899a6;
                          margin-left: 8px;
                        }

                        .contact-delete {
                          color: #8899a6;
                          cursor: pointer;
                          padding: 0 4px;
                          font-size: 16px;
                        }

                        .contact-delete:hover {
                          color: #f4212e;
                        }

                        .add-contact-btn {
                          width: 100%;
                          padding: 8px;
                          background: transparent;
                          border: 1px dashed #3f4650;
                          border-radius: 4px;
                          color: #8899a6;
                          cursor: pointer;
                          font-size: 12px;
                          margin-top: 8px;
                          transition: all 0.2s;
                        }

                        .add-contact-btn:hover {
                          border-color: #1d9bf0;
                          color: #1d9bf0;
                        }

                        .issue-flag {
                          cursor: pointer;
                          text-decoration: underline;
                        }

                        .issue-flag:hover {
                          opacity: 0.8;
                        }

                        .delay-item {
                          background: #0f1419;
                          border-radius: 6px;
                          padding: 12px;
                          margin-bottom: 12px;
                          border-left: 3px solid #f4212e;
                        }

                        .delay-header {
                          display: flex;
                          justify-content: space-between;
                          align-items: center;
                          margin-bottom: 8px;
                        }

                        .delay-date {
                          font-size: 13px;
                          color: #8899a6;
                          font-weight: 500;
                        }

                        .delay-status {
                          padding: 3px 8px;
                          border-radius: 10px;
                          font-size: 11px;
                          font-weight: 600;
                          text-transform: uppercase;
                        }

                        .delay-reason {
                          font-size: 13px;
                          color: #e1e8ed;
                          line-height: 1.4;
                        }

                        .products-container {
                          max-height: 280px;
                          overflow-y: auto;
                          padding-right: 8px;
                        }

                        .product-item {
                          display: flex;
                          justify-content: space-between;
                          align-items: center;
                          padding: 12px 0;
                          border-bottom: 1px solid #253341;
                        }

                        .product-item:last-child {
                          border-bottom: none;
                        }

                        .product-name {
                          color: #e1e8ed;
                          font-size: 14px;
                          font-weight: 500;
                          font-family: monospace;
                        }

                        .product-status {
                          padding: 4px 10px;
                          border-radius: 12px;
                          font-size: 11px;
                          font-weight: 600;
                          text-transform: uppercase;
                        }

                        .status-ordered {
                          background: #b87a0020;
                          color: #b87a00;
                        }

                        .status-delivered {
                          background: #00ba7c20;
                          color: #00ba7c;
                        }

                        .status-pending {
                          background: #8899a620;
                          color: #8899a6;
                        }

                        .status-complete {
                          background: #00ba7c20;
                          color: #00ba7c;
                          font-weight: 700;
                        }

                        .status-building {
                          background: #1d9bf020;
                          color: #1d9bf0;
                          font-weight: 600;
                        }

                        .status-placed {
                          background: #9333ea20;
                          color: #9333ea;
                          font-weight: 600;
                        }

                        .status-placing {
                          background: #9333ea15;
                          color: #9333ea;
                        }

                        .status-uplifted {
                          background: #f59e0b20;
                          color: #f59e0b;
                          font-weight: 600;
                        }

                        .status-uplifting {
                          background: #f59e0b15;
                          color: #f59e0b;
                        }

                        .status-not-started {
                          background: #64748b20;
                          color: #64748b;
                        }

                        .timeline-item {
                          display: flex;
                          align-items: center;
                          padding: 12px;
                          background: #0f1419;
                          border-radius: 6px;
                          margin-bottom: 12px;
                          transition: all 0.2s;
                        }

                        .timeline-item:hover {
                          background: #1a2530;
                          transform: translateX(4px);
                        }

                        .timeline-date {
                          min-width: 100px;
                          color: #8899a6;
                          font-size: 13px;
                        }

                        .timeline-content {
                          flex: 1;
                          margin-left: 20px;
                          color: #e1e8ed;
                          font-size: 14px;
                        }

                        .timeline-status {
                          padding: 4px 10px;
                          background: #253341;
                          color: #8899a6;
                          border-radius: 12px;
                          font-size: 12px;
                        }

                        .timeline-status.completed {
                          background: #00ba7c20;
                          color: #00ba7c;
                        }
                      </style>

                      <div class="overview-container">
                        <!-- PROGRESS BANNER -->
                        <div class="progress-banner">
                          <div class="progress-top-row">
                            <!-- Progress Bar -->
                            <div class="progress-main">
                              <div class="progress-title">Progress</div>
                              <div class="progress-bar-wrapper">
                                <div class="progress-bar-container">
                                  <div class="progress-bar"></div>
                                </div>
                                <div class="progress-percentage">68%</div>
                              </div>
                            </div>

                            <!-- Metric Boxes -->
                            <div class="progress-metric status-critical">
                              <span class="metric-status-dot critical"></span>
                              <div class="metric-label">Time Left</div>
                              <div class="metric-value">3.5 days</div>
                            </div>

                            <div class="progress-metric">
                              <div class="metric-label">Budget</div>
                              <div class="metric-value">£18.5K</div>
                              <div style="font-size: 9px; color: #536471;">of £52K</div>
                            </div>

                            <div class="progress-metric">
                              <div class="metric-label">Tasks</div>
                              <div class="metric-value">16/24</div>
                            </div>

                            <div class="progress-metric">
                              <div class="metric-label">Completion</div>
                              <div class="metric-value">04/10/25</div>
                            </div>
                          </div>

                          <!-- Quick Actions -->
                          <div class="quick-actions-row">
                            <button class="quick-action-btn" onclick="setActiveTab('tasks')">
                              <span style="font-size: 13px;">📋</span> Tasks
                            </button>
                            <button class="quick-action-btn" onclick="setActiveTab('photos')">
                              <span style="font-size: 13px;">📸</span> Photos
                            </button>
                            <button class="quick-action-btn" onclick="setActiveTab('notes')">
                              <span style="font-size: 13px;">📝</span> Notes
                            </button>
                            <button class="quick-action-btn" onclick="setActiveTab('documents')">
                              <span style="font-size: 13px;">📄</span> Docs
                            </button>
                            <button class="quick-action-btn" onclick="setActiveTab('floorplan')">
                              <span style="font-size: 13px;">📐</span> Floor Plan
                            </button>
                            <button class="quick-action-btn" onclick="setActiveTab('labour')">
                              <span style="font-size: 13px;">👷</span> Labour
                            </button>
                            <button class="quick-action-btn">
                              <span style="font-size: 13px;">📊</span> Reports
                            </button>
                            <button class="quick-action-btn">
                              <span style="font-size: 13px;">💷</span> Invoice
                            </button>
                          </div>
                        </div>

                        <!-- Main Content -->
                        <div class="container">
                          <div class="dynamic-grid">
                            <!-- Job Details with Edit -->
                            <div class="card">
                              <h3 class="card-title">
                                Job Details
                                <button class="edit-details-btn">✏️ Edit</button>
                              </h3>
                              <div class="detail-row">
                                <span class="detail-label">Reference:</span>
                                <span class="detail-value">${row?.reference || "—"}</span>
                              </div>
                              <div class="detail-row">
                                <span class="detail-label">Title:</span>
                                <span class="detail-value">${row?.title || "—"}</span>
                              </div>
                              <div class="detail-row">
                                <span class="detail-label">Client:</span>
                                <span class="detail-value">${row?.client_name || "—"}</span>
                              </div>
                              <div class="detail-row">
                                <span class="detail-label">Status:</span>
                                <span class="detail-value">${getStatusLabel(row?.status)}</span>
                              </div>
                              <div class="detail-row">
                                <span class="detail-label">Lead Installer/Supervisor:</span>
                                <select class="dropdown-select">
                                  <option value="">Select...</option>
                                  <option value="john_smith">John Smith</option>
                                  <option value="sarah_jones">Sarah Jones</option>
                                  <option value="mike_wilson">Mike Wilson</option>
                                </select>
                              </div>

                              <!-- Multiple Site Contacts -->
                              <div class="detail-row" style="flex-direction: column; align-items: flex-start;">
                                <span class="detail-label" style="margin-bottom: 8px;">Site Contacts:</span>
                                <div class="contacts-container">
                                  <div class="contact-item">
                                    <div>
                                      <span class="contact-info">Sarah Johnson • 07700 900123</span>
                                      <span class="contact-role">Primary</span>
                                    </div>
                                    <span class="contact-delete">×</span>
                                  </div>
                                  <div class="contact-item">
                                    <div>
                                      <span class="contact-info">Mike Wilson • 07700 900456</span>
                                      <span class="contact-role">Secondary</span>
                                    </div>
                                    <span class="contact-delete">×</span>
                                  </div>
                                  <button class="add-contact-btn">+ Add Contact</button>
                                </div>
                              </div>

                              <!-- Issue Flags -->
                              <div class="detail-row">
                                <span class="detail-label" style="color: #f4212e;">Access Issues:</span>
                                <span class="detail-value issue-flag" style="color: #f4212e;">⚠ Flagged</span>
                              </div>
                              <div class="detail-row">
                                <span class="detail-label" style="color: #f4212e;">Out of Hours:</span>
                                <span class="detail-value issue-flag" style="color: #f4212e;">⚠ Required</span>
                              </div>
                            </div>

                            <!-- Labour Allocation -->
                            <div class="card">
                              <h3 class="card-title">Labour Allocation</h3>
                              <p style="color: #8899a6; font-size: 13px; margin-bottom: 16px;">Pulled from SmartQuote</p>

                              <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #253341;">
                                <span style="color: #8899a6; font-size: 13px;">Man in Van:</span>
                                <span style="color: #e1e8ed; font-size: 13px; font-weight: 500;">0</span>
                              </div>
                              <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #253341;">
                                <span style="color: #8899a6; font-size: 13px;">On Foot:</span>
                                <span style="color: #e1e8ed; font-size: 13px; font-weight: 500;">0</span>
                              </div>
                              <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #253341;">
                                <span style="color: #8899a6; font-size: 13px;">Supervisor:</span>
                                <span style="color: #e1e8ed; font-size: 13px; font-weight: 500;">0</span>
                              </div>
                              <div style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #253341;">
                                <span style="color: #8899a6; font-size: 13px;">Total Manpower/Day:</span>
                                <span style="color: #1d9bf0; font-size: 13px; font-weight: 600;">0 allocated</span>
                              </div>

                              <button style="margin-top: 16px; padding: 10px 24px; background: #1d9bf0; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 500; width: 100%;">+ Schedule Labour</button>
                            </div>

                            <!-- Delays Tracking -->
                            <div class="card">
                              <h3 class="card-title">
                                Delays
                                <span style="font-size: 11px; color: #f4212e; font-weight: 400;">2 logged</span>
                              </h3>
                              <div class="delay-item">
                                <div class="delay-header">
                                  <span class="delay-date">28 Sep - 2.5 hrs lost</span>
                                  <span class="delay-status" style="background: #f4212e20; color: #f4212e;">Critical</span>
                                </div>
                                <div class="delay-reason">Materials delivery delayed - supplier issue with vinyl flooring</div>
                              </div>
                              <div class="delay-item">
                                <div class="delay-header">
                                  <span class="delay-date">30 Sep - 1 hr lost</span>
                                  <span class="delay-status" style="background: #ffa50020; color: #ffa500;">Minor</span>
                                </div>
                                <div class="delay-reason">Site access delayed - security clearance issue</div>
                              </div>
                              <button style="width: 100%; padding: 10px; background: transparent; border: 1px dashed #3f4650; border-radius: 6px; color: #8899a6; cursor: pointer; font-size: 13px; margin-top: 12px;">+ Log Delay</button>
                            </div>

                            <!-- Products on Job -->
                            <div class="card wide">
                              <h3 class="card-title">
                                Products on Job
                                <span style="font-size: 11px; color: #8899a6; font-weight: 400;">
                                  ${products.length} items • Status from Tasks
                                </span>
                              </h3>
                              <div class="products-container">
                                ${loadingProducts ?
                        '<div style="text-align: center; padding: 20px; color: #8899a6;">Loading products...</div>' :
                        products.length === 0 ?
                          '<div style="text-align: center; padding: 20px; color: #8899a6;">No products found for this job</div>' :
                          products.map(product => {
                            const progressData = getProductStatusAndProgress(product);
                            const statusClass = 'status-' + progressData.phase.replace(/\s+/g, '-').toLowerCase();
                            return `
                                        <div class="product-item">
                                          <div class="product-name">${product.quantity}no. ${product.name}</div>
                                          <span class="product-status ${statusClass}">${progressData.status}</span>
                                        </div>
                                      `;
                          }).join('')
                      }
                              </div>
                            </div>

                            <!-- Timeline -->
                            <div class="card wide">
                              <h3 class="card-title">Recent Activity & Milestones</h3>
                              <div class="timeline-item">
                                <span class="timeline-date">Today</span>
                                <span class="timeline-content">Review floor plan revisions with client</span>
                                <span class="timeline-status">Pending</span>
                              </div>
                              <div class="timeline-item">
                                <span class="timeline-date">Yesterday</span>
                                <span class="timeline-content">25no. VF-2000 Vinyl Flooring delivered</span>
                                <span class="timeline-status completed">Completed</span>
                              </div>
                              <div class="timeline-item">
                                <span class="timeline-date">04 Oct</span>
                                <span class="timeline-content">Project completion deadline</span>
                                <span class="timeline-status">Milestone</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <script>
                        // Make setActiveTab function available to inline handlers
                        window.setActiveTabFromOverview = function(tab) {
                          // This would need to be connected to the parent React component
                        };
                      </script>
                    `
                  }} />
                )}
                {activeTab === "floorplan" && <FloorPlanTab jobId={id!} canManage={canManage} />}
                {activeTab === "documents" && <DocumentsTab jobId={id!} canManage={canUpload} />}
                {activeTab === "editHistory" && <EditHistoryTab jobId={id!} canView={canViewHistory} />}
              </div>
            </section>
          </>
        )}
      </main>
    </>
  );
}