// Task Banner Settings Component for Admin Panel
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { theme } from '@/lib/theme';
import type { TaskBannerSettings, TaskBannerItemWithBrightness, BackgroundColor, TextStyle, TextColor, TaskType, TaskFrequency, TaskAssignment } from '@/lib/taskBanner/types';

interface TaskBannerSettingsProps {
  isDirector: boolean;
}

export function TaskBannerSettingsComponent({ isDirector }: TaskBannerSettingsProps) {
  const [settings, setSettings] = useState<TaskBannerSettings | null>(null);
  const [tasks, setTasks] = useState<TaskBannerItemWithBrightness[]>([]);
  const [loading, setLoading] = useState(true);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    type: 'admin' as TaskType,
    frequency: 'once' as TaskFrequency,
    due_date: '',
    navigation_route: '/dashboard',
    assigned_to: 'all' as TaskAssignment
  });

  useEffect(() => {
    loadSettings();
    loadTasks();
  }, []);

  async function loadSettings() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error('[TaskBannerSettings] No session found');
        setSettings(getDefaultSettings());
        setLoading(false);
        return;
      }

      console.log('[TaskBannerSettings] Loading settings...');
      const res = await fetch('/api/task-banner/settings', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      console.log('[TaskBannerSettings] Settings response status:', res.status);
      const data = await res.json();
      console.log('[TaskBannerSettings] Settings data:', data);

      if (!res.ok) {
        console.error('[TaskBannerSettings] Failed to load settings:', data.error);
        setSettings(getDefaultSettings());
      } else {
        setSettings(data.settings || getDefaultSettings());
      }
      setLoading(false);
    } catch (error) {
      console.error('[TaskBannerSettings] Error loading settings:', error);
      setSettings(getDefaultSettings());
      setLoading(false);
    }
  }

  async function loadTasks() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch('/api/task-banner/tasks', {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      const data = await res.json();
      setTasks(data.tasks || []);
    } catch (error) {
      console.error('Error loading tasks:', error);
    }
  }

  async function saveSettings() {
    if (!settings || !isDirector) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setSaveMessage('No session found - please log in');
        setTimeout(() => setSaveMessage(null), 3000);
        return;
      }

      console.log('Saving settings:', settings);

      const res = await fetch('/api/task-banner/settings', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(settings)
      });

      const data = await res.json();
      console.log('Save response:', { status: res.status, data });

      if (res.ok) {
        setIsSaved(true);
        setSaveMessage('Settings saved successfully!');
        setTimeout(() => {
          setIsSaved(false);
          setSaveMessage(null);
        }, 3000);
      } else {
        const errorMsg = data.error || 'Error saving settings';
        setSaveMessage(`Error: ${errorMsg}`);
        console.error('Save failed:', { status: res.status, error: errorMsg });
        setTimeout(() => setSaveMessage(null), 5000);
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      setSaveMessage(`Error: ${error.message || 'Unknown error'}`);
      setTimeout(() => setSaveMessage(null), 5000);
    }
  }

  async function createTask() {
    if (!isDirector) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch('/api/task-banner/tasks', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newTask)
      });

      if (res.ok) {
        setShowCreateTask(false);
        setNewTask({
          title: '',
          type: 'admin',
          frequency: 'once',
          due_date: '',
          navigation_route: '/dashboard',
          assigned_to: 'all'
        });
        loadTasks();
        setSaveMessage('Task created successfully!');
        setTimeout(() => setSaveMessage(null), 3000);
      }
    } catch (error) {
      console.error('Error creating task:', error);
    }
  }

  async function deleteTask(taskId: string) {
    if (!isDirector) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch('/api/task-banner/tasks', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ id: taskId })
      });

      if (res.ok) {
        loadTasks();
        setSaveMessage('Task deleted');
        setTimeout(() => setSaveMessage(null), 3000);
      }
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  }

  function getDefaultSettings(): TaskBannerSettings {
    return {
      id: '1',
      show_background: true,
      background_color: 'black',
      text_style: 'CLEAN_NEON',
      text_color: 'neon-blue',
      font_size: 22,
      scroll_speed: 30,
      message_spacing: 96,
      empty_message: 'NO ACTIVE TASKS - ALL CLEAR',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
  }

  if (loading || !settings) {
    return <div style={{ color: theme.colors.textSubtle }}>Loading banner settings...</div>;
  }

  // Sample task for preview
  const sampleTask = {
    title: 'REVIEW PENDING INVOICES',
    type: 'invoicing' as TaskType,
    brightness: 4,
    dueIn: '2 HOURS'
  };

  // Helper function to get background color
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

  // Helper to get task color
  function getTaskColor(type: string) {
    const colors: Record<string, { rgb: string }> = {
      invoicing: { rgb: '168, 85, 247' },
      costs: { rgb: '34, 197, 94' },
      calls: { rgb: '59, 130, 246' },
      admin: { rgb: '236, 72, 153' }
    };
    return colors[type] || colors.admin;
  }

  return (
    <>
      {/* Font for Dot Matrix preview */}
      <link href="https://fonts.googleapis.com/css2?family=Rubik+Pixels&display=swap" rel="stylesheet" />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
        {/* Live Preview */}
        <div>
        <h4 style={{ fontSize: 16, fontWeight: 600, color: theme.colors.text, marginBottom: 12 }}>
          👁️ Live Preview
        </h4>
        <div
          style={{
            position: 'relative',
            overflow: 'hidden',
            height: 51,
            paddingTop: 8,
            paddingBottom: 8,
            backgroundColor: settings?.show_background ? getBackgroundColor(settings?.background_color || 'black') : 'transparent',
            borderBottom: settings?.show_background ? '2px solid rgba(255, 255, 255, 0.1)' : 'none',
            boxShadow: settings?.show_background ? 'inset 0 0 30px rgba(0, 0, 0, 0.9)' : 'none',
            borderRadius: theme.radii.md,
            border: `1px solid ${theme.colors.border}`
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

          {/* Scrolling sample */}
          <style>{`
            @keyframes previewScroll {
              0% { transform: translateX(100%); }
              100% { transform: translateX(-100%); }
            }
          `}</style>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              animation: `previewScroll ${settings?.scroll_speed || 30}s linear infinite`,
              whiteSpace: 'nowrap'
            }}
          >
            {[...Array(3)].map((_, idx) => {
              const color = getTaskColor(sampleTask.type);
              const isDotMatrix = settings?.text_style === 'DOT_MATRIX';

              return (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                    padding: '0 28px',
                    marginRight: `${settings?.message_spacing || 96}px`
                  }}
                >
                  {/* Icon */}
                  <div style={{ color: `rgb(${color.rgb})`, fontSize: 18 }}>📄</div>

                  {/* Title */}
                  <span
                    style={{
                      color: `rgb(${color.rgb})`,
                      fontSize: `${Math.round((settings?.font_size || 22) * 0.9)}px`,
                      fontFamily: isDotMatrix ? "'Rubik Pixels', monospace" : "'Inter', -apple-system, sans-serif",
                      fontWeight: isDotMatrix ? 'normal' : '600',
                      letterSpacing: isDotMatrix ? '0.3em' : '0.05em',
                      textShadow: isDotMatrix
                        ? 'none'
                        : `0 0 4px rgba(${color.rgb}, 0.9), 0 0 12px rgba(${color.rgb}, 0.5)`,
                      textTransform: 'uppercase'
                    }}
                  >
                    {sampleTask.title}
                  </span>

                  {/* Due time */}
                  <span
                    style={{
                      color: `rgb(${color.rgb})`,
                      fontSize: `${Math.round((settings?.font_size || 22) * 0.5)}px`,
                      fontFamily: isDotMatrix ? "'Rubik Pixels', monospace" : "'Inter', -apple-system, sans-serif",
                      fontWeight: isDotMatrix ? 'normal' : '600',
                      letterSpacing: isDotMatrix ? '0.3em' : '0.1em',
                      opacity: 0.8,
                      textTransform: 'uppercase'
                    }}
                  >
                    {sampleTask.dueIn}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
        <p style={{ fontSize: 12, color: theme.colors.textSubtle, marginTop: 8, fontStyle: 'italic' }}>
          ⬆️ This is how your banner will look. Adjust settings below to see changes instantly.
        </p>
      </div>

      {/* Appearance Settings */}
      <div>
        <h4 style={{ fontSize: 16, fontWeight: 600, color: theme.colors.text, marginBottom: 16 }}>
          🎨 Highway Appearance
        </h4>
        <div style={{ display: 'grid', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 15, color: theme.colors.text }}>Show Background</span>
            <button
              type="button"
              onClick={() => isDirector && setSettings({ ...settings, show_background: !settings.show_background })}
              disabled={!isDirector}
              style={{
                width: 54,
                height: 28,
                borderRadius: 999,
                border: `1px solid ${theme.colors.border}`,
                background: settings.show_background ? theme.colors.accent : "#111823",
                position: "relative",
                cursor: isDirector ? "pointer" : "not-allowed",
                opacity: isDirector ? 1 : 0.6
              }}
            >
              <span
                style={{
                  position: "absolute",
                  top: 2,
                  left: settings.show_background ? 28 : 2,
                  width: 24,
                  height: 24,
                  borderRadius: 999,
                  background: "#fff"
                }}
              />
            </button>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 15, color: theme.colors.text, marginBottom: 8 }}>
              Background Color
            </label>
            <select
              value={settings.background_color}
              onChange={(e) => isDirector && setSettings({ ...settings, background_color: e.target.value as BackgroundColor })}
              disabled={!isDirector}
              style={{
                width: '100%',
                padding: "12px 16px",
                background: theme.colors.panelAlt,
                border: `2px solid ${theme.colors.border}`,
                borderRadius: theme.radii.md,
                color: theme.colors.text,
                fontSize: 15
              }}
            >
              <option value="black">Black</option>
              <option value="charcoal">Charcoal</option>
              <option value="grey">Grey</option>
              <option value="silver">Silver</option>
              <option value="gold">Gold</option>
              <option value="green">Green</option>
              <option value="teal">Teal</option>
              <option value="navy">Navy</option>
              <option value="purple">Purple</option>
              <option value="pink">Pink</option>
              <option value="brown">Brown</option>
              <option value="orange">Orange</option>
              <option value="white">White</option>
              <option value="cream">Cream</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 15, color: theme.colors.text, marginBottom: 8 }}>
              Text Style
            </label>
            <select
              value={settings.text_style}
              onChange={(e) => isDirector && setSettings({ ...settings, text_style: e.target.value as TextStyle })}
              disabled={!isDirector}
              style={{
                width: '100%',
                padding: "12px 16px",
                background: theme.colors.panelAlt,
                border: `2px solid ${theme.colors.border}`,
                borderRadius: theme.radii.md,
                color: theme.colors.text,
                fontSize: 15
              }}
            >
              <option value="CLEAN_NEON">Clean Neon</option>
              <option value="DOT_MATRIX">Dot Matrix</option>
              <option value="RETRO_GLOW">Retro Glow</option>
              <option value="CYBERPUNK">Cyberpunk</option>
              <option value="NEON_TUBES">Neon Tubes</option>
              <option value="HOLOGRAPHIC">Holographic</option>
              <option value="ELECTRIC_PULSE">Electric Pulse</option>
              <option value="SYNTHWAVE">Synthwave</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 15, color: theme.colors.text, marginBottom: 8 }}>
              Text Color
            </label>
            <select
              value={settings.text_color}
              onChange={(e) => isDirector && setSettings({ ...settings, text_color: e.target.value as TextColor })}
              disabled={!isDirector}
              style={{
                width: '100%',
                padding: "12px 16px",
                background: theme.colors.panelAlt,
                border: `2px solid ${theme.colors.border}`,
                borderRadius: theme.radii.md,
                color: theme.colors.text,
                fontSize: 15
              }}
            >
              <option value="neon-blue">Neon Blue</option>
              <option value="cyber-pink">Cyber Pink</option>
              <option value="electric-purple">Electric Purple</option>
              <option value="toxic-green">Toxic Green</option>
              <option value="laser-red">Laser Red</option>
              <option value="plasma-orange">Plasma Orange</option>
              <option value="cosmic-teal">Cosmic Teal</option>
              <option value="radioactive-yellow">Radioactive Yellow</option>
              <option value="hot-magenta">Hot Magenta</option>
              <option value="ultra-violet">Ultra Violet</option>
              <option value="neon-lime">Neon Lime</option>
              <option value="bright-cyan">Bright Cyan</option>
              <option value="fire-orange">Fire Orange</option>
              <option value="shocking-pink">Shocking Pink</option>
              <option value="vivid-gold">Vivid Gold</option>
              <option value="rainbow">🌈 Rainbow (Cycles)</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 15, color: theme.colors.text, marginBottom: 8 }}>
              Font Size: {settings.font_size}px
            </label>
            <input
              type="range"
              min="12"
              max="48"
              value={settings.font_size}
              onChange={(e) => isDirector && setSettings({ ...settings, font_size: Number(e.target.value) })}
              disabled={!isDirector}
              style={{ width: '100%' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 15, color: theme.colors.text, marginBottom: 8 }}>
              Scroll Speed: {70 - settings.scroll_speed} (faster →)
            </label>
            <input
              type="range"
              min="10"
              max="60"
              value={70 - settings.scroll_speed}
              onChange={(e) => isDirector && setSettings({ ...settings, scroll_speed: 70 - Number(e.target.value) })}
              disabled={!isDirector}
              style={{ width: '100%' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 15, color: theme.colors.text, marginBottom: 8 }}>
              Message Spacing: {settings.message_spacing}px
            </label>
            <input
              type="range"
              min="48"
              max="400"
              value={settings.message_spacing}
              onChange={(e) => isDirector && setSettings({ ...settings, message_spacing: Number(e.target.value) })}
              disabled={!isDirector}
              style={{ width: '100%' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: 15, color: theme.colors.text, marginBottom: 8 }}>
              Empty Message (when no tasks active)
            </label>
            <input
              type="text"
              value={settings.empty_message || 'NO ACTIVE TASKS - ALL CLEAR'}
              onChange={(e) => isDirector && setSettings({ ...settings, empty_message: e.target.value })}
              disabled={!isDirector}
              placeholder="NO ACTIVE TASKS - ALL CLEAR"
              style={{
                width: '100%',
                padding: "12px 16px",
                background: theme.colors.panelAlt,
                border: `2px solid ${theme.colors.border}`,
                borderRadius: theme.radii.md,
                color: theme.colors.text,
                fontSize: 15
              }}
            />
            <p style={{ fontSize: 12, color: theme.colors.textSubtle, marginTop: 6, fontStyle: 'italic' }}>
              This message will scroll when there are no active tasks on the highway
            </p>
          </div>
        </div>
      </div>

      {/* Save Settings Button */}
      <button
        onClick={saveSettings}
        disabled={!isDirector}
        style={{
          padding: "12px 20px",
          fontSize: 16,
          fontWeight: 600,
          color: "white",
          background: isSaved ? "#22c55e" : theme.colors.accent,
          borderRadius: theme.radii.md,
          border: "none",
          cursor: isDirector ? "pointer" : "not-allowed",
          opacity: isDirector ? 1 : 0.6,
          transition: "all 0.3s ease"
        }}
      >
        {isSaved ? "✓ Saved!" : "💾 Save Appearance Settings"}
      </button>

      {/* Task Management */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <h4 style={{ fontSize: 16, fontWeight: 600, color: theme.colors.text, margin: 0 }}>
            📋 Active Tasks ({tasks.length})
          </h4>
          <button
            onClick={() => setShowCreateTask(true)}
            disabled={!isDirector}
            style={{
              padding: "8px 16px",
              fontSize: 14,
              fontWeight: 600,
              color: "white",
              background: theme.colors.accentAlt,
              borderRadius: theme.radii.md,
              border: "none",
              cursor: isDirector ? "pointer" : "not-allowed",
              opacity: isDirector ? 1 : 0.6
            }}
          >
            + Create Task
          </button>
        </div>

        {tasks.length === 0 ? (
          <div style={{
            padding: 24,
            textAlign: 'center',
            background: theme.colors.panelAlt,
            borderRadius: theme.radii.md,
            color: theme.colors.textSubtle
          }}>
            No active tasks. Create one to see it scrolling on the highway!
          </div>
        ) : (
          <div style={{ display: 'grid', gap: 12 }}>
            {tasks.map((task) => (
              <div
                key={task.id}
                style={{
                  padding: 16,
                  background: theme.colors.panelAlt,
                  borderRadius: theme.radii.md,
                  border: `1px solid ${theme.colors.border}`,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: theme.colors.text, marginBottom: 4 }}>
                    {task.title}
                  </div>
                  <div style={{ fontSize: 13, color: theme.colors.textSubtle }}>
                    {task.type} • {task.frequency} • due {task.dueIn} • brightness {task.brightness}/5
                  </div>
                </div>
                <button
                  onClick={() => deleteTask(task.id)}
                  disabled={!isDirector}
                  style={{
                    padding: "6px 12px",
                    fontSize: 13,
                    fontWeight: 600,
                    color: "#ff6b6b",
                    background: "#2b1a1a",
                    borderRadius: 6,
                    border: "1px solid #ff6b6b",
                    cursor: isDirector ? "pointer" : "not-allowed",
                    opacity: isDirector ? 1 : 0.6
                  }}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Task Modal */}
      {showCreateTask && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10000
        }}>
          <div style={{
            background: theme.colors.panel,
            borderRadius: theme.radii.lg,
            padding: 32,
            width: '100%',
            maxWidth: 600,
            margin: 16,
            border: `1px solid ${theme.colors.border}`
          }}>
            <h3 style={{ fontSize: 22, fontWeight: 700, color: theme.colors.text, marginBottom: 24 }}>
              Create New Task
            </h3>

            <div style={{ display: 'grid', gap: 16, marginBottom: 24 }}>
              <div>
                <label style={{ display: 'block', fontSize: 15, fontWeight: 600, color: theme.colors.text, marginBottom: 8 }}>
                  Task Title
                </label>
                <input
                  type="text"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  placeholder="REVIEW PENDING INVOICES"
                  style={{
                    width: '100%',
                    padding: "12px 16px",
                    background: theme.colors.panelAlt,
                    border: `2px solid ${theme.colors.border}`,
                    borderRadius: theme.radii.md,
                    color: theme.colors.text,
                    fontSize: 15
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 15, fontWeight: 600, color: theme.colors.text, marginBottom: 8 }}>
                    Type
                  </label>
                  <select
                    value={newTask.type}
                    onChange={(e) => setNewTask({ ...newTask, type: e.target.value as TaskType })}
                    style={{
                      width: '100%',
                      padding: "12px 16px",
                      background: theme.colors.panelAlt,
                      border: `2px solid ${theme.colors.border}`,
                      borderRadius: theme.radii.md,
                      color: theme.colors.text,
                      fontSize: 15
                    }}
                  >
                    <option value="invoicing">Invoicing</option>
                    <option value="costs">Costs</option>
                    <option value="calls">Calls</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 15, fontWeight: 600, color: theme.colors.text, marginBottom: 8 }}>
                    Frequency
                  </label>
                  <select
                    value={newTask.frequency}
                    onChange={(e) => setNewTask({ ...newTask, frequency: e.target.value as TaskFrequency })}
                    style={{
                      width: '100%',
                      padding: "12px 16px",
                      background: theme.colors.panelAlt,
                      border: `2px solid ${theme.colors.border}`,
                      borderRadius: theme.radii.md,
                      color: theme.colors.text,
                      fontSize: 15
                    }}
                  >
                    <option value="once">Once</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="biweekly">Biweekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 15, fontWeight: 600, color: theme.colors.text, marginBottom: 8 }}>
                  Due Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={newTask.due_date}
                  onChange={(e) => setNewTask({ ...newTask, due_date: e.target.value })}
                  style={{
                    width: '100%',
                    padding: "12px 16px",
                    background: theme.colors.panelAlt,
                    border: `2px solid ${theme.colors.border}`,
                    borderRadius: theme.radii.md,
                    color: theme.colors.text,
                    fontSize: 15
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 15, fontWeight: 600, color: theme.colors.text, marginBottom: 8 }}>
                  Navigation Route
                </label>
                <input
                  type="text"
                  value={newTask.navigation_route}
                  onChange={(e) => setNewTask({ ...newTask, navigation_route: e.target.value })}
                  placeholder="/invoicing/schedule"
                  style={{
                    width: '100%',
                    padding: "12px 16px",
                    background: theme.colors.panelAlt,
                    border: `2px solid ${theme.colors.border}`,
                    borderRadius: theme.radii.md,
                    color: theme.colors.text,
                    fontSize: 15
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 15, fontWeight: 600, color: theme.colors.text, marginBottom: 8 }}>
                  Assigned To
                </label>
                <select
                  value={newTask.assigned_to}
                  onChange={(e) => setNewTask({ ...newTask, assigned_to: e.target.value as TaskAssignment })}
                  style={{
                    width: '100%',
                    padding: "12px 16px",
                    background: theme.colors.panelAlt,
                    border: `2px solid ${theme.colors.border}`,
                    borderRadius: theme.radii.md,
                    color: theme.colors.text,
                    fontSize: 15
                  }}
                >
                  <option value="all">All Users</option>
                  <option value="directors">Directors Only</option>
                  <option value="managers">Managers Only</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowCreateTask(false)}
                style={{
                  padding: "12px 20px",
                  fontSize: 16,
                  fontWeight: 600,
                  color: theme.colors.text,
                  background: theme.colors.panelAlt,
                  border: `1px solid ${theme.colors.border}`,
                  borderRadius: theme.radii.md,
                  cursor: "pointer"
                }}
              >
                Cancel
              </button>
              <button
                onClick={createTask}
                disabled={!newTask.title || !newTask.due_date}
                style={{
                  padding: "12px 20px",
                  fontSize: 16,
                  fontWeight: 600,
                  color: "white",
                  background: theme.colors.accent,
                  borderRadius: theme.radii.md,
                  border: "none",
                  cursor: newTask.title && newTask.due_date ? "pointer" : "not-allowed",
                  opacity: newTask.title && newTask.due_date ? 1 : 0.6
                }}
              >
                Create Task
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save Message */}
      {saveMessage && (
        <div style={{
          padding: "12px 16px",
          background: theme.colors.accentAlt + '20',
          border: `1px solid ${theme.colors.accentAlt}`,
          borderRadius: theme.radii.md,
          color: theme.colors.accentAlt,
          fontWeight: 600,
          textAlign: "center"
        }}>
          {saveMessage}
        </div>
      )}
      </div>
    </>
  );
}
