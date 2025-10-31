/**
 * GlassmorphicStyles — True Glassmorphic Design System (Qwen Specification)
 * 
 * Based on the authentic glassmorphic pill specification with:
 * - Lighter glass base effect with precise backdrop blur
 * - Dynamic pill-to-strap transformation on click
 * - CSS pseudo-elements for status dots
 * - Refined color palette with accurate glow effects
 * - Smooth cubic-bezier transitions
 */

import React from "react";

import { theme } from "../../lib/theme";

// True glassmorphic base styles (lighter, more refined)
export const glassmorphicBase = {
  // Refined glass effect - lighter and more subtle
  backdropFilter: "blur(10px)",
  WebkitBackdropFilter: "blur(10px)",
  background: "rgba(255, 255, 255, 0.08)",
  border: "1px solid rgba(255, 255, 255, 0.12)",
  
  // Subtle depth with inner highlight
  boxShadow: `
    0 0 10px 1px rgba(0, 170, 255, 0.2),
    inset 0 1px 2px rgba(255, 255, 255, 0.1)
  `,
  
  // Smooth transitions with proper easing
  transition: "all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1)",
  color: "white",
};

// True glassmorphic variants
export const glassmorphicVariants = {
  // Pills - authentic specification
  pill: {
    ...glassmorphicBase,
    display: "inline-flex",
    alignItems: "center",
    padding: "6px 12px",
    borderRadius: "999px", // Fully rounded pill
    fontSize: "14px",
    fontWeight: "600",
    whiteSpace: "nowrap" as const,
    cursor: "pointer",
    position: "relative" as const,
  },
  
  // Dropdown - adapted from pill base
  dropdown: {
    ...glassmorphicBase,
    borderRadius: "12px",
    padding: "8px 12px",
    fontSize: "14px",
    fontWeight: "500",
    minHeight: "40px",
    display: "flex",
    alignItems: "center",
    width: "100%",
  },
  
  // Panel - for larger containers
  panel: {
    ...glassmorphicBase,
    borderRadius: "16px",
    padding: "20px",
    boxShadow: `
      0 0 20px 2px rgba(0, 170, 255, 0.15),
      inset 0 1px 2px rgba(255, 255, 255, 0.1)
    `,
  },
  
  // Button - interactive elements
  button: {
    ...glassmorphicBase,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    borderRadius: "12px",
    padding: "8px 16px",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
  },
};

// Interactive state modifiers - true specification
export const glassmorphicStates = {
  hover: {
    boxShadow: `
      0 0 14px 3px rgba(0, 170, 255, 0.35),
      inset 0 1px 2px rgba(255, 255, 255, 0.15)
    `,
  },
  
  // Click state - pill transforms to strap (key innovation)
  clicked: {
    borderRadius: "4px", // Flattens corners dramatically
    padding: "6px 10px",
    boxShadow: `
      0 0 8px 1px rgba(100, 100, 100, 0.2),
      inset 0 1px 2px rgba(0, 0, 0, 0.1)
    `,
    background: "rgba(255, 255, 255, 0.05)",
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  
  focus: {
    outline: "none",
    border: `1px solid ${theme?.colors?.accent ?? "#00aaff"}`,
    boxShadow: "0 0 14px 3px rgba(0, 170, 255, 0.3), inset 0 1px 2px rgba(255, 255, 255, 0.15)",
  },
  
  disabled: {
    opacity: 0.6,
    cursor: "not-allowed",
    transform: "none",
  },
};

// True color specifications with precise glow effects
export const glassmorphicColors = {
  installing: {
    color: "#00dfff",
    hoverGlow: "0 0 14px 3px rgba(0, 223, 255, 0.4), inset 0 1px 2px rgba(255,255,255,0.15)"
  },
  planned: {
    color: "#ffcc00",
    hoverGlow: "0 0 14px 3px rgba(255, 204, 0, 0.4), inset 0 1px 2px rgba(255,255,255,0.15)"
  },
  completed: {
    color: "#4caf50",
    hoverGlow: "0 0 14px 3px rgba(76, 175, 80, 0.4), inset 0 1px 2px rgba(255,255,255,0.15)"
  },
  error: {
    color: "#f44336",
    hoverGlow: "0 0 14px 3px rgba(244, 67, 54, 0.4), inset 0 1px 2px rgba(255,255,255,0.15)"
  },
  pending: {
    color: "#9c27b0",
    hoverGlow: "0 0 14px 3px rgba(156, 39, 176, 0.4), inset 0 1px 2px rgba(255,255,255,0.15)"
  },
  active: {
    color: "#2196f3",
    hoverGlow: "0 0 14px 3px rgba(33, 150, 243, 0.4), inset 0 1px 2px rgba(255,255,255,0.15)"
  },
  draft: {
    color: "#9e9e9e",
    hoverGlow: "0 0 14px 3px rgba(158, 158, 158, 0.3), inset 0 1px 2px rgba(255,255,255,0.15)"
  },
  delayed: {
    color: "#ff5722",
    hoverGlow: "0 0 14px 3px rgba(255, 87, 34, 0.4), inset 0 1px 2px rgba(255,255,255,0.15)"
  },
  // Legacy mappings for existing code
  blue: {
    color: "#2196f3",
    hoverGlow: "0 0 14px 3px rgba(33, 150, 243, 0.4), inset 0 1px 2px rgba(255,255,255,0.15)"
  },
  green: {
    color: "#4caf50",
    hoverGlow: "0 0 14px 3px rgba(76, 175, 80, 0.4), inset 0 1px 2px rgba(255,255,255,0.15)"
  },
  orange: {
    color: "#ffcc00",
    hoverGlow: "0 0 14px 3px rgba(255, 204, 0, 0.4), inset 0 1px 2px rgba(255,255,255,0.15)"
  },
  cyan: {
    color: "#00dfff",
    hoverGlow: "0 0 14px 3px rgba(0, 223, 255, 0.4), inset 0 1px 2px rgba(255,255,255,0.15)"
  },
  red: {
    color: "#f44336",
    hoverGlow: "0 0 14px 3px rgba(244, 67, 54, 0.4), inset 0 1px 2px rgba(255,255,255,0.15)"
  },
  amber: {
    color: "#ffcc00",
    hoverGlow: "0 0 14px 3px rgba(255, 204, 0, 0.4), inset 0 1px 2px rgba(255,255,255,0.15)"
  },
  purple: {
    color: "#9c27b0",
    hoverGlow: "0 0 14px 3px rgba(156, 39, 176, 0.4), inset 0 1px 2px rgba(255,255,255,0.15)"
  },
};

// Legacy export for backward compatibility
export const glassmorphicGlows = glassmorphicColors;

// React hook for glassmorphic styling - updated for true specification
export function useGlassmorphic(
  variant: keyof typeof glassmorphicVariants = "pill",
  options: {
    color?: keyof typeof glassmorphicColors;
    disabled?: boolean;
    interactive?: boolean;
    clicked?: boolean;
  } = {}
) {
  const { color, disabled, interactive: _interactive = true, clicked } = options;
  
  const baseStyle = glassmorphicVariants[variant];
  const colorConfig = color ? glassmorphicColors[color] : null;
  
  // Apply color if specified
  const colorStyle = colorConfig ? { color: colorConfig.color } : {};
  
  // Apply clicked state (pill-to-strap transformation)
  const clickedStyle = clicked ? glassmorphicStates.clicked : {};
  
  // Apply disabled state
  const disabledStyle = disabled ? glassmorphicStates.disabled : {};
  
  return {
    ...baseStyle,
    ...colorStyle,
    ...clickedStyle,
    ...disabledStyle,
  };
}

// Updated utility function for true glassmorphic styles
export function getGlassmorphicStyle(
  variant: keyof typeof glassmorphicVariants,
  state?: keyof typeof glassmorphicStates | "clicked",
  color?: keyof typeof glassmorphicColors
): React.CSSProperties {
  const baseStyle = glassmorphicVariants[variant];
  const stateStyle = state && state !== "clicked" ? glassmorphicStates[state] : {};
  const clickedStyle = state === "clicked" ? glassmorphicStates.clicked : {};
  const colorConfig = color ? glassmorphicColors[color] : null;
  const colorStyle = colorConfig ? { color: colorConfig.color } : {};
  
  return {
    ...baseStyle,
    ...stateStyle,
    ...clickedStyle,
    ...colorStyle,
  };
}

// CSS class names for true glassmorphic system
export const glassmorphicClassNames = {
  base: "glassmorphic-base",
  pill: "glassmorphic-pill",
  dropdown: "glassmorphic-dropdown",
  panel: "glassmorphic-panel",
  button: "glassmorphic-button",
  hover: "glassmorphic-hover",
  clicked: "glassmorphic-clicked", // New clicked state
  focus: "glassmorphic-focus",
  disabled: "glassmorphic-disabled",
};

// Updated utility component with click state support
export const GlassmorphicElement: React.FC<{
  variant?: keyof typeof glassmorphicVariants;
  color?: keyof typeof glassmorphicColors;
  disabled?: boolean;
  clicked?: boolean;
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
} & React.HTMLAttributes<HTMLDivElement>> = ({ 
  variant = "pill", 
  color, 
  disabled, 
  clicked,
  className = "", 
  children, 
  onClick,
  ...props 
}) => {
  const [isClicked, setIsClicked] = React.useState(clicked || false);
  
  const handleClick = () => {
    if (!disabled) {
      setIsClicked(!isClicked);
      onClick?.();
    }
  };
  
  const style = useGlassmorphic(variant, { 
    color, 
    disabled, 
    interactive: !disabled,
    clicked: isClicked 
  });
  
  const colorConfig = color ? glassmorphicColors[color] : null;
  
  return (
    <div 
      className={`${glassmorphicClassNames[variant]} ${className}`}
      style={{
        ...style,
        // Add status dot using CSS-like styling for pills
        ...(variant === "pill" && {
          position: "relative" as const,
        })
      }}
      onClick={handleClick}
      onMouseEnter={(e) => {
        if (colorConfig && !disabled) {
          e.currentTarget.style.boxShadow = colorConfig.hoverGlow;
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled) {
          e.currentTarget.style.boxShadow = glassmorphicBase.boxShadow;
        }
      }}
      {...props}
    >
      {/* Status dot for pills - using CSS ::before equivalent */}
      {variant === "pill" && (
        <span style={{
          width: "6px",
          height: "6px",
          borderRadius: "50%",
          marginRight: "8px",
          background: "currentColor",
          opacity: 0.9,
          display: "inline-block"
        }} />
      )}
      {children}
    </div>
  );
};