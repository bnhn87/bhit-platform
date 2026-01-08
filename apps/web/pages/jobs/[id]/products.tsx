import Link from "next/link";
import { useRouter } from "next/router";
import { useMemo } from "react";

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
const tile: React.CSSProperties = {
  background: "#0f151c",
  border: "1px solid #1d2733",
  borderRadius: 14,
  padding: 16,
};

export default function JobProductsPage() {
  const r = useRouter();
  const jobId = (r.query.id as string) || "";
  const activePath = r.asPath;

  const tabs = useMemo(
    () => {
      if (!jobId) return [];
      return [
        { label: "Overview", href: `/jobs/${jobId}`, active: activePath === `/jobs/${jobId}` },
        { label: "Floor Plan", href: `/jobs/${jobId}/floorplan`, active: activePath.startsWith(`/jobs/${jobId}/floorplan`) },
        { label: "Documents", href: `/jobs/${jobId}/documents`, active: activePath.startsWith(`/jobs/${jobId}/documents`) },
        { label: "Products", href: `/jobs/${jobId}/products`, active: true },
      ];
    },
    [activePath, jobId]
  );

  async function share() {
    const url = `${window.location.origin}/jobs/${jobId}/products`;
    try {
      if ((navigator as unknown as { share?: (data: { title: string; url: string }) => Promise<void> }).share) {
        await (navigator as unknown as { share: (data: { title: string; url: string }) => Promise<void> }).share({ title: "Job Products", url });
      }
      else {
        await navigator.clipboard.writeText(url);
        alert("Link copied.");
      }
    } catch {
      await navigator.clipboard.writeText(url);
      alert("Link copied.");
    }
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {tabs.map((t) => (
          <Link key={t.href} href={t.href} style={tabLink(t.active)}>
            {t.label}
          </Link>
        ))}
        <span style={{ marginLeft: "auto" }} />
        <Link href="/jobs" style={btn(false)}>
          Back to Jobs
        </Link>
        <button onClick={share} style={btn(false)}>
          Share
        </button>
      </div>

      <div style={tile}>
        {/* TODO: connect Smart Quote output / product lines */}
        <div style={{ opacity: 0.85 }}>Products module — show parsed items / quantities here.</div>
      </div>
    </div>
  );
}
