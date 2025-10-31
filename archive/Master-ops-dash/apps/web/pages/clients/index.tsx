import { panelStyle, theme } from "../../lib/theme";

export default function Clients() {
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ ...panelStyle, padding: 16 }}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>Clients</div>
        <div style={{ color: theme.colors.subtext }}>
          Client management list (hook up to data when ready).
        </div>
      </div>
    </div>
  );
}
