import React, { useState, useEffect } from "react";

import { supabase } from "../../lib/supabaseClient";
import { theme } from "../../lib/theme";

interface AddJobModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (jobId: string) => void;
  defaultValues?: Partial<{
    title: string;
    client_name: string;
    reference: string;
    priority: "low" | "medium" | "high";
    deadline: string;
  }>;
}

export default function AddJobModal({
  open,
  onClose,
  onCreated,
  defaultValues
}: AddJobModalProps) {
  const [title, setTitle] = useState("");
  const [client, setClient] = useState("");
  const [ref, setRef] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [deadline, setDeadline] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // Reset form when modal opens/closes
  useEffect(() => {
    if (open) {
      setTitle(defaultValues?.title || "");
      setClient(defaultValues?.client_name || "");
      setRef(defaultValues?.reference || "");
      setPriority(defaultValues?.priority || "medium");
      setDeadline(defaultValues?.deadline || "");
      setMsg(null);
      setBusy(false);
    }
  }, [open, defaultValues]);

  if (!open) return null;

  async function submit() {
    if (!title.trim()) {
      setMsg("Title is required.");
      return;
    }
    
    setBusy(true);
    setMsg(null);

    try {
      const { data, error } = await supabase
        .from("jobs")
        .insert({
          title: title.trim(),
          client_name: client.trim() || null,
          reference: ref.trim() || null,
          priority: priority,
          deadline: deadline || null,
          status: "planned",
          percent_complete: 0
        })
        .select("id")
        .single();

      if (error) throw error;

      const jobId = data!.id as string;

      // Ensure planning row exists
      await supabase
        .from("job_planning")
        .upsert({ job_id: jobId, status: "pending" }, { onConflict: "job_id" });

      // Reset form
      setTitle("");
      setClient("");
      setRef("");
      setPriority("medium");
      setDeadline("");
      
      onCreated(jobId);
    } catch (error: unknown) {
      setMsg(error instanceof Error ? error.message : "Failed to create job");
    } finally {
      setBusy(false);
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !busy) {
      submit();
    }
    if (e.key === "Escape") {
      onClose();
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.6)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: 20
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
        style={{
          width: 600,
          maxWidth: "100%",
          background: theme.colors.panel,
          color: theme.colors.text,
          border: `1px solid ${theme.colors.border}`,
          borderRadius: 16,
          padding: 24,
          boxShadow: theme.shadow
        }}
      >
        <div style={{ 
          fontWeight: 700, 
          fontSize: 18,
          marginBottom: 20,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between"
        }}>
          Add New Job
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: theme.colors.textSubtle,
              fontSize: 24,
              cursor: "pointer",
              padding: 4
            }}
          >
            ×
          </button>
        </div>
        
        <div style={{ display: "grid", gap: 16 }}>
          <Field label="Title" required>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={inputStyle()}
              placeholder="Project title"
              autoFocus
            />
          </Field>
          
          <Field label="Client">
            <input
              value={client}
              onChange={(e) => setClient(e.target.value)}
              style={inputStyle()}
              placeholder="Client name"
            />
          </Field>
          
          <Field label="Reference">
            <input
              value={ref}
              onChange={(e) => setRef(e.target.value)}
              style={inputStyle()}
              placeholder="Internal reference (optional)"
            />
          </Field>
          
          <Field label="Priority">
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as "low" | "medium" | "high")}
              style={inputStyle()}
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </Field>
          
          <Field label="Deadline">
            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              style={inputStyle()}
              min={new Date().toISOString().split('T')[0]}
            />
          </Field>
        </div>
        
        {msg && (
          <div
            style={{
              marginTop: 16,
              padding: 12,
              borderLeft: `4px solid ${msg.includes("error") || msg.includes("failed") ? theme.colors.danger : theme.colors.accent}`,
              color: theme.colors.text,
              background: theme.colors.panelAlt,
              borderRadius: 8,
              fontSize: 14
            }}
          >
            {msg}
          </div>
        )}
        
        <div style={{ 
          display: "flex", 
          gap: 12, 
          marginTop: 24, 
          justifyContent: "flex-end" 
        }}>
          <button
            onClick={onClose}
            disabled={busy}
            style={{
              padding: "10px 16px",
              borderRadius: 8,
              border: `1px solid ${theme.colors.border}`,
              background: theme.colors.panelAlt,
              color: theme.colors.text,
              cursor: busy ? "not-allowed" : "pointer",
              opacity: busy ? 0.6 : 1,
              transition: "all 0.2s ease"
            }}
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={busy || !title.trim()}
            style={{
              padding: "10px 20px",
              borderRadius: 8,
              border: "none",
              background: theme.colors.accent,
              color: "white",
              cursor: (busy || !title.trim()) ? "not-allowed" : "pointer",
              opacity: (busy || !title.trim()) ? 0.6 : 1,
              transition: "all 0.2s ease",
              fontWeight: 600
            }}
          >
            {busy ? "Creating..." : "Create Job"}
          </button>
        </div>
      </div>
    </div>
  );
}

interface FieldProps {
  label: string;
  children: React.ReactNode;
  required?: boolean;
}

function Field({ label, children, required = false }: FieldProps) {
  return (
    <div style={{ display: "grid", gap: 8 }}>
      <label style={{ 
        fontSize: 14, 
        color: theme.colors.text,
        fontWeight: 600,
        display: "flex",
        alignItems: "center",
        gap: 4
      }}>
        {label}
        {required && (
          <span style={{ color: theme.colors.danger, fontSize: 16 }}>*</span>
        )}
      </label>
      {children}
    </div>
  );
}

function inputStyle(): React.CSSProperties {
  return {
    padding: "12px 14px",
    background: theme.colors.panelAlt,
    border: `1px solid ${theme.colors.border}`,
    color: theme.colors.text,
    borderRadius: 8,
    fontSize: 14,
    outline: "none",
    transition: "border-color 0.2s ease",
    width: "100%"
  };
}

export type { AddJobModalProps };
