export const theme = {
  colors: {
    bg: "var(--bg)",
    background: "var(--bg)",
    panel: "var(--panel)",
    panelAlt: "var(--panel-2)",
    border: "var(--border)",
    text: "var(--text)",
    textSubtle: "var(--muted)",
    accent: "var(--accent)",
    accentAlt: "var(--info)", // Preserving Blue as alternate accent
    warn: "var(--warn)",
    danger: "var(--bad)",
    error: "var(--bad)",
    success: "var(--ok)",
    info: "var(--info)",
    muted: "var(--muted)"
  },
  radii: { xs: 4, sm: 4, md: 8, lg: 12, xl: 16, full: 9999 },
  spacing: (n: number) => `${n * 4}px`,
  shadow: "var(--shadow)"
} as const;
