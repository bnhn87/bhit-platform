/**
 * Responsive Design System for SmartQuote
 * Provides breakpoints, media queries, and responsive utilities
 */

export const breakpoints = {
    xs: 320,   // Mobile portrait
    sm: 640,   // Mobile landscape
    md: 768,   // Tablet portrait
    lg: 1024,  // Tablet landscape / Small desktop
    xl: 1280,  // Desktop
    '2xl': 1536 // Large desktop
} as const;

export type Breakpoint = keyof typeof breakpoints;

/**
 * Media query strings for CSS
 */
export const mediaQueries = {
    xs: `@media (min-width: ${breakpoints.xs}px)`,
    sm: `@media (min-width: ${breakpoints.sm}px)`,
    md: `@media (min-width: ${breakpoints.md}px)`,
    lg: `@media (min-width: ${breakpoints.lg}px)`,
    xl: `@media (min-width: ${breakpoints.xl}px)`,
    '2xl': `@media (min-width: ${breakpoints['2xl']}px)`,

    // Max width queries (mobile-first exceptions)
    maxSm: `@media (max-width: ${breakpoints.sm - 1}px)`,
    maxMd: `@media (max-width: ${breakpoints.md - 1}px)`,
    maxLg: `@media (max-width: ${breakpoints.lg - 1}px)`,

    // Common device queries
    mobile: `@media (max-width: ${breakpoints.md - 1}px)`,
    tablet: `@media (min-width: ${breakpoints.md}px) and (max-width: ${breakpoints.lg - 1}px)`,
    desktop: `@media (min-width: ${breakpoints.lg}px)`,

    // Orientation queries
    portrait: '@media (orientation: portrait)',
    landscape: '@media (orientation: landscape)',

    // Touch device detection
    touch: '@media (hover: none) and (pointer: coarse)',
    mouse: '@media (hover: hover) and (pointer: fine)',
} as const;

/**
 * Responsive spacing scale
 */
export const responsiveSpacing = {
    xs: {
        padding: '12px',
        margin: '8px',
        gap: '8px',
    },
    sm: {
        padding: '16px',
        margin: '12px',
        gap: '12px',
    },
    md: {
        padding: '20px',
        margin: '16px',
        gap: '16px',
    },
    lg: {
        padding: '24px',
        margin: '20px',
        gap: '20px',
    },
    xl: {
        padding: '32px',
        margin: '24px',
        gap: '24px',
    },
    '2xl': {
        padding: '40px',
        margin: '32px',
        gap: '32px',
    },
} as const;

/**
 * Responsive typography scale
 */
export const responsiveTypography = {
    mobile: {
        h1: '24px',
        h2: '20px',
        h3: '18px',
        body: '14px',
        small: '12px',
    },
    tablet: {
        h1: '28px',
        h2: '22px',
        h3: '18px',
        body: '15px',
        small: '13px',
    },
    desktop: {
        h1: '32px',
        h2: '24px',
        h3: '20px',
        body: '16px',
        small: '14px',
    },
} as const;

/**
 * Get current breakpoint from window width
 */
export const getCurrentBreakpoint = (width: number): Breakpoint => {
    if (width >= breakpoints['2xl']) return '2xl';
    if (width >= breakpoints.xl) return 'xl';
    if (width >= breakpoints.lg) return 'lg';
    if (width >= breakpoints.md) return 'md';
    if (width >= breakpoints.sm) return 'sm';
    return 'xs';
};

/**
 * Check if current width matches a breakpoint
 */
export const matchesBreakpoint = (width: number, breakpoint: Breakpoint): boolean => {
    return width >= breakpoints[breakpoint];
};

/**
 * Check if current device is mobile
 */
export const isMobile = (width: number): boolean => {
    return width < breakpoints.md;
};

/**
 * Check if current device is tablet
 */
export const isTablet = (width: number): boolean => {
    return width >= breakpoints.md && width < breakpoints.lg;
};

/**
 * Check if current device is desktop
 */
export const isDesktop = (width: number): boolean => {
    return width >= breakpoints.lg;
};

/**
 * Responsive container styles
 */
export const getResponsiveContainerStyles = (currentBreakpoint: Breakpoint): React.CSSProperties => {
    const baseStyles: React.CSSProperties = {
        width: '100%',
        marginLeft: 'auto',
        marginRight: 'auto',
    };

    if (currentBreakpoint === 'xs' || currentBreakpoint === 'sm') {
        return {
            ...baseStyles,
            maxWidth: '100%',
            padding: '0 16px',
        };
    }

    if (currentBreakpoint === 'md') {
        return {
            ...baseStyles,
            maxWidth: '768px',
            padding: '0 20px',
        };
    }

    if (currentBreakpoint === 'lg') {
        return {
            ...baseStyles,
            maxWidth: '1024px',
            padding: '0 24px',
        };
    }

    // xl and 2xl
    return {
        ...baseStyles,
        maxWidth: '1200px',
        padding: '0 32px',
    };
};

/**
 * Responsive grid styles
 */
export const getResponsiveGridStyles = (
    currentBreakpoint: Breakpoint,
    options?: {
        mobileCols?: number;
        tabletCols?: number;
        desktopCols?: number;
    }
): React.CSSProperties => {
    const { mobileCols = 1, tabletCols = 2, desktopCols = 3 } = options || {};

    let columns = mobileCols;
    if (currentBreakpoint === 'md' || currentBreakpoint === 'lg') {
        columns = tabletCols;
    } else if (currentBreakpoint === 'xl' || currentBreakpoint === '2xl') {
        columns = desktopCols;
    }

    return {
        display: 'grid',
        gridTemplateColumns: `repeat(${columns}, 1fr)`,
        gap: responsiveSpacing[currentBreakpoint].gap,
    };
};

/**
 * Responsive flex styles
 */
export const getResponsiveFlexStyles = (
    currentBreakpoint: Breakpoint,
    options?: {
        mobileDirection?: 'row' | 'column';
        desktopDirection?: 'row' | 'column';
    }
): React.CSSProperties => {
    const { mobileDirection = 'column', desktopDirection = 'row' } = options || {};

    const isMobileSize = currentBreakpoint === 'xs' || currentBreakpoint === 'sm';

    return {
        display: 'flex',
        flexDirection: isMobileSize ? mobileDirection : desktopDirection,
        gap: responsiveSpacing[currentBreakpoint].gap,
    };
};

/**
 * Touch-friendly button styles
 */
export const getTouchFriendlyStyles = (isTouchDevice: boolean): React.CSSProperties => {
    if (!isTouchDevice) return {};

    return {
        minHeight: '44px',
        minWidth: '44px',
        padding: '12px 16px',
        fontSize: '16px', // Prevents iOS zoom on focus
    };
};

/**
 * Hide on mobile/desktop utilities
 */
export const hideOnMobile = (currentBreakpoint: Breakpoint): React.CSSProperties => {
    return isMobile(breakpoints[currentBreakpoint])
        ? { display: 'none' }
        : {};
};

export const hideOnDesktop = (currentBreakpoint: Breakpoint): React.CSSProperties => {
    return isDesktop(breakpoints[currentBreakpoint])
        ? { display: 'none' }
        : {};
};

export const showOnlyMobile = hideOnDesktop;
export const showOnlyDesktop = hideOnMobile;
