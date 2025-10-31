import { ReactNode } from "react";
import { panelStyle, theme } from "../../lib/theme";

export default function StatCard({
  title,
  value,
  right
}: {
  title: string;
  value: string | number;
  right?: ReactNode;
}) {
  return (
    <div style={{ ...panelStyle, padding: 16, display: "flex", alignItems: "center", gap: 12 }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12, color: theme.colors.subtext, marginBottom: 6 }}>
          {title.toUpperCase()}
        </div>
        <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: 0.2 }}>{value}</div>
      </div>
      {right && <div>{right}</div>}
    </div>
  );
}
