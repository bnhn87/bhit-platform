/**
 * OnHoldAlert — Alert banner component for jobs with "On Hold" status
 * 
 * Displays prominent warning banners in dashboard, today view, and jobs list
 * when a job status is set to "On Hold" to indicate blocked status requiring attention.
 */

import React from "react";


import { getGlassmorphicStyle } from "./GlassmorphicStyles";

interface OnHoldAlertProps {
  jobTitle?: string;
  jobId?: string;
  onDismiss?: () => void;
  variant?: "banner" | "inline" | "compact";
  showIcon?: boolean;
}

export const OnHoldAlert: React.FC<OnHoldAlertProps> = ({
  jobTitle = "Job",
  jobId,
  onDismiss,
  variant = "banner",
  showIcon = true,
}) => {
  const variants = {
    banner: {
      padding: "16px 20px",
      fontSize: "15px",
      fontWeight: "600",
      borderRadius: "12px",
      margin: "16px 0",
    },
    inline: {
      padding: "12px 16px",
      fontSize: "14px",
      fontWeight: "500",
      borderRadius: "8px",
      margin: "8px 0",
    },
    compact: {
      padding: "8px 12px",
      fontSize: "13px",
      fontWeight: "500",
      borderRadius: "6px",
      margin: "4px 0",
    },
  };

  const alertStyle = {
    ...getGlassmorphicStyle("panel"),
    ...variants[variant],
    background: "rgba(156, 39, 176, 0.15)", // Purple background for "on hold"
    border: "1px solid rgba(156, 39, 176, 0.4)",
    color: "#e1bee7", // Light purple text
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    position: "relative" as const,
    overflow: "hidden" as const,
    animation: "pulse-glow 3s infinite",
  };

  return (
    <>
      <div style={alertStyle}>
        {/* Animated background pulse */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background:
              "linear-gradient(45deg, rgba(156, 39, 176, 0.1) 0%, rgba(156, 39, 176, 0.05) 50%, rgba(156, 39, 176, 0.1) 100%)",
            opacity: 0.8,
            animation: "shimmer 2s infinite",
            zIndex: 0,
          }}
        />

        <div style={{ flex: 1, display: "flex", alignItems: "center" }}>
          {showIcon && (
            <svg 
              style={{ 
                width: "20px", 
                height: "20px", 
                marginRight: "12px", 
                color: "#e1bee7", 
                flexShrink: 0 
              }} 
              fill="currentColor" 
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
                clipRule="evenodd"
              />
            </svg>
          )}
          <div style={{ position: "relative", zIndex: 1 }}>
            <strong>On Hold:</strong> {jobTitle}
            {jobId && (
              <span style={{ marginLeft: "8px", opacity: 0.8 }}>
                (#{jobId})
              </span>
            )}
            {variant === "banner" && (
              <div style={{ fontSize: "13px", marginTop: "4px", opacity: 0.9 }}>
                This job is blocked and requires attention to proceed.
              </div>
            )}
          </div>
        </div>

        {onDismiss && (
          <button
            onClick={onDismiss}
            style={{
              background: "transparent",
              border: "none",
              color: "rgba(225, 190, 231, 0.8)",
              cursor: "pointer",
              padding: "4px 8px",
              borderRadius: "4px",
              fontSize: "18px",
              lineHeight: "1",
              transition: "all 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)";
              e.currentTarget.style.color = "white";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "rgba(225, 190, 231, 0.8)";
            }}
            title="Dismiss alert"
          >
            ×
          </button>
        )}
      </div>

      {/* CSS animations */}
      <style jsx>{`
        @keyframes pulse-glow {
          0% {
            box-shadow: 0 0 10px rgba(156, 39, 176, 0.3),
              inset 0 1px 2px rgba(255, 255, 255, 0.1);
          }
          50% {
            box-shadow: 0 0 20px rgba(156, 39, 176, 0.5),
              inset 0 1px 2px rgba(255, 255, 255, 0.1);
          }
          100% {
            box-shadow: 0 0 10px rgba(156, 39, 176, 0.3),
              inset 0 1px 2px rgba(255, 255, 255, 0.1);
          }
        }

        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          div {
            animation: none !important;
          }
        }
      `}</style>
    </>
  );
};

// Hook for managing on-hold alerts across the application
export function useOnHoldAlerts() {
  const [onHoldJobs, setOnHoldJobs] = React.useState<
    Array<{ id: string; title: string; timestamp: Date }>
  >([]);

  const addOnHoldJob = React.useCallback((id: string, title: string) => {
    setOnHoldJobs((prev) => {
      // Avoid duplicates
      if (prev.some((job) => job.id === id)) return prev;
      return [...prev, { id, title, timestamp: new Date() }];
    });
  }, []);

  const removeOnHoldJob = React.useCallback((id: string) => {
    setOnHoldJobs((prev) => prev.filter((job) => job.id !== id));
  }, []);

  const clearAllOnHoldJobs = React.useCallback(() => {
    setOnHoldJobs([]);
  }, []);

  return {
    onHoldJobs,
    addOnHoldJob,
    removeOnHoldJob,
    clearAllOnHoldJobs,
    hasOnHoldJobs: onHoldJobs.length > 0,
  };
}

export default OnHoldAlert;