import { panelStyle, theme } from "../../lib/theme";

export default function BarChart({
  title,
  x,
  series
}: {
  title: string;
  x: string[];
  series: { name: string; data: number[] }[];
}) {
  const max = Math.max(1, ...series.flatMap((s) => s.data));
  const barW = 18;
  const gap = 8;
  const groupW = series.length * barW + (series.length - 1) * 6;
  const totalW = x.length * (groupW + gap) + gap;

  return (
    <div style={{ ...panelStyle, padding: 16 }}>
      <div style={{ fontWeight: 600, marginBottom: 8 }}>{title}</div>
      <div style={{ overflowX: "auto" }}>
        <div style={{ display: "grid", gridTemplateRows: "240px auto", gap: 8, minWidth: totalW }}>
          {/* Chart area */}
          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              height: 240,
              gap
            }}
          >
            {x.map((label, i) => (
              <div key={i} style={{ width: groupW, display: "flex", alignItems: "flex-end", gap: 6 }}>
                {series.map((s, si) => {
                  const v = s.data[i] ?? 0;
                  const h = Math.round((v / max) * 220);
                  const color =
                    si === 0 ? theme.colors.brand : theme.colors.accent;
                  return (
                    <div key={si} style={{ width: barW, height: h, background: color, borderRadius: 6 }} title={`${s.name}: ${v}`} />
                  );
                })}
              </div>
            ))}
          </div>
          {/* X labels */}
          <div style={{ display: "flex", gap, color: theme.colors.subtext, fontSize: 12 }}>
            {x.map((label, i) => (
              <div key={i} style={{ width: groupW, textAlign: "center" }}>{label}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
