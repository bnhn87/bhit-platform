// Task Banner Component - Production Version
'use client';

import { Phone, FileText, DollarSign, Settings } from 'lucide-react';
import { useRouter } from 'next/router';
import React, { useEffect, useState } from 'react';

import { supabase } from '@/lib/supabaseClient';
import type { TaskBannerItemWithBrightness, TaskBannerSettings } from '@/lib/taskBanner/types';


export default function TaskBanner() {
  const [tasks, setTasks] = useState<TaskBannerItemWithBrightness[]>([]);
  const [settings, setSettings] = useState<TaskBannerSettings | null>(null);
  const [userPreferences, setUserPreferences] = useState<any | null>(null);
  const [isEnabled, setIsEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    loadBannerData();
    const subscription = setupRealtimeSubscriptions();
    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  async function loadBannerData() {
    try {
      // Get session for auth token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setLoading(false);
        return;
      }

      // Helper for safe fetching
      const safeFetch = async (url: string, options?: RequestInit) => {
        const res = await fetch(url, options);
        if (!res.ok) {
          // Consume body to avoid leaks, but ignore it
          await res.text().catch(() => { });
          throw new Error(`API Error ${res.status} for ${url}`);
        }
        return res.json();
      };

      // Check user permission
      const permissionData = await safeFetch('/api/task-banner/user-permissions', {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });

      if (!permissionData?.enabled) {
        setIsEnabled(false);
        setLoading(false);
        return;
      }

      setIsEnabled(true);

      // Fetch tasks
      const tasksData = await safeFetch('/api/task-banner/tasks', {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      setTasks(tasksData.tasks || []);

      // Fetch global settings
      const settingsData = await safeFetch('/api/task-banner/settings');
      setSettings(settingsData.settings);

      // Fetch user preferences (overrides global settings)
      // This endpoint might not exist or might fail, so we wrap it individually
      try {
        const preferencesData = await safeFetch('/api/task-banner/user-preferences', {
          headers: { 'Authorization': `Bearer ${session.access_token}` }
        });
        setUserPreferences(preferencesData.preferences);
      } catch (prefError) {
        // Ignore preference load errors, treat as null
        console.warn('Failed to load preferences via banner:', prefError);
        setUserPreferences(null);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error loading banner data:', error);
      // Fallback to disabled state on error to prevent UI crash
      setIsEnabled(false);
      setLoading(false);
    }
  }

  function setupRealtimeSubscriptions() {
    const channel = supabase
      .channel('task_banner_changes')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'task_banner_items' },
        () => loadBannerData()
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'task_banner_settings' },
        () => loadBannerData()
      )
      .subscribe();

    return channel;
  }

  async function handleTaskClick(task: TaskBannerItemWithBrightness) {
    try {
      // Mark as in-progress if pending
      if (task.status === 'pending') {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          await fetch('/api/task-banner/tasks', {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              id: task.id,
              status: 'in_progress'
            })
          });
        }
      }

      // Navigate to the route
      router.push(task.navigation_route);
    } catch (error) {
      console.error('Error handling task click:', error);
    }
  }

  // DEBUG: Show demo banner if database not set up yet
  const isDemoMode = !isEnabled || !settings || tasks.length === 0;

  if (loading) {
    return null;
  }

  // Demo data for testing (shows immediately)
  const demoSettings: TaskBannerSettings = {
    id: 'demo',
    show_background: true,
    background_color: 'black',
    text_style: 'CLEAN_NEON',
    text_color: 'neon-blue',
    font_size: 22, // Reduced by ~10% from 24
    scroll_speed: 30,
    message_spacing: 96, // pixels between messages
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const demoTasks: TaskBannerItemWithBrightness[] = [
    {
      id: 'demo-1',
      title: 'DATABASE SETUP REQUIRED - CLICK TO VIEW INSTRUCTIONS',
      type: 'admin',
      frequency: 'once',
      due_date: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      status: 'pending',
      navigation_route: '/dashboard',
      assigned_to: 'all',
      created_by: 'system',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      brightness: 5,
      dueIn: 'SETUP NEEDED',
      saved: false
    }
  ];

  // Use user preferences if available, otherwise global settings, otherwise demo
  const displaySettings = isDemoMode
    ? demoSettings
    : (userPreferences || settings);

  // If no tasks, create empty message task
  const getEmptyMessageTasks = (settings: TaskBannerSettings): TaskBannerItemWithBrightness[] => {
    const emptyMessage = settings.empty_message || 'NO ACTIVE TASKS - ALL CLEAR';
    return [{
      id: 'empty-message',
      title: emptyMessage,
      type: 'admin',
      frequency: 'once',
      due_date: new Date().toISOString(),
      status: 'pending',
      navigation_route: '/dashboard',
      assigned_to: 'all',
      created_by: 'system',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      brightness: 3,
      dueIn: '',
      saved: false
    }];
  };

  const displayTasks = isDemoMode
    ? demoTasks
    : tasks.length > 0
      ? tasks
      : getEmptyMessageTasks(displaySettings);

  // Calculate dynamic height based on font size - hugs the text
  const fontSize = displaySettings.font_size || 22;
  const bannerHeight = Math.max(40, Math.round(fontSize * 2.3)); // Dynamic height with minimum
  const verticalPadding = Math.max(8, Math.round(fontSize * 0.35)); // Proportional padding

  return (
    <>
      <link href="https://fonts.googleapis.com/css2?family=Rubik+Pixels&display=swap" rel="stylesheet" />

      <style>{`
        @keyframes scroll {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }

        @keyframes led-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.85; }
        }

        .dot-matrix-text {
          font-family: 'Rubik Pixels', monospace;
          text-transform: uppercase;
          letter-spacing: 0.3em;
          line-height: 1;
        }
      `}</style>

      <div
        className="task-banner"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 9999,
          overflow: 'hidden',
          height: bannerHeight,
          paddingTop: verticalPadding,
          paddingBottom: verticalPadding,
          backgroundColor: displaySettings.show_background ? getBackgroundColor(displaySettings.background_color) : 'transparent',
          borderBottom: displaySettings.show_background ? '2px solid rgba(255, 255, 255, 0.1)' : 'none',
          boxShadow: displaySettings.show_background ? 'inset 0 0 30px rgba(0, 0, 0, 0.9)' : 'none',
          display: 'flex',
          alignItems: 'center'
        }}
      >
        {/* LED matrix pixel grid */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            opacity: 0.15,
            background: `
              repeating-linear-gradient(
                0deg,
                transparent,
                transparent 2px,
                rgba(0,0,0,0.5) 2px,
                rgba(0,0,0,0.5) 3px
              )
            `
          }}
        />

        {/* Scrolling tasks */}
        <div style={{ display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
          {[...displayTasks, ...displayTasks].map((task, index) => (
            <TaskCard
              key={`${task.id}-${index}`}
              task={task}
              index={index}
              settings={displaySettings}
              onClick={() => handleTaskClick(task)}
              messageSpacing={displaySettings.message_spacing || 96}
            />
          ))}
        </div>
      </div>
    </>
  );
}

function TaskCard({
  task,
  index,
  settings,
  onClick,
  messageSpacing
}: {
  task: TaskBannerItemWithBrightness;
  index: number;
  settings: TaskBannerSettings;
  onClick: () => void;
  messageSpacing: number;
}) {
  // Use text_color from settings if available, otherwise fall back to task type color
  const color = settings.text_color ? getTextColorRGB(settings.text_color) : getTaskColor(task.type);
  const styles = getBrightnessStyles(task.brightness);
  const isPulsing = task.brightness >= 4;
  const isDotMatrix = settings.text_style === 'DOT_MATRIX';

  return (
    <div
      onClick={onClick}
      style={{
        cursor: 'pointer',
        flexShrink: 0,
        animation: `scroll ${settings.scroll_speed}s linear infinite`,
        animationDelay: `${index * -5}s`,
        zIndex: task.brightness * 10,
        marginRight: `${messageSpacing}px`
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '0 28px' }}>
        {/* Icon */}
        <div
          style={{
            color: `rgb(${color.rgb})`,
            opacity: styles.opacity,
            filter: isDotMatrix
              ? `brightness(${0.5 + (styles.opacity * 0.7)})`
              : `drop-shadow(0 0 ${styles.blur * 0.3}px rgba(${color.rgb}, ${styles.opacity}))`,
            animation: isPulsing ? 'led-pulse 1.2s ease-in-out infinite' : 'none'
          }}
        >
          {getTaskIcon(task.type)}
        </div>

        {/* Task title */}
        <span
          className={isDotMatrix ? 'dot-matrix-text' : ''}
          style={{
            color: `rgb(${color.rgb})`,
            fontSize: `${Math.round(settings.font_size * 0.9)}px`,
            fontFamily: isDotMatrix ? "'Rubik Pixels', monospace" : "'Inter', -apple-system, sans-serif",
            fontWeight: isDotMatrix ? 'normal' : '600',
            letterSpacing: isDotMatrix ? '0.3em' : '0.05em',
            textShadow: isDotMatrix
              ? (isPulsing ? `0 0 2px rgba(${color.rgb}, 0.6)` : 'none')
              : `
                  0 0 ${styles.blur * 0.2}px rgba(${color.rgb}, ${styles.opacity}),
                  0 0 ${styles.blur * 0.5}px rgba(${color.rgb}, ${styles.opacity * 0.6}),
                  0 0 ${styles.blur}px rgba(${color.rgb}, ${styles.opacity * 0.3})
                `,
            opacity: styles.opacity,
            maskImage: task.saved
              ? 'linear-gradient(to right, white 0%, white 50%, transparent 100%)'
              : 'none',
            WebkitMaskImage: task.saved
              ? 'linear-gradient(to right, white 0%, white 50%, transparent 100%)'
              : 'none',
            filter: isDotMatrix
              ? `brightness(${0.5 + (styles.opacity * 0.7)})`
              : 'none',
            animation: isPulsing ? 'led-pulse 1.2s ease-in-out infinite' : 'none',
            whiteSpace: 'nowrap',
            textTransform: 'uppercase'
          }}
        >
          {task.title}
        </span>

        {/* Due time */}
        <span
          className={isDotMatrix ? 'dot-matrix-text' : ''}
          style={{
            color: `rgb(${color.rgb})`,
            fontSize: `${Math.round(settings.font_size * 0.5)}px`,
            fontFamily: isDotMatrix ? "'Rubik Pixels', monospace" : "'Inter', -apple-system, sans-serif",
            fontWeight: isDotMatrix ? 'normal' : '600',
            letterSpacing: isDotMatrix ? '0.3em' : '0.1em',
            textShadow: isDotMatrix
              ? 'none'
              : `0 0 ${styles.blur * 0.2}px rgba(${color.rgb}, ${styles.opacity * 0.8})`,
            opacity: styles.opacity * 0.8,
            filter: isDotMatrix
              ? `brightness(${0.6 + (styles.opacity * 0.5)})`
              : 'none',
            textTransform: 'uppercase'
          }}
        >
          {task.dueIn}
        </span>
      </div>
    </div>
  );
}

// Helper functions
function getTextColorRGB(textColor: string): { rgb: string } {
  const colors: Record<string, { rgb: string }> = {
    'neon-blue': { rgb: '0, 191, 255' },
    'cyber-pink': { rgb: '255, 20, 147' },
    'electric-purple': { rgb: '138, 43, 226' },
    'toxic-green': { rgb: '57, 255, 20' },
    'laser-red': { rgb: '255, 0, 77' },
    'plasma-orange': { rgb: '255, 140, 0' },
    'cosmic-teal': { rgb: '0, 255, 234' },
    'radioactive-yellow': { rgb: '255, 255, 0' },
    'hot-magenta': { rgb: '255, 0, 255' },
    'ultra-violet': { rgb: '159, 0, 255' },
    'neon-lime': { rgb: '191, 255, 0' },
    'bright-cyan': { rgb: '0, 255, 255' },
    'fire-orange': { rgb: '255, 69, 0' },
    'shocking-pink': { rgb: '255, 105, 180' },
    'vivid-gold': { rgb: '255, 215, 0' },
    'rainbow': { rgb: '0, 191, 255' } // Default for rainbow, will cycle
  };
  return colors[textColor] || colors['neon-blue'];
}

function getTaskColor(type: string) {
  const colors: Record<string, { rgb: string }> = {
    invoicing: { rgb: '168, 85, 247' },
    costs: { rgb: '34, 197, 94' },
    calls: { rgb: '59, 130, 246' },
    admin: { rgb: '236, 72, 153' }
  };
  return colors[type] || colors.admin;
}

function getBrightnessStyles(brightness: number) {
  const levels: Record<number, { opacity: number; blur: number; spread: number }> = {
    1: { opacity: 0.35, blur: 4, spread: 1 },
    2: { opacity: 0.55, blur: 8, spread: 2 },
    3: { opacity: 0.75, blur: 14, spread: 4 },
    4: { opacity: 0.9, blur: 24, spread: 8 },
    5: { opacity: 1, blur: 40, spread: 15 }
  };
  return levels[brightness] || levels[3];
}

function getTaskIcon(type: string) {
  switch (type) {
    case 'invoicing': return <FileText size={18} />;
    case 'costs': return <DollarSign size={18} />;
    case 'calls': return <Phone size={18} />;
    case 'admin': return <Settings size={18} />;
    default: return <Settings size={18} />;
  }
}

function getBackgroundColor(color: string) {
  const colors: Record<string, string> = {
    black: '#000000',
    charcoal: '#1a1a1a',
    grey: '#4a4a4a',
    silver: '#c0c0c0',
    gold: '#d4af37',
    green: '#1a3d2e',
    teal: '#1a3d3d',
    navy: '#1a1a3d',
    purple: '#2d1a3d',
    pink: '#3d1a2d',
    brown: '#3d2a1a',
    orange: '#3d2a1a',
    white: '#ffffff',
    cream: '#f5f5dc'
  };
  return colors[color] || colors.black;
}
