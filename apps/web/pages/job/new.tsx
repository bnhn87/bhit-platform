// apps/web/pages/job/new.tsx
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

import { useRequireAuth } from "../../hooks/useRequireAuth";
import { useUserRole } from "../../hooks/useUserRole";
import { supabase } from "../../lib/supabaseClient";
import { theme } from "../../lib/theme";
import { JobPayload } from "../../lib/types";

type NewJob = {
  title: string;
  client_name: string;
  reference: string;
  status: "planned" | "in_progress" | "completed" | "snagging";
  location_x?: number | null;
  location_y?: number | null;
};

export default function NewJobPage() {
  useRequireAuth();
  const { role } = useUserRole();
  const canManage = role === "director" || role === "ops";

  const router = useRouter();
  const [f, setF] = useState<NewJob>({
    title: "",
    client_name: "",
    reference: "",
    status: "planned",
    location_x: null,
    location_y: null
  });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!canManage) setMsg("You do not have permission to create jobs.");
  }, [canManage]);

  async function getAccountIdForUser(userId: string): Promise<string | null> {
    const { data, error } = await supabase
      .from("users")
      .select("account_id")
      .eq("id", userId)
      .limit(1)
      .single();
    if (error) {
      // console.error("Failed to fetch account_id:", error);
      return null;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data as unknown as { account_id?: string })?.account_id ?? null;
  }

  async function submit() {
    setMsg(null);
    if (!canManage) {
      setMsg("You do not have permission to create jobs.");
      return;
    }
    if (!f.title.trim()) {
      setMsg("Title is required.");
      return;
    }

    setBusy(true);

    // Resolve current user
    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData?.user) {
      setBusy(false);
      setMsg("Could not resolve the current user session.");
      return;
    }
    const userId = userData.user.id;

    // Resolve account_id from public.users (RLS predicates rely on this)
    const accountId = await getAccountIdForUser(userId);
    if (!accountId) {
      setBusy(false);
      setMsg("Your account could not be determined. Please ensure your user has an account_id.");
      return;
    }

    const payload: JobPayload = {
      title: f.title.trim(),
      client_name: f.client_name.trim() || null,
      reference: f.reference.trim() || null,
      status: f.status,
      location_x: f.location_x ?? null,
      location_y: f.location_y ?? null,
      created_by: userId,
      account_id: accountId
    };

    const { data, error } = await supabase
      .from("jobs")
      .insert(payload)
      .select("id")
      .single();

    setBusy(false);

    if (error) {
      // console.error("Insert jobs error:", error);
      setMsg(error.message || "Insert failed due to security policy or missing fields.");
      return;
    }

    const id = data?.id as string | undefined;
    if (id) router.replace(`/job/${id}`);
    else setMsg("Created, but could not resolve new Job ID.");
  }

  function inputStyle(extra?: React.CSSProperties): React.CSSProperties {
    return {
      padding: "10px 12px",
      background: "#111823",
      border: `1px solid ${theme.colors.border}`,
      color: theme.colors.text,
      borderRadius: 8,
      ...(extra || {})
    };
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ fontWeight: 800, fontSize: 24, letterSpacing: 0.2 }}>New Job</div>

      <div style={{ padding: 16, opacity: canManage ? 1 : 0.6 }}>
        <div style={{ display: "grid", gap: 12, maxWidth: 720 }}>
          <Field label="Title">
            <input
              value={f.title}
              onChange={(e) => setF({ ...f, title: e.target.value })}
              placeholder="Project / Site name"
              style={inputStyle()}
              disabled={!canManage || busy}
            />
          </Field>
          <Field label="Client">
            <input
              value={f.client_name}
              onChange={(e) => setF({ ...f, client_name: e.target.value })}
              placeholder="Client name"
              style={inputStyle()}
              disabled={!canManage || busy}
            />
          </Field>
          <Field label="Reference">
            <input
              value={f.reference}
              onChange={(e) => setF({ ...f, reference: e.target.value })}
              placeholder="Internal ref (optional)"
              style={inputStyle()}
              disabled={!canManage || busy}
            />
          </Field>
          <Field label="Status">
            <select
              value={f.status}
              onChange={(e) => setF({ ...f, status: e.target.value as NewJob["status"] })}
              style={inputStyle()}
              disabled={!canManage || busy}
            >
              <option value="planned">Planned</option>
              <option value="in_progress">In Progress</option>
              <option value="snagging">Snagging</option>
              <option value="completed">Completed</option>
            </select>
          </Field>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Map X (0–100)">
              <input
                type="number"
                min={0}
                max={100}
                value={f.location_x ?? ""}
                onChange={(e) =>
                  setF({ ...f, location_x: e.target.value === "" ? null : Math.max(0, Math.min(100, Number(e.target.value))) })
                }
                placeholder="Optional"
                style={inputStyle({ textAlign: "right" })}
                disabled={!canManage || busy}
              />
            </Field>
            <Field label="Map Y (0–100)">
              <input
                type="number"
                min={0}
                max={100}
                value={f.location_y ?? ""}
                onChange={(e) =>
                  setF({ ...f, location_y: e.target.value === "" ? null : Math.max(0, Math.min(100, Number(e.target.value))) })
                }
                placeholder="Optional"
                style={inputStyle({ textAlign: "right" })}
                disabled={!canManage || busy}
              />
            </Field>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={submit}
              disabled={!canManage || busy}
              style={{
                padding: "10px 14px",
                background: theme.colors.accent,
                color: "white",
                border: 0,
                borderRadius: 8,
                cursor: !canManage || busy ? "not-allowed" : "pointer",
                opacity: !canManage || busy ? 0.7 : 1
              }}
            >
              Create Job
            </button>
            <button
              onClick={() => router.back()}
              style={{
                padding: "10px 14px",
                borderRadius: 8,
                border: `1px solid ${theme.colors.border}`,
                background: "#0f151c",
                color: theme.colors.text
              }}
            >
              Cancel
            </button>
            {msg && <div style={{ alignSelf: "center", color: theme.colors.textSubtle }}>{msg}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 10, alignItems: "center" }}>
      <div style={{ fontSize: 12, color: theme.colors.textSubtle }}>{label}</div>
      {children}
    </div>
  );
}
