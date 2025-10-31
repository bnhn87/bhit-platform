import Link from 'next/link';
// at the top of your component's return, before the planner panel:
const activePath = r.asPath;
const tabs = [
  { label: "Overview", href: `/job/${jobId}`, active: activePath === `/job/${jobId}` },
  { label: "Floor Plan", href: `/job/${jobId}/floorplan`, active: true },
  { label: "Documents", href: `/job/${jobId}/documents`, active: false },
  { label: "Products", href: `/job/${jobId}/products`, active: false },
];

const tabLink = (active: boolean): React.CSSProperties => ({
  padding: "8px 12px",
  borderRadius: 8,
  border: "1px solid #1d2733",
  background: active ? "#141d29" : "#0b1118",
  color: "#e8eef6",
  textDecoration: "none",
  fontWeight: active ? 800 : 700,
});
const btn = (solid = false): React.CSSProperties => ({
  padding: "10px 14px",
  borderRadius: 10,
  border: solid ? "1px solid #196ed1" : "1px solid #1d2733",
  background: solid ? "#1d91ff" : "#0f151c",
  color: solid ? "#fff" : "#e8eef6",
  fontWeight: 800,
  textDecoration: "none",
  cursor: "pointer",
});

// then render:
<div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
  {tabs.map((t) => (
    <Link key={t.href} href={t.href} style={tabLink(t.active)}>
      {t.label}
    </Link>
  ))}
  <span style={{ marginLeft: "auto" }} />
  <Link href="/jobs" style={btn(false)}>Back to Jobs</Link>
  <button
    onClick={async () => {
      const url = `${window.location.origin}/job/${jobId}/floorplan`;
      try {
        if ((navigator as any).share) await (navigator as any).share({ title: "Job Floor Plan", url });
        else { await navigator.clipboard.writeText(url); alert("Link copied."); }
      } catch { await navigator.clipboard.writeText(url); alert("Link copied."); }
    }}
    style={btn(false)}
  >
    Share
  </button>
</div>
