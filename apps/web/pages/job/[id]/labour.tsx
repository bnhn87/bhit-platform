import { useRouter } from 'next/router';
import { useState, useEffect, useCallback } from 'react';

import { useUserRole } from '@/hooks/useUserRole';
import { canEditLabour } from '@/lib/roles';
import { supabase } from '@/lib/supabaseClient';

interface DayAllocation {
  van: number;
  foot: number;
  supervisor: number;
  hours: number;
}

interface Task {
  name: string;
  hours: number;
  crew: {
    van?: number;
    foot?: number;
    supervisor?: number;
  };
}

interface JobData {
  id: string;
  reference: string;
  client_name: string;
  location: string;
  quoted_amount: number;
  start_date?: string;
  end_date?: string;
  tasks: Task[];
  totalHours: number;
  workingDays: number;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export default function LabourScheduler() {
  const router = useRouter();
  const { id: jobId } = router.query;
  const { role: userRole, loading: roleLoading } = useUserRole();

  // State
  const [job, setJob] = useState<JobData | null>(null);
  const [allocations, setAllocations] = useState<Record<string, DayAllocation>>({});
  const [currentDate, setCurrentDate] = useState(new Date());
  const [allocationMode, setAllocationMode] = useState<'auto' | 'manual' | 'balanced'>('auto');
  const [_selectedDate, _setSelectedDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

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

  // Check if date is in job range
  const isDateInJobRange = (date: Date): boolean => {
    if (!startDate || !endDate) return false;
    const start = new Date(startDate);
    const end = new Date(endDate);
    return date >= start && date <= end;
  };

  const loadJobData = useCallback(async () => {
    try {
      setLoading(true);

      // Load job details
      const { data: jobData, error: jobError } = await supabase
        .from('jobs')
        .select(`
          id,
          reference,
          client_name,
          location,
          quoted_amount,
          start_date,
          end_date
        `)
        .eq('id', jobId)
        .single();

      if (jobError) throw jobError;

      // Load job items/tasks
      const { data: jobItems, error: itemsError } = await supabase
        .from('job_items')
        .select('*')
        .eq('job_id', jobId);

      if (itemsError) console.warn('No job items found:', itemsError);

      // Transform data
      const tasks: Task[] = jobItems?.map(item => ({
        name: item.label || item.product_code || 'Task',
        hours: (item.qty || 1) * (item.hours_per_unit || 1),
        crew: {
          // Simple crew assignment logic - could be enhanced
          van: item.product_code?.includes('workstation') ? 1 : 0,
          foot: item.product_code?.includes('power') || item.product_code?.includes('screen') ? 1 : 0,
          supervisor: item.product_code?.includes('quality') ? 1 : 0
        }
      })) || [
        // Fallback default tasks if no job items
        { name: 'Installation work', hours: 40, crew: { van: 1, foot: 1 } },
        { name: 'Quality check', hours: 4, crew: { supervisor: 1 } }
      ];

      const totalHours = tasks.reduce((sum, task) => sum + task.hours, 0);
      const jobStart = jobData.start_date || new Date().toISOString().split('T')[0];
      const jobEnd = jobData.end_date || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const workingDays = getWorkingDays(new Date(jobStart), new Date(jobEnd));

      const transformedJob: JobData = {
        ...jobData,
        tasks,
        totalHours,
        workingDays
      };

      setJob(transformedJob);
      setStartDate(jobStart);
      setEndDate(jobEnd);

      // Load existing allocations
      const { data: existingAllocations } = await supabase
        .from('labour_allocations')
        .select('*')
        .eq('job_id', jobId);

      if (existingAllocations) {
        const allocationsMap: Record<string, DayAllocation> = {};
        existingAllocations.forEach(alloc => {
          const dateKey = alloc.work_date;
          if (!allocationsMap[dateKey]) {
            allocationsMap[dateKey] = { van: 0, foot: 0, supervisor: 0, hours: 0 };
          }

          if (alloc.role === 'installer' && alloc.crew_mode === 'van') {
            allocationsMap[dateKey].van = alloc.headcount;
          } else if (alloc.role === 'installer' && alloc.crew_mode === 'foot') {
            allocationsMap[dateKey].foot = alloc.headcount;
          } else if (alloc.role === 'supervisor') {
            allocationsMap[dateKey].supervisor = alloc.headcount;
          }
        });

        // Calculate hours for each day
        Object.keys(allocationsMap).forEach(date => {
          const alloc = allocationsMap[date];
          alloc.hours = calculateDailyHours(alloc.van, alloc.foot);
        });

        setAllocations(allocationsMap);
      }

    } catch (error: unknown) {
      console.error('Error loading job data:', error);
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  // Load job data
  useEffect(() => {
    if (!jobId || !userRole) return;

    loadJobData();
  }, [jobId, userRole, loadJobData]);

  // Auto-allocate labour
  const autoAllocate = () => {
    if (!job || !startDate || !endDate) return;

    const newAllocations: Record<string, DayAllocation> = {};
    const start = new Date(startDate);
    const end = new Date(endDate);
    const current = new Date(start);

    // Calculate optimal daily allocation
    const dailyHours = job.totalHours / job.workingDays;
    const installersNeeded = Math.ceil(dailyHours / 6.4); // 7h - 0.6h non-productive
    const dailyVan = Math.min(1, Math.floor(installersNeeded / 2));
    const dailyFoot = Math.max(0, installersNeeded - (dailyVan * 2));

    let supervisorDayCount = 0;

    while (current <= end) {
      const day = current.getDay();
      if (day !== 0 && day !== 6) { // Skip weekends
        const dateStr = formatDate(current);

        newAllocations[dateStr] = {
          van: dailyVan,
          foot: dailyFoot,
          supervisor: supervisorDayCount === Math.floor(job.workingDays / 2) ? 1 : 0, // Supervisor on middle day
          hours: calculateDailyHours(dailyVan, dailyFoot)
        };

        supervisorDayCount++;
      }
      current.setDate(current.getDate() + 1);
    }

    setAllocations(newAllocations);
  };

  // Balanced allocation
  const balancedAllocate = () => {
    if (!job || !startDate || !endDate) return;

    const newAllocations: Record<string, DayAllocation> = {};
    const start = new Date(startDate);
    const end = new Date(endDate);
    const current = new Date(start);
    const hoursPerDay = job.totalHours / job.workingDays;

    while (current <= end) {
      const day = current.getDay();
      if (day !== 0 && day !== 6) {
        const dateStr = formatDate(current);

        // Calculate crew to achieve target hours
        const installersNeeded = Math.ceil(hoursPerDay / 6.4);
        const vanCrews = Math.min(1, Math.floor(installersNeeded / 2));
        const footInstallers = Math.max(0, installersNeeded - (vanCrews * 2));

        newAllocations[dateStr] = {
          van: vanCrews,
          foot: footInstallers,
          supervisor: 0,
          hours: calculateDailyHours(vanCrews, footInstallers)
        };
      }
      current.setDate(current.getDate() + 1);
    }

    setAllocations(newAllocations);
  };

  // Save schedule
  const saveSchedule = async () => {
    if (!job || !canEditLabour(userRole)) {
      alert('You do not have permission to save labour schedules');
      return;
    }

    try {
      // Delete existing allocations for this job
      await supabase
        .from('labour_allocations')
        .delete()
        .eq('job_id', job.id);

      // Insert new allocations
      const allocationInserts = [];

      for (const [date, allocation] of Object.entries(allocations)) {
        if (allocation.van > 0) {
          allocationInserts.push({
            job_id: job.id,
            work_date: date,
            role: 'installer',
            crew_mode: 'van',
            headcount: allocation.van
          });
        }

        if (allocation.foot > 0) {
          allocationInserts.push({
            job_id: job.id,
            work_date: date,
            role: 'installer',
            crew_mode: 'foot',
            headcount: allocation.foot
          });
        }

        if (allocation.supervisor > 0) {
          allocationInserts.push({
            job_id: job.id,
            work_date: date,
            role: 'supervisor',
            crew_mode: null,
            headcount: allocation.supervisor
          });
        }
      }

      if (allocationInserts.length > 0) {
        const { error } = await supabase
          .from('labour_allocations')
          .insert(allocationInserts);

        if (error) throw error;
      }

      alert('Schedule saved successfully!');
    } catch (error: unknown) {
      console.error('Error saving schedule:', error);
      alert('Failed to save schedule');
    }
  };

  // Toggle day allocation (manual mode)
  const toggleDay = (dateStr: string) => {
    if (allocationMode !== 'manual') return;

    const current = allocations[dateStr];
    if (current && (current.van > 0 || current.foot > 0)) {
      // Remove allocation
      const newAllocations = { ...allocations };
      delete newAllocations[dateStr];
      setAllocations(newAllocations);
    } else {
      // Add allocation
      setAllocations({
        ...allocations,
        [dateStr]: {
          van: 1,
          foot: 2,
          supervisor: 0,
          hours: calculateDailyHours(1, 2)
        }
      });
    }
  };

  // Render calendar
  const renderCalendar = () => {
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
      const isInRange = isDateInJobRange(date);
      const allocation = allocations[dateStr];

      let cellClass = 'day-cell';
      if (isWeekend) cellClass += ' weekend';
      if (isInRange) cellClass += ' in-range';
      if (allocation) cellClass += ' selected';

      days.push(
        <div key={day} className={cellClass} onClick={() => toggleDay(dateStr)}>
          <div className="day-number">{day}</div>
          <div className="day-allocations">
            {allocation && allocation.van > 0 && (
              <div className="allocation-badge van">🚐 {allocation.van}</div>
            )}
            {allocation && allocation.foot > 0 && (
              <div className="allocation-badge foot">👷 {allocation.foot}</div>
            )}
            {allocation && allocation.supervisor > 0 && (
              <div className="allocation-badge supervisor">📋 {allocation.supervisor}</div>
            )}
          </div>
          {allocation && allocation.hours > 0 && (
            <div className="capacity-indicator">{allocation.hours.toFixed(1)}h</div>
          )}
        </div>
      );
    }

    return days;
  };

  // Calculate summary
  const calculateSummary = () => {
    let vanTotal = 0, footTotal = 0, hoursTotal = 0;

    Object.values(allocations).forEach(alloc => {
      vanTotal += alloc.van || 0;
      footTotal += alloc.foot || 0;
      hoursTotal += alloc.hours || 0;
    });

    return { vanTotal, footTotal, hoursTotal };
  };

  const summary = calculateSummary();

  if (loading || roleLoading) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center">
        <div>Loading labour scheduler...</div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-neutral-950 text-neutral-100 flex items-center justify-center">
        <div>Job not found</div>
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

        .job-header {
          margin-bottom: 24px;
          padding-bottom: 16px;
          border-bottom: 1px solid rgba(255,255,255,0.1);
        }

        .job-title {
          font-size: 20px;
          font-weight: 700;
          margin-bottom: 8px;
        }

        .job-meta {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .meta-item {
          display: flex;
          justify-content: space-between;
          font-size: 13px;
          color: #888;
        }

        .meta-item strong {
          color: #fafafa;
        }

        .timeline-section {
          margin-bottom: 24px;
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

        .timeline-card {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 8px;
          padding: 12px;
          margin-bottom: 8px;
        }

        .date-range {
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
        }

        .date-input {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 4px;
          padding: 6px 8px;
          color: #fafafa;
          font-size: 13px;
        }

        .duration-display {
          font-size: 14px;
          font-weight: 600;
          color: #60a5fa;
          text-align: center;
          margin-top: 8px;
        }

        .tasks-list {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 8px;
          padding: 12px;
        }

        .task-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 0;
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }

        .task-item:last-child {
          border-bottom: none;
        }

        .task-name {
          font-size: 14px;
          flex: 1;
        }

        .task-hours {
          font-size: 13px;
          color: #888;
          margin-right: 12px;
        }

        .task-crew {
          display: flex;
          gap: 4px;
        }

        .crew-badge {
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 600;
        }

        .crew-badge.van {
          background: rgba(59, 130, 246, 0.2);
          color: #60a5fa;
        }

        .crew-badge.foot {
          background: rgba(168, 85, 247, 0.2);
          color: #a78bfa;
        }

        .crew-badge.supervisor {
          background: rgba(251, 146, 60, 0.2);
          color: #fbbf24;
        }

        .crew-requirements {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 8px;
          padding: 12px;
        }

        .crew-calc {
          display: grid;
          gap: 8px;
        }

        .crew-line {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 14px;
        }

        .crew-line .label {
          color: #888;
        }

        .crew-line .value {
          font-weight: 600;
        }

        .total-row {
          padding-top: 8px;
          margin-top: 8px;
          border-top: 1px solid rgba(255,255,255,0.1);
          font-weight: 600;
          color: #10b981;
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

        .btn-success {
          background: #10b981;
          border-color: #10b981;
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

        .allocation-mode {
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

        .suggestion-bar {
          background: rgba(37, 99, 235, 0.1);
          border: 1px solid rgba(37, 99, 235, 0.3);
          border-radius: 8px;
          padding: 12px;
          margin-bottom: 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .suggestion-text {
          font-size: 14px;
          color: #60a5fa;
        }

        .apply-suggestion {
          padding: 6px 12px;
          background: #2563eb;
          border-radius: 6px;
          color: white;
          font-size: 13px;
          cursor: pointer;
          border: none;
        }

        .apply-suggestion:hover {
          background: #1d4ed8;
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

        .day-cell.in-range {
          background: rgba(37, 99, 235, 0.05);
          border: 1px solid rgba(37, 99, 235, 0.2);
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

        .allocation-summary {
          margin-top: 20px;
          padding: 16px;
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 8px;
        }

        .summary-title {
          font-size: 14px;
          font-weight: 600;
          margin-bottom: 12px;
        }

        .summary-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
        }

        .summary-card {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 6px;
          padding: 8px;
          text-align: center;
        }

        .summary-label {
          font-size: 11px;
          color: #888;
          text-transform: uppercase;
          margin-bottom: 4px;
        }

        .summary-value {
          font-size: 18px;
          font-weight: 700;
        }
      `}</style>

      <div className="split-layout">
        {/* Left Panel: Job Details */}
        <div className="job-panel">
          <div className="job-header">
            <h2 className="job-title">{job.reference} - {job.client_name}</h2>
            <div className="job-meta">
              <div className="meta-item">
                <span>Location:</span>
                <strong>{job.location}</strong>
              </div>
              <div className="meta-item">
                <span>Client:</span>
                <strong>{job.client_name}</strong>
              </div>
              <div className="meta-item">
                <span>Value:</span>
                <strong>£{job.quoted_amount?.toLocaleString()}</strong>
              </div>
            </div>
          </div>

          <div className="timeline-section">
            <h3 className="section-title">📅 Project Timeline</h3>
            <div className="timeline-card">
              <div className="date-range">
                <input
                  type="date"
                  className="date-input"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
                <input
                  type="date"
                  className="date-input"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              <div className="duration-display">{job.workingDays} Working Days</div>
            </div>
          </div>

          <div className="timeline-section">
            <h3 className="section-title">📋 Tasks & Requirements</h3>
            <div className="tasks-list">
              {job.tasks.map((task, index) => (
                <div key={index} className="task-item">
                  <span className="task-name">{task.name}</span>
                  <span className="task-hours">{task.hours}h</span>
                  <div className="task-crew">
                    {task.crew.van && <span className="crew-badge van">{task.crew.van} Van</span>}
                    {task.crew.foot && <span className="crew-badge foot">{task.crew.foot} Foot</span>}
                    {task.crew.supervisor && <span className="crew-badge supervisor">{task.crew.supervisor} Sup</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="timeline-section">
            <h3 className="section-title">👷 Crew Calculation</h3>
            <div className="crew-requirements">
              <div className="crew-calc">
                <div className="crew-line">
                  <span className="label">Total Hours Required:</span>
                  <span className="value">{job.totalHours}h</span>
                </div>
                <div className="crew-line">
                  <span className="label">Available Days:</span>
                  <span className="value">{job.workingDays} days</span>
                </div>
                <div className="crew-line">
                  <span className="label">Daily Hours Needed:</span>
                  <span className="value">{(job.totalHours / job.workingDays).toFixed(1)}h</span>
                </div>
                <div className="crew-line total-row">
                  <span className="label">Suggested Crew:</span>
                  <span className="value">1 Van + 2 Foot</span>
                </div>
              </div>
            </div>
          </div>

          <div className="action-buttons">
            <button className="btn btn-primary" onClick={autoAllocate}>
              Auto-Allocate
            </button>
            <button className="btn" onClick={balancedAllocate}>
              Balanced
            </button>
          </div>

          {canEditLabour(userRole) && (
            <div className="action-buttons">
              <button className="btn btn-success" onClick={saveSchedule}>
                Save Schedule
              </button>
            </div>
          )}
        </div>

        {/* Right Panel: Calendar */}
        <div className="calendar-panel">
          <div className="calendar-header">
            <h1 className="calendar-title">Labour Allocation</h1>
            <div className="allocation-mode">
              <button
                className={`mode-btn ${allocationMode === 'auto' ? 'active' : ''}`}
                onClick={() => setAllocationMode('auto')}
              >
                Auto
              </button>
              <button
                className={`mode-btn ${allocationMode === 'manual' ? 'active' : ''}`}
                onClick={() => setAllocationMode('manual')}
              >
                Manual
              </button>
              <button
                className={`mode-btn ${allocationMode === 'balanced' ? 'active' : ''}`}
                onClick={() => setAllocationMode('balanced')}
              >
                Balanced
              </button>
            </div>
          </div>

          <div className="suggestion-bar">
            <span className="suggestion-text">
              Suggested allocation: 1 van crew + 2 on-foot installers across {job.workingDays} days
            </span>
            <button className="apply-suggestion" onClick={autoAllocate}>Apply</button>
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
              {renderCalendar()}
            </div>
          </div>

          <div className="allocation-summary">
            <h3 className="summary-title">Allocation Summary</h3>
            <div className="summary-grid">
              <div className="summary-card">
                <div className="summary-label">Van Days</div>
                <div className="summary-value">{summary.vanTotal}</div>
              </div>
              <div className="summary-card">
                <div className="summary-label">Foot Days</div>
                <div className="summary-value">{summary.footTotal}</div>
              </div>
              <div className="summary-card">
                <div className="summary-label">Total Hours</div>
                <div className="summary-value">{summary.hoursTotal.toFixed(1)}h</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}