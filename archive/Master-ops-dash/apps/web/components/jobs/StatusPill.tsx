import React from "react";
import { supabase } from "../../lib/supabaseClient";
import { theme } from "../../lib/theme";

export type JobStatus = "planned" | "in_progress" | "snagging" | "completed";

function isUUID(v?: string | null) {
  return !!v && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

export default function StatusPill(props: {
  status: JobStatus;
  jobId?: string | null;
  canManage?: boolean;
  onChanged?: (next: JobStatus) => void;
}) {
  const { status, jobId, canManage = false, onChanged } = props;
  const hasValidId = isUUID(jobId);
  const clickable = canManage && hasValidId;

  function nextStatus(s: JobStatus): JobStatus {
    switch (s) {
      case "planned": return "in_progress";
      case "in_progress": return "snagging";
      case "snagging": return "completed";
      case "completed": default: return "planned";
    }
  }
  function prevStatus(s: JobStatus): JobStatus {
    switch (s) {
      case "planned": return "completed";
      case "in_progress": return "planned";
      case "snagging": return "in_progress";
      case "completed": default: return "snagging";
    }
  }
  function labelFor(s: JobStatus) {
    switch (s) {
      case "planned": return "Planned";
      case "in_progress": return "Installing";
      case "snagging": return "Snagging";
      case "completed": return "Completed";
    }
  }
  function dotColor(s: JobStatus) {
    switch (s) {
      case "planned": return theme.colors.subtext;
      case "in_progress": return theme.colors.accent;
      case "snagging": return theme.colors.warning;
      case "completed": return theme.colors.success;
      default: return theme.colors.subtext;
    }
  }

  async function updateStatus(next: JobStatus) {
    if (!hasValidId) return;
    onChanged?.(next); // optimistic
    const { error } = await supabase.from("jobs").update({ status: next }).eq("id", jobId!);
    if (error) {
      onChanged?.(status); // revert if parent supplied state handler
      alert("Couldn't update status: " + error.message);
    }
  }

  async function handleClick(e: React.MouseEvent) {
    if (!clickable) return;
    const next = e.shiftKey ? prevStatus(status) : nextStatus(status);
    await updateStatus(next);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={!clickable}
      title={
        clickable
          ? "Click to change status (Shift+Click for previous)"
          : hasValidId ? "No permission" : "Job id not ready yet"
      }
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "6px 12px",
        borderRadius: 999,
        border: `1px solid ${theme.colors.panelBorder}`,
        background: clickable ? "linear-gradient(180deg,#111823,#0c121a)" : "#111823",
        color: theme.colors.text,
        fontSize: 12,
        lineHeight: 1,
        cursor: clickable ? "pointer" : "default",
        opacity: clickable ? 1 : 0.7
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: 999,
          background: dotColor(status),
          boxShadow: "0 0 0 2px rgba(0,0,0,0.35)"
        }}
      />
      {labelFor(status)}
    </button>
  );
}
