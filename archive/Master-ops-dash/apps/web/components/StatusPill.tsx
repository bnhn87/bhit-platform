import React from "react";
import { theme } from "@/lib/theme";

export type JobStatus = "planned" | "in_progress" | "snagging" | "completed";

const statusMeta: Record<
  JobStatus,
  { label: string; bg: string; dot: string; border: string }
> = {
  planned: {
    label: "Planned",
    bg: "rgba(245, 158, 11, 0.12)",
    dot: theme.colors.warning,
    border: theme.colors.panelBorder,
  },
  in_progress: {
    label: "Installing",
    bg: "rgba(59, 130, 246, 0.14)",
    dot: theme.colors.accent,
    border: theme.colors.panelBorder,
  },
  snagging: {
    label: "Snagging",
    bg: "rgba(245, 158, 11, 0.18)",
    dot: theme.colors.brand ?? theme.colors.warning,
    border: theme.colors.panelBorder,
  },
  completed: {
    label: "Completed",
    bg: "rgba(22, 163, 74, 0.14)",
    dot: theme.colors.success,
    border: theme.colors.panelBorder,
  },
};

type Props = {
  value: JobStatus;
  onClick?: () => void;
  size?: "sm" | "md";
  title?: string;
};

export default function StatusPill({ value, onClick, size = "md", title }: Props) {
  const m = statusMeta[value];
  const padY = size === "sm" ? 6 : 8;
  const padX = size === "sm" ? 10 : 12;
  const font = size === "sm" ? 12 : 13;

  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: `${padY}px ${padX}px`,
        background: m.bg,
        color: theme.colors.text,
        border: `1px solid ${m.border}`,
        borderRadius: 999,
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06), 0 6px 18px rgba(0,0,0,0.35)",
        fontSize: font,
        fontWeight: 600,
        letterSpacing: 0.2,
        cursor: onClick ? "pointer" : "default",
        transition: "transform .12s ease, border-color .12s ease",
      }}
      onMouseDown={(e) => onClick && e.currentTarget.classList.add("pill-press")}
      onMouseUp={(e) => onClick && e.currentTarget.classList.remove("pill-press")}
      onMouseLeave={(e) => onClick && e.currentTarget.classList.remove("pill-press")}
      className="status-pill"
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: 8,
          background: m.dot,
          boxShadow: "0 0 0 2px rgba(0,0,0,0.25) inset",
        }}
      />
      {m.label}
      <style jsx>{`
        .status-pill:active,
        .pill-press {
          transform: scale(0.98);
          border-color: ${theme.colors.brand ?? theme.colors.accent};
        }
      `}</style>
    </button>
  );
}
