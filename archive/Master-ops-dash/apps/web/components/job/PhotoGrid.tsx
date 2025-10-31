// apps/web/components/job/PhotoGrid.tsx
import { panelStyle, theme } from "../../lib/theme";

export default function PhotoGrid({
  items,
  onDelete
}: {
  items: { name: string; url: string }[];
  onDelete?: (name: string) => void;
}) {
  return (
    <div style={{ ...panelStyle, padding: 16 }}>
      <div style={{ fontWeight: 600, marginBottom: 10 }}>Photos</div>
      {items.length === 0 ? (
        <div style={{ color: theme.colors.subtext, fontSize: 14 }}>No photos yet.</div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
            gap: 10
          }}
        >
          {items.map((img) => (
            <div key={img.name} style={{ position: "relative", borderRadius: 8, overflow: "hidden", border: `1px solid ${theme.colors.panelBorder}` }}>
              <img src={img.url} alt={img.name} style={{ width: "100%", height: 100, objectFit: "cover", display: "block" }} />
              {onDelete && (
                <button
                  onClick={() => onDelete(img.name)}
                  style={{
                    position: "absolute",
                    top: 6,
                    right: 6,
                    padding: "4px 6px",
                    fontSize: 12,
                    background: "#111823",
                    border: `1px solid ${theme.colors.panelBorder}`,
                    color: theme.colors.text,
                    borderRadius: 6,
                    cursor: "pointer"
                  }}
                >
                  Delete
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
