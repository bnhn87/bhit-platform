import React, { useState, useEffect } from "react";

import { supabase } from "../../lib/supabaseClient";
import { theme } from "../../lib/theme";

export type JobStatus = "planned" | "in_progress" | "snagging" | "completed";

function isUUID(v?: string | null) {
  return !!v && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

export default function StatusPill(props: {
  status: JobStatus;
  jobId?: string | null;
  canManage?: boolean;
  onStatusChange?: (next: JobStatus) => void;
  enableCycling?: boolean;
  cycleInterval?: number;
}) {
  const { status, jobId, canManage = false, onStatusChange, enableCycling = false, cycleInterval = 3000 } = props;
  const hasValidId = isUUID(jobId);
  const clickable = canManage && hasValidId;
  const [currentStatus, setCurrentStatus] = useState<JobStatus>(status);
  const [isHovered, setIsHovered] = useState(false);

  function nextStatus(s: JobStatus): JobStatus {
    switch (s) {
      case "planned": return "in_progress";
      case "in_progress": return "snagging";
      case "snagging": return "completed";
      case "completed": default: return "planned";
    }
  }
  function prevStatus(s: JobStatus): JobStatus {
    switch (s) {
      case "planned": return "completed";
      case "in_progress": return "planned";
      case "snagging": return "in_progress";
      case "completed": default: return "snagging";
    }
  }
  function labelFor(s: JobStatus) {
    switch (s) {
      case "planned": return "Planned";
      case "in_progress": return "In Progress";
      case "snagging": return "Snagging";
      case "completed": return "Completed";
    }
  }
  const _dotColor = (s: JobStatus) => {
    switch (s) {
      case "planned": return theme.colors.textSubtle;
      case "in_progress": return theme.colors.accent;
      case "snagging": return theme.colors.warn;
      case "completed": return theme.colors.accentAlt;
      default: return theme.colors.textSubtle;
    }
  };

  // Cycling effect - independent of clickable status
  useEffect(() => {
    if (!enableCycling || isHovered) return;
    
    const interval = setInterval(() => {
      setCurrentStatus(prev => nextStatus(prev));
    }, cycleInterval);

    return () => clearInterval(interval);
  }, [enableCycling, cycleInterval, isHovered]);

  // Reset to actual status when not cycling or when status prop changes
  useEffect(() => {
    if (!enableCycling) {
      setCurrentStatus(status);
    }
  }, [status, enableCycling]);

  // Initialize currentStatus with the prop status
  useEffect(() => {
    setCurrentStatus(status);
  }, [status]);

  const _getGlassmorphicClass = (s: JobStatus): string => {
    switch (s) {
      case "planned": return "glassmorphic-planned";        // Yellow - for scheduled/planned jobs
      case "in_progress": return "glassmorphic-installing"; // Cyan - for active work
      case "snagging": return "glassmorphic-pending";       // Purple - for snagging/quality issues
      case "completed": return "glassmorphic-completed";    // Green - for finished jobs
      default: return "glassmorphic-planned";
    }
  }

  async function updateStatus(next: JobStatus) {
    if (!hasValidId) return;
    onStatusChange?.(next); // optimistic
    const { error } = await supabase.from("jobs").update({ status: next }).eq("id", jobId!);
    if (error) {
      onStatusChange?.(status); // revert if parent supplied state handler
      alert("Couldn't update status: " + error.message);
    }
  }

  async function handleClick(e: React.MouseEvent) {
    if (!clickable) return;
    const next = e.shiftKey ? prevStatus(status) : nextStatus(status);
    setCurrentStatus(next); // Update display immediately
    await updateStatus(next);
  }

  const displayStatus = enableCycling ? currentStatus : status;

  return (
    <div
      className={`status-pill ${displayStatus} ${clickable ? 'interactive' : 'static'} ${isHovered ? 'expanded' : ''}`}
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      title={
        clickable
          ? "Click to change status (Shift+Click for previous)"
          : hasValidId ? "No permission" : "Job id not ready yet"
      }
      style={{
        cursor: clickable ? "pointer" : "default",
        opacity: clickable ? 1 : 0.7,
      }}
    >
      <div className="pill-content">
        <span className="status-text">{labelFor(displayStatus)}</span>
      </div>

      <style jsx>{`
        .status-pill {
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 6px 16px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          user-select: none;
          overflow: hidden;
        }

        .status-pill::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(135deg,
            rgba(255, 255, 255, 0.1) 0%,
            rgba(255, 255, 255, 0.05) 100%);
          border-radius: inherit;
          transition: opacity 0.3s ease;
        }

        .pill-content {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .status-text {
          white-space: nowrap;
        }

        /* Status-specific styles */
        .status-pill.planned {
          background: rgba(251, 191, 36, 0.15);
          color: #fbbf24;
          border-color: rgba(251, 191, 36, 0.3);
        }

        .status-pill.in_progress {
          background: rgba(6, 182, 212, 0.15);
          color: #06b6d4;
          border-color: rgba(6, 182, 212, 0.3);
        }

        .status-pill.snagging {
          background: rgba(168, 85, 247, 0.15);
          color: #a855f7;
          border-color: rgba(168, 85, 247, 0.3);
        }

        .status-pill.completed {
          background: rgba(34, 197, 94, 0.15);
          color: #22c55e;
          border-color: rgba(34, 197, 94, 0.3);
        }

        /* Interactive states */
        .status-pill.interactive:hover {
          transform: translateY(-1px);
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
        }

        .status-pill.interactive:hover::before {
          opacity: 0.8;
        }

        .status-pill.interactive:active {
          transform: translateY(0);
        }

        /* Expanded state for future use */
        .status-pill.expanded {
          border-radius: 12px;
          padding: 8px 20px;
        }

        /* Add subtle glow effect */
        .status-pill.planned:hover {
          box-shadow: 0 0 20px rgba(251, 191, 36, 0.3);
        }

        .status-pill.in_progress:hover {
          box-shadow: 0 0 20px rgba(6, 182, 212, 0.3);
        }

        .status-pill.snagging:hover {
          box-shadow: 0 0 20px rgba(168, 85, 247, 0.3);
        }

        .status-pill.completed:hover {
          box-shadow: 0 0 20px rgba(34, 197, 94, 0.3);
        }
      `}</style>
    </div>
  );
}