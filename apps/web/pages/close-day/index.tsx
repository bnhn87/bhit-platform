// Page to list jobs that need to be closed for the day
import { useRouter } from "next/router";
import { useEffect, useState } from "react";

import { supabase } from "../../lib/supabaseClient";
import { theme } from "../../lib/theme";

type Job = {
  id: string;
  title: string;
  client_name: string | null;
  status: string;
};

export default function CloseDayIndex() {
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadJobs() {
      const { data, error } = await supabase
        .from("jobs")
        .select("id, title, client_name, status")
        .in("status", ["in_progress", "snagging"])
        .order("created_at", { ascending: false });

      if (!error && data) {
        setJobs(data);
      }
      setLoading(false);
    }

    loadJobs();
  }, []);

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ color: theme.colors.text }}>Close Day - Select Job</h1>
      
      {loading ? (
        <div style={{ color: theme.colors.textSubtle }}>Loading jobs...</div>
      ) : jobs.length === 0 ? (
        <div style={{ color: theme.colors.textSubtle }}>No active jobs to close.</div>
      ) : (
        <div style={{ display: "grid", gap: 12 }}>
          {jobs.map((job) => (
            <div
              key={job.id}
              style={{
                padding: 16,
                border: `1px solid ${theme.colors.border}`,
                borderRadius: 8,
                background: theme.colors.panel,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center"
              }}
            >
              <div>
                <div style={{ color: theme.colors.text, fontWeight: 600 }}>{job.title}</div>
                <div style={{ color: theme.colors.textSubtle }}>{job.client_name || "No client"}</div>
              </div>
              <button
                onClick={() => router.push(`/close-day/${job.id}`)}
                style={{
                  padding: "8px 16px",
                  background: theme.colors.accent,
                  color: "white",
                  border: 0,
                  borderRadius: 6,
                  cursor: "pointer"
                }}
              >
                Close Day
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}