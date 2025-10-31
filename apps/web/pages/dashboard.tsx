import Link from "next/link";
import { useRouter } from "next/router";
import React, { useState, useEffect } from "react";

import StatusPill, { JobStatus } from '../components/jobs/StatusPill';
import LabourCalendarOverview from '../components/LabourCalendarOverview';
import { useDashboardData } from '../hooks/useDashboardData';
import { supabase } from "../lib/supabaseClient";
import { theme } from "../lib/theme";

// Metric Card Component
function MetricCard({ value, label, accent = false, percentage = false, currency = false }: {
  value: string | number;
  label: string;
  accent?: boolean;
  percentage?: boolean;
  currency?: boolean;
}) {
  const formatValue = () => {
    if (currency) return `£${value}k`;
    if (percentage) return `${value}%`;
    return value;
  };

  return (
    <div className="glassmorphic-panel glassmorphic-base" style={{
      textAlign: "center",
      minHeight: 120,
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      boxSizing: 'border-box',
      width: '100%'
    }}>
      <div style={{
        fontSize: accent ? "clamp(24px, 6vw, 36px)" : "clamp(20px, 5vw, 32px)",
        fontWeight: 700,
        color: accent ? theme.colors.accent : theme.colors.text,
        marginBottom: 8,
        lineHeight: 1
      }}>
        {formatValue()}
      </div>
      <div style={{
        fontSize: "clamp(10px, 2vw, 12px)",
        color: theme.colors.textSubtle,
        textTransform: "uppercase",
        letterSpacing: 0.5,
        lineHeight: 1.4
      }}>
        {label}
      </div>
    </div>
  );
}


// Ring Gauge Component
function RingGauge({ percentage, color, size = 80 }: {
  percentage: number;
  color: string;
  size?: number;
}) {
  const radius = (size - 8) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={theme.colors.border}
          strokeWidth={4}
          fill="transparent"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={4}
          fill="transparent"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <div style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        fontSize: 18,
        fontWeight: 700,
        color: theme.colors.text
      }}>
        {percentage}%
      </div>
    </div>
  );
}


// Main Dashboard Component - NO NAVBAR (it comes from _app.tsx)
export default function Dashboard() {
  const router = useRouter();
  const { data: dashboardData, loading: dashboardLoading } = useDashboardData();
  const [currentTime, setCurrentTime] = useState("");
  const [activeJobs, setActiveJobs] = useState<Array<{ id: string; reference?: string; title?: string; status?: string; client_name?: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [showQuickAddModal, setShowQuickAddModal] = useState(false);
  const [quickAddForm, setQuickAddForm] = useState({
    date: new Date().toISOString().split('T')[0],
    reference: '',
    projectManager: '',
    jobDetail: '',
    address: '',
    image: null as File | null
  });

  useEffect(() => {
    const updateTime = () => {
      setCurrentTime(new Date().toLocaleTimeString("en-GB", { 
        hour: "2-digit", 
        minute: "2-digit" 
      }));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch active jobs from database
  const fetchActiveJobs = React.useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("jobs")
        .select("id, reference, title, client_name, status")
        .in("status", ["planned", "in_progress", "snagging"])
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .limit(3);

      if (error) {
        console.error("Error fetching active jobs:", error);
        setActiveJobs([]);
      } else {
        // Ensure unique jobs by ID to prevent duplicates
        const uniqueJobs = data ? data.filter((job, index, self) =>
          index === self.findIndex(j => j.id === job.id)
        ) : [];
        // eslint-disable-next-line no-console
        console.log('Dashboard: Fetched jobs data:', data);
        // eslint-disable-next-line no-console
        console.log('Dashboard: Unique jobs:', uniqueJobs);
        setActiveJobs(uniqueJobs);
      }
    } catch (err) {
      console.error("Error fetching active jobs:", err);
      setActiveJobs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActiveJobs();
  }, [fetchActiveJobs]);

  // Status mapping for UI display
  const getStatusVariant = (status: string | null): JobStatus => {
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

  const handleQuickAddJob = async () => {
    try {
      // Create job entry
      const jobData = {
        reference: quickAddForm.reference,
        title: quickAddForm.jobDetail,
        client_name: 'Quick Add Job',
        address: quickAddForm.address,
        project_manager: quickAddForm.projectManager,
        scheduled_date: quickAddForm.date,
        status: 'planned',
        created_at: new Date().toISOString(),
        created_by: 'Dashboard User'
      };

      const { data, error } = await supabase
        .from("jobs")
        .insert([jobData])
        .select()
        .single();

      if (error) {
        console.error("Error creating job:", error);
        alert("Error creating job: " + error.message);
        return;
      }

      // Handle image upload if provided
      if (quickAddForm.image && data) {
        const fileName = `${data.id}/${Date.now()}-${quickAddForm.image.name}`;
        const { error: uploadError } = await supabase.storage
          .from('job-photos')
          .upload(fileName, quickAddForm.image);

        if (uploadError) {
          console.error("Error uploading image:", uploadError);
        }
      }

      // Reset form and close modal
      setQuickAddForm({
        date: new Date().toISOString().split('T')[0],
        reference: '',
        projectManager: '',
        jobDetail: '',
        address: '',
        image: null
      });
      setShowQuickAddModal(false);

      // Refresh active jobs
      const { data: updatedJobs } = await supabase
        .from("jobs")
        .select("id, reference, title, client_name, status")
        .in("status", ["planned", "in_progress", "snagging"])
        .order("created_at", { ascending: false })
        .limit(3);
      
      if (updatedJobs) {
        setActiveJobs(updatedJobs);
      }

      alert("Job created successfully!");
    } catch (err) {
      console.error("Error creating job:", err);
      alert("Error creating job");
    }
  };


  return (
    <div style={{ 
      padding: 24, 
      width: '100%', 
      maxWidth: '100vw', 
      overflowX: 'hidden',
      boxSizing: 'border-box'
    }}>
      {/* Header with time */}
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: 32,
        flexWrap: "wrap",
        gap: 16
      }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <h1 style={{
            fontSize: "clamp(24px, 5vw, 32px)",
            fontWeight: 700,
            color: theme.colors.text,
            margin: 0,
            marginBottom: 4,
            lineHeight: 1.2
          }}>
            BHIT Ops Dashboard
          </h1>
        </div>
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          fontSize: "clamp(14px, 3vw, 18px)",
          color: theme.colors.textSubtle,
          flexWrap: "wrap"
        }}>
          <button
            onClick={() => setShowQuickAddModal(true)}
            className="glassmorphic-button glassmorphic-base glassmorphic-glow-cyan"
            style={{
              padding: "12px 20px",
              fontSize: "14px",
              fontWeight: 600,
              borderRadius: "999px",
              border: "none",
              cursor: "pointer",
              transition: "all 0.3s ease"
            }}
          >
            ⚡ Quick Add
          </button>
          <div style={{ fontWeight: 600 }}>{currentTime}</div>
        </div>
      </div>

      {/* Top Row KPIs */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(min(140px, 100%), 1fr))",
        gap: 16,
        marginBottom: 24,
        width: '100%'
      }}>
        <MetricCard value={dashboardData?.jobsInProgress || 0} label="Jobs In Progress" />
        <MetricCard value={dashboardData?.quotesPending || 0} label="Quotes Pending" />
        <div className="glassmorphic-panel glassmorphic-base" style={{
          textAlign: "center",
          minHeight: 120,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center"
        }}>
          <RingGauge percentage={dashboardData?.crewUtilization || 0} color={theme.colors.accent} size={60} />
          <div style={{
            fontSize: 12,
            color: theme.colors.textSubtle,
            textTransform: "uppercase",
            letterSpacing: 0.5,
            marginTop: 8
          }}>
            Crew Utilization
          </div>
        </div>
        <MetricCard value={dashboardData?.vehiclesInUse || 0} label="Vehicles In Use" />
        <MetricCard value={dashboardData?.wasteLoadsToday || 0} label="Waste Loads Booked" />
        <MetricCard value={dashboardData?.avgBufferUsed || 0} label="Avg Buffer Used" percentage />
        <MetricCard value={(dashboardData?.netMargin || 0) / 1000} label="Net Margin" currency accent />
      </div>

      {/* Main Content Grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(min(400px, 100%), 1fr))",
        gap: 24,
        width: '100%'
      }}>
        <div className="glassmorphic-panel glassmorphic-base" style={{
          height: "fit-content",
          width: '100%',
          boxSizing: 'border-box'
        }}>
          <div style={{
            fontSize: "clamp(16px, 3vw, 18px)",
            fontWeight: 600,
            color: theme.colors.text,
            marginBottom: 16
          }}>
            Activity Feed
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {!dashboardData?.feed || dashboardData.feed.length === 0 ? (
              <div style={{
                color: theme.colors.textSubtle,
                fontSize: 14,
                textAlign: 'center',
                padding: '20px 0'
              }}>
                No recent activity found.
              </div>
            ) : (
              dashboardData.feed.map((item) => (
                <div key={item.id} style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 12,
                  padding: "12px 0",
                  borderBottom: `1px solid ${theme.colors.border}`,
                }}>
                  <div style={{
                    fontSize: "clamp(14px, 3vw, 16px)",
                    color: theme.colors.accent,
                    minWidth: 20,
                    textAlign: 'center'
                  }}>
                    {item.text.includes('Quote') ? '↗' : item.text.includes('delay') ? '⚠' : item.text.includes('van') || item.text.includes('load') ? '🚛' : '↗'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: "clamp(12px, 2.5vw, 14px)",
                      color: theme.colors.text,
                      marginBottom: 4,
                      wordBreak: 'break-word'
                    }}>
                      {item.text}
                    </div>
                    <div style={{
                      fontSize: "clamp(10px, 2vw, 12px)",
                      color: theme.colors.textSubtle
                    }}>
                      {new Date(item.occurred_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="glassmorphic-panel glassmorphic-base">
          <div style={{
            fontSize: 18,
            fontWeight: 600,
            color: theme.colors.text,
            marginBottom: 16,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 8
          }}>
            <span>Active Jobs</span>
            <button
              onClick={() => router.push('/jobs')}
              style={{
                background: "transparent",
                border: `1px solid ${theme.colors.border}`,
                color: theme.colors.text,
                padding: "8px 12px",
                borderRadius: 4,
                fontSize: 12,
                cursor: "pointer",
                minHeight: 32
              }}
            >
              View All
            </button>
          </div>
          <div style={{ display: "grid", gap: 12 }}>
            {loading ? (
              <div style={{ color: theme.colors.textSubtle }}>Loading jobs...</div>
            ) : activeJobs.length === 0 ? (
              <div style={{ color: theme.colors.textSubtle }}>No active jobs found.</div>
            ) : (
              activeJobs.map((job) => (
                <div 
                  key={job.id} 
                  style={{
                    padding: 12,
                    backgroundColor: theme.colors.panelAlt,
                    borderRadius: theme.radii.sm,
                    border: `1px solid ${theme.colors.border}`,
                  }}
                >
                  <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: 12,
                    flexWrap: "wrap"
                  }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <Link href={`/job/${job.id}`} style={{ 
                        fontWeight: 600, 
                        fontSize: 14, 
                        color: theme.colors.text, 
                        textDecoration: 'none', 
                        marginBottom: 4, 
                        display: 'block',
                        wordBreak: 'break-word'
                      }}>
                        {job.reference ? `${job.reference} — ` : ""}{job.title}
                      </Link>
                      <div style={{ 
                        fontSize: 12, 
                        color: theme.colors.textSubtle,
                        wordBreak: 'break-word'
                      }}>
                        {job.client_name || "No client"}
                      </div>
                    </div>
                    <div style={{ flexShrink: 0 }}>
                      <StatusPill
                        status={getStatusVariant(job.status || null)}
                        jobId={job.id}
                        canManage={true}
                        onStatusChange={fetchActiveJobs}
                      />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Advanced Analytics Section - Master-ops-dash components */}
      {!dashboardLoading && dashboardData && (
        <div style={{
          marginTop: 32,
          width: '100%'
        }}>
          <LabourCalendarOverview />
        </div>
      )}


      {/* Quick Add Job Modal */}
      {showQuickAddModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: 20
        }}>
          <div className="glassmorphic-panel glassmorphic-base" style={{
            maxWidth: 500,
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            borderRadius: theme.radii.lg
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 24
            }}>
              <h3 style={{ 
                margin: 0, 
                color: theme.colors.text,
                fontSize: 'clamp(18px, 4vw, 24px)'
              }}>
                ⚡ Quick Add Job
              </h3>
              <button
                onClick={() => setShowQuickAddModal(false)}
                className="glassmorphic-button glassmorphic-base"
                style={{
                  padding: 8,
                  borderRadius: '50%',
                  border: 'none',
                  cursor: 'pointer',
                  color: theme.colors.text
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'grid', gap: 16 }}>
              <div>
                <label style={{ 
                  display: 'block', 
                  marginBottom: 8, 
                  color: theme.colors.text,
                  fontWeight: 600,
                  fontSize: 'clamp(12px, 2.5vw, 14px)'
                }}>
                  Date *
                </label>
                <input
                  type="date"
                  value={quickAddForm.date}
                  onChange={(e) => setQuickAddForm({...quickAddForm, date: e.target.value})}
                  className="glassmorphic-dropdown glassmorphic-base"
                  required
                  style={{ border: 'none', color: theme.colors.text, fontSize: '14px' }}
                />
              </div>

              <div>
                <label style={{ 
                  display: 'block', 
                  marginBottom: 8, 
                  color: theme.colors.text,
                  fontWeight: 600,
                  fontSize: 'clamp(12px, 2.5vw, 14px)'
                }}>
                  Reference Number *
                </label>
                <input
                  type="text"
                  value={quickAddForm.reference}
                  onChange={(e) => setQuickAddForm({...quickAddForm, reference: e.target.value})}
                  className="glassmorphic-dropdown glassmorphic-base"
                  placeholder="e.g., JOB-2024-001"
                  required
                  style={{ border: 'none', color: theme.colors.text, fontSize: '14px' }}
                />
              </div>

              <div>
                <label style={{ 
                  display: 'block', 
                  marginBottom: 8, 
                  color: theme.colors.text,
                  fontWeight: 600,
                  fontSize: 'clamp(12px, 2.5vw, 14px)'
                }}>
                  Project Manager *
                </label>
                <input
                  type="text"
                  value={quickAddForm.projectManager}
                  onChange={(e) => setQuickAddForm({...quickAddForm, projectManager: e.target.value})}
                  className="glassmorphic-dropdown glassmorphic-base"
                  placeholder="Project Manager Name"
                  required
                  style={{ border: 'none', color: theme.colors.text, fontSize: '14px' }}
                />
              </div>

              <div>
                <label style={{ 
                  display: 'block', 
                  marginBottom: 8, 
                  color: theme.colors.text,
                  fontWeight: 600,
                  fontSize: 'clamp(12px, 2.5vw, 14px)'
                }}>
                  Job Details *
                </label>
                <textarea
                  value={quickAddForm.jobDetail}
                  onChange={(e) => setQuickAddForm({...quickAddForm, jobDetail: e.target.value})}
                  className="glassmorphic-dropdown glassmorphic-base"
                  placeholder="Describe the job details..."
                  required
                  rows={3}
                  style={{ 
                    border: 'none', 
                    color: theme.colors.text, 
                    fontSize: '14px',
                    resize: 'vertical'
                  }}
                />
              </div>

              <div>
                <label style={{ 
                  display: 'block', 
                  marginBottom: 8, 
                  color: theme.colors.text,
                  fontWeight: 600,
                  fontSize: 'clamp(12px, 2.5vw, 14px)'
                }}>
                  Address *
                </label>
                <textarea
                  value={quickAddForm.address}
                  onChange={(e) => setQuickAddForm({...quickAddForm, address: e.target.value})}
                  className="glassmorphic-dropdown glassmorphic-base"
                  placeholder="Full job address..."
                  required
                  rows={2}
                  style={{ 
                    border: 'none', 
                    color: theme.colors.text, 
                    fontSize: '14px',
                    resize: 'vertical'
                  }}
                />
              </div>

              <div>
                <label style={{ 
                  display: 'block', 
                  marginBottom: 8, 
                  color: theme.colors.text,
                  fontWeight: 600,
                  fontSize: 'clamp(12px, 2.5vw, 14px)'
                }}>
                  Add Image (Optional)
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setQuickAddForm({...quickAddForm, image: e.target.files?.[0] || null})}
                  className="glassmorphic-dropdown glassmorphic-base"
                  style={{ 
                    border: 'none', 
                    color: theme.colors.text, 
                    fontSize: '14px',
                    cursor: 'pointer'
                  }}
                />
              </div>

              <div style={{
                display: 'flex',
                gap: 12,
                justifyContent: 'flex-end',
                marginTop: 8
              }}>
                <button
                  onClick={() => setShowQuickAddModal(false)}
                  className="glassmorphic-button glassmorphic-base"
                  style={{
                    padding: "12px 20px",
                    fontSize: "14px",
                    border: 'none',
                    cursor: 'pointer',
                    color: theme.colors.textSubtle
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleQuickAddJob}
                  className="glassmorphic-button glassmorphic-base glassmorphic-glow-green"
                  style={{
                    padding: "12px 24px",
                    fontSize: "14px",
                    fontWeight: 600,
                    border: 'none',
                    cursor: 'pointer'
                  }}
                  disabled={!quickAddForm.reference || !quickAddForm.projectManager || !quickAddForm.jobDetail || !quickAddForm.address}
                >
                  💾 Save Job
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}