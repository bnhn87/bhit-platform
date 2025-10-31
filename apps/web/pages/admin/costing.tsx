// apps/web/pages/admin/costing.tsx
import { useEffect, useState } from "react";

import CostControlPanel from "../../components/CostControlPanel";
import { useHasCostAccess } from "../../hooks/useHasCostAccess";
import { useRequireAuth } from "../../hooks/useRequireAuth";
import { supabase } from "../../lib/supabaseClient";
import { theme } from "../../lib/theme";

type Job = { id: string; title: string; client_name: string | null; status: string; created_at: string };

export default function CostingAdmin() {
  useRequireAuth();
  const { allowed, loading } = useHasCostAccess();

  const [jobs, setJobs] = useState<Job[]>([]);
  const [selected, setSelected] = useState<string>("");

  useEffect(() => {
    if (loading || !allowed) return;
    (async () => {
      const { data } = await supabase
        .from("jobs")
        .select("id,title,client_name,status,created_at")
        .order("created_at", { ascending: false })
        .limit(100);
      setJobs(data || []);
      if (data && data.length && !selected) setSelected(data[0].id);
    })();
  }, [allowed, loading, selected]);

  if (loading) return <div style={{ padding: 16 }}>Checking access...</div>;
  if (!allowed) return <div style={{ padding: 16, color: theme.colors.danger }}>Not authorised.</div>;

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ padding: 16 }}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>Costing Admin</div>
        <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 10, alignItems: "center" }}>
          <div style={{ fontSize: 12, color: theme.colors.textSubtle }}>Select job</div>
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            style={{
              padding: "10px 12px",
              background: "#111823",
              border: `1px solid ${theme.colors.border}`,
              color: theme.colors.text,
              borderRadius: 8,
              minWidth: 320
            }}
          >
            {jobs.map((j) => (
              <option key={j.id} value={j.id}>
                {j.title} — {j.client_name ?? "—"} ({new Date(j.created_at).toLocaleDateString()})
              </option>
            ))}
          </select>
        </div>
      </div>

      {selected && <CostControlPanel jobId={selected} />}
    </div>
  );
}
