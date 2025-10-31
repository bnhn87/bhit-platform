import { useState, useEffect, useCallback } from 'react';
import {
    Breakpoint,
    breakpoints,
    getCurrentBreakpoint,
    isMobile as checkIsMobile,
    isTablet as checkIsTablet,
    isDesktop as checkIsDesktop,
    matchesBreakpoint,
} from '../utils/responsive';

/**
 * Hook to detect current breakpoint
 * Updates on window resize with debouncing
 */
export const useBreakpoint = (): Breakpoint => {
    const [breakpoint, setBreakpoint] = useState<Breakpoint>(() => {
        if (typeof window === 'undefined') return 'lg'; // SSR default
        return getCurrentBreakpoint(window.innerWidth);
    });

    useEffect(() => {
        if (typeof window === 'undefined') return;

        let timeoutId: NodeJS.Timeout;

        const handleResize = () => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                const newBreakpoint = getCurrentBreakpoint(window.innerWidth);
                if (newBreakpoint !== breakpoint) {
                    setBreakpoint(newBreakpoint);
                }
            }, 150); // Debounce 150ms
        };

        window.addEventListener('resize', handleResize);

        // Check on mount
        handleResize();

        return () => {
            clearTimeout(timeoutId);
            window.removeEventListener('resize', handleResize);
        };
    }, [breakpoint]);

    return breakpoint;
};

/**
 * Hook to check if a specific breakpoint is active
 */
export const useMediaQuery = (query: string): boolean => {
    const [matches, setMatches] = useState(() => {
        if (typeof window === 'undefined') return false;
        return window.matchMedia(query).matches;
    });

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const mediaQuery = window.matchMedia(query);

        const handleChange = (e: MediaQueryListEvent) => {
            setMatches(e.matches);
        };

        // Modern browsers
        if (mediaQuery.addEventListener) {
            mediaQuery.addEventListener('change', handleChange);
        } else {
            // Legacy browsers
            mediaQuery.addListener(handleChange);
        }

        // Set initial value
        setMatches(mediaQuery.matches);

        return () => {
            if (mediaQuery.removeEventListener) {
                mediaQuery.removeEventListener('change', handleChange);
            } else {
                mediaQuery.removeListener(handleChange);
            }
        };
    }, [query]);

    return matches;
};

/**
 * Hook to check if device is mobile
 */
export const useIsMobile = (): boolean => {
    const breakpoint = useBreakpoint();
    return checkIsMobile(breakpoints[breakpoint]);
};

/**
 * Hook to check if device is tablet
 */
export const useIsTablet = (): boolean => {
    const breakpoint = useBreakpoint();
    return checkIsTablet(breakpoints[breakpoint]);
};

/**
 * Hook to check if device is desktop
 */
export const useIsDesktop = (): boolean => {
    const breakpoint = useBreakpoint();
    return checkIsDesktop(breakpoints[breakpoint]);
};

/**
 * Hook to check if a specific breakpoint is matched
 */
export const useMatchBreakpoint = (targetBreakpoint: Breakpoint): boolean => {
    const currentBreakpoint = useBreakpoint();
    return matchesBreakpoint(breakpoints[currentBreakpoint], targetBreakpoint);
};

/**
 * Hook to detect touch device
 */
export const useIsTouchDevice = (): boolean => {
    const [isTouch, setIsTouch] = useState(false);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const checkTouch = () => {
            return (
                'ontouchstart' in window ||
                navigator.maxTouchPoints > 0 ||
                // @ts-ignore - Legacy property
                navigator.msMaxTouchPoints > 0
            );
        };

        setIsTouch(checkTouch());
    }, []);

    return isTouch;
};

/**
 * Hook to get window dimensions
 * Updates on resize with debouncing
 */
export const useWindowSize = (): { width: number; height: number } => {
    const [windowSize, setWindowSize] = useState(() => {
        if (typeof window === 'undefined') {
            return { width: 1024, height: 768 }; // SSR default
        }
        return {
            width: window.innerWidth,
            height: window.innerHeight,
        };
    });

    useEffect(() => {
        if (typeof window === 'undefined') return;

        let timeoutId: NodeJS.Timeout;

        const handleResize = () => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                setWindowSize({
                    width: window.innerWidth,
                    height: window.innerHeight,
                });
            }, 150); // Debounce 150ms
        };

        window.addEventListener('resize', handleResize);

        // Set initial size
        handleResize();

        return () => {
            clearTimeout(timeoutId);
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    return windowSize;
};

/**
 * Hook for responsive values
 * Returns different values based on current breakpoint
 */
export const useResponsiveValue = <T,>(values: {
    xs?: T;
    sm?: T;
    md?: T;
    lg?: T;
    xl?: T;
    '2xl'?: T;
    default: T;
}): T => {
    const breakpoint = useBreakpoint();

    // Return breakpoint-specific value or fall back to default
    return values[breakpoint] ?? values.default;
};

/**
 * Hook to detect orientation
 */
export const useOrientation = (): 'portrait' | 'landscape' => {
    const [orientation, setOrientation] = useState<'portrait' | 'landscape'>(() => {
        if (typeof window === 'undefined') return 'landscape';
        return window.innerHeight > window.innerWidth ? 'portrait' : 'landscape';
    });

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const handleOrientationChange = () => {
            setOrientation(window.innerHeight > window.innerWidth ? 'portrait' : 'landscape');
        };

        window.addEventListener('resize', handleOrientationChange);
        handleOrientationChange();

        return () => {
            window.removeEventListener('resize', handleOrientationChange);
        };
    }, []);

    return orientation;
};

/**
 * Hook for conditional mobile/desktop rendering
 */
export const useResponsiveRender = () => {
    const isMobile = useIsMobile();
    const isTablet = useIsTablet();
    const isDesktop = useIsDesktop();

    const renderMobile = useCallback(
        (content: React.ReactNode) => (isMobile ? content : null),
        [isMobile]
    );

    const renderTablet = useCallback(
        (content: React.ReactNode) => (isTablet ? content : null),
        [isTablet]
    );

    const renderDesktop = useCallback(
        (content: React.ReactNode) => (isDesktop ? content : null),
        [isDesktop]
    );

    const renderMobileOrTablet = useCallback(
        (content: React.ReactNode) => (isMobile || isTablet ? content : null),
        [isMobile, isTablet]
    );

    return {
        isMobile,
        isTablet,
        isDesktop,
        renderMobile,
        renderTablet,
        renderDesktop,
        renderMobileOrTablet,
    };
};
