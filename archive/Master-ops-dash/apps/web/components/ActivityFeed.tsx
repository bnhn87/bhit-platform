import { panelStyle, theme } from "../lib/theme";

export default function ActivityFeed({
  title,
  rows
}: {
  title: string;
  rows: { id: string; text: string; occurred_at: string }[];
}) {
  return (
    <div style={{ ...panelStyle, padding: 16 }}>
      <div style={{ fontWeight: 600, marginBottom: 8 }}>{title}</div>
      {rows.length === 0 ? (
        <div style={{ color: theme.colors.subtext, fontSize: 14 }}>No recent activity.</div>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 10 }}>
          {rows.map((r) => (
            <li
              key={r.id}
              style={{
                display: "grid",
                gridTemplateColumns: "auto 1fr auto",
                gap: 10,
                padding: "10px 12px",
                border: `1px solid ${theme.colors.panelBorder}`,
                borderRadius: 10
              }}
            >
              <span
                aria-hidden
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 99,
                  background: theme.colors.brand,
                  alignSelf: "center"
                }}
              />
              <div>{r.text}</div>
              <div style={{ color: theme.colors.subtext, fontSize: 12 }}>
                {new Date(r.occurred_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
