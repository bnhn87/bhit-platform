import React, { useState, useEffect, useCallback } from 'react';

import { useUserRole } from '@/hooks/useUserRole';
import { canEditLabour } from '@/lib/roles';
import { supabase } from '@/lib/supabaseClient';

interface LabourTabProps {
  jobId: string;
}

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
  title: string;
  status?: string;
  tasks: Task[];
  totalHours: number;
  workingDays: number;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const LabourTab: React.FC<LabourTabProps> = ({ jobId }) => {
  const { role: userRole, loading: roleLoading } = useUserRole();

  // State
  const [job, setJob] = useState<JobData | null>(null);
  const [allocations, setAllocations] = useState<Record<string, DayAllocation>>({});
  const [currentDate, setCurrentDate] = useState(new Date());
  const [allocationMode, setAllocationMode] = useState<'auto' | 'manual' | 'balanced'>('auto');
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [desiredJobLength, setDesiredJobLength] = useState<number>(7); // Default 7 days
  const [_smartQuoteData, setSmartQuoteData] = useState<Record<string, unknown> | null>(null);
  const [smartQuoteTasks, setSmartQuoteTasks] = useState<Task[]>([]);
  const [aiGeneratedTasks, setAiGeneratedTasks] = useState<Task[]>([]);

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

  // Calculate daily capacity hours using SmartQuote logic
  // 1 labour unit = 8 hours of productive work
  const calculateDailyHours = (van: number, foot: number): number => {
    const vanInstallers = van * 2; // Van crew = 2 installers
    const totalInstallers = vanInstallers + foot;
    return totalInstallers * 8; // 8 hours per installer (SmartQuote standard)
  };

  // Convert hours to labour units (SmartQuote standard)
  const hoursToLabourUnits = (hours: number): number => {
    return hours / 8; // 1 labour unit = 8 hours
  };

  // Convert labour units to hours
  const _labourUnitsToHours = (units: number): number => {
    return units * 8; // 8 hours per labour unit
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

      // Load job details - try v_jobs_list view first, then fallback to jobs table
      let jobData: Record<string, unknown> | null = null;
      let jobError: unknown = null;

      // First attempt: use v_jobs_list view (same pattern as main job page)
      const viewResult = await supabase
        .from('v_jobs_list')
        .select('id, reference, title, client_name')
        .eq('id', jobId)
        .limit(1)
        .single();

      if (viewResult.data) {
        jobData = viewResult.data;
      } else {
        // Fallback: try direct jobs table query with only known columns
        const tableResult = await supabase
          .from('jobs')
          .select('id, reference, title, client_name, status')
          .eq('id', jobId)
          .single();

        jobData = tableResult.data;
        jobError = tableResult.error;
      }

      if (jobError) {
        throw jobError;
      }

      if (!jobData) {
        throw new Error('Job not found - no data returned');
      }

      // Load job items/tasks from SmartQuote
      const { data: jobItems, error: itemsError } = await supabase
        .from('job_items')
        .select('*')
        .eq('job_id', jobId);

      // Load generated tasks
      const { data: generatedTasks, error: tasksError } = await supabase
        .from('generated_tasks')
        .select('*')
        .eq('job_id', jobId);

      if (itemsError) console.warn('No job items found:', itemsError);
      if (tasksError) console.warn('No generated tasks found:', tasksError);

      // Transform SmartQuote job items to tasks
      const smartQuoteTasks: Task[] = jobItems?.map(item => ({
        name: item.label || item.product_code || 'SmartQuote Item',
        hours: (item.qty || 1) * (item.hours_per_unit || 1),
        crew: {
          // Enhanced crew assignment logic based on product type
          van: (item.product_code?.toLowerCase().includes('workstation') ||
               item.product_code?.toLowerCase().includes('desk') ||
               item.product_code?.toLowerCase().includes('cabinet')) ? 1 : 0,
          foot: (item.product_code?.toLowerCase().includes('chair') ||
                item.product_code?.toLowerCase().includes('screen') ||
                item.product_code?.toLowerCase().includes('accessory')) ? 1 : 0,
          supervisor: (item.product_code?.toLowerCase().includes('quality') ||
                      item.product_code?.toLowerCase().includes('inspect')) ? 1 : 0
        }
      })) || [];

      // Transform generated tasks
      const aiGeneratedTasks: Task[] = generatedTasks?.map(task => ({
        name: task.title || 'Generated Task',
        hours: (task.estimated_time_minutes || 60) / 60, // Convert minutes to hours
        crew: {
          // Infer crew requirements from task description
          van: (task.description?.toLowerCase().includes('install') &&
               (task.description?.toLowerCase().includes('furniture') ||
                task.description?.toLowerCase().includes('desk') ||
                task.description?.toLowerCase().includes('cabinet'))) ? 1 : 0,
          foot: (task.description?.toLowerCase().includes('mount') ||
                task.description?.toLowerCase().includes('screen') ||
                task.description?.toLowerCase().includes('accessory')) ? 1 : 0,
          supervisor: (task.description?.toLowerCase().includes('quality') ||
                      task.description?.toLowerCase().includes('inspect') ||
                      task.description?.toLowerCase().includes('check')) ? 1 : 0
        }
      })) || [];

      // Combine all tasks
      const tasks: Task[] = [...smartQuoteTasks, ...aiGeneratedTasks];

      // Add fallback tasks if no data available
      if (tasks.length === 0) {
        tasks.push(
          { name: 'Installation work', hours: 40, crew: { van: 1, foot: 1 } },
          { name: 'Quality check', hours: 4, crew: { supervisor: 1 } }
        );
      }

      const totalHours = tasks.reduce((sum, task) => sum + task.hours, 0);
      // Use default dates since start_date/end_date columns don't exist
      const jobStart = new Date().toISOString().split('T')[0];
      const jobEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const workingDays = getWorkingDays(new Date(jobStart), new Date(jobEnd));

      const transformedJob: JobData = {
        id: String(jobData.id),
        reference: String(jobData.reference),
        client_name: String(jobData.client_name),
        title: String(jobData.title),
        status: jobData.status ? String(jobData.status) : undefined,
        tasks,
        totalHours,
        workingDays
      };

      // Store task arrays for UI display
      setSmartQuoteTasks(smartQuoteTasks);
      setAiGeneratedTasks(aiGeneratedTasks);

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
      console.error('Job ID that failed:', jobId);
      console.error('Error details:', error instanceof Error ? error.message : error);
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  // Load job data
  useEffect(() => {
    if (!jobId || !userRole) {
      return;
    }
    loadJobData();
  }, [jobId, userRole, loadJobData]);

  // Auto-allocate labour
  const autoAllocate = () => {
    if (!job || !startDate || !endDate) return;

    const newAllocations: Record<string, DayAllocation> = {};
    const start = new Date(startDate);
    const end = new Date(endDate);
    const current = new Date(start);

    // SmartQuote logic: Calculate labour units needed per day
    const dailyHours = job.totalHours / job.workingDays;
    const dailyLabourUnits = hoursToLabourUnits(dailyHours);
    const installersNeeded = Math.ceil(dailyLabourUnits); // Each installer = 1 labour unit (8h)

    // Determine optimal crew mix based on job type and SmartQuote data
    const dailyVan = Math.floor(installersNeeded / 2); // Prefer van crews (2 people)
    const dailyFoot = installersNeeded % 2; // Remaining single installers

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
    const labourUnitsPerDay = hoursToLabourUnits(hoursPerDay);

    while (current <= end) {
      const day = current.getDay();
      if (day !== 0 && day !== 6) {
        const dateStr = formatDate(current);

        // Calculate crew to achieve target labour units (SmartQuote logic)
        const installersNeeded = Math.ceil(labourUnitsPerDay);
        const vanCrews = Math.floor(installersNeeded / 2);
        const footInstallers = installersNeeded % 2;

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

  // Clear all allocations
  const clearAllocation = () => {
    setAllocations({});
  };

  // Auto-allocate based on desired job length
  const autoAllocateByJobLength = () => {
    if (!job || !desiredJobLength) return;

    // Calculate new end date based on desired job length
    const start = new Date(startDate);
    const newEnd = new Date(start);
    newEnd.setDate(start.getDate() + desiredJobLength - 1);

    const newEndDate = formatDate(newEnd);
    setEndDate(newEndDate);

    // Recalculate working days for the new period
    const workingDaysInPeriod = getWorkingDays(start, newEnd);

    if (workingDaysInPeriod === 0) return;

    const newAllocations: Record<string, DayAllocation> = {};
    const current = new Date(start);

    // Calculate optimal daily allocation using SmartQuote labour units
    const dailyHours = job.totalHours / workingDaysInPeriod;
    const dailyLabourUnits = hoursToLabourUnits(dailyHours);
    const installersNeeded = Math.ceil(dailyLabourUnits);

    // Distribute between van crews and foot installers (SmartQuote mix)
    const vanCrews = Math.floor(installersNeeded / 2);
    const footInstallers = installersNeeded % 2;

    let dayCount = 0;
    while (current <= newEnd && dayCount < desiredJobLength) {
      const day = current.getDay();
      if (day !== 0 && day !== 6) { // Skip weekends
        const dateStr = formatDate(current);

        newAllocations[dateStr] = {
          van: vanCrews,
          foot: footInstallers,
          supervisor: dayCount === Math.floor(workingDaysInPeriod / 2) ? 1 : 0, // Supervisor on middle day
          hours: calculateDailyHours(vanCrews, footInstallers)
        };
        dayCount++;
      }
      current.setDate(current.getDate() + 1);
    }

    setAllocations(newAllocations);
  };

  // Load SmartQuote data for job
  const loadSmartQuoteData = async () => {
    try {
      // Try to find quotes associated with this job
      const { data: quoteData, error } = await supabase
        .from('smartquotes')
        .select('*')
        .eq('job_id', jobId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        // eslint-disable-next-line no-console
        console.log('No SmartQuote found for job:', error.message);
        return null;
      }

      return quoteData;
    } catch (error: unknown) {
      console.error('Error loading SmartQuote data:', error);
      return null;
    }
  };

  // Allocate based on SmartQuote data
  const allocatePerSmartQuote = async () => {
    if (!job) return;

    try {
      const quoteData = await loadSmartQuoteData();

      if (!quoteData) {
        alert('No SmartQuote found for this job. Please create a quote first.');
        return;
      }

      // Parse the quote data to extract labour requirements
      const parsedData = JSON.parse(quoteData.parsed_data || '{}');
      const results = parsedData.results || [];

      if (results.length === 0) {
        alert('No products found in SmartQuote to calculate labour from.');
        return;
      }

      // Calculate total installation time from quote
      let totalQuoteHours = 0;
      let vanCrewsNeeded = 0;
      let footInstallersNeeded = 0;
      let _supervisorDays = 0;

      results.forEach((item: { quantity?: number; category?: string }) => {
        const qty = item.quantity || 1;
        const category = item.category || '';

        // Estimate hours based on product category and quantity
        if (category.toLowerCase().includes('workstation') || category.toLowerCase().includes('desk')) {
          totalQuoteHours += qty * 2; // 2 hours per workstation
          vanCrewsNeeded += Math.ceil(qty / 4); // 1 van crew can install 4 workstations per day
        } else if (category.toLowerCase().includes('chair') || category.toLowerCase().includes('seating')) {
          totalQuoteHours += qty * 0.5; // 30 minutes per chair
          footInstallersNeeded += Math.ceil(qty / 16); // 1 installer can do 16 chairs per day
        } else if (category.toLowerCase().includes('screen') || category.toLowerCase().includes('panel')) {
          totalQuoteHours += qty * 1; // 1 hour per screen
          footInstallersNeeded += Math.ceil(qty / 8); // 1 installer can do 8 screens per day
        } else {
          // Generic product - estimate 1 hour per item
          totalQuoteHours += qty * 1;
          footInstallersNeeded += Math.ceil(qty / 8);
        }
      });

      // Calculate job duration based on quote complexity
      const estimatedDays = Math.ceil(totalQuoteHours / 48); // 48 productive hours per week (7h * 8h - breaks)
      // Supervisor days calculated earlier in scope

      // Update job length and calculate new end date
      setDesiredJobLength(estimatedDays);

      const start = new Date(startDate);
      const newEnd = new Date(start);
      newEnd.setDate(start.getDate() + estimatedDays - 1);
      setEndDate(formatDate(newEnd));

      // Create optimized allocation
      const newAllocations: Record<string, DayAllocation> = {};
      const current = new Date(start);

      // Distribute crews optimally across the estimated period
      const dailyVanCrews = Math.max(1, Math.ceil(vanCrewsNeeded / estimatedDays));
      const dailyFootInstallers = Math.max(1, Math.ceil(footInstallersNeeded / estimatedDays));

      let dayCount = 0;
      while (current <= newEnd && dayCount < estimatedDays) {
        const day = current.getDay();
        if (day !== 0 && day !== 6) { // Skip weekends
          const dateStr = formatDate(current);

          newAllocations[dateStr] = {
            van: dailyVanCrews,
            foot: dailyFootInstallers,
            supervisor: dayCount % 3 === 1 ? 1 : 0, // Supervisor every 3rd working day
            hours: calculateDailyHours(dailyVanCrews, dailyFootInstallers)
          };
          dayCount++;
        }
        current.setDate(current.getDate() + 1);
      }

      setAllocations(newAllocations);
      setSmartQuoteData(quoteData);

      alert(`Labour allocated based on SmartQuote!\n\nEstimated job duration: ${estimatedDays} days\nTotal hours: ${Math.round(totalQuoteHours)}\nDaily allocation: ${dailyVanCrews} van crews, ${dailyFootInstallers} foot installers`);

    } catch (error: unknown) {
      console.error('Error allocating per SmartQuote:', error);
      alert('Error loading SmartQuote data. Please try again.');
    }
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
      if (allocation) {
        cellClass += ' selected has-allocation';
      }

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
      <div style={{ padding: '20px', color: '#fafafa' }}>
        Loading labour scheduler...
      </div>
    );
  }

  if (!job) {
    return (
      <div style={{ padding: '20px', color: '#fafafa' }}>
        <div>Job not found</div>
        <div style={{ fontSize: '12px', marginTop: '10px', opacity: 0.7 }}>
          Debug: jobId={jobId}, userRole={userRole}, loading={loading}
        </div>
      </div>
    );
  }

  return (
    <div style={{ color: '#fafafa', height: '100%', overflow: 'hidden' }}>
      <style jsx>{`
        .split-layout {
          display: grid;
          grid-template-columns: 400px 1fr;
          height: 500px;
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
          font-size: 18px;
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
          font-size: 12px;
          color: #888;
        }

        .meta-item strong {
          color: #fafafa;
        }

        .timeline-section {
          margin-bottom: 20px;
        }

        .section-title {
          font-size: 11px;
          text-transform: uppercase;
          color: #888;
          letter-spacing: 0.5px;
          margin-bottom: 10px;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .timeline-card {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 6px;
          padding: 10px;
          margin-bottom: 6px;
        }

        .date-range {
          display: flex;
          justify-content: space-between;
          margin-bottom: 6px;
        }

        .date-input {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 4px;
          padding: 4px 6px;
          color: #fafafa;
          font-size: 12px;
        }

        .duration-display {
          font-size: 13px;
          font-weight: 600;
          color: #60a5fa;
          text-align: center;
          margin-top: 6px;
        }

        .tasks-list {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 6px;
          padding: 10px;
          max-height: 120px;
          overflow-y: auto;
        }

        .task-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 6px 0;
          border-bottom: 1px solid rgba(255,255,255,0.05);
          font-size: 12px;
        }

        .task-item:last-child {
          border-bottom: none;
        }

        .task-name {
          flex: 1;
        }

        .task-hours {
          color: #888;
          margin-right: 8px;
        }

        .task-crew {
          display: flex;
          gap: 3px;
        }

        .crew-badge {
          padding: 1px 4px;
          border-radius: 3px;
          font-size: 9px;
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
          border-radius: 6px;
          padding: 10px;
        }

        .crew-calc {
          display: grid;
          gap: 6px;
        }

        .crew-line {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 12px;
        }

        .crew-line .label {
          color: #888;
        }

        .crew-line .value {
          font-weight: 600;
        }

        .total-row {
          padding-top: 6px;
          margin-top: 6px;
          border-top: 1px solid rgba(255,255,255,0.1);
          font-weight: 600;
          color: #10b981;
        }

        .action-buttons {
          display: flex;
          gap: 6px;
          margin-top: 16px;
        }

        .btn {
          flex: 1;
          padding: 8px;
          border-radius: 6px;
          border: 1px solid rgba(255,255,255,0.1);
          background: rgba(255,255,255,0.02);
          color: #fafafa;
          font-size: 12px;
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

        .btn-warning {
          background: #f59e0b;
          border-color: #f59e0b;
          color: #000;
        }

        .btn-warning:hover {
          background: #d97706;
        }

        .btn-secondary {
          background: #6b7280;
          border-color: #6b7280;
        }

        .btn-secondary:hover {
          background: #4b5563;
        }

        .btn-info {
          background: #0ea5e9;
          border-color: #0ea5e9;
        }

        .btn-info:hover {
          background: #0284c7;
        }

        .job-length-section {
          margin-top: 20px;
          padding: 16px;
          background: rgba(255,255,255,0.02);
          border-radius: 8px;
          border: 1px solid rgba(255,255,255,0.1);
        }

        .section-title {
          margin: 0 0 12px 0;
          font-size: 14px;
          font-weight: 600;
          color: #fafafa;
        }

        .input-group {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .input-group label {
          font-size: 12px;
          color: #d1d5db;
          min-width: 40px;
        }

        .job-length-input {
          flex: 1;
          padding: 6px 8px;
          border-radius: 4px;
          border: 1px solid rgba(255,255,255,0.2);
          background: rgba(0,0,0,0.3);
          color: #fafafa;
          font-size: 12px;
          max-width: 80px;
        }

        .job-length-input:focus {
          outline: none;
          border-color: #2563eb;
        }

        .calendar-panel {
          padding: 20px;
          overflow-y: auto;
        }

        .calendar-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .calendar-title {
          font-size: 18px;
          font-weight: 700;
        }

        .allocation-mode {
          display: flex;
          gap: 6px;
        }

        .mode-btn {
          padding: 4px 8px;
          border-radius: 4px;
          border: 1px solid rgba(255,255,255,0.1);
          background: rgba(255,255,255,0.02);
          color: #888;
          font-size: 11px;
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
          border-radius: 6px;
          padding: 10px;
          margin-bottom: 16px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .suggestion-text {
          font-size: 12px;
          color: #60a5fa;
        }

        .apply-suggestion {
          padding: 4px 8px;
          background: #2563eb;
          border-radius: 4px;
          color: white;
          font-size: 11px;
          cursor: pointer;
          border: none;
        }

        .apply-suggestion:hover {
          background: #1d4ed8;
        }

        .calendar {
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 12px;
          overflow: hidden;
        }

        .month-nav {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px;
          background: rgba(255,255,255,0.03);
          border-bottom: 1px solid rgba(255,255,255,0.1);
        }

        .month-display {
          font-size: 14px;
          font-weight: 600;
        }

        .nav-btn {
          width: 28px;
          height: 28px;
          border-radius: 4px;
          border: 1px solid rgba(255,255,255,0.1);
          background: rgba(255,255,255,0.02);
          color: #fafafa;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          font-size: 14px;
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
          padding: 8px;
          text-align: center;
          font-size: 10px;
          font-weight: 600;
          color: #888;
          text-transform: uppercase;
        }

        .days-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 2px;
          padding: 8px;
          border: 2px solid rgba(255,255,255,0.3);
          border-radius: 12px;
          background: rgba(0,0,0,0.1);
          backdrop-filter: blur(4px);
        }

        .day-cell {
          min-height: 140px;
          height: auto;
          border: 2px solid rgba(255,255,255,0.2);
          border-radius: 8px;
          padding: 12px 8px;
          cursor: pointer;
          position: relative;
          display: flex;
          flex-direction: column;
          gap: 6px;
          background: rgba(15, 23, 42, 0.8);
          backdrop-filter: blur(2px);
          transition: all 0.3s ease;
          box-sizing: border-box;
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.1), 0 1px 3px rgba(0,0,0,0.2);
        }

        .day-cell.other-month {
          opacity: 0.3;
          background: rgba(0,0,0,0.2);
          border-color: rgba(255,255,255,0.1);
          backdrop-filter: none;
        }

        .day-cell.weekend {
          background: rgba(71, 85, 105, 0.3);
          border-color: rgba(255,255,255,0.15);
        }

        .day-cell.in-range {
          background: rgba(59, 130, 246, 0.2);
          border-color: rgba(59, 130, 246, 0.6);
          box-shadow: inset 0 1px 0 rgba(59, 130, 246, 0.3), 0 2px 8px rgba(59, 130, 246, 0.2);
        }

        .day-cell.selected {
          background: rgba(16, 185, 129, 0.25);
          border-color: rgba(16, 185, 129, 0.8);
          box-shadow: inset 0 1px 0 rgba(16, 185, 129, 0.4), 0 2px 8px rgba(16, 185, 129, 0.3);
        }

        .day-cell.has-allocation {
          background: rgba(59, 130, 246, 0.2);
          border-color: rgba(59, 130, 246, 0.7);
          min-height: 160px;
          box-shadow: inset 0 1px 0 rgba(59, 130, 246, 0.4), 0 3px 12px rgba(59, 130, 246, 0.2);
        }

        .day-cell:hover:not(.other-month) {
          background: rgba(255,255,255,0.1);
          border-color: rgba(255,255,255,0.5);
          transform: translateY(-2px);
          box-shadow: inset 0 1px 0 rgba(255,255,255,0.2), 0 4px 16px rgba(0,0,0,0.3);
        }

        .day-number {
          font-size: 12px;
          font-weight: 600;
          margin-bottom: 4px;
        }

        .day-allocations {
          display: flex;
          flex-direction: column;
          gap: 3px;
          flex: 1;
        }

        .allocation-badge {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 2px;
          padding: 3px 6px;
          border-radius: 4px;
          font-size: 9px;
          font-weight: 600;
          border: 1px solid rgba(255,255,255,0.1);
          backdrop-filter: blur(2px);
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
          bottom: 2px;
          right: 2px;
          font-size: 8px;
          color: #10b981;
          background: rgba(16, 185, 129, 0.1);
          padding: 1px 3px;
          border-radius: 2px;
        }

        .allocation-summary {
          margin-top: 16px;
          padding: 12px;
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 6px;
        }

        .summary-title {
          font-size: 12px;
          font-weight: 600;
          margin-bottom: 8px;
        }

        .summary-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
        }

        .summary-card {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 4px;
          padding: 6px;
          text-align: center;
        }

        .summary-label {
          font-size: 9px;
          color: #888;
          text-transform: uppercase;
          margin-bottom: 2px;
        }

        .summary-value {
          font-size: 16px;
          font-weight: 700;
        }

        .summary-units {
          font-size: 10px;
          color: rgba(255,255,255,0.6);
          font-weight: 500;
        }
      `}</style>

      <div className="split-layout">
        {/* Left Panel: Job Details */}
        <div className="job-panel">
          <div className="job-header">
            <h2 className="job-title">{job.reference} - {job.client_name}</h2>
            <div className="job-meta">
              <div className="meta-item">
                <span>Status:</span>
                <strong>{job.status || 'planned'}</strong>
              </div>
              <div className="meta-item">
                <span>Title:</span>
                <strong>{job.title}</strong>
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
            <h3 className="section-title">📋 Tasks & Requirements ({job.tasks.length} total)</h3>
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

              {smartQuoteTasks.length > 0 && (
                <div style={{ marginTop: '12px', padding: '8px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '4px' }}>
                  <div style={{ fontSize: '11px', color: '#60a5fa', fontWeight: '600', marginBottom: '4px' }}>
                    SmartQuote Tasks ({smartQuoteTasks.length})
                  </div>
                  {smartQuoteTasks.map((task, idx) => (
                    <div key={`sq-${idx}`} style={{ fontSize: '10px', color: '#9ca3af', marginBottom: '2px' }}>
                      {task.name}: {task.hours}h
                    </div>
                  ))}
                </div>
              )}

              {aiGeneratedTasks.length > 0 && (
                <div style={{ marginTop: '8px', padding: '8px', background: 'rgba(168, 85, 247, 0.1)', borderRadius: '4px' }}>
                  <div style={{ fontSize: '11px', color: '#a78bfa', fontWeight: '600', marginBottom: '4px' }}>
                    Generated Tasks ({aiGeneratedTasks.length})
                  </div>
                  {aiGeneratedTasks.map((task, idx) => (
                    <div key={`ai-${idx}`} style={{ fontSize: '10px', color: '#9ca3af', marginBottom: '2px' }}>
                      {task.name}: {task.hours}h
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="timeline-section">
            <h3 className="section-title">👷 Crew Calculation</h3>
            <div className="crew-requirements">
              <div className="crew-calc">
                <div className="crew-line">
                  <span className="label">SmartQuote Hours ({smartQuoteTasks.length} items):</span>
                  <span className="value">{smartQuoteTasks.reduce((sum, task) => sum + task.hours, 0).toFixed(1)}h</span>
                </div>
                <div className="crew-line">
                  <span className="label">Generated Tasks Hours ({aiGeneratedTasks.length} items):</span>
                  <span className="value">{aiGeneratedTasks.reduce((sum, task) => sum + task.hours, 0).toFixed(1)}h</span>
                </div>
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
                  <span className="value">{Math.ceil((job.totalHours / job.workingDays) / 6.4)} Van + {Math.ceil(((job.totalHours / job.workingDays) % 6.4) / 6.4)} Foot</span>
                </div>
              </div>
            </div>
          </div>

          {/* Desired Job Length Input */}
          <div className="job-length-section">
            <h3 className="section-title">Desired Job Length</h3>
            <div className="input-group">
              <label htmlFor="jobLength">Days:</label>
              <input
                id="jobLength"
                type="number"
                min="1"
                max="30"
                value={desiredJobLength}
                onChange={(e) => setDesiredJobLength(parseInt(e.target.value) || 1)}
                className="job-length-input"
              />
              <button
                className="btn btn-secondary"
                onClick={autoAllocateByJobLength}
                disabled={!canEditLabour(userRole)}
                title="Auto-allocate labour for the specified number of days"
              >
                Apply
              </button>
            </div>
          </div>

          <div className="action-buttons">
            <button className="btn btn-primary" onClick={autoAllocate}>
              Auto-Allocate
            </button>
            <button className="btn" onClick={balancedAllocate}>
              Balanced
            </button>
            <button
              className="btn btn-info"
              onClick={allocatePerSmartQuote}
              disabled={!canEditLabour(userRole)}
              title="Auto-allocate labour based on SmartQuote data"
            >
              Allocate per SmartQuote
            </button>
            <button
              className="btn btn-warning"
              onClick={clearAllocation}
              disabled={!canEditLabour(userRole)}
              title="Clear all labour allocations"
            >
              Clear Allocation
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
              Suggested allocation: 1 van crew (2 labour units) + 2 on-foot installers (2 labour units) across {job.workingDays} days
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
                <div className="summary-label">Van Crews</div>
                <div className="summary-value">{summary.vanTotal}</div>
                <div className="summary-units">{(summary.vanTotal * 2).toFixed(1)} units</div>
              </div>
              <div className="summary-card">
                <div className="summary-label">Foot Installers</div>
                <div className="summary-value">{summary.footTotal}</div>
                <div className="summary-units">{summary.footTotal.toFixed(1)} units</div>
              </div>
              <div className="summary-card">
                <div className="summary-label">Total Hours</div>
                <div className="summary-value">{summary.hoursTotal.toFixed(1)}h</div>
                <div className="summary-units">{hoursToLabourUnits(summary.hoursTotal).toFixed(1)} units</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LabourTab;