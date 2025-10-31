import React from "react";

import { theme } from "../../lib/theme";

interface ProgressBarProps {
  value: number;
  width?: number;
  height?: number;
  className?: string;
  style?: React.CSSProperties;
  showText?: boolean;
}

export default function ProgressBar({ 
  value, 
  width = 160, 
  height = 10, 
  className,
  style,
  showText = false 
}: ProgressBarProps) {
  const v = Math.max(0, Math.min(100, value));
  
  return (
    <div 
      className={className}
      style={{ 
        width, 
        height, 
        borderRadius: 999, 
        background: theme.colors.panelAlt, 
        border: `1px solid ${theme.colors.border}`,
        position: "relative",
        ...style
      }}
    >
      <div
        style={{
          width: `${v}%`,
          height: "100%",
          borderRadius: 999,
          background: theme.colors.accent,
          transition: "width 0.3s ease"
        }}
      />
      {showText && (
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            fontSize: 12,
            color: theme.colors.text,
            fontWeight: 600,
            pointerEvents: "none"
          }}
        >
          {Math.round(v)}%
        </div>
      )}
    </div>
  );
}