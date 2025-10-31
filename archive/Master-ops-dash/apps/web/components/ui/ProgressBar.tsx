import { theme } from "../../lib/theme";

export default function ProgressBar({ value }: { value: number }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div style={{ width: 160, height: 10, borderRadius: 999, background: "#111823", border: `1px solid ${theme.colors.panelBorder}` }}>
      <div
        style={{
          width: `${v}%`,
          height: "100%",
          borderRadius: 999,
          background: theme.colors.accent
        }}
      />
    </div>
  );
}
