import React, { useState, useEffect, useCallback } from 'react';

import { supabase } from '@/lib/supabaseClient';

interface DashboardSummary {
  job_id: string;
  reference: string;
  location: string;
  client_name: string;
  job_status: string;
  start_date: string;
  end_date: string;
  quoted_amount: number;
  completion_percentage: number;
  quality_score: number;
  total_milestones: number;
  completed_milestones: number;
  delayed_milestones: number;
  total_spent: number;
  active_alerts: number;
  critical_alerts: number;
  last_report_date: string;
  schedule_status: 'on_track' | 'at_risk' | 'overdue';
}

interface ProgressMetric {
  id: string;
  metric_type: string;
  metric_value: number;
  target_value: number;
  unit: string;
  recorded_at: string;
}

interface Alert {
  id: string;
  alert_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  status: string;
  created_at: string;
}

const METRIC_COLORS = {
  completion_percentage: '#22c55e',
  quality_score: '#3b82f6',
  safety_incidents: '#ef4444',
  budget_variance: '#f59e0b',
  schedule_variance: '#8b5cf6',
  labor_efficiency: '#06b6d4',
  material_waste: '#f97316',
  client_satisfaction: '#ec4899'
};

const ALERT_COLORS = {
  low: '#22c55e',
  medium: '#f59e0b',
  high: '#ef4444',
  critical: '#dc2626'
};

const SCHEDULE_STATUS_COLORS = {
  on_track: '#22c55e',
  at_risk: '#f59e0b',
  overdue: '#ef4444'
};

export default function ConstructionProgressDashboard() {
  const [jobs, setJobs] = useState<DashboardSummary[]>([]);
  const [selectedJob, setSelectedJob] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<ProgressMetric[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'metrics' | 'alerts' | 'reports'>('overview');

  const loadDashboardData = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('construction_dashboard_summary')
        .select('*')
        .order('completion_percentage', { ascending: false });

      if (error) throw error;
      setJobs(data || []);

      if (data && data.length > 0 && !selectedJob) {
        setSelectedJob(data[0].job_id);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedJob]);

  const loadJobDetails = useCallback(async (jobId: string) => {
    try {
      // Load metrics
      const { data: metricsData, error: metricsError } = await supabase
        .from('construction_progress_metrics')
        .select('*')
        .eq('job_id', jobId)
        .order('recorded_at', { ascending: false })
        .limit(20);

      if (metricsError) throw metricsError;
      setMetrics(metricsData || []);

      // Load alerts
      const { data: alertsData, error: alertsError } = await supabase
        .from('construction_alerts')
        .select('*')
        .eq('job_id', jobId)
        .eq('status', 'open')
        .order('created_at', { ascending: false });

      if (alertsError) throw alertsError;
      setAlerts(alertsData || []);
    } catch (error) {
      console.error('Error loading job details:', error);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  useEffect(() => {
    if (selectedJob) {
      loadJobDetails(selectedJob);
    }
  }, [selectedJob, loadJobDetails]);

  function getProgressColor(percentage: number): string {
    if (percentage >= 90) return '#22c55e';
    if (percentage >= 70) return '#3b82f6';
    if (percentage >= 50) return '#f59e0b';
    return '#ef4444';
  }

  function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP'
    }).format(amount);
  }

  function formatDate(date: string): string {
    return new Date(date).toLocaleDateString('en-GB');
  }

  const selectedJobData = jobs.find(job => job.job_id === selectedJob);

  if (loading) {
    return (
      <div style={{ padding: 24 }}>
        <div style={{ fontWeight: 800, fontSize: 24, marginBottom: 24 }}>
          Construction Progress Dashboard
        </div>
        <div>Loading...</div>
      </div>
    );
  }

  return (
    <div style={{
      padding: 24,
      background: '#0b1118',
      color: '#e8eef6',
      minHeight: '100vh'
    }}>
      <div style={{ fontWeight: 800, fontSize: 24, marginBottom: 24 }}>
        Construction Progress Dashboard
      </div>

      {/* Job Selection Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
        gap: 16,
        marginBottom: 32
      }}>
        {jobs.map(job => (
          <div
            key={job.job_id}
            onClick={() => setSelectedJob(job.job_id)}
            style={{
              padding: 16,
              background: selectedJob === job.job_id ? '#1d2733' : '#0f151c',
              border: `1px solid ${selectedJob === job.job_id ? '#3b82f6' : '#1d2733'}`,
              borderRadius: 8,
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>
                  {job.reference}
                </div>
                <div style={{ fontSize: 14, color: '#9ca3af', marginBottom: 8 }}>
                  {job.location}
                </div>
                <div style={{ fontSize: 12, color: '#6b7280' }}>
                  {job.client_name}
                </div>
              </div>
              <div style={{
                padding: '4px 8px',
                borderRadius: 4,
                fontSize: 10,
                fontWeight: 600,
                textTransform: 'uppercase',
                background: SCHEDULE_STATUS_COLORS[job.schedule_status],
                color: '#fff'
              }}>
                {job.schedule_status.replace('_', ' ')}
              </div>
            </div>

            {/* Progress Bar */}
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                <span>Progress</span>
                <span>{Math.round(job.completion_percentage)}%</span>
              </div>
              <div style={{
                width: '100%',
                height: 6,
                background: '#1d2733',
                borderRadius: 3
              }}>
                <div style={{
                  width: `${job.completion_percentage}%`,
                  height: '100%',
                  background: getProgressColor(job.completion_percentage),
                  borderRadius: 3,
                  transition: 'width 0.3s ease'
                }} />
              </div>
            </div>

            {/* Key Metrics */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, fontSize: 12 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: '#9ca3af' }}>Milestones</div>
                <div style={{ fontWeight: 600 }}>
                  {job.completed_milestones}/{job.total_milestones}
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: '#9ca3af' }}>Budget</div>
                <div style={{ fontWeight: 600 }}>
                  {Math.round((job.total_spent / job.quoted_amount) * 100)}%
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: '#9ca3af' }}>Alerts</div>
                <div style={{
                  fontWeight: 600,
                  color: job.critical_alerts > 0 ? '#ef4444' : '#22c55e'
                }}>
                  {job.active_alerts}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Detailed View */}
      {selectedJobData && (
        <div style={{
          background: '#0f151c',
          border: '1px solid #1d2733',
          borderRadius: 8,
          overflow: 'hidden'
        }}>
          {/* Header */}
          <div style={{
            padding: 20,
            borderBottom: '1px solid #1d2733',
            background: '#14202b'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, marginBottom: 4 }}>
                  {selectedJobData.reference} - {selectedJobData.location}
                </h2>
                <div style={{ fontSize: 14, color: '#9ca3af' }}>
                  {selectedJobData.client_name} • {formatDate(selectedJobData.start_date)} - {formatDate(selectedJobData.end_date)}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 24, fontWeight: 800, color: getProgressColor(selectedJobData.completion_percentage) }}>
                  {Math.round(selectedJobData.completion_percentage)}%
                </div>
                <div style={{ fontSize: 12, color: '#9ca3af' }}>Complete</div>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div style={{
            display: 'flex',
            borderBottom: '1px solid #1d2733',
            background: '#111823'
          }}>
            {(['overview', 'metrics', 'alerts', 'reports'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: '12px 20px',
                  background: activeTab === tab ? '#1d2733' : 'transparent',
                  border: 'none',
                  color: activeTab === tab ? '#3b82f6' : '#9ca3af',
                  fontSize: 14,
                  fontWeight: 600,
                  textTransform: 'capitalize',
                  cursor: 'pointer',
                  borderBottom: activeTab === tab ? '2px solid #3b82f6' : 'none'
                }}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div style={{ padding: 20 }}>
            {activeTab === 'overview' && (
              <div style={{ display: 'grid', gap: 20 }}>
                {/* Summary Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
                  <div style={{
                    padding: 16,
                    background: '#14202b',
                    borderRadius: 8,
                    border: '1px solid #1d2733'
                  }}>
                    <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 4 }}>Quality Score</div>
                    <div style={{ fontSize: 24, fontWeight: 700, color: '#3b82f6' }}>
                      {Math.round(selectedJobData.quality_score)}/100
                    </div>
                  </div>

                  <div style={{
                    padding: 16,
                    background: '#14202b',
                    borderRadius: 8,
                    border: '1px solid #1d2733'
                  }}>
                    <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 4 }}>Budget Used</div>
                    <div style={{ fontSize: 18, fontWeight: 700 }}>
                      {formatCurrency(selectedJobData.total_spent)}
                    </div>
                    <div style={{ fontSize: 12, color: '#9ca3af' }}>
                      of {formatCurrency(selectedJobData.quoted_amount)}
                    </div>
                  </div>

                  <div style={{
                    padding: 16,
                    background: '#14202b',
                    borderRadius: 8,
                    border: '1px solid #1d2733'
                  }}>
                    <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 4 }}>Milestones</div>
                    <div style={{ fontSize: 18, fontWeight: 700 }}>
                      {selectedJobData.completed_milestones} / {selectedJobData.total_milestones}
                    </div>
                    <div style={{ fontSize: 12, color: selectedJobData.delayed_milestones > 0 ? '#ef4444' : '#22c55e' }}>
                      {selectedJobData.delayed_milestones} delayed
                    </div>
                  </div>

                  <div style={{
                    padding: 16,
                    background: '#14202b',
                    borderRadius: 8,
                    border: '1px solid #1d2733'
                  }}>
                    <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 4 }}>Active Alerts</div>
                    <div style={{
                      fontSize: 24,
                      fontWeight: 700,
                      color: selectedJobData.critical_alerts > 0 ? '#ef4444' : '#22c55e'
                    }}>
                      {selectedJobData.active_alerts}
                    </div>
                    <div style={{ fontSize: 12, color: '#ef4444' }}>
                      {selectedJobData.critical_alerts} critical
                    </div>
                  </div>
                </div>

                {/* Recent Activity */}
                <div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Recent Activity</h3>
                  <div style={{ fontSize: 14, color: '#9ca3af' }}>
                    Last progress report: {selectedJobData.last_report_date ? formatDate(selectedJobData.last_report_date) : 'No reports yet'}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'metrics' && (
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Progress Metrics</h3>
                <div style={{ display: 'grid', gap: 12 }}>
                  {metrics.length === 0 ? (
                    <div style={{ fontSize: 14, color: '#9ca3af', textAlign: 'center', padding: 40 }}>
                      No metrics recorded yet
                    </div>
                  ) : (
                    metrics.map(metric => (
                      <div key={metric.id} style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: 12,
                        background: '#14202b',
                        borderRadius: 6,
                        border: '1px solid #1d2733'
                      }}>
                        <div>
                          <div style={{ fontWeight: 600, textTransform: 'capitalize' }}>
                            {metric.metric_type.replace('_', ' ')}
                          </div>
                          <div style={{ fontSize: 12, color: '#9ca3af' }}>
                            {formatDate(metric.recorded_at)}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{
                            fontSize: 18,
                            fontWeight: 700,
                            color: METRIC_COLORS[metric.metric_type as keyof typeof METRIC_COLORS] || '#e8eef6'
                          }}>
                            {metric.metric_value}{metric.unit}
                          </div>
                          {metric.target_value && (
                            <div style={{ fontSize: 12, color: '#9ca3af' }}>
                              Target: {metric.target_value}{metric.unit}
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {activeTab === 'alerts' && (
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Active Alerts</h3>
                <div style={{ display: 'grid', gap: 12 }}>
                  {alerts.length === 0 ? (
                    <div style={{ fontSize: 14, color: '#9ca3af', textAlign: 'center', padding: 40 }}>
                      No active alerts
                    </div>
                  ) : (
                    alerts.map(alert => (
                      <div key={alert.id} style={{
                        padding: 16,
                        background: '#14202b',
                        borderRadius: 8,
                        border: `1px solid ${ALERT_COLORS[alert.severity]}`,
                        borderLeft: `4px solid ${ALERT_COLORS[alert.severity]}`
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                          <div style={{ fontWeight: 700, fontSize: 16 }}>
                            {alert.title}
                          </div>
                          <div style={{
                            padding: '2px 8px',
                            borderRadius: 4,
                            fontSize: 10,
                            fontWeight: 600,
                            textTransform: 'uppercase',
                            background: ALERT_COLORS[alert.severity],
                            color: '#fff'
                          }}>
                            {alert.severity}
                          </div>
                        </div>
                        <div style={{ fontSize: 14, color: '#d1d5db', marginBottom: 8 }}>
                          {alert.description}
                        </div>
                        <div style={{ fontSize: 12, color: '#9ca3af' }}>
                          {formatDate(alert.created_at)} • {alert.alert_type.replace('_', ' ')}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {activeTab === 'reports' && (
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Daily Progress Reports</h3>
                <div style={{ fontSize: 14, color: '#9ca3af', textAlign: 'center', padding: 40 }}>
                  Reports feature coming soon
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}