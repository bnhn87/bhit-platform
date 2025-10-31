import Link from "next/link";
import React from "react";

import { theme } from "../../lib/theme";

import StatusPill, { JobStatus } from "./StatusPill";

export interface JobTile {
  id: string;
  title: string;
  client_name: string | null;
  status: JobStatus;
  created_at: string;
  reference?: string | null;
  percent_complete?: number;
  priority?: "low" | "medium" | "high";
  deadline?: string | null;
}

interface JobCardProps {
  job: JobTile;
  canManage: boolean;
  onChangeStatus: (id: string, newStatus: JobStatus) => void;
  onClick?: () => void;
  showDetails?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export default function JobCard({
  job,
  canManage,
  onChangeStatus,
  onClick,
  showDetails = true,
  className,
  style
}: JobCardProps) {
  const handleCardClick = (e: React.MouseEvent) => {
    // Don't trigger card click if clicking on status pill
    if ((e.target as HTMLElement).closest('button')) {
      return;
    }
    onClick?.();
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case "high": return theme.colors.danger;
      case "medium": return theme.colors.warn;
      case "low": return theme.colors.textSubtle;
      default: return theme.colors.textSubtle;
    }
  };

  const isOverdue = job.deadline && new Date(job.deadline) < new Date();

  return (
    <div
      className={className}
      style={{
        border: `1px solid ${theme.colors.border}`,
        background: theme.colors.panel,
        padding: 16,
        borderRadius: 12,
        display: "grid",
        gap: 10,
        cursor: onClick ? "pointer" : "default",
        transition: "all 0.2s ease",
        position: "relative",
        ...style
      }}
      onClick={handleCardClick}
      onMouseEnter={(e) => {
        if (onClick) {
          e.currentTarget.style.borderColor = theme.colors.accent;
          e.currentTarget.style.transform = "translateY(-1px)";
          e.currentTarget.style.boxShadow = theme.shadow;
        }
      }}
      onMouseLeave={(e) => {
        if (onClick) {
          e.currentTarget.style.borderColor = theme.colors.border;
          e.currentTarget.style.transform = "translateY(0)";
          e.currentTarget.style.boxShadow = "none";
        }
      }}
    >
      {/* Priority indicator */}
      {job.priority && job.priority !== "low" && (
        <div
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: getPriorityColor(job.priority)
          }}
          title={`${job.priority} priority`}
        />
      )}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <Link
            href={`/job/${job.id}`}
            style={{ 
              color: theme.colors.text, 
              textDecoration: "none", 
              fontWeight: 700,
              fontSize: 16,
              display: "block",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {job.title}
          </Link>
          
          {job.reference && (
            <div style={{ 
              fontSize: 11, 
              color: theme.colors.textSubtle,
              marginTop: 2
            }}>
              Ref: {job.reference}
            </div>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {typeof job.percent_complete === "number" && (
            <div style={{
              fontSize: 11,
              color: theme.colors.textSubtle,
              whiteSpace: "nowrap"
            }}>
              {job.percent_complete}%
            </div>
          )}
          
          <StatusPill
            status={job.status}
            jobId={job.id}
            canManage={canManage}
            onStatusChange={canManage ? (newStatus) => onChangeStatus(job.id, newStatus) : undefined}
          />
        </div>
      </div>

      {showDetails && (
        <div style={{ 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "space-between",
          color: theme.colors.textSubtle, 
          fontSize: 12 
        }}>
          <div>
            {job.client_name ?? "—"} • {new Date(job.created_at).toLocaleDateString()}
          </div>
          
          {job.deadline && (
            <div style={{ 
              color: isOverdue ? theme.colors.danger : theme.colors.textSubtle,
              fontWeight: isOverdue ? 600 : 400
            }}>
              Due: {new Date(job.deadline).toLocaleDateString()}
              {isOverdue && " (Overdue)"}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export type { JobCardProps };
