import React, { ReactNode } from "react";

import { theme } from "../../lib/theme";

interface StatCardProps {
  title: string;
  value: string | number;
  right?: ReactNode;
  subtitle?: string;
  trend?: "up" | "down" | "neutral";
  trendValue?: string | number;
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
  loading?: boolean;
  color?: string;
}

export default function StatCard({
  title,
  value,
  right,
  subtitle,
  trend,
  trendValue,
  className,
  style,
  onClick,
  loading = false,
  color = theme.colors.text
}: StatCardProps) {
  const getTrendColor = () => {
    switch (trend) {
      case "up": return theme.colors.accentAlt;
      case "down": return theme.colors.danger;
      default: return theme.colors.textSubtle;
    }
  };

  const getTrendIcon = () => {
    switch (trend) {
      case "up": return "↗";
      case "down": return "↘";
      default: return "→";
    }
  };

  return (
    <div 
      className={className}
      style={{ 
        padding: 16, 
        display: "flex", 
        alignItems: "center", 
        gap: 12,
        cursor: onClick ? "pointer" : "default",
        borderRadius: theme.radii.md,
        background: onClick ? theme.colors.panel : "transparent",
        border: `1px solid ${theme.colors.border}`,
        transition: "all 0.2s ease",
        ...style
      }}
      onClick={onClick}
      onMouseEnter={(e) => {
        if (onClick) {
          e.currentTarget.style.borderColor = theme.colors.accent;
          e.currentTarget.style.transform = "translateY(-1px)";
        }
      }}
      onMouseLeave={(e) => {
        if (onClick) {
          e.currentTarget.style.borderColor = theme.colors.border;
          e.currentTarget.style.transform = "translateY(0)";
        }
      }}
    >
      <div style={{ flex: 1 }}>
        <div style={{ 
          fontSize: 12, 
          color: theme.colors.textSubtle, 
          marginBottom: 6,
          fontWeight: 600,
          letterSpacing: 0.5
        }}>
          {title.toUpperCase()}
        </div>
        <div style={{ 
          fontSize: 18, 
          fontWeight: 700, 
          letterSpacing: 0.1,
          color: loading ? theme.colors.textSubtle : color,
          marginBottom: subtitle || trend ? 4 : 0
        }}>
          {loading ? "..." : value}
        </div>
        {subtitle && (
          <div style={{ 
            fontSize: 12, 
            color: theme.colors.textSubtle,
            marginTop: 2
          }}>
            {subtitle}
          </div>
        )}
        {trend && trendValue && (
          <div style={{ 
            fontSize: 12, 
            color: getTrendColor(),
            marginTop: 4,
            display: "flex",
            alignItems: "center",
            gap: 4
          }}>
            <span>{getTrendIcon()}</span>
            <span>{trendValue}</span>
          </div>
        )}
      </div>
      {right && <div>{right}</div>}
    </div>
  );
}