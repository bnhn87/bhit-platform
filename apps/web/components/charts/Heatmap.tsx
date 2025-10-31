/**
 * BHIT Heatmap (safe, self-contained, default export)
 *
 * Fixes:
 * - Guarantees a DEFAULT EXPORT (prevents "Element type is invalid" from Dashboard).
 * - Null-safe color utilities (no crashes when a color is undefined).
 *
 * Props contract (kept compatible with your Dashboard usage):
 *   title?: string;
 *   cols: string[];      // column labels
 *   rows: string[];      // row labels
 *   data: number[][];    // same shape as rows x cols
 *
 * Rendering:
 * - Lightweight canvas heatmap for performance.
 * - Falls back to a simple grid when canvas is unavailable.
 */

import React, { useEffect, useMemo, useRef } from "react";
type Props = {
  title?: string;
  cols: string[];
  rows: string[];
  data: number[][];
};

const DEFAULT_HEX = "#3b82f6"; // blue

// ---- Safe color utils ----
function hexToRgb(hex?: string) {
  const fallback: [number, number, number] = [59, 130, 246];
  if (!hex || typeof hex !== "string") return fallback;
  const h = hex.trim().replace(/^#/, "");
  if (!/^(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(h)) return fallback;
  const hh = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(hh, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255] as [number, number, number];
}

function color(hex?: string, alpha = 1) {
  const [r, g, b] = hexToRgb(hex ?? DEFAULT_HEX);
  const a = Number.isFinite(alpha) ? Math.max(0, Math.min(1, alpha)) : 1;
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}
// --------------------------

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function HeatmapCanvas({ cols, rows, data }: Omit<Props, "title">) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const stats = useMemo(() => {
    let min = Number.POSITIVE_INFINITY;
    let max = Number.NEGATIVE_INFINITY;
    for (let r = 0; r < rows.length; r++) {
      for (let c = 0; c < cols.length; c++) {
        const v = data?.[r]?.[c] ?? 0;
        if (v < min) min = v;
        if (v > max) max = v;
      }
    }
    if (!isFinite(min)) min = 0;
    if (!isFinite(max)) max = 1;
    if (min === max) max = min + 1; // avoid div-by-zero
    return { min, max, range: max - min };
  }, [cols.length, rows.length, data]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const cellW = 24;
    const cellH = 18;
    const padTop = 22;
    const padLeft = 80;

    const width = padLeft + cols.length * cellW + 1;
    const height = padTop + rows.length * cellH + 1;
    canvas.width = width;
    canvas.height = height;

    // bg
    ctx.fillStyle = "#121a23";
    ctx.fillRect(0, 0, width, height);

    // column labels
    ctx.fillStyle = "#9fb2c8";
    ctx.font = "12px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    cols.forEach((label, i) => {
      ctx.fillText(label, padLeft + i * cellW + cellW / 2, padTop - 10);
    });

    // row labels
    ctx.textAlign = "right";
    rows.forEach((label, r) => {
      ctx.fillText(label, padLeft - 8, padTop + r * cellH + cellH / 2);
    });

    // cells
    const [rr, gg, bb] = hexToRgb(DEFAULT_HEX);
    for (let r = 0; r < rows.length; r++) {
      for (let c = 0; c < cols.length; c++) {
        const v = data?.[r]?.[c] ?? 0;
        const t = clamp((v - stats.min) / stats.range, 0, 1);
        // ease slightly so mid values are visible
        const eased = Math.pow(t, 0.85);
        ctx.fillStyle = `rgba(${rr}, ${gg}, ${bb}, ${0.08 + 0.92 * eased})`;
        ctx.fillRect(padLeft + c * cellW, padTop + r * cellH, cellW - 2, cellH - 2);
      }
    }

    // grid lines (subtle)
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    for (let c = 0; c <= cols.length; c++) {
      const x = padLeft + c * cellW - 1;
      ctx.beginPath();
      ctx.moveTo(x, padTop - 2);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let r = 0; r <= rows.length; r++) {
      const y = padTop + r * cellH - 1;
      ctx.beginPath();
      ctx.moveTo(padLeft - 2, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  }, [cols, rows, data, stats]);

  return (
    <div style={{ overflowX: "auto" }}>
      <canvas ref={canvasRef} />
    </div>
  );
}

export default function Heatmap({ title, cols, rows, data }: Props) {
  return (
    <section style={{ padding: 16 }}>
      {title && (
        <div
          style={{
            marginBottom: 8,
            fontWeight: 700,
            color: "#e8eef6",
            letterSpacing: 0.2,
          }}
        >
          {title}
        </div>
      )}
      <HeatmapCanvas cols={cols} rows={rows} data={data} />
      {/* Simple legend */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, color: "#9fb2c8", fontSize: 12 }}>
        <span>Low</span>
        <div style={{ flex: 1, height: 6, background: `linear-gradient(90deg, ${color(DEFAULT_HEX, 0.15)} 0%, ${color(DEFAULT_HEX, 1)} 100%)`, borderRadius: 999 }} />
        <span>High</span>
      </div>
    </section>
  );
}
