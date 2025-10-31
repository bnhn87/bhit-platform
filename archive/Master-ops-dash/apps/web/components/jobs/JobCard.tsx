import Link from "next/link";
import StatusPill, { JobStatus } from "../ui/StatusPill";
import { panelStyle, theme } from "../../lib/theme";

export type JobTile = {
  id: string;
  title: string;
  client_name: string | null;
  status: JobStatus;
  created_at: string;
};

export default function JobCard({
  job,
  canManage,
  onChangeStatus,
}: {
  job: JobTile;
  canManage: boolean;
  onChangeStatus: (id: string) => void;
}) {
  return (
    <div
      style={{
        ...panelStyle,
        padding: 14,
        borderRadius: 12,
        display: "grid",
        gap: 8,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <Link
          href={`/job/${job.id}`}
          style={{ color: theme.colors.text, textDecoration: "none", fontWeight: 700 }}
        >
          {job.title}
        </Link>

        <div style={{ marginLeft: "auto" }}>
          <StatusPill
            value={job.status}
            onClick={canManage ? () => onChangeStatus(job.id) : undefined}
            title={canManage ? "Click to cycle status" : undefined}
          />
        </div>
      </div>

      <div style={{ color: theme.colors.subtext, fontSize: 12 }}>
        {job.client_name ?? "—"} • {new Date(job.created_at).toLocaleString()}
      </div>
    </div>
  );
}
