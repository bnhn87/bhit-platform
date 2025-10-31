/**
 * Standardized Icon Sizing Utility for SmartQuote
 * Provides consistent, responsive icon sizing across all components
 */

import React from 'react';

export type IconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';

// Base icon sizes in pixels
export const ICON_SIZES = {
  xs: { height: 12, width: 12 },
  sm: { height: 16, width: 16 },
  md: { height: 20, width: 20 },
  lg: { height: 24, width: 24 },
  xl: { height: 32, width: 32 },
  '2xl': { height: 40, width: 40 },
  '3xl': { height: 48, width: 48 }
} as const;

// Responsive sizing configurations
export const RESPONSIVE_BREAKPOINTS = {
  mobile: '(max-width: 640px)',
  tablet: '(max-width: 768px)',
  desktop: '(min-width: 769px)'
} as const;

/**
 * Get icon styling with optional responsive behavior
 */
export const getIconStyle = (
  size: IconSize, 
  options: {
    responsive?: boolean;
    mobileReduction?: number;
    color?: string;
    marginRight?: number;
    marginLeft?: number;
  } = {}
): React.CSSProperties => {
  const { 
    responsive = true, // Default to responsive
    mobileReduction = 4, 
    color,
    marginRight,
    marginLeft 
  } = options;
  
  const baseSize = ICON_SIZES[size];
  
  // Use CSS clamp for better responsive scaling
  const getResponsiveSize = (basePixels: number): string => {
    if (!responsive) return `${basePixels}px`;
    
    const minSize = Math.max(12, basePixels - mobileReduction);
    const maxSize = basePixels;
    // Use vw units for smooth scaling between breakpoints
    const vwSize = Math.round((basePixels / 1200) * 100 * 100) / 100; // Based on 1200px container
    
    return `clamp(${minSize}px, ${vwSize}vw, ${maxSize}px)`;
  };
  
  const style: React.CSSProperties = {
    height: getResponsiveSize(baseSize.height),
    width: getResponsiveSize(baseSize.width),
    flexShrink: 0, // Prevent icons from shrinking in flex containers
    ...(color && { color }),
    ...(marginRight && { marginRight }),
    ...(marginLeft && { marginLeft })
  };

  return style;
};

/**
 * Context-specific icon size recommendations
 */
export const ICON_CONTEXT_SIZES = {
  // Button icons - small and unobtrusive
  button: 'sm' as IconSize,
  buttonLarge: 'md' as IconSize,
  
  // Navigation and header icons
  navigation: 'md' as IconSize,
  header: 'lg' as IconSize,
  
  // Feature and action icons
  feature: 'xl' as IconSize,
  hero: '2xl' as IconSize,
  
  // Brand and logo
  brandSmall: 'xl' as IconSize,
  brand: '2xl' as IconSize,
  brandLarge: '3xl' as IconSize,
  
  // Utility and status icons
  status: 'sm' as IconSize,
  warning: 'md' as IconSize,
  error: 'lg' as IconSize,
  
  // Loading and feedback
  loading: 'lg' as IconSize,
  loadingLarge: '2xl' as IconSize,
  
  // File and document icons
  file: 'md' as IconSize,
  fileLarge: 'xl' as IconSize,
  
  // Action icons in lists/tables
  tableAction: 'sm' as IconSize,
  listAction: 'md' as IconSize
} as const;

/**
 * Get icon props for specific contexts with responsive behavior
 */
export const getIconProps = (
  context: keyof typeof ICON_CONTEXT_SIZES,
  options: {
    responsive?: boolean;
    color?: string;
    marginRight?: number;
    marginLeft?: number;
  } = {}
) => {
  const size = ICON_CONTEXT_SIZES[context];
  return {
    style: getIconStyle(size, { responsive: true, ...options })
  };
};

/**
 * Utility for creating responsive icon wrapper components
 */
export const createResponsiveIcon = (
  IconComponent: React.ComponentType<{ [key: string]: unknown }>,
  defaultSize: IconSize = 'md'
) => {
  const ResponsiveIcon = React.forwardRef<
    SVGSVGElement, 
    { 
      size?: IconSize; 
      responsive?: boolean; 
      context?: keyof typeof ICON_CONTEXT_SIZES;
      [key: string]: unknown;
    }
  >(({ size, responsive: _responsiveProp = false, context, ...props }, ref) => {
    const iconSize = context ? ICON_CONTEXT_SIZES[context as keyof typeof ICON_CONTEXT_SIZES] : (size || defaultSize);
    const iconStyle = getIconStyle(iconSize as IconSize);

    return React.createElement(IconComponent, { ref, style: iconStyle, ...props });
  });
  
  ResponsiveIcon.displayName = `ResponsiveIcon(${IconComponent.displayName || IconComponent.name})`;
  
  return ResponsiveIcon;
};