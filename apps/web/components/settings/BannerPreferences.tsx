// User Banner Preferences Component for Settings Page
import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { theme } from '@/lib/theme';
import type { UserBannerPreferences, BackgroundColor, TextStyle, TextColor } from '@/lib/taskBanner/types';

export function BannerPreferencesComponent() {
  const [preferences, setPreferences] = useState<UserBannerPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    loadPreferences();
  }, []);

  async function loadPreferences() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setLoading(false);
        return;
      }

      const res = await fetch('/api/task-banner/user-preferences', {
        headers: { 'Authorization': `Bearer ${session.access_token}` }
      });
      const data = await res.json();
      setPreferences(data.preferences);
      setLoading(false);
    } catch (error) {
      console.error('Error loading preferences:', error);
      setLoading(false);
    }
  }

  async function savePreferences() {
    if (!preferences) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setSaveMessage('No session found - please log in');
        setTimeout(() => setSaveMessage(null), 3000);
        return;
      }

      console.log('Saving preferences:', preferences);

      const res = await fetch('/api/task-banner/user-preferences', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          show_background: preferences.show_background,
          background_color: preferences.background_color,
          text_style: preferences.text_style,
          text_color: preferences.text_color,
          font_size: preferences.font_size,
          scroll_speed: preferences.scroll_speed,
          message_spacing: preferences.message_spacing
        })
      });

      const data = await res.json();
      console.log('Save response:', { status: res.status, data });

      if (res.ok) {
        setIsSaved(true);
        setSaveMessage('Banner preferences saved! Refresh to see changes.');
        setTimeout(() => {
          setIsSaved(false);
          setSaveMessage(null);
        }, 3000);
      } else {
        const errorMsg = data.error || 'Error saving preferences';
        setSaveMessage(`Error: ${errorMsg}`);
        console.error('Save failed:', { status: res.status, error: errorMsg });
        setTimeout(() => setSaveMessage(null), 5000);
      }
    } catch (error) {
      console.error('Error saving preferences:', error);
      setSaveMessage(`Error: ${error.message || 'Unknown error'}`);
      setTimeout(() => setSaveMessage(null), 5000);
    }
  }

  if (loading) {
    return <div style={{ color: theme.colors.textSubtle }}>Loading your banner preferences...</div>;
  }

  if (!preferences) {
    return <div style={{ color: theme.colors.textSubtle }}>No preferences found</div>;
  }

  // Sample task for preview
  const sampleTask = {
    title: 'REVIEW PENDING INVOICES',
    type: 'invoicing',
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

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Live Preview */}
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: theme.colors.text, marginBottom: 8 }}>
            👁️ Live Preview
          </div>
          <div
            style={{
              position: 'relative',
              overflow: 'hidden',
              height: 51,
              paddingTop: 8,
              paddingBottom: 8,
              backgroundColor: preferences.show_background ? getBackgroundColor(preferences.background_color) : 'transparent',
              borderBottom: preferences.show_background ? '2px solid rgba(255, 255, 255, 0.1)' : 'none',
              boxShadow: preferences.show_background ? 'inset 0 0 30px rgba(0, 0, 0, 0.9)' : 'none',
              borderRadius: 8,
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
              @keyframes userPreviewScroll {
                0% { transform: translateX(100%); }
                100% { transform: translateX(-100%); }
              }
            `}</style>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                animation: `userPreviewScroll ${preferences.scroll_speed}s linear infinite`,
                whiteSpace: 'nowrap'
              }}
            >
              {[...Array(3)].map((_, idx) => {
                const color = getTaskColor(sampleTask.type);
                const isDotMatrix = preferences.text_style === 'DOT_MATRIX';

                return (
                  <div
                    key={idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 14,
                      padding: '0 28px',
                      marginRight: `${preferences.message_spacing}px`
                    }}
                  >
                    {/* Icon */}
                    <div style={{ color: `rgb(${color.rgb})`, fontSize: 18 }}>📄</div>

                    {/* Title */}
                    <span
                      style={{
                        color: `rgb(${color.rgb})`,
                        fontSize: `${Math.round(preferences.font_size * 0.9)}px`,
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
                        fontSize: `${Math.round(preferences.font_size * 0.5)}px`,
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
          <p style={{ fontSize: 11, color: theme.colors.textSubtle, marginTop: 6, fontStyle: 'italic' }}>
            ⬆️ This is how your banner will look. Adjust settings below to see changes instantly.
          </p>
        </div>
      {/* Background Toggle */}
      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 10, alignItems: 'center' }}>
        <div style={{ fontSize: 12, color: theme.colors.textSubtle }}>Show Background</div>
        <button
          type="button"
          onClick={() => setPreferences({ ...preferences, show_background: !preferences.show_background })}
          style={{
            width: 54,
            height: 28,
            borderRadius: 999,
            border: `1px solid ${theme.colors.border}`,
            background: preferences.show_background ? theme.colors.accent : "#111823",
            position: "relative",
            cursor: "pointer"
          }}
        >
          <span
            style={{
              position: "absolute",
              top: 2,
              left: preferences.show_background ? 28 : 2,
              width: 24,
              height: 24,
              borderRadius: 999,
              background: "#fff"
            }}
          />
        </button>
      </div>

      {/* Background Color */}
      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 10, alignItems: 'center' }}>
        <div style={{ fontSize: 12, color: theme.colors.textSubtle }}>Background Color</div>
        <select
          value={preferences.background_color}
          onChange={(e) => setPreferences({ ...preferences, background_color: e.target.value as BackgroundColor })}
          style={{
            padding: "10px 12px",
            background: "#111823",
            border: `1px solid ${theme.colors.border}`,
            color: theme.colors.text,
            borderRadius: 8
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

      {/* Text Style */}
      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 10, alignItems: 'center' }}>
        <div style={{ fontSize: 12, color: theme.colors.textSubtle }}>Text Style</div>
        <select
          value={preferences.text_style}
          onChange={(e) => setPreferences({ ...preferences, text_style: e.target.value as TextStyle })}
          style={{
            padding: "10px 12px",
            background: "#111823",
            border: `1px solid ${theme.colors.border}`,
            color: theme.colors.text,
            borderRadius: 8
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

      {/* Text Color */}
      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 10, alignItems: 'center' }}>
        <div style={{ fontSize: 12, color: theme.colors.textSubtle }}>Text Color</div>
        <select
          value={preferences.text_color}
          onChange={(e) => setPreferences({ ...preferences, text_color: e.target.value as TextColor })}
          style={{
            padding: "10px 12px",
            background: "#111823",
            border: `1px solid ${theme.colors.border}`,
            color: theme.colors.text,
            borderRadius: 8
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

      {/* Font Size */}
      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 10, alignItems: 'center' }}>
        <div style={{ fontSize: 12, color: theme.colors.textSubtle }}>Font Size: {preferences.font_size}px</div>
        <input
          type="range"
          min="12"
          max="48"
          value={preferences.font_size}
          onChange={(e) => setPreferences({ ...preferences, font_size: Number(e.target.value) })}
          style={{ width: '100%' }}
        />
      </div>

      {/* Scroll Speed */}
      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 10, alignItems: 'center' }}>
        <div style={{ fontSize: 12, color: theme.colors.textSubtle }}>Scroll Speed: {70 - preferences.scroll_speed} (faster →)</div>
        <input
          type="range"
          min="10"
          max="60"
          value={70 - preferences.scroll_speed}
          onChange={(e) => setPreferences({ ...preferences, scroll_speed: 70 - Number(e.target.value) })}
          style={{ width: '100%' }}
        />
      </div>

      {/* Message Spacing */}
      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 10, alignItems: 'center' }}>
        <div style={{ fontSize: 12, color: theme.colors.textSubtle }}>Message Spacing: {preferences.message_spacing}px</div>
        <input
          type="range"
          min="48"
          max="400"
          value={preferences.message_spacing}
          onChange={(e) => setPreferences({ ...preferences, message_spacing: Number(e.target.value) })}
          style={{ width: '100%' }}
        />
      </div>

      {/* Save Button */}
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <button
          onClick={savePreferences}
          style={{
            padding: "10px 14px",
            background: isSaved ? "#22c55e" : theme.colors.accent,
            color: "white",
            border: 0,
            borderRadius: 8,
            cursor: "pointer",
            transition: "all 0.3s ease"
          }}
        >
          {isSaved ? "✓ Saved!" : "Save Banner Preferences"}
        </button>
        {saveMessage && <div style={{ alignSelf: "center", color: theme.colors.textSubtle }}>{saveMessage}</div>}
      </div>

      <div style={{
        marginTop: 8,
        padding: 12,
        background: theme.colors.panelAlt,
        borderRadius: 8,
        fontSize: 12,
        color: theme.colors.textSubtle,
        fontStyle: 'italic'
      }}>
        💡 These settings control how the task banner highway appears for you. Changes will take effect after refreshing the page.
      </div>
      </div>
    </>
  );
}
