import React from "react";

import { theme } from "../../lib/theme";

interface RingGaugeProps {
  percent: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  backgroundColor?: string;
  textColor?: string;
  showText?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export default function RingGauge({ 
  percent, 
  size = 64, 
  strokeWidth = 6,
  color = theme.colors.accent,
  backgroundColor = theme.colors.border,
  textColor = theme.colors.text,
  showText = true,
  className,
  style
}: RingGaugeProps) {
  const r = (size / 2) - strokeWidth;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(100, percent));
  const dash = (p / 100) * c;

  return (
    <svg 
      width={size} 
      height={size} 
      viewBox={`0 0 ${size} ${size}`}
      className={className}
      style={style}
    >
      {/* Background circle */}
      <circle 
        cx={size/2} 
        cy={size/2} 
        r={r} 
        stroke={backgroundColor} 
        strokeWidth={strokeWidth} 
        fill="none" 
      />
      {/* Progress circle */}
      <circle
        cx={size/2} 
        cy={size/2} 
        r={r}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={`${dash} ${c - dash}`}
        strokeLinecap="round"
        fill="none"
        transform={`rotate(-90 ${size/2} ${size/2})`}
        style={{
          transition: "stroke-dasharray 0.3s ease"
        }}
      />
      {/* Text display */}
      {showText && (
        <text
          x="50%" 
          y="50%" 
          dominantBaseline="middle" 
          textAnchor="middle"
          fontSize={Math.min(14, size * 0.2)} 
          fill={textColor} 
          fontWeight={700}
        >
          {Math.round(p)}%
        </text>
      )}
    </svg>
  );
}