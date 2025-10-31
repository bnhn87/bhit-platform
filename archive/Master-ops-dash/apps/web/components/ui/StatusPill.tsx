/**
 * StatusPill — Glassmorphic neon pill (benchmark‑matched)
 *
 * Locked behavior:
 *  - Click            → advance status
 *  - Alt/Ctrl/Cmd+Click → revert status
 *  - Single control only (no multi-buttons)
 *
 * Visuals:
 *  - Glassmorphic capsule with toned outer glow and soft inner highlight.
 *  - Uses styled‑jsx so the CSS exactly matches your HTML benchmark.
 *  - No inner ring; just a tiny dot + text.
 *
 * Safe defaults:
 *  - If theme isn't wired, fall back to hard-coded colors.
 */

import React from "react";
import { theme } from "../../lib/theme";

export type JobStatus = "planned" | "in_progress" | "snagging" | "completed";

type Props = {
  value: JobStatus;
  onChange?: (next: JobStatus) => void;
  /** Optional override for order */
  sequence?: JobStatus[];
  /** Optional label overrides */
  labels?: Partial<Record<JobStatus, string>>;
  title?: string;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
};

const ORDER: JobStatus[] = ["planned", "in_progress", "snagging", "completed"];

// Benchmark tones
const tone = {
  installing: "#00dfff",
  planned: "#ffcc00",
  completed: "#4caf50",
  snagging: theme?.colors?.brand ?? "#ff9900",
  text: theme?.colors?.text ?? "#e8eef6",
};

export default function StatusPill({
  value,
  onChange,
  sequence = ORDER,
  labels,
  title,
  disabled,
  size = "md",
}: Props) {
  const i = sequence.indexOf(value);
  const next = (i >= 0 ? sequence[Math.min(i + 1, sequence.length - 1)] : sequence[0]) as JobStatus;
  const prev = (i >= 0 ? sequence[Math.max(i - 1, 0)] : sequence[0]) as JobStatus;

  const label =
    labels?.[value] ??
    ({
      planned: "Planned",
      in_progress: "Installing",
      snagging: "Snagging",
      completed: "Completed",
    } as Record<JobStatus, string>)[value];

  const cls =
    value === "in_progress"
      ? "status-installing"
      : value === "planned"
      ? "status-planned"
      : value === "completed"
      ? "status-completed"
      : "status-snagging";

  const sizes = {
    sm: { padY: 6, padX: 12, font: 12, dot: 6 },
    md: { padY: 8, padX: 14, font: 13.5, dot: 7 },
    lg: { padY: 10, padX: 18, font: 15, dot: 8 },
  }[size];

  function handleMouseDown(e: React.MouseEvent<HTMLButtonElement>) {
    if (disabled) return;
    const goPrev = e.altKey || e.ctrlKey || e.metaKey;
    const target = goPrev ? prev : next;
    if (onChange && target !== value) onChange(target);
  }

  return (
    <button
      type="button"
      title={title ?? hint(sequence, value)}
      className={`status-pill ${cls}`}
      disabled={!!disabled}
      onMouseDown={handleMouseDown}
      style={{
        padding: `${sizes.padY}px ${sizes.padX}px`,
        fontSize: sizes.font,
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <span className="dot" style={{ width: sizes.dot, height: sizes.dot }} />
      {label}

      <style jsx>{`
        .status-pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          border-radius: 999px;
          font-weight: 700;
          letter-spacing: 0.2px;
          line-height: 1;
          color: ${tone.text};
          cursor: ${disabled ? "not-allowed" : "pointer"};
          white-space: nowrap;

          /* Glass base + border */
          background: rgba(255, 255, 255, 0.08);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.1);

          /* Soft inner highlight */
          box-shadow: inset 0 1px 2px rgba(255, 255, 255, 0.12);

          transition: box-shadow 0.25s cubic-bezier(0.25, 0.8, 0.25, 1), transform 0.06s ease;
        }

        .status-pill .dot {
          display: inline-block;
          border-radius: 999px;
          opacity: 0.95;
          box-shadow: 0 0 6px currentColor;
        }

        /* Variants (outer glow toned to match benchmark) */
        .status-installing {
          color: ${tone.installing};
          box-shadow: 0 0 10px 2px rgba(0, 223, 255, 0.25), inset 0 1px 2px rgba(255, 255, 255, 0.1);
        }
        .status-planned {
          color: ${tone.planned};
          box-shadow: 0 0 10px 2px rgba(255, 204, 0, 0.25), inset 0 1px 2px rgba(255, 255, 255, 0.1);
        }
        .status-completed {
          color: ${tone.completed};
          box-shadow: 0 0 10px 2px rgba(76, 175, 80, 0.25), inset 0 1px 2px rgba(255, 255, 255, 0.1);
        }
        .status-snagging {
          color: ${tone.snagging};
          box-shadow: 0 0 10px 2px rgba(255, 153, 0, 0.25), inset 0 1px 2px rgba(255, 255, 255, 0.1);
        }

        /* Hover pulse (subtle) */
        .status-pill:hover {
          box-shadow: 0 0 14px 4px currentColor, inset 0 1px 2px rgba(255, 255, 255, 0.15);
        }

        /* Press feedback — keeps capsule (no inner ring) */
        .status-pill:active {
          transform: translateY(1px);
          box-shadow: 0 0 6px 1px rgba(128, 128, 128, 0.2), inset 0 1px 2px rgba(0, 0, 0, 0.12);
          background: rgba(255, 255, 255, 0.05);
          border-color: rgba(255, 255, 255, 0.08);
        }

        @media (prefers-reduced-motion: reduce) {
          .status-pill {
            transition: none;
          }
        }
      `}</style>
    </button>
  );
}

function hint(seq: JobStatus[], current: JobStatus) {
  const i = seq.indexOf(current);
  const nice = (s: string) => s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const n = i >= 0 && i < seq.length - 1 ? nice(seq[i + 1]) : nice(seq[Math.max(i, 0)]);
  const p = i > 0 ? nice(seq[i - 1]) : nice(seq[Math.max(i, 0)]);
  return `Click → ${n}. Alt/Ctrl/Cmd+Click → ${p}.`;
}
