// apps/web/components/MetricCard.tsx
import { panelStyle, theme } from "../lib/theme";

export default function MetricCard({
  title,
  value,
  hint
}: {
  title: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div
      style={{
        ...panelStyle,
        padding: 20,
        display: "flex",
        flexDirection: "column",
        minHeight: 120
      }}
    >
      <div style={{ fontSize: 13, color: theme.colors.subtext }}>{title}</div>
      <div style={{ fontSize: 28, fontWeight: 700, marginTop: 6 }}>{value}</div>
      {hint && <div style={{ fontSize: 12, color: theme.colors.subtext, marginTop: 8 }}>{hint}</div>}
    </div>
  );
}
