export const theme = {
  colors: {
    bg: "#0a0e17", // BHi Concept Background
    background: "#0a0e17",
    panel: "#1a202c", // BHi Concept Inactive/Panel
    panelAlt: "#141824",
    border: "#262626", // Dark grey border
    text: "#ffffff",
    textSubtle: "#a3a3a3",
    accent: "#f38b00", // BHi Concept Orange
    accentAlt: "#3182ce", // BHi Concept Active Blue
    warn: "#f59e0b",
    danger: "#ef4444",
    error: "#ef4444",
    success: "#22c55e",
    info: "#3182ce", // BHi Concept Blue
    muted: "#4a5568" // BHi Toggle Inactive
  },
  radii: { xs: 4, sm: 4, md: 8, lg: 12, xl: 16, full: 9999 }, // Concept uses 4px button radius
  spacing: (n: number) => `${n * 4}px`,
  shadow: "0 4px 20px rgba(0,0,0,0.5)"
} as const;
