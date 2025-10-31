import { panelStyle, theme } from "../lib/theme";

export default function MapPanel({
  pins
}: {
  pins: { id: string; x: number; y: number; title: string }[];
}) {
  return (
    <div style={{ ...panelStyle, padding: 12, height: 300, position: "relative", overflow: "hidden" }}>
      <div style={{ fontWeight: 600, marginBottom: 6, paddingLeft: 4 }}>Jobs Map (mock)</div>
      <div
        style={{
          position: "absolute",
          inset: 12,
          borderRadius: 10,
          border: `1px solid ${theme.colors.panelBorder}`,
          background:
            "linear-gradient(0deg, rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)",
          backgroundSize: "24px 24px"
        }}
      />
      {pins.map((p) => (
        <div
          key={p.id}
          title={p.title}
          style={{
            position: "absolute",
            left: `${Math.max(0, Math.min(100, p.x))}%`,
            top: `${Math.max(0, Math.min(100, p.y))}%`,
            transform: "translate(-50%, -50%)",
            display: "flex",
            alignItems: "center",
            gap: 6
          }}
        >
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: 99,
              background: theme.colors.brand,
              boxShadow: "0 0 0 3px rgba(245,158,11,0.25)"
            }}
          />
          <div
            style={{
              fontSize: 12,
              padding: "4px 6px",
              borderRadius: 6,
              background: "#111823",
              border: `1px solid ${theme.colors.panelBorder}`
            }}
          >
            {p.title}
          </div>
        </div>
      ))}
    </div>
  );
}
