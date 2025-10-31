/**
 * Dashboard-Consistent Styling Utilities for SmartQuote
 * Matches exact dimensions, spacing, and styling patterns from the Dashboard
 */

import React from 'react';

import { theme } from '../../../lib/theme';

// BHIT Dashboard Style System - Exact Measurements
export const DASHBOARD_STYLES = {
  // Card dimensions & spacing from Dashboard
  cards: {
    padding: '16px',
    borderRadius: theme.radii.md, // 12px
    border: `1px solid ${theme.colors.border}`,
    background: theme.colors.panel,
    gap: '16px',
    minHeight: '120px'
  },

  // Button specifications from Dashboard
  buttons: {
    primary: {
      padding: '12px 20px',
      borderRadius: theme.radii.sm, // 8px
      fontSize: '14px',
      fontWeight: 600,
      minHeight: '44px'
    },
    secondary: {
      padding: '8px 12px',
      borderRadius: theme.radii.sm, // 8px
      fontSize: '14px',
      fontWeight: 600,
      minHeight: '32px'
    },
    small: {
      padding: '6px 12px',
      borderRadius: '999px',
      fontSize: '14px',
      fontWeight: 600,
      minHeight: '28px'
    }
  },

  // Typography scale from Dashboard
  typography: {
    mainTitle: {
      fontSize: 'clamp(24px, 5vw, 32px)',
      fontWeight: 700,
      lineHeight: 1.2
    },
    sectionHeader: {
      fontSize: 'clamp(16px, 3vw, 18px)',
      fontWeight: 600,
      lineHeight: 1.3
    },
    cardTitle: {
      fontSize: '18px',
      fontWeight: 600,
      lineHeight: 1.4
    },
    bodyText: {
      fontSize: 'clamp(12px, 2.5vw, 14px)',
      lineHeight: 1.5
    },
    smallText: {
      fontSize: 'clamp(10px, 2vw, 12px)',
      lineHeight: 1.4
    },
    labelText: {
      fontSize: '14px',
      fontWeight: 500,
      lineHeight: 1.3
    },
    buttonText: {
      fontSize: '14px',
      fontWeight: 600,
      lineHeight: 1
    }
  },

  // Form elements from Dashboard
  forms: {
    input: {
      padding: '8px 12px',
      border: `1px solid ${theme.colors.border}`,
      borderRadius: theme.radii.md, // 12px
      fontSize: '14px',
      minHeight: '40px'
    },
    dropdown: {
      padding: '8px 12px',
      borderRadius: theme.radii.md, // 12px
      fontSize: '14px',
      fontWeight: 500,
      minHeight: '40px'
    }
  },

  // Spacing patterns from Dashboard
  spacing: {
    section: '24px',
    card: '16px',
    element: '12px',
    small: '8px',
    micro: '4px'
  },

  // Panel specifications from Dashboard
  panels: {
    glassmorphic: {
      borderRadius: '16px',
      padding: '20px',
      backdropFilter: 'blur(10px)',
      background: 'rgba(255, 255, 255, 0.08)',
      border: '1px solid rgba(255, 255, 255, 0.12)',
      boxShadow: '0 0 10px 1px rgba(0, 170, 255, 0.2), inset 0 1px 2px rgba(255, 255, 255, 0.1)'
    },
    standard: {
      borderRadius: theme.radii.lg, // 16px
      padding: '20px',
      background: theme.colors.panel,
      border: `1px solid ${theme.colors.border}`
    }
  },

  // Interactive states from Dashboard
  interactions: {
    hover: {
      boxShadow: '0 0 14px 3px rgba(0, 170, 255, 0.35)',
      transform: 'translateY(-1px)',
      transition: 'all 0.3s ease'
    },
    focus: {
      border: `1px solid ${theme.colors.accent}`,
      boxShadow: '0 0 14px 3px rgba(0, 170, 255, 0.3)'
    },
    transition: 'all 0.3s ease'
  }
} as const;

// Utility functions for applying Dashboard styles

/**
 * Get Dashboard-consistent card styling
 */
export const getDashboardCardStyle = (variant: 'standard' | 'glassmorphic' = 'standard'): React.CSSProperties => {
  const base = DASHBOARD_STYLES.cards;
  const panel = variant === 'glassmorphic' ? DASHBOARD_STYLES.panels.glassmorphic : DASHBOARD_STYLES.panels.standard;
  
  return {
    ...base,
    ...panel,
    display: 'flex',
    flexDirection: 'column',
    gap: base.gap,
    transition: DASHBOARD_STYLES.interactions.transition
  };
};

/**
 * Get Dashboard-consistent button styling
 */
export const getDashboardButtonStyle = (
  variant: 'primary' | 'secondary' | 'small' = 'primary',
  options: {
    color?: string;
    backgroundColor?: string;
    border?: string;
    disabled?: boolean;
  } = {}
): React.CSSProperties => {
  const base = DASHBOARD_STYLES.buttons[variant];
  const { color, backgroundColor, border, disabled } = options;
  
  return {
    ...base,
    color: disabled ? theme.colors.textSubtle : (color || theme.colors.text),
    backgroundColor: disabled ? theme.colors.muted : (backgroundColor || theme.colors.accent),
    border: border || 'none',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.6 : 1,
    transition: DASHBOARD_STYLES.interactions.transition,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: DASHBOARD_STYLES.spacing.small
  };
};

/**
 * Get Dashboard-consistent typography styling
 */
export const getDashboardTypographyStyle = (
  variant: keyof typeof DASHBOARD_STYLES.typography,
  color?: string
): React.CSSProperties => {
  const base = DASHBOARD_STYLES.typography[variant];
  
  return {
    ...base,
    color: color || theme.colors.text,
    margin: 0
  };
};

/**
 * Get Dashboard-consistent form input styling
 */
export const getDashboardInputStyle = (
  focused: boolean = false,
  error: boolean = false
): React.CSSProperties => {
  const base = DASHBOARD_STYLES.forms.input;
  
  return {
    ...base,
    color: theme.colors.text,
    backgroundColor: theme.colors.panel,
    ...(focused && DASHBOARD_STYLES.interactions.focus),
    ...(error && {
      borderColor: theme.colors.danger,
      boxShadow: `0 0 0 3px rgba(239, 68, 68, 0.1)`
    }),
    transition: DASHBOARD_STYLES.interactions.transition
  };
};

/**
 * Get Dashboard-consistent layout grid styling
 */
export const getDashboardGridStyle = (
  type: 'main' | 'cards' | 'form' = 'main'
): React.CSSProperties => {
  const gridTemplates = {
    main: 'repeat(auto-fit, minmax(min(400px, 100%), 1fr))',
    cards: 'repeat(auto-fit, minmax(min(140px, 100%), 1fr))',
    form: 'repeat(auto-fit, minmax(250px, 1fr))'
  };
  
  const gaps = {
    main: DASHBOARD_STYLES.spacing.section,
    cards: DASHBOARD_STYLES.spacing.card,
    form: DASHBOARD_STYLES.spacing.element
  };
  
  return {
    display: 'grid',
    gridTemplateColumns: gridTemplates[type],
    gap: gaps[type],
    width: '100%'
  };
};

/**
 * Get Dashboard-consistent interactive hover effects
 */
export const addDashboardHoverEffects = (element: HTMLElement | null) => {
  if (!element) return;
  
  const handleMouseEnter = () => {
    Object.assign(element.style, DASHBOARD_STYLES.interactions.hover);
  };
  
  const handleMouseLeave = () => {
    element.style.boxShadow = 'none';
    element.style.transform = 'translateY(0)';
  };
  
  element.addEventListener('mouseenter', handleMouseEnter);
  element.addEventListener('mouseleave', handleMouseLeave);
  
  return () => {
    element.removeEventListener('mouseenter', handleMouseEnter);
    element.removeEventListener('mouseleave', handleMouseLeave);
  };
};

/**
 * Dashboard-consistent spacing utilities
 */
export const spacing = {
  section: { marginBottom: DASHBOARD_STYLES.spacing.section },
  card: { marginBottom: DASHBOARD_STYLES.spacing.card },
  element: { marginBottom: DASHBOARD_STYLES.spacing.element },
  small: { marginBottom: DASHBOARD_STYLES.spacing.small },
  micro: { marginBottom: DASHBOARD_STYLES.spacing.micro },
  
  // Padding variants
  sectionPadding: { padding: DASHBOARD_STYLES.spacing.section },
  cardPadding: { padding: DASHBOARD_STYLES.spacing.card },
  elementPadding: { padding: DASHBOARD_STYLES.spacing.element },
  smallPadding: { padding: DASHBOARD_STYLES.spacing.small },
  
  // Gap variants for flex/grid
  sectionGap: { gap: DASHBOARD_STYLES.spacing.section },
  cardGap: { gap: DASHBOARD_STYLES.spacing.card },
  elementGap: { gap: DASHBOARD_STYLES.spacing.element },
  smallGap: { gap: DASHBOARD_STYLES.spacing.small }
};