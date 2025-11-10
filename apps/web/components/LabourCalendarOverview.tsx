import React, { useState, useEffect, useCallback } from 'react';

import { supabase } from '@/lib/supabaseClient';
import { theme } from '@/lib/theme';

interface LabourAllocation {
  work_date: string;
  van_crews: number;
  foot_installers: number;
  supervisors: number;
  capacity_hours: number;
  job_id: string;
  job_reference?: string;
}

interface LabourCalendarOverviewProps {
  title?: string;
}

const LabourCalendarOverview: React.FC<LabourCalendarOverviewProps> = ({
  title = "Labour Calendar Overview"
}) => {
  const [allocations, setAllocations] = useState<LabourAllocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());

  const loadLabourCalendar = useCallback(async () => {
    try {
      setLoading(true);

      const year = currentDate.getFullYear();
      const month = currentDate.getMonth() + 1;

      // Get all labour allocations for the current month across all jobs
      // Note: v_labour_calendar table may not exist, handle gracefully
      let data = null;
      let error = null;

      try {
        const response = await (supabase
          .from('v_labour_calendar') as any)
          .select(`
            *,
            jobs!inner(reference)
          `)
          .gte('work_date', `${year}-${month.toString().padStart(2, '0')}-01`)
          .lte('work_date', `${year}-${month.toString().padStart(2, '0')}-31`)
          .order('work_date', { ascending: true });

        data = response.data;
        error = response.error;
      } catch (err) {
        // Silently handle missing table
        error = err;
      }

      if (error) {
        // Silently handle missing table - no console error
        setAllocations([]);
        setLoading(false);
        return;
      }

      // Filter out days with no allocation and add job reference
      const activeAllocations = (data || []).filter((alloc: LabourAllocation & { jobs?: { reference?: string } }) =>
        alloc.van_crews > 0 || alloc.foot_installers > 0 || alloc.supervisors > 0
      ).map((alloc: LabourAllocation & { jobs?: { reference?: string } }): LabourAllocation => ({
        work_date: alloc.work_date,
        van_crews: alloc.van_crews,
        foot_installers: alloc.foot_installers,
        supervisors: alloc.supervisors,
        capacity_hours: alloc.capacity_hours,
        job_id: alloc.job_id,
        job_reference: alloc.jobs?.reference || 'Unknown'
      }));

      setAllocations(activeAllocations);
    } catch (error: unknown) {
      console.error('Error in loadLabourCalendar:', error);
    } finally {
      setLoading(false);
    }
  }, [currentDate]);

  useEffect(() => {
    loadLabourCalendar();
  }, [loadLabourCalendar]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const getTotalStats = () => {
    const result = allocations.reduce((acc, alloc) => ({
      totalVanDays: acc.totalVanDays + alloc.van_crews,
      totalFootDays: acc.totalFootDays + alloc.foot_installers,
      totalSupervisorDays: acc.totalSupervisorDays + alloc.supervisors,
      totalHours: acc.totalHours + alloc.capacity_hours,
      activeJobs: new Set([...acc.activeJobs, alloc.job_id])
    }), {
      totalVanDays: 0,
      totalFootDays: 0,
      totalSupervisorDays: 0,
      totalHours: 0,
      activeJobs: new Set<string>()
    });

    return {
      ...result,
      activeJobs: result.activeJobs.size
    };
  };

  const stats = getTotalStats();

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  if (loading) {
    return (
      <div className="glassmorphic-panel glassmorphic-base" style={{
        padding: 24,
        height: 400,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ color: theme.colors.textSubtle }}>Loading labour calendar...</div>
      </div>
    );
  }

  return (
    <div className="glassmorphic-panel glassmorphic-base" style={{
      padding: 24,
      height: 400,
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20
      }}>
        <h3 style={{
          margin: 0,
          fontSize: 18,
          fontWeight: 600,
          color: theme.colors.text
        }}>
          {title}
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            onClick={() => navigateMonth('prev')}
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: 4,
              color: theme.colors.text,
              padding: '4px 8px',
              cursor: 'pointer'
            }}
          >
            ←
          </button>
          <span style={{
            color: theme.colors.text,
            fontWeight: 600,
            fontSize: 14
          }}>
            {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </span>
          <button
            onClick={() => navigateMonth('next')}
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: 4,
              color: theme.colors.text,
              padding: '4px 8px',
              cursor: 'pointer'
            }}
          >
            →
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 12,
        marginBottom: 20,
        padding: 12,
        background: 'rgba(0,0,0,0.2)',
        borderRadius: 8
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#60a5fa' }}>
            {stats.totalVanDays}
          </div>
          <div style={{ fontSize: 10, color: theme.colors.textSubtle, textTransform: 'uppercase' }}>
            Van Days
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#34d399' }}>
            {stats.totalFootDays}
          </div>
          <div style={{ fontSize: 10, color: theme.colors.textSubtle, textTransform: 'uppercase' }}>
            Foot Days
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#fbbf24' }}>
            {stats.totalSupervisorDays}
          </div>
          <div style={{ fontSize: 10, color: theme.colors.textSubtle, textTransform: 'uppercase' }}>
            Supervisor Days
          </div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 20, fontWeight: 700, color: theme.colors.accent }}>
            {Math.round(stats.totalHours)}
          </div>
          <div style={{ fontSize: 10, color: theme.colors.textSubtle, textTransform: 'uppercase' }}>
            Total Hours
          </div>
        </div>
      </div>

      {/* Allocation List */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        fontSize: 12
      }}>
        {allocations.length === 0 ? (
          <div style={{
            textAlign: 'center',
            color: theme.colors.textSubtle,
            marginTop: 40
          }}>
            No labour scheduled for {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {allocations.map((alloc, index) => (
              <div key={index} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '8px 12px',
                background: 'rgba(255,255,255,0.02)',
                borderRadius: 6,
                border: '1px solid rgba(255,255,255,0.05)'
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{
                    fontWeight: 600,
                    color: theme.colors.text,
                    fontSize: 13
                  }}>
                    {formatDate(alloc.work_date)}
                  </span>
                  <span style={{
                    color: theme.colors.textSubtle,
                    fontSize: 11
                  }}>
                    {alloc.job_reference}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  {alloc.van_crews > 0 && (
                    <span style={{
                      padding: '2px 6px',
                      background: 'rgba(59, 130, 246, 0.2)',
                      borderRadius: 4,
                      color: '#60a5fa',
                      fontSize: 10,
                      fontWeight: 600
                    }}>
                      {alloc.van_crews}V
                    </span>
                  )}
                  {alloc.foot_installers > 0 && (
                    <span style={{
                      padding: '2px 6px',
                      background: 'rgba(16, 185, 129, 0.2)',
                      borderRadius: 4,
                      color: '#34d399',
                      fontSize: 10,
                      fontWeight: 600
                    }}>
                      {alloc.foot_installers}F
                    </span>
                  )}
                  {alloc.supervisors > 0 && (
                    <span style={{
                      padding: '2px 6px',
                      background: 'rgba(245, 158, 11, 0.2)',
                      borderRadius: 4,
                      color: '#fbbf24',
                      fontSize: 10,
                      fontWeight: 600
                    }}>
                      {alloc.supervisors}S
                    </span>
                  )}
                  <span style={{
                    fontSize: 11,
                    color: theme.colors.textSubtle,
                    marginLeft: 4
                  }}>
                    {Math.round(alloc.capacity_hours)}h
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default LabourCalendarOverview;