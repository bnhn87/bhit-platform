export const theme = {
  colors: {
    bg: "#050505", // Deepest black/void for high contrast
    background: "#050505",
    panel: "#0f1115", // Very subtle off-black
    panelAlt: "#14161a",
    border: "#262626", // Dark grey border
    text: "#ffffff",
    textSubtle: "#a3a3a3",
    accent: "#f97316", // BHi Brand Orange (Safety/Industrial)
    accentAlt: "#22c55e", // Success Green
    warn: "#f59e0b",
    danger: "#ef4444",
    error: "#ef4444",
    success: "#22c55e",
    info: "#3b82f6",
    muted: "#1f2937"
  },
  radii: { xs: 4, sm: 6, md: 8, lg: 12, xl: 16, full: 9999 }, // Slightly sharper, more industrial approach
  spacing: (n: number) => `${n * 4}px`,
  shadow: "0 4px 20px rgba(0,0,0,0.5)" // Deeper, heavier shadows
} as const;
