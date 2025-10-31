import React, { useState, useEffect, useCallback } from 'react';

import { supabase } from '@/lib/supabaseClient';

interface LabourResource {
  id: string;
  name: string;
  resource_type: 'worker' | 'team' | 'equipment';
  role: string;
  availability_status: string;
  shifts_this_week: number;
  hours_this_week: number;
  next_shift_date: string | null;
  utilization_percentage: number;
}

interface Shift {
  id: string;
  resource_id: string;
  job_id: string | null;
  shift_date: string;
  start_time: string;
  end_time: string;
  shift_type: string;
  status: string;
  hours_worked: number | null;
  total_cost: number | null;
  job_reference?: string;
  job_location?: string;
}

interface CalendarEvent {
  id: string;
  title: string;
  start_date: string;
  end_date: string;
  start_time: string | null;
  end_time: string | null;
  event_type: string;
  status: string;
  color: string;
  resource_ids: string[];
}

const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const STATUS_COLORS = {
  scheduled: '#3b82f6',
  confirmed: '#22c55e',
  in_progress: '#f59e0b',
  completed: '#10b981',
  cancelled: '#ef4444',
  no_show: '#dc2626'
};

const RESOURCE_TYPE_COLORS = {
  worker: '#3b82f6',
  team: '#8b5cf6',
  equipment: '#f59e0b'
};

export default function LabourCalendar() {
  const [resources, setResources] = useState<LabourResource[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [_events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [_selectedResource, _setSelectedResource] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'week' | 'day' | 'month'>('week');
  const [_showCreateModal, setShowCreateModal] = useState(false);

  const loadCalendarData = useCallback(async () => {
    try {
      setLoading(true);

      // Load resources summary
      const { data: resourcesData, error: resourcesError } = await supabase
        .from('labour_calendar_summary')
        .select('*')
        .order('resource_name');

      if (resourcesError) throw resourcesError;
      setResources(resourcesData || []);

      // Calculate week bounds
      const weekStart = getWeekStart(currentWeek);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);

      // Load shifts for the current period
      const { data: shiftsData, error: shiftsError } = await supabase
        .from('labour_shifts')
        .select(`
          *,
          labour_resources (name, resource_type),
          jobs (reference, location)
        `)
        .gte('shift_date', weekStart.toISOString().split('T')[0])
        .lte('shift_date', weekEnd.toISOString().split('T')[0])
        .order('shift_date')
        .order('start_time');

      if (shiftsError) throw shiftsError;

      const transformedShifts: Shift[] = (shiftsData || []).map(shift => ({
        id: shift.id,
        resource_id: shift.resource_id,
        job_id: shift.job_id,
        shift_date: shift.shift_date,
        start_time: shift.start_time,
        end_time: shift.end_time,
        shift_type: shift.shift_type,
        status: shift.status,
        hours_worked: shift.hours_worked,
        total_cost: shift.total_cost,
        job_reference: shift.jobs?.reference,
        job_location: shift.jobs?.location
      }));

      setShifts(transformedShifts);

      // Load calendar events
      const { data: eventsData, error: eventsError } = await supabase
        .from('labour_calendar_events')
        .select('*')
        .gte('start_date', weekStart.toISOString().split('T')[0])
        .lte('end_date', weekEnd.toISOString().split('T')[0])
        .order('start_date')
        .order('start_time');

      if (eventsError) throw eventsError;
      setEvents(eventsData || []);

    } catch (error) {
      console.error('Error loading calendar data:', error);
    } finally {
      setLoading(false);
    }
  }, [currentWeek]);

  useEffect(() => {
    loadCalendarData();
  }, [loadCalendarData]);

  function getWeekStart(date: Date): Date {
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    return new Date(date.setDate(diff));
  }

  function getWeekDays(startDate: Date): Date[] {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(startDate);
      day.setDate(day.getDate() + i);
      days.push(day);
    }
    return days;
  }

  function formatTime(time: string): string {
    return new Date(`2000-01-01T${time}`).toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  }

  function formatDate(date: Date): string {
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short'
    });
  }

  function getShiftsForResourceAndDate(resourceId: string, date: string): Shift[] {
    return shifts.filter(shift =>
      shift.resource_id === resourceId &&
      shift.shift_date === date
    );
  }

  function navigateWeek(direction: 'prev' | 'next') {
    const newWeek = new Date(currentWeek);
    newWeek.setDate(newWeek.getDate() + (direction === 'next' ? 7 : -7));
    setCurrentWeek(newWeek);
  }

  const weekStart = getWeekStart(new Date(currentWeek));
  const weekDays = getWeekDays(weekStart);

  if (loading) {
    return (
      <div style={{ padding: 24 }}>
        <div style={{ fontWeight: 800, fontSize: 24, marginBottom: 24 }}>
          Labour Calendar
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
            Labour Calendar
          </h1>
          <p style={{ fontSize: 14, color: '#9ca3af', margin: 0 }}>
            Visual scheduling and resource management
          </p>
        </div>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          {/* View Mode Selector */}
          <div style={{ display: 'flex', gap: 4, background: '#0f151c', borderRadius: 8, padding: 4 }}>
            {(['day', 'week', 'month'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                style={{
                  padding: '6px 12px',
                  background: viewMode === mode ? '#3b82f6' : 'transparent',
                  color: viewMode === mode ? '#fff' : '#9ca3af',
                  border: 'none',
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: 'pointer',
                  textTransform: 'capitalize'
                }}
              >
                {mode}
              </button>
            ))}
          </div>

          {/* Week Navigation */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button
              onClick={() => navigateWeek('prev')}
              style={{
                padding: '8px 12px',
                background: '#0f151c',
                border: '1px solid #1d2733',
                borderRadius: 6,
                color: '#e8eef6',
                cursor: 'pointer'
              }}
            >
              ←
            </button>
            <div style={{ fontSize: 14, fontWeight: 600, minWidth: 120, textAlign: 'center' }}>
              {formatDate(weekDays[0])} - {formatDate(weekDays[6])}
            </div>
            <button
              onClick={() => navigateWeek('next')}
              style={{
                padding: '8px 12px',
                background: '#0f151c',
                border: '1px solid #1d2733',
                borderRadius: 6,
                color: '#e8eef6',
                cursor: 'pointer'
              }}
            >
              →
            </button>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            style={{
              padding: '8px 16px',
              background: '#3b82f6',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            + Add Shift
          </button>
        </div>
      </div>

      {/* Resources Summary */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: 16,
        marginBottom: 32
      }}>
        {resources.slice(0, 4).map(resource => (
          <div
            key={resource.id}
            style={{
              padding: 16,
              background: '#0f151c',
              border: '1px solid #1d2733',
              borderRadius: 8
            }}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: 12
            }}>
              <div>
                <div style={{ fontWeight: 600, marginBottom: 2 }}>
                  {resource.name}
                </div>
                <div style={{
                  fontSize: 12,
                  color: '#9ca3af',
                  textTransform: 'capitalize'
                }}>
                  {resource.resource_type} • {resource.role}
                </div>
              </div>
              <div style={{
                padding: '2px 6px',
                borderRadius: 4,
                fontSize: 10,
                fontWeight: 600,
                textTransform: 'uppercase',
                background: RESOURCE_TYPE_COLORS[resource.resource_type],
                color: '#fff'
              }}>
                {resource.resource_type}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: 12 }}>
              <div>
                <div style={{ color: '#9ca3af' }}>This Week</div>
                <div style={{ fontWeight: 600 }}>
                  {resource.shifts_this_week} shifts
                </div>
              </div>
              <div>
                <div style={{ color: '#9ca3af' }}>Hours</div>
                <div style={{ fontWeight: 600 }}>
                  {Math.round(resource.hours_this_week)}h
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div style={{
        background: '#0f151c',
        border: '1px solid #1d2733',
        borderRadius: 12,
        overflow: 'hidden'
      }}>
        {/* Calendar Header */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '200px repeat(7, 1fr)',
          borderBottom: '1px solid #1d2733',
          background: '#14202b'
        }}>
          <div style={{
            padding: 16,
            fontWeight: 600,
            borderRight: '1px solid #1d2733'
          }}>
            Resources
          </div>
          {weekDays.map((day, index) => (
            <div
              key={index}
              style={{
                padding: 16,
                textAlign: 'center',
                borderRight: index < 6 ? '1px solid #1d2733' : 'none'
              }}
            >
              <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 2 }}>
                {DAYS_OF_WEEK[index]}
              </div>
              <div style={{ fontWeight: 600 }}>
                {formatDate(day)}
              </div>
            </div>
          ))}
        </div>

        {/* Calendar Body */}
        <div style={{ maxHeight: 600, overflow: 'auto' }}>
          {resources.map(resource => (
            <div
              key={resource.id}
              style={{
                display: 'grid',
                gridTemplateColumns: '200px repeat(7, 1fr)',
                borderBottom: '1px solid #1d2733',
                minHeight: 80
              }}
            >
              {/* Resource Info */}
              <div style={{
                padding: 16,
                borderRight: '1px solid #1d2733',
                background: '#111823',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center'
              }}>
                <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>
                  {resource.name}
                </div>
                <div style={{ fontSize: 12, color: '#9ca3af' }}>
                  {Math.round(resource.utilization_percentage)}% utilization
                </div>
              </div>

              {/* Day Cells */}
              {weekDays.map((day, dayIndex) => {
                const dateStr = day.toISOString().split('T')[0];
                const dayShifts = getShiftsForResourceAndDate(resource.id, dateStr);

                return (
                  <div
                    key={dayIndex}
                    style={{
                      padding: 8,
                      borderRight: dayIndex < 6 ? '1px solid #1d2733' : 'none',
                      minHeight: 80,
                      position: 'relative'
                    }}
                  >
                    {dayShifts.map(shift => (
                      <div
                        key={shift.id}
                        style={{
                          padding: '4px 6px',
                          marginBottom: 4,
                          background: STATUS_COLORS[shift.status as keyof typeof STATUS_COLORS] || '#6b7280',
                          borderRadius: 4,
                          fontSize: 10,
                          fontWeight: 600,
                          color: '#fff',
                          cursor: 'pointer'
                        }}
                        title={`${shift.job_reference || 'No Job'} • ${formatTime(shift.start_time)}-${formatTime(shift.end_time)}`}
                      >
                        <div style={{ marginBottom: 2 }}>
                          {formatTime(shift.start_time)}-{formatTime(shift.end_time)}
                        </div>
                        {shift.job_reference && (
                          <div style={{ fontSize: 8, opacity: 0.9 }}>
                            {shift.job_reference}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div style={{
        display: 'flex',
        gap: 16,
        marginTop: 16,
        fontSize: 12,
        color: '#9ca3af'
      }}>
        <div>Status:</div>
        {Object.entries(STATUS_COLORS).map(([status, color]) => (
          <div key={status} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{
              width: 12,
              height: 12,
              borderRadius: 2,
              background: color
            }} />
            <span style={{ textTransform: 'capitalize' }}>
              {status.replace('_', ' ')}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}