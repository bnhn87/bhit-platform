import { useEffect, useRef, useCallback } from 'react';

/**
 * Hook for managing focus and keyboard navigation in complex components
 */
export const useFocusManagement = () => {
    const focusableElements = useRef<HTMLElement[]>([]);
    const currentFocusIndex = useRef<number>(-1);

    const registerFocusable = useCallback((element: HTMLElement | null) => {
        if (element && !focusableElements.current.includes(element)) {
            focusableElements.current.push(element);
        }
    }, []);

    const unregisterFocusable = useCallback((element: HTMLElement | null) => {
        if (element) {
            focusableElements.current = focusableElements.current.filter(el => el !== element);
        }
    }, []);

    const focusNext = useCallback(() => {
        const elements = focusableElements.current.filter(el => !el.hasAttribute('disabled'));
        if (elements.length === 0) return;

        currentFocusIndex.current = (currentFocusIndex.current + 1) % elements.length;
        elements[currentFocusIndex.current]?.focus();
    }, []);

    const focusPrevious = useCallback(() => {
        const elements = focusableElements.current.filter(el => !el.hasAttribute('disabled'));
        if (elements.length === 0) return;

        currentFocusIndex.current = currentFocusIndex.current <= 0
            ? elements.length - 1
            : currentFocusIndex.current - 1;
        elements[currentFocusIndex.current]?.focus();
    }, []);

    const focusFirst = useCallback(() => {
        const elements = focusableElements.current.filter(el => !el.hasAttribute('disabled'));
        if (elements.length > 0) {
            currentFocusIndex.current = 0;
            elements[0]?.focus();
        }
    }, []);

    const focusLast = useCallback(() => {
        const elements = focusableElements.current.filter(el => !el.hasAttribute('disabled'));
        if (elements.length > 0) {
            currentFocusIndex.current = elements.length - 1;
            elements[elements.length - 1]?.focus();
        }
    }, []);

    return {
        registerFocusable,
        unregisterFocusable,
        focusNext,
        focusPrevious,
        focusFirst,
        focusLast
    };
};

/**
 * Hook for managing focus trap in modals/dialogs
 */
export const useFocusTrap = (isActive: boolean) => {
    const containerRef = useRef<HTMLElement | null>(null);
    const previousFocus = useRef<HTMLElement | null>(null);

    useEffect(() => {
        if (!isActive || !containerRef.current) return;

        // Save currently focused element
        previousFocus.current = document.activeElement as HTMLElement;

        // Get all focusable elements within the container
        const getFocusableElements = (): HTMLElement[] => {
            if (!containerRef.current) return [];

            const focusableSelectors = [
                'a[href]',
                'button:not([disabled])',
                'textarea:not([disabled])',
                'input:not([disabled])',
                'select:not([disabled])',
                '[tabindex]:not([tabindex="-1"])'
            ].join(',');

            return Array.from(containerRef.current.querySelectorAll(focusableSelectors));
        };

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key !== 'Tab') return;

            const focusableElements = getFocusableElements();
            if (focusableElements.length === 0) return;

            const firstElement = focusableElements[0];
            const lastElement = focusableElements[focusableElements.length - 1];

            // Shift + Tab
            if (e.shiftKey) {
                if (document.activeElement === firstElement) {
                    e.preventDefault();
                    lastElement.focus();
                }
            }
            // Tab
            else {
                if (document.activeElement === lastElement) {
                    e.preventDefault();
                    firstElement.focus();
                }
            }
        };

        // Focus first element when trap activates
        const focusableElements = getFocusableElements();
        if (focusableElements.length > 0) {
            focusableElements[0].focus();
        }

        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('keydown', handleKeyDown);
            // Restore focus when trap deactivates
            if (previousFocus.current && document.contains(previousFocus.current)) {
                previousFocus.current.focus();
            }
        };
    }, [isActive]);

    return containerRef;
};

/**
 * Hook for announcing messages to screen readers
 */
export const useScreenReaderAnnounce = () => {
    const announceRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        // Create live region if it doesn't exist
        if (!announceRef.current) {
            const liveRegion = document.createElement('div');
            liveRegion.setAttribute('role', 'status');
            liveRegion.setAttribute('aria-live', 'polite');
            liveRegion.setAttribute('aria-atomic', 'true');
            liveRegion.style.position = 'absolute';
            liveRegion.style.left = '-10000px';
            liveRegion.style.width = '1px';
            liveRegion.style.height = '1px';
            liveRegion.style.overflow = 'hidden';
            document.body.appendChild(liveRegion);
            announceRef.current = liveRegion;
        }

        return () => {
            if (announceRef.current && document.body.contains(announceRef.current)) {
                document.body.removeChild(announceRef.current);
            }
        };
    }, []);

    const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
        if (!announceRef.current) return;

        announceRef.current.setAttribute('aria-live', priority);
        announceRef.current.textContent = message;

        // Clear after announcement
        setTimeout(() => {
            if (announceRef.current) {
                announceRef.current.textContent = '';
            }
        }, 1000);
    }, []);

    return announce;
};

/**
 * Utility function to generate unique IDs for ARIA relationships
 */
let idCounter = 0;
export const useUniqueId = (prefix: string = 'id'): string => {
    const idRef = useRef<string>('');

    if (!idRef.current) {
        idRef.current = `${prefix}-${++idCounter}-${Date.now()}`;
    }

    return idRef.current;
};

/**
 * Hook for managing ARIA expanded state (accordions, dropdowns, etc.)
 */
export const useAriaExpanded = (initialState: boolean = false) => {
    const [isExpanded, setIsExpanded] = React.useState(initialState);

    const toggle = useCallback(() => {
        setIsExpanded(prev => !prev);
    }, []);

    const expand = useCallback(() => {
        setIsExpanded(true);
    }, []);

    const collapse = useCallback(() => {
        setIsExpanded(false);
    }, []);

    return {
        isExpanded,
        toggle,
        expand,
        collapse,
        ariaExpanded: isExpanded
    };
};

// Import React for useState
import React from 'react';
