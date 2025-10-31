/**
 * Accessibility Provider - v2025-09-19 Specification Compliance
 * Ensures WCAG 2.1 AA compliance and enhanced accessibility features
 */

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';

import { theme } from '../lib/theme';

interface AccessibilitySettings {
  highContrast: boolean;
  reducedMotion: boolean;
  largeText: boolean;
  screenReaderOptimized: boolean;
  keyboardNavigation: boolean;
  focusTrapping: boolean;
}

interface AccessibilityContextType {
  settings: AccessibilitySettings;
  updateSettings: (updates: Partial<AccessibilitySettings>) => void;
  announceToScreenReader: (message: string, priority?: 'polite' | 'assertive') => void;
  focusFirstElement: (container?: HTMLElement) => void;
  focusLastElement: (container?: HTMLElement) => void;
  trapFocus: (container: HTMLElement) => () => void;
}

const AccessibilityContext = createContext<AccessibilityContextType | null>(null);

export function useAccessibility() {
  const context = useContext(AccessibilityContext);
  if (!context) {
    throw new Error('useAccessibility must be used within AccessibilityProvider');
  }
  return context;
}

interface AccessibilityProviderProps {
  children: ReactNode;
}

export default function AccessibilityProvider({ children }: AccessibilityProviderProps) {
  const [settings, setSettings] = useState<AccessibilitySettings>({
    highContrast: false,
    reducedMotion: false,
    largeText: false,
    screenReaderOptimized: false,
    keyboardNavigation: true,
    focusTrapping: false
  });

  const [announcer, setAnnouncer] = useState<HTMLElement | null>(null);

  // Define announceToScreenReader function first (before useEffects that depend on it)
  const announceToScreenReader = React.useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    if (!announcer) return;

    announcer.setAttribute('aria-live', priority);
    announcer.textContent = message;

    // Clear the message after a short delay
    setTimeout(() => {
      announcer.textContent = '';
    }, 1000);
  }, [announcer]);

  const updateSettings = (updates: Partial<AccessibilitySettings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
  };

  // Initialize accessibility settings from localStorage and system preferences
  useEffect(() => {
    const savedSettings = localStorage.getItem('bhit_accessibility_settings');
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }

    // Detect system preferences
    const mediaQueries = {
      reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)'),
      highContrast: window.matchMedia('(prefers-contrast: high)'),
      largeText: window.matchMedia('(prefers-reduced-data: reduce)')
    };

    const updateFromSystem = () => {
      setSettings(prev => ({
        ...prev,
        reducedMotion: mediaQueries.reducedMotion.matches,
        highContrast: mediaQueries.highContrast.matches
      }));
    };

    updateFromSystem();
    Object.values(mediaQueries).forEach(mq => mq.addEventListener('change', updateFromSystem));

    return () => {
      Object.values(mediaQueries).forEach(mq => mq.removeEventListener('change', updateFromSystem));
    };
  }, []);

  // Create screen reader announcer element
  useEffect(() => {
    const announcerElement = document.createElement('div');
    announcerElement.setAttribute('aria-live', 'polite');
    announcerElement.setAttribute('aria-atomic', 'true');
    announcerElement.style.position = 'absolute';
    announcerElement.style.left = '-10000px';
    announcerElement.style.width = '1px';
    announcerElement.style.height = '1px';
    announcerElement.style.overflow = 'hidden';
    document.body.appendChild(announcerElement);
    setAnnouncer(announcerElement);

    return () => {
      if (announcerElement.parentNode) {
        announcerElement.parentNode.removeChild(announcerElement);
      }
    };
  }, []);

  // Apply CSS custom properties based on settings
  useEffect(() => {
    const root = document.documentElement;

    // High contrast mode
    if (settings.highContrast) {
      root.style.setProperty('--color-background', '#000000');
      root.style.setProperty('--color-text', '#ffffff');
      root.style.setProperty('--color-accent', '#ffff00');
      root.style.setProperty('--color-border', '#ffffff');
    } else {
      root.style.removeProperty('--color-background');
      root.style.removeProperty('--color-text');
      root.style.removeProperty('--color-accent');
      root.style.removeProperty('--color-border');
    }

    // Large text mode
    if (settings.largeText) {
      root.style.setProperty('--font-scale', '1.2');
    } else {
      root.style.removeProperty('--font-scale');
    }

    // Reduced motion
    if (settings.reducedMotion) {
      root.style.setProperty('--animation-duration', '0s');
      root.style.setProperty('--transition-duration', '0s');
    } else {
      root.style.removeProperty('--animation-duration');
      root.style.removeProperty('--transition-duration');
    }

    // Save settings to localStorage
    localStorage.setItem('bhit_accessibility_settings', JSON.stringify(settings));
  }, [settings]);

  // Keyboard navigation enhancement
  useEffect(() => {
    if (!settings.keyboardNavigation) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip link functionality
      if (e.key === 'Tab' && !e.shiftKey && e.target === document.body) {
        const skipLink = document.querySelector('[data-skip-link]') as HTMLElement;
        if (skipLink) {
          skipLink.focus();
          e.preventDefault();
        }
      }

      // Enhanced focus management
      if (e.key === 'Escape') {
        const activeElement = document.activeElement as HTMLElement;
        if (activeElement && activeElement.blur) {
          activeElement.blur();
        }
        announceToScreenReader('Navigation cancelled');
      }

      // Arrow key navigation for custom components
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        const currentElement = e.target as HTMLElement;
        if (currentElement.getAttribute('role') === 'listbox' ||
            currentElement.getAttribute('role') === 'menu') {
          handleArrowNavigation(e);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [settings.keyboardNavigation, announceToScreenReader]);

  const getFocusableElements = (container: HTMLElement = document.body): HTMLElement[] => {
    const focusableSelectors = [
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable="true"]'
    ].join(', ');

    return Array.from(container.querySelectorAll(focusableSelectors)) as HTMLElement[];
  };

  const focusFirstElement = (container?: HTMLElement) => {
    const elements = getFocusableElements(container);
    if (elements.length > 0) {
      elements[0].focus();
      announceToScreenReader('Focused on first element');
    }
  };

  const focusLastElement = (container?: HTMLElement) => {
    const elements = getFocusableElements(container);
    if (elements.length > 0) {
      elements[elements.length - 1].focus();
      announceToScreenReader('Focused on last element');
    }
  };

  const trapFocus = (container: HTMLElement) => {
    const focusableElements = getFocusableElements(container);
    if (focusableElements.length === 0) return () => {};

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          // Shift + Tab
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          // Tab
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }

      if (e.key === 'Escape') {
        announceToScreenReader('Focus trap deactivated');
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    firstElement.focus();

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  };

  const handleArrowNavigation = (e: KeyboardEvent) => {
    const currentElement = e.target as HTMLElement;
    const container = currentElement.closest('[role="listbox"], [role="menu"]') as HTMLElement;
    if (!container) return;

    const items = Array.from(container.querySelectorAll('[role="option"], [role="menuitem"]')) as HTMLElement[];
    const currentIndex = items.indexOf(currentElement);

    let nextIndex = currentIndex;

    switch (e.key) {
      case 'ArrowUp':
        nextIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
        break;
      case 'ArrowDown':
        nextIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
        break;
      case 'Home':
        nextIndex = 0;
        break;
      case 'End':
        nextIndex = items.length - 1;
        break;
      default:
        return;
    }

    e.preventDefault();
    items[nextIndex]?.focus();
  };

  const contextValue: AccessibilityContextType = {
    settings,
    updateSettings,
    announceToScreenReader,
    focusFirstElement,
    focusLastElement,
    trapFocus
  };

  return (
    <AccessibilityContext.Provider value={contextValue}>
      {children}

      {/* Skip Link */}
      <a
        href="#main-content"
        data-skip-link
        style={{
          position: 'absolute',
          left: '-9999px',
          zIndex: 999999,
          padding: '8px 16px',
          backgroundColor: theme.colors.accent,
          color: 'white',
          textDecoration: 'none',
          fontSize: '14px',
          fontWeight: 'bold'
        }}
        onFocus={(e) => {
          e.target.style.left = '6px';
          e.target.style.top = '6px';
        }}
        onBlur={(e) => {
          e.target.style.left = '-9999px';
        }}
      >
        Skip to main content
      </a>

      {/* Accessibility Settings Panel - Only shown when activated */}
      {settings.screenReaderOptimized && <AccessibilityPanel />}
    </AccessibilityContext.Provider>
  );
}

function AccessibilityPanel() {
  const { settings, updateSettings } = useAccessibility();
  const [isVisible, setIsVisible] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsVisible(!isVisible)}
        style={{
          position: 'fixed',
          top: '10px',
          left: '10px',
          padding: '8px',
          backgroundColor: theme.colors.accent,
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          zIndex: 999998,
          fontSize: '12px'
        }}
        aria-label="Toggle accessibility settings"
      >
        ♿
      </button>

      {isVisible && (
        <div
          role="dialog"
          aria-labelledby="accessibility-title"
          style={{
            position: 'fixed',
            top: '50px',
            left: '10px',
            backgroundColor: theme.colors.panel,
            border: `2px solid ${theme.colors.accent}`,
            borderRadius: '8px',
            padding: '16px',
            zIndex: 999999,
            minWidth: '250px',
            color: theme.colors.text
          }}
        >
          <h3 id="accessibility-title" style={{ marginTop: 0, fontSize: '16px' }}>
            Accessibility Settings
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                checked={settings.highContrast}
                onChange={(e) => updateSettings({ highContrast: e.target.checked })}
              />
              High Contrast
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                checked={settings.largeText}
                onChange={(e) => updateSettings({ largeText: e.target.checked })}
              />
              Large Text
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                checked={settings.reducedMotion}
                onChange={(e) => updateSettings({ reducedMotion: e.target.checked })}
              />
              Reduce Motion
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                checked={settings.keyboardNavigation}
                onChange={(e) => updateSettings({ keyboardNavigation: e.target.checked })}
              />
              Enhanced Keyboard Navigation
            </label>
          </div>

          <button
            onClick={() => setIsVisible(false)}
            style={{
              marginTop: '12px',
              padding: '6px 12px',
              backgroundColor: theme.colors.accent,
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Close
          </button>
        </div>
      )}
    </>
  );
}

// Custom hook for managing focus
export function useFocusManagement() {
  const { focusFirstElement, focusLastElement, trapFocus, announceToScreenReader } = useAccessibility();

  const manageFocus = React.useCallback((element: HTMLElement, action: 'first' | 'last' | 'trap') => {
    switch (action) {
      case 'first':
        focusFirstElement(element);
        break;
      case 'last':
        focusLastElement(element);
        break;
      case 'trap':
        return trapFocus(element);
      default:
        break;
    }
  }, [focusFirstElement, focusLastElement, trapFocus]);

  return { manageFocus, announceToScreenReader };
}

// HOC for adding accessibility features to components
export function withAccessibility<P extends object>(Component: React.ComponentType<P>) {
  const WrappedComponent = React.forwardRef<HTMLElement, P>((props, _ref) => {
    const { settings, announceToScreenReader } = useAccessibility();

    React.useEffect(() => {
      if (settings.screenReaderOptimized) {
        announceToScreenReader(`${Component.displayName || Component.name} loaded`);
      }
    }, [announceToScreenReader, settings.screenReaderOptimized]);

    return <Component {...(props as P)} />;
  });

  WrappedComponent.displayName = `withAccessibility(${Component.displayName || Component.name})`;
  return WrappedComponent;
}