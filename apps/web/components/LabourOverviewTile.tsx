import React, { useState, useEffect, useCallback } from 'react';

import { supabase } from '@/lib/supabaseClient';
import { theme } from '@/lib/theme';

interface LabourAllocation {
  work_date: string;
  van_crews: number;
  foot_installers: number;
  supervisors: number;
  capacity_hours: number;
}

interface LabourOverviewTileProps {
  jobId: string;
}

const LabourOverviewTile: React.FC<LabourOverviewTileProps> = ({ jobId }) => {
  const [allocations, setAllocations] = useState<LabourAllocation[]>([]);
  const [loading, setLoading] = useState(true);

  const loadLabourAllocations = useCallback(async () => {
    try {
      setLoading(true);

      // Get current month's allocations
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;

      // Call the get_labour_calendar_month function
      const { data, error } = await supabase.rpc('get_labour_calendar_month', {
        p_job_id: jobId,
        p_year: year,
        p_month: month
      });

      if (error) {
        console.error('Error loading labour allocations:', error);
        return;
      }

      // Filter out days with no allocation
      const activeAllocations = (data || []).filter((alloc: LabourAllocation) =>
        alloc.van_crews > 0 || alloc.foot_installers > 0 || alloc.supervisors > 0
      );

      setAllocations(activeAllocations);
    } catch (error) {
      console.error('Error in loadLabourAllocations:', error);
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    if (!jobId) return;
    loadLabourAllocations();
  }, [jobId, loadLabourAllocations]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const getTotalStats = () => {
    return allocations.reduce((acc, alloc) => ({
      totalVanDays: acc.totalVanDays + alloc.van_crews,
      totalFootDays: acc.totalFootDays + alloc.foot_installers,
      totalSupervisorDays: acc.totalSupervisorDays + alloc.supervisors,
      totalHours: acc.totalHours + alloc.capacity_hours
    }), { totalVanDays: 0, totalFootDays: 0, totalSupervisorDays: 0, totalHours: 0 });
  };

  const stats = getTotalStats();

  if (loading) {
    return (
      <div style={{
        padding: 16,
        borderRadius: 10,
        border: `1px solid ${theme.colors.border}`,
        background: "rgba(255,255,255,0.03)"
      }}>
        <div style={{ fontWeight: 600, marginBottom: 8, color: theme.colors.text }}>
          Labour Allocation
        </div>
        <div style={{ color: theme.colors.textSubtle, fontSize: 14 }}>
          Loading...
        </div>
      </div>
    );
  }

  if (allocations.length === 0) {
    return (
      <div style={{
        padding: 16,
        borderRadius: 10,
        border: `1px solid ${theme.colors.border}`,
        background: "rgba(255,255,255,0.03)"
      }}>
        <div style={{ fontWeight: 600, marginBottom: 8, color: theme.colors.text }}>
          Labour Allocation
        </div>
        <div style={{ color: theme.colors.textSubtle, fontSize: 14 }}>
          No labour scheduled for this month
        </div>
      </div>
    );
  }

  return (
    <div style={{
      padding: 16,
      borderRadius: 10,
      border: `1px solid ${theme.colors.border}`,
      background: "rgba(255,255,255,0.03)"
    }}>
      <div style={{ fontWeight: 600, marginBottom: 12, color: theme.colors.text }}>
        Labour Allocation
      </div>

      {/* Summary Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: 8,
        marginBottom: 12,
        padding: 8,
        background: 'rgba(0,0,0,0.2)',
        borderRadius: 6
      }}>
        <div style={{ fontSize: 12, color: theme.colors.textSubtle }}>
          <div><strong>Van Days:</strong> {stats.totalVanDays}</div>
          <div><strong>Foot Days:</strong> {stats.totalFootDays}</div>
        </div>
        <div style={{ fontSize: 12, color: theme.colors.textSubtle }}>
          <div><strong>Supervisor Days:</strong> {stats.totalSupervisorDays}</div>
          <div><strong>Total Hours:</strong> {Math.round(stats.totalHours)}</div>
        </div>
      </div>

      {/* Detailed Schedule */}
      <div style={{
        maxHeight: 200,
        overflowY: 'auto',
        fontSize: 12,
        color: theme.colors.textSubtle
      }}>
        <div style={{ fontWeight: 600, marginBottom: 6, color: theme.colors.text }}>
          Scheduled Days:
        </div>
        {allocations.map((alloc, index) => (
          <div key={index} style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '4px 0',
            borderBottom: index < allocations.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none'
          }}>
            <span style={{ fontWeight: 500 }}>
              {formatDate(alloc.work_date)}
            </span>
            <div style={{ display: 'flex', gap: 8, fontSize: 11 }}>
              {alloc.van_crews > 0 && (
                <span style={{
                  padding: '2px 6px',
                  background: 'rgba(59, 130, 246, 0.2)',
                  borderRadius: 4,
                  color: '#60a5fa'
                }}>
                  {alloc.van_crews}V
                </span>
              )}
              {alloc.foot_installers > 0 && (
                <span style={{
                  padding: '2px 6px',
                  background: 'rgba(16, 185, 129, 0.2)',
                  borderRadius: 4,
                  color: '#34d399'
                }}>
                  {alloc.foot_installers}F
                </span>
              )}
              {alloc.supervisors > 0 && (
                <span style={{
                  padding: '2px 6px',
                  background: 'rgba(245, 158, 11, 0.2)',
                  borderRadius: 4,
                  color: '#fbbf24'
                }}>
                  {alloc.supervisors}S
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LabourOverviewTile;