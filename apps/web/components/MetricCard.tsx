import React from 'react';

import { theme } from '../lib/theme';

import StatusPill from './StatusPill';

interface MetricCardProps {
  title: string;
  value?: string | number;
  loading?: boolean;
  pill?: {
    label: string;
    sub?: string;
    variant?: 'ok' | 'warn' | 'bad' | 'info';
  };
  className?: string;
  style?: React.CSSProperties;
  onClick?: () => void;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string | number;
}

export default function MetricCard({ 
  title, 
  value, 
  loading = false, 
  pill, 
  className,
  style,
  onClick,
  subtitle,
  trend,
  trendValue
}: MetricCardProps) {
  const getTrendColor = () => {
    switch (trend) {
      case 'up': return theme.colors.accentAlt;
      case 'down': return theme.colors.danger;
      default: return theme.colors.textSubtle;
    }
  };

  const getTrendIcon = () => {
    switch (trend) {
      case 'up': return '↗';
      case 'down': return '↘';
      default: return '→';
    }
  };

  return (
    <section 
      className={className}
      style={{
        padding: 16,
        borderRadius: theme.radii.md,
        background: theme.colors.panel,
        border: `1px solid ${theme.colors.border}`,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.2s ease',
        ...style
      }}
      onClick={onClick}
      onMouseEnter={(e) => {
        if (onClick) {
          e.currentTarget.style.borderColor = theme.colors.accent;
          e.currentTarget.style.transform = 'translateY(-1px)';
        }
      }}
      onMouseLeave={(e) => {
        if (onClick) {
          e.currentTarget.style.borderColor = theme.colors.border;
          e.currentTarget.style.transform = 'translateY(0)';
        }
      }}
    >
      <div style={{
        fontSize: 12,
        color: theme.colors.textSubtle,
        marginBottom: 8,
        fontWeight: 600,
        letterSpacing: 0.5,
        textTransform: 'uppercase'
      }}>
        {title}
      </div>
      
      <div>
        <div style={{
          fontSize: 28,
          fontWeight: 800,
          letterSpacing: 0.2,
          color: loading ? theme.colors.textSubtle : theme.colors.text,
          marginBottom: subtitle || trend ? 4 : 0
        }}>
          {loading ? '...' : value}
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
            display: 'flex',
            alignItems: 'center',
            gap: 4
          }}>
            <span>{getTrendIcon()}</span>
            <span>{trendValue}</span>
          </div>
        )}
        
        {pill && (
          <div style={{ marginTop: 10 }}>
            <StatusPill
              variant={pill.variant}
              label={pill.label}
              subLabel={pill.sub}
            />
          </div>
        )}
      </div>
    </section>
  );
}

export type { MetricCardProps };
