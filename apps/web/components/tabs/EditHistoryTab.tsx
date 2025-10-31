/**
 * EditHistoryTab — Shows job edit history for directors
 *
 * Assumptions:
 * - Table: public.job_edit_history (id uuid, job_id uuid, user_id uuid, field_name text, old_value text, new_value text, created_at timestamptz)
 * - RLS allows select for directors, ops, and admin roles only
 */

import React from "react";

import { supabase } from "@/lib/supabaseClient";
import { theme } from "@/lib/theme";

type EditHistoryItem = {
  id: string;
  job_id: string;
  user_id: string;
  field_name: string;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
  users: {
    full_name: string | null;
  } | null;
};

type Props = { 
  jobId: string;
  canView: boolean; // Only directors, ops, and admin can view
};

export default function EditHistoryTab({ jobId, canView }: Props) {
  const [items, setItems] = React.useState<EditHistoryItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    let alive = true;
    
    (async () => {
      if (!canView) {
        setLoading(false);
        return;
      }
      
      setLoading(true);
      setErr(null);
      
      try {
        const { data, error } = await supabase
          .from("job_edit_history")
          .select(`
            *,
            users:user_id (full_name)
          `)
          .eq("job_id", jobId)
          .order("created_at", { ascending: false })
          .limit(100);
          
        if (!alive) return;
        
        if (error) {
          setErr(error.message);
          setItems([]);
        } else {
          setItems((data as EditHistoryItem[]) ?? []);
        }
      } catch (e: unknown) {
        if (!alive) return;
        setErr((e as Error).message || "Failed to load edit history");
        setItems([]);
      } finally {
        if (alive) {
          setLoading(false);
        }
      }
    })();
    
    return () => {
      alive = false;
    };
  }, [jobId, canView]);

  if (!canView) {
    return (
      <div style={{ padding: 20, textAlign: "center", color: theme.colors.textSubtle }}>
        Edit history is only visible to directors, ops, and admin users.
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 820 }}>
      <h3 style={{ marginTop: 0 }}>Edit History</h3>
      
      {loading && <div style={{ padding: 20, color: theme.colors.textSubtle }}>Loading edit history...</div>}
      
      {err && <div style={{ color: "#ff7777", marginBottom: 16 }}>{err}</div>}
      
      {!loading && !err && (
        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 12 }}>
          {items.length === 0 ? (
            <li style={{ padding: 20, textAlign: "center", color: theme.colors.textSubtle }}>
              No edit history found for this job.
            </li>
          ) : (
            items.map((item) => (
              <li
                key={item.id}
                style={{
                  padding: 16,
                  borderRadius: 10,
                  border: `1px solid ${theme.colors.border}`,
                  background: "rgba(255,255,255,0.03)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>
                    {item.users?.full_name || "Unknown User"}
                  </div>
                  <div style={{ fontSize: 12, color: theme.colors.textSubtle }}>
                    {new Date(item.created_at).toLocaleString()}
                  </div>
                </div>
                
                <div style={{ fontSize: 14 }}>
                  <strong>{item.field_name}</strong> changed
                </div>
                
                <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, color: theme.colors.textSubtle, marginBottom: 4 }}>From:</div>
                    <div style={{ 
                      padding: 8, 
                      background: "rgba(255,255,255,0.05)", 
                      borderRadius: 6,
                      whiteSpace: "pre-wrap",
                      minHeight: "20px"
                    }}>
                      {item.old_value !== null ? item.old_value : <span style={{ opacity: 0.6 }}>—</span>}
                    </div>
                  </div>
                  
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, color: theme.colors.textSubtle, marginBottom: 4 }}>To:</div>
                    <div style={{ 
                      padding: 8, 
                      background: "rgba(255,255,255,0.05)", 
                      borderRadius: 6,
                      whiteSpace: "pre-wrap",
                      minHeight: "20px"
                    }}>
                      {item.new_value !== null ? item.new_value : <span style={{ opacity: 0.6 }}>—</span>}
                    </div>
                  </div>
                </div>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}