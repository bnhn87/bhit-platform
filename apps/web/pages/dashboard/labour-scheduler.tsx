import { useRouter } from 'next/router';
import { useState, useEffect, useCallback } from 'react';

import { useUserRole } from '@/hooks/useUserRole';
import { supabase } from '@/lib/supabaseClient';

interface DayAllocation {
  van: number;
  foot: number;
  supervisor: number;
  hours: number;
}

interface JobSummary {
  id: string;
  reference: string;
  client_name: string;
  location: string;
  quoted_amount: number;
  totalHours: number;
  workingDays: number;
  allocatedDays: number;
  progress: number;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function DashboardLabourScheduler() {
  const router = useRouter();
  const { role: userRole, loading: roleLoading } = useUserRole();

  // State
  const [jobs, setJobs] = useState<JobSummary[]>([]);
  const [selectedJob, setSelectedJob] = useState<JobSummary | null>(null);
  const [allocations, setAllocations] = useState<Record<string, Record<string, DayAllocation>>>({});
  const [currentDate, setCurrentDate] = useState(new Date());
  const [_allocationMode, _setAllocationMode] = useState<'auto' | 'manual' | 'balanced'>('auto');
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'overview' | 'job'>('overview');

  // Calculate working days between dates
  const getWorkingDays = (start: Date, end: Date): number => {
    let count = 0;
    const current = new Date(start);
    while (current <= end) {
      const day = current.getDay();
      if (day !== 0 && day !== 6) count++;
      current.setDate(current.getDate() + 1);
    }
    return count;
  };

  // Calculate daily capacity hours
  const calculateDailyHours = (van: number, foot: number): number => {
    const totalInstallers = (van * 2) + foot;
    return Math.max(0, totalInstallers * 7 - totalInstallers * 0.6);
  };

  // Format date for database
  const formatDate = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const loadJobsData = useCallback(async () => {
    try {
      setLoading(true);

      // Load active jobs
      const { data: jobsData, error: jobsError } = await supabase
        .from('jobs')
        .select(`
          id,
          reference,
          client_name,
          location,
          quoted_amount,
          start_date,
          end_date,
          status
        `)
        .in('status', ['active', 'in_progress'])
        .order('reference');

      if (jobsError) throw jobsError;

      // Load job items for each job to calculate hours
      const jobsWithHours = await Promise.all(
        (jobsData || []).map(async (job) => {
          const { data: jobItems } = await supabase
            .from('job_items')
            .select('qty, hours_per_unit')
            .eq('job_id', job.id);

          const totalHours = jobItems?.reduce((sum, item) =>
            sum + ((item.qty || 1) * (item.hours_per_unit || 1)), 0
          ) || 40; // Default 40 hours if no items

          const startDate = job.start_date ? new Date(job.start_date) : new Date();
          const endDate = job.end_date ? new Date(job.end_date) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
          const workingDays = getWorkingDays(startDate, endDate);

          // Load existing allocations to calculate progress
          const { data: existingAllocations } = await supabase
            .from('labour_allocations')
            .select('work_date')
            .eq('job_id', job.id);

          const allocatedDays = existingAllocations?.length || 0;
          const progress = workingDays > 0 ? (allocatedDays / workingDays) * 100 : 0;

          return {
            ...job,
            totalHours,
            workingDays,
            allocatedDays,
            progress
          };
        })
      );

      setJobs(jobsWithHours);

      // Load all allocations for calendar view
      const { data: allAllocations } = await supabase
        .from('labour_allocations')
        .select('*')
        .in('job_id', jobsWithHours.map(j => j.id));

      if (allAllocations) {
        const allocationsMap: Record<string, Record<string, DayAllocation>> = {};

        allAllocations.forEach(alloc => {
          const jobId = alloc.job_id;
          const dateKey = alloc.work_date;

          if (!allocationsMap[jobId]) {
            allocationsMap[jobId] = {};
          }

          if (!allocationsMap[jobId][dateKey]) {
            allocationsMap[jobId][dateKey] = { van: 0, foot: 0, supervisor: 0, hours: 0 };
          }

          if (alloc.role === 'installer' && alloc.crew_mode === 'van') {
            allocationsMap[jobId][dateKey].van = alloc.headcount;
          } else if (alloc.role === 'installer' && alloc.crew_mode === 'foot') {
            allocationsMap[jobId][dateKey].foot = alloc.headcount;
          } else if (alloc.role === 'supervisor') {
            allocationsMap[jobId][dateKey].supervisor = alloc.headcount;
          }
        });

        // Calculate hours for each allocation
        Object.keys(allocationsMap).forEach(jobId => {
          Object.keys(allocationsMap[jobId]).forEach(date => {
            const alloc = allocationsMap[jobId][date];
            alloc.hours = calculateDailyHours(alloc.van, alloc.foot);
          });
        });

        setAllocations(allocationsMap);
      }

    } catch (error: unknown) {
      console.error('Error loading jobs data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load jobs data
  useEffect(() => {
    if (!userRole) return;
    loadJobsData();
  }, [userRole, loadJobsData]);

  // Select job for detailed scheduling
  const selectJob = (job: JobSummary) => {
    setSelectedJob(job);
    setViewMode('job');
    router.push(`/job/${job.id}/labour`);
  };

  // Auto-allocate for all jobs
  const autoAllocateAll = () => {
    // eslint-disable-next-line no-console
    console.log('Auto-allocating all jobs...');
    // This would implement batch auto-allocation
  };

  // Render calendar with all job allocations
  const renderOverviewCalendar = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const firstDayOfWeek = firstDay.getDay() || 7;
    const daysInMonth = lastDay.getDate();

    const days = [];

    // Previous month days
    const prevMonth = new Date(year, month - 1, 0);
    for (let i = firstDayOfWeek - 2; i >= 0; i--) {
      const day = prevMonth.getDate() - i;
      days.push(
        <div key={`prev-${day}`} className="day-cell other-month">
          <div className="day-number">{day}</div>
        </div>
      );
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateStr = formatDate(date);
      const dayOfWeek = date.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      // Aggregate all jobs for this day
      let totalVan = 0, totalFoot = 0, totalSupervisor = 0, totalHours = 0;
      const jobAllocations: Array<{job: JobSummary, allocation: DayAllocation}> = [];

      jobs.forEach(job => {
        const jobAllocs = allocations[job.id];
        if (jobAllocs && jobAllocs[dateStr]) {
          const alloc = jobAllocs[dateStr];
          totalVan += alloc.van;
          totalFoot += alloc.foot;
          totalSupervisor += alloc.supervisor;
          totalHours += alloc.hours;
          jobAllocations.push({ job, allocation: alloc });
        }
      });

      let cellClass = 'day-cell';
      if (isWeekend) cellClass += ' weekend';
      if (jobAllocations.length > 0) cellClass += ' selected';

      days.push(
        <div key={day} className={cellClass}>
          <div className="day-number">{day}</div>
          <div className="day-allocations">
            {totalVan > 0 && (
              <div className="allocation-badge van">🚐 {totalVan}</div>
            )}
            {totalFoot > 0 && (
              <div className="allocation-badge foot">👷 {totalFoot}</div>
            )}
            {totalSupervisor > 0 && (
              <div className="allocation-badge supervisor">📋 {totalSupervisor}</div>
            )}
            {jobAllocations.length > 1 && (
              <div className="job-count">{jobAllocations.length} jobs</div>
            )}
          </div>
          {totalHours > 0 && (
            <div className="capacity-indicator">{totalHours.toFixed(1)}h</div>
          )}
        </div>
      );
    }

    return days;
  };

  // Calculate overall summary
  const calculateOverallSummary = () => {
    let totalVan = 0, totalFoot = 0, totalHours = 0, totalJobs = 0;

    Object.values(allocations).forEach(jobAllocs => {
      Object.values(jobAllocs).forEach(alloc => {
        totalVan += alloc.van || 0;
        totalFoot += alloc.foot || 0;
        totalHours += alloc.hours || 0;
      });
    });

    totalJobs = jobs.filter(job => allocations[job.id] && Object.keys(allocations[job.id]).length > 0).length;

    return { totalVan, totalFoot, totalHours, totalJobs };
  };

  const overallSummary = calculateOverallSummary();

  if (loading || roleLoading) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center">
        <div>Loading labour scheduler...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <style jsx>{`
        .split-layout {
          display: grid;
          grid-template-columns: 400px 1fr;
          height: 100vh;
        }

        .job-panel {
          background: rgb(17, 17, 17);
          border-right: 1px solid rgba(255,255,255,0.1);
          overflow-y: auto;
          padding: 20px;
        }

        .panel-header {
          margin-bottom: 24px;
          padding-bottom: 16px;
          border-bottom: 1px solid rgba(255,255,255,0.1);
        }

        .panel-title {
          font-size: 20px;
          font-weight: 700;
          margin-bottom: 8px;
        }

        .jobs-grid {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .job-card {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 8px;
          padding: 12px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .job-card:hover {
          background: rgba(255,255,255,0.05);
          border-color: #2563eb;
        }

        .job-card.selected {
          background: rgba(37, 99, 235, 0.1);
          border-color: #2563eb;
        }

        .job-ref {
          font-size: 14px;
          font-weight: 600;
          color: #60a5fa;
          margin-bottom: 4px;
        }

        .job-client {
          font-size: 13px;
          color: #fafafa;
          margin-bottom: 8px;
        }

        .job-progress {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 8px;
        }

        .progress-bar {
          flex: 1;
          height: 4px;
          background: rgba(255,255,255,0.1);
          border-radius: 2px;
          margin-right: 8px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          background: #10b981;
          transition: width 0.3s;
        }

        .progress-text {
          font-size: 11px;
          color: #888;
        }

        .section-title {
          font-size: 12px;
          text-transform: uppercase;
          color: #888;
          letter-spacing: 0.5px;
          margin-bottom: 12px;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .action-buttons {
          display: flex;
          gap: 8px;
          margin-top: 24px;
        }

        .btn {
          flex: 1;
          padding: 10px;
          border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.1);
          background: rgba(255,255,255,0.02);
          color: #fafafa;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          text-align: center;
        }

        .btn:hover {
          background: rgba(255,255,255,0.05);
        }

        .btn-primary {
          background: #2563eb;
          border-color: #2563eb;
        }

        .btn-primary:hover {
          background: #1d4ed8;
        }

        .calendar-panel {
          padding: 20px;
          overflow-y: auto;
        }

        .calendar-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }

        .calendar-title {
          font-size: 20px;
          font-weight: 700;
        }

        .view-mode {
          display: flex;
          gap: 8px;
        }

        .mode-btn {
          padding: 6px 12px;
          border-radius: 6px;
          border: 1px solid rgba(255,255,255,0.1);
          background: rgba(255,255,255,0.02);
          color: #888;
          font-size: 13px;
          cursor: pointer;
        }

        .mode-btn.active {
          background: rgba(37, 99, 235, 0.2);
          border-color: #2563eb;
          color: #60a5fa;
        }

        .overview-stats {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-bottom: 20px;
        }

        .stat-card {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 8px;
          padding: 12px;
          text-align: center;
        }

        .stat-value {
          font-size: 24px;
          font-weight: 700;
          margin-bottom: 4px;
        }

        .stat-label {
          font-size: 11px;
          color: #888;
          text-transform: uppercase;
        }

        .calendar {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 16px;
          overflow: hidden;
        }

        .month-nav {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px;
          background: rgba(255,255,255,0.03);
          border-bottom: 1px solid rgba(255,255,255,0.1);
        }

        .month-display {
          font-size: 16px;
          font-weight: 600;
        }

        .nav-btn {
          width: 32px;
          height: 32px;
          border-radius: 6px;
          border: 1px solid rgba(255,255,255,0.1);
          background: rgba(255,255,255,0.02);
          color: #fafafa;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        .nav-btn:hover {
          background: rgba(255,255,255,0.05);
        }

        .weekdays {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          background: rgba(255,255,255,0.03);
          border-bottom: 1px solid rgba(255,255,255,0.1);
        }

        .weekday {
          padding: 12px;
          text-align: center;
          font-size: 12px;
          font-weight: 600;
          color: #888;
          text-transform: uppercase;
        }

        .days-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
        }

        .day-cell {
          min-height: 100px;
          border-right: 1px solid rgba(255,255,255,0.05);
          border-bottom: 1px solid rgba(255,255,255,0.05);
          padding: 8px;
          cursor: pointer;
          position: relative;
        }

        .day-cell:nth-child(7n) {
          border-right: none;
        }

        .day-cell.other-month {
          opacity: 0.3;
        }

        .day-cell.weekend {
          background: rgba(255,255,255,0.01);
        }

        .day-cell.selected {
          background: rgba(16, 185, 129, 0.1);
        }

        .day-cell:hover:not(.other-month):not(.weekend) {
          background: rgba(255,255,255,0.02);
        }

        .day-number {
          font-size: 14px;
          font-weight: 600;
          margin-bottom: 6px;
        }

        .day-allocations {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .allocation-badge {
          display: flex;
          align-items: center;
          gap: 2px;
          padding: 2px 4px;
          border-radius: 3px;
          font-size: 10px;
        }

        .allocation-badge.van {
          background: rgba(59, 130, 246, 0.2);
          color: #60a5fa;
        }

        .allocation-badge.foot {
          background: rgba(168, 85, 247, 0.2);
          color: #a78bfa;
        }

        .allocation-badge.supervisor {
          background: rgba(251, 146, 60, 0.2);
          color: #fbbf24;
        }

        .job-count {
          font-size: 9px;
          color: #888;
          background: rgba(255,255,255,0.1);
          padding: 1px 3px;
          border-radius: 2px;
        }

        .capacity-indicator {
          position: absolute;
          bottom: 4px;
          right: 4px;
          font-size: 10px;
          color: #10b981;
          background: rgba(16, 185, 129, 0.1);
          padding: 2px 4px;
          border-radius: 3px;
        }
      `}</style>

      <div className="split-layout">
        {/* Left Panel: Jobs List */}
        <div className="job-panel">
          <div className="panel-header">
            <h2 className="panel-title">Active Jobs</h2>
            <p className="text-sm text-neutral-400">
              {jobs.length} jobs • Click to schedule
            </p>
          </div>

          <div className="jobs-grid">
            {jobs.map((job) => (
              <div
                key={job.id}
                className={`job-card ${selectedJob?.id === job.id ? 'selected' : ''}`}
                onClick={() => selectJob(job)}
              >
                <div className="job-ref">{job.reference}</div>
                <div className="job-client">{job.client_name}</div>
                <div className="text-xs text-neutral-500">{job.location}</div>
                <div className="text-xs text-neutral-500">
                  £{job.quoted_amount?.toLocaleString()} • {job.totalHours}h
                </div>
                <div className="job-progress">
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{ width: `${job.progress}%` }}
                    />
                  </div>
                  <span className="progress-text">
                    {job.allocatedDays}/{job.workingDays} days
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6">
            <h3 className="section-title">🎯 Bulk Actions</h3>
            <div className="action-buttons">
              <button className="btn btn-primary" onClick={autoAllocateAll}>
                Auto-Allocate All
              </button>
            </div>
          </div>
        </div>

        {/* Right Panel: Overview Calendar */}
        <div className="calendar-panel">
          <div className="calendar-header">
            <h1 className="calendar-title">Labour Overview</h1>
            <div className="view-mode">
              <button
                className={`mode-btn ${viewMode === 'overview' ? 'active' : ''}`}
                onClick={() => setViewMode('overview')}
              >
                Overview
              </button>
              <button
                className={`mode-btn ${viewMode === 'job' ? 'active' : ''}`}
                onClick={() => setViewMode('job')}
                disabled={!selectedJob}
              >
                Job Detail
              </button>
            </div>
          </div>

          <div className="overview-stats">
            <div className="stat-card">
              <div className="stat-value">{overallSummary.totalJobs}</div>
              <div className="stat-label">Active Jobs</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{overallSummary.totalVan}</div>
              <div className="stat-label">Van Days</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{overallSummary.totalFoot}</div>
              <div className="stat-label">Foot Days</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{overallSummary.totalHours.toFixed(0)}h</div>
              <div className="stat-label">Total Hours</div>
            </div>
          </div>

          <div className="calendar">
            <div className="month-nav">
              <button
                className="nav-btn"
                onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))}
              >
                ←
              </button>
              <span className="month-display">
                {MONTH_NAMES[currentDate.getMonth()]} {currentDate.getFullYear()}
              </span>
              <button
                className="nav-btn"
                onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))}
              >
                →
              </button>
            </div>

            <div className="weekdays">
              <div className="weekday">Mon</div>
              <div className="weekday">Tue</div>
              <div className="weekday">Wed</div>
              <div className="weekday">Thu</div>
              <div className="weekday">Fri</div>
              <div className="weekday">Sat</div>
              <div className="weekday">Sun</div>
            </div>

            <div className="days-grid">
              {renderOverviewCalendar()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}