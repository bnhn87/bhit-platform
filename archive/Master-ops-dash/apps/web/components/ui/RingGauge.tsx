import { theme } from "../../lib/theme";

export default function RingGauge({ percent, size = 64 }: { percent: number; size?: number }) {
  const r = (size / 2) - 6;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(100, percent));
  const dash = (p / 100) * c;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size/2} cy={size/2} r={r} stroke={theme.colors.panelBorder} strokeWidth={6} fill="none" />
      <circle
        cx={size/2} cy={size/2} r={r}
        stroke={theme.colors.brand}
        strokeWidth={6}
        strokeDasharray={`${dash} ${c - dash}`}
        strokeLinecap="round"
        fill="none"
        transform={`rotate(-90 ${size/2} ${size/2})`}
      />
      <text
        x="50%" y="50%" dominantBaseline="middle" textAnchor="middle"
        fontSize={14} fill={theme.colors.text} fontWeight={700}
      >
        {Math.round(p)}%
      </text>
    </svg>
  );
}
