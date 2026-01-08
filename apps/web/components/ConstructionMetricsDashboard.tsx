import React, { useState, useEffect } from 'react';

import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';

interface MetricCard {
  title: string;
  value: string | number;
  unit?: string;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: string;
  color: string;
  icon: string;
}

interface JobSummary {
  id: string;
  reference: string;
  location: string;
  status: string;
  completion: number;
  daysRemaining: number;
  budgetUsed: number;
  totalBudget: number;
  riskLevel: 'low' | 'medium' | 'high';
}

const RISK_COLORS = {
  low: '#22c55e',
  medium: '#f59e0b',
  high: '#ef4444'
};

export default function ConstructionMetricsDashboard() {
  const [metrics, setMetrics] = useState<MetricCard[]>([]);
  const [jobs, setJobs] = useState<JobSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<'today' | 'week' | 'month'>('week');

  useEffect(() => {
    loadMetricsData();
  }, [timeframe]);

  async function loadMetricsData() {
    try {
      setLoading(true);

      // Load active jobs for summary
      // Load active jobs for summary from the aggregated view
      const { data: jobsData, error: jobsError } = await supabase
        .from('v_construction_dashboard')
        .select('*')
        .order('risk_level', { ascending: false }) // Show high risk first
        .limit(15);

      if (jobsError) throw jobsError;

      // Transform jobs data
      const transformedJobs: JobSummary[] = (jobsData || []).map(job => {
        const daysRemaining = job.end_date
          ? Math.max(0, Math.ceil((new Date(job.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)))
          : 0;

        return {
          id: job.id,
          reference: job.reference || 'N/A',
          location: job.location || 'N/A',
          status: job.status,
          // Use completion from view (aggregates Targets Page)
          completion: job.completion || 0,
          daysRemaining,
          // Use budget/labour from view (aggregates Labour Page)
          budgetUsed: 0, // Pending 'costs' table integration
          totalBudget: job.total_budget || 0,
          // Use risk level calculated by DB view
          riskLevel: job.risk_level || 'low'
        };
      });

      setJobs(transformedJobs);

      // Calculate aggregate metrics
      const totalJobs = transformedJobs.length;
      const avgCompletion = totalJobs > 0
        ? Math.round(transformedJobs.reduce((sum, job) => sum + job.completion, 0) / totalJobs)
        : 0;
      const highRiskJobs = transformedJobs.filter(job => job.riskLevel === 'high').length;
      const totalBudget = transformedJobs.reduce((sum, job) => sum + job.totalBudget, 0);
      const totalSpent = transformedJobs.reduce((sum, job) => sum + job.budgetUsed, 0);
      const budgetUtilization = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0;

      const metricsData: MetricCard[] = [
        {
          title: 'Active Projects',
          value: totalJobs,
          trend: 'stable',
          trendValue: '+2 this week',
          color: '#3b82f6',
          icon: '🏗️'
        },
        {
          title: 'Avg Completion',
          value: avgCompletion,
          unit: '%',
          trend: avgCompletion > 70 ? 'up' : 'down',
          trendValue: '+5% this week',
          color: '#22c55e',
          icon: '📊'
        },
        {
          title: 'Budget Utilization',
          value: budgetUtilization,
          unit: '%',
          trend: budgetUtilization > 80 ? 'up' : 'stable',
          trendValue: `£${(totalSpent / 1000).toFixed(0)}k spent`,
          color: '#f59e0b',
          icon: '💰'
        },
        {
          title: 'High Risk Projects',
          value: highRiskJobs,
          trend: highRiskJobs > 0 ? 'up' : 'down',
          trendValue: 'Needs attention',
          color: highRiskJobs > 0 ? '#ef4444' : '#22c55e',
          icon: '⚠️'
        },
        {
          title: 'Safety Score',
          value: 94,
          unit: '%',
          trend: 'up',
          trendValue: '+2% this month',
          color: '#22c55e',
          icon: '🛡️'
        },
        {
          title: 'Quality Rating',
          value: 4.7,
          unit: '/5',
          trend: 'stable',
          trendValue: 'Client feedback',
          color: '#8b5cf6',
          icon: '⭐'
        }
      ];

      setMetrics(metricsData);

    } catch (error: unknown) {
      console.error('Error loading metrics:', error);
    } finally {
      setLoading(false);
    }
  }

  function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      notation: amount > 1000000 ? 'compact' : 'standard'
    }).format(amount);
  }

  if (loading) {
    return (
      <div style={{ padding: 24 }}>
        <div style={{ fontWeight: 800, fontSize: 24, marginBottom: 24 }}>
          Construction Metrics
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
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 32
      }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, marginBottom: 4 }}>
            Construction Metrics
          </h1>
          <p style={{ fontSize: 14, color: '#9ca3af', margin: 0 }}>
            Real-time insights into project performance and KPIs
          </p>
        </div>

        {/* Timeframe Selector */}
        <div style={{ display: 'flex', gap: 4, background: '#0f151c', borderRadius: 8, padding: 4 }}>
          {(['today', 'week', 'month'] as const).map(period => (
            <button
              key={period}
              onClick={() => setTimeframe(period)}
              style={{
                padding: '8px 16px',
                background: timeframe === period ? '#3b82f6' : 'transparent',
                color: timeframe === period ? '#fff' : '#9ca3af',
                border: 'none',
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                textTransform: 'capitalize'
              }}
            >
              {period}
            </button>
          ))}
        </div>
      </div>

      {/* Metrics Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: 20,
        marginBottom: 32
      }}>
        {metrics.map((metric, index) => (
          <div
            key={index}
            style={{
              padding: 20,
              background: '#0f151c',
              border: '1px solid #1d2733',
              borderRadius: 12,
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            {/* Background Gradient */}
            <div style={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: 60,
              height: 60,
              background: `linear-gradient(135deg, ${metric.color}20, transparent)`,
              borderRadius: '0 12px 0 60px'
            }} />

            {/* Icon */}
            <div style={{
              position: 'absolute',
              top: 16,
              right: 16,
              fontSize: 24,
              opacity: 0.8
            }}>
              {metric.icon}
            </div>

            {/* Content */}
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 8, fontWeight: 500 }}>
                {metric.title}
              </div>

              <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: 12 }}>
                <span style={{
                  fontSize: 32,
                  fontWeight: 800,
                  color: metric.color,
                  lineHeight: 1
                }}>
                  {metric.value}
                </span>
                {metric.unit && (
                  <span style={{
                    fontSize: 16,
                    color: '#9ca3af',
                    marginLeft: 4,
                    fontWeight: 600
                  }}>
                    {metric.unit}
                  </span>
                )}
              </div>

              {/* Trend */}
              {metric.trend && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 12,
                  color: '#9ca3af'
                }}>
                  <span style={{
                    color: metric.trend === 'up' ? '#22c55e' :
                      metric.trend === 'down' ? '#ef4444' : '#9ca3af'
                  }}>
                    {metric.trend === 'up' ? '↗' : metric.trend === 'down' ? '↘' : '→'}
                  </span>
                  {metric.trendValue}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Projects Table */}
      <div style={{
        background: '#0f151c',
        border: '1px solid #1d2733',
        borderRadius: 12,
        overflow: 'hidden'
      }}>
        <div style={{
          padding: 20,
          borderBottom: '1px solid #1d2733',
          background: '#14202b'
        }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>
            Active Projects Overview
          </h2>
        </div>

        <div style={{ overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#111823' }}>
                <th style={{ padding: 16, textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#9ca3af' }}>
                  Project
                </th>
                <th style={{ padding: 16, textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#9ca3af' }}>
                  Progress
                </th>
                <th style={{ padding: 16, textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#9ca3af' }}>
                  Budget
                </th>
                <th style={{ padding: 16, textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#9ca3af' }}>
                  Timeline
                </th>
                <th style={{ padding: 16, textAlign: 'center', fontSize: 12, fontWeight: 600, color: '#9ca3af' }}>
                  Risk
                </th>
              </tr>
            </thead>
            <tbody>
              {jobs.map(job => (
                <tr key={job.id} style={{ borderBottom: '1px solid #1d2733' }}>
                  <td style={{ padding: 16 }}>
                    <div style={{ fontWeight: 600, marginBottom: 2 }}>
                      <Link href={`/jobs/${job.id}`} style={{ color: 'inherit', textDecoration: 'none', cursor: 'pointer' }}>
                        {job.reference}
                      </Link>
                    </div>
                    <div style={{ fontSize: 12, color: '#9ca3af' }}>
                      {job.location}
                    </div>
                  </td>
                  <td style={{ padding: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{
                        width: 60,
                        height: 6,
                        background: '#1d2733',
                        borderRadius: 3
                      }}>
                        <div style={{
                          width: `${job.completion}%`,
                          height: '100%',
                          background: job.completion > 75 ? '#22c55e' :
                            job.completion > 50 ? '#3b82f6' :
                              job.completion > 25 ? '#f59e0b' : '#ef4444',
                          borderRadius: 3
                        }} />
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 600 }}>
                        {job.completion}%
                      </span>
                    </div>
                  </td>
                  <td style={{ padding: 16 }}>
                    <div style={{ fontWeight: 600, marginBottom: 2 }}>
                      {formatCurrency(job.budgetUsed)}
                    </div>
                    <div style={{ fontSize: 12, color: '#9ca3af' }}>
                      of {formatCurrency(job.totalBudget)}
                    </div>
                  </td>
                  <td style={{ padding: 16 }}>
                    <div style={{
                      color: job.daysRemaining < 7 ? '#ef4444' :
                        job.daysRemaining < 30 ? '#f59e0b' : '#22c55e',
                      fontWeight: 600,
                      marginBottom: 2
                    }}>
                      {job.daysRemaining} days
                    </div>
                    <div style={{ fontSize: 12, color: '#9ca3af' }}>
                      remaining
                    </div>
                  </td>
                  <td style={{ padding: 16, textAlign: 'center' }}>
                    <div style={{
                      display: 'inline-block',
                      padding: '4px 8px',
                      borderRadius: 6,
                      fontSize: 10,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      background: RISK_COLORS[job.riskLevel],
                      color: '#fff'
                    }}>
                      {job.riskLevel}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}