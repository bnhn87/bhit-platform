export const theme = {
  colors: {
    bg: "#0e141b",
    panel: "#121a23",
    panelAlt: "#0b1117",
    border: "#1d2733",
    text: "#e8eef6",
    textSubtle: "#9fb2c8",
    accent: "#3b82f6",
    accentAlt: "#22c55e",
    warn: "#f59e0b",
    danger: "#ef4444",
    muted: "#223041"
  },
  radii: { xs: 6, sm: 8, md: 12, lg: 16, xl: 20 },
  spacing: (n: number) => `${n * 4}px`,
  shadow: "0 6px 24px rgba(0,0,0,0.25)"
} as const;
