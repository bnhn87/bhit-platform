import React, { useEffect, useState } from "react";

import { documentSelectionService, type ModuleType } from "../../lib/documentSelection";
import { supabase } from "../../lib/supabaseClient";
import { theme } from "../../lib/theme";

type Row = {
  id: string;
  job_id: string;
  title: string;
  doc_type: string | null;
  storage_path: string;
  file_ext: string | null;
  bytes: number | null;
  created_at: string;
};

type SendToModule = "taskGeneration" | "smartQuote" | "floorPlanner";

interface SendToMenuProps {
  documentId: string;
  onSendTo: (module: SendToModule) => void;
  onClose: () => void;
}

function SendToMenu({ documentId: _documentId, onSendTo, onClose }: SendToMenuProps) {
  const modules: { key: SendToModule; label: string; description: string }[] = [
    { key: "taskGeneration", label: "Task Generation", description: "Generate installation tasks" },
    { key: "smartQuote", label: "SmartQuote", description: "Extract products for quotes" },
    { key: "floorPlanner", label: "Floor Planner", description: "Add furniture to floor plan" }
  ];

  return (
    <div style={{
      position: "absolute",
      right: 0,
      top: "100%",
      background: theme.colors.panel,
      border: `1px solid ${theme.colors.border}`,
      borderRadius: 8,
      boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
      zIndex: 1000,
      minWidth: 200
    }}>
      {modules.map(module => (
        <button
          key={module.key}
          onClick={() => {
            onSendTo(module.key);
            onClose();
          }}
          style={{
            display: "block",
            width: "100%",
            padding: "12px 16px",
            border: "none",
            background: "transparent",
            color: theme.colors.text,
            textAlign: "left",
            cursor: "pointer",
            borderBottom: `1px solid ${theme.colors.border}`,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(255,255,255,0.05)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 2 }}>{module.label}</div>
          <div style={{ fontSize: 12, color: theme.colors.textSubtle }}>{module.description}</div>
        </button>
      ))}
    </div>
  );
}

export default function DocumentsTab({ jobId, canManage }: { jobId: string; canManage: boolean }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [sendToMenuOpen, setSendToMenuOpen] = useState<string | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);

  const bucket = "job-docs";

  async function load() {
    const { data, error } = await supabase
      .from("job_documents")
      .select("*")
      .eq("job_id", jobId)
      .order("created_at", { ascending: false });
    if (error) setMsg(error.message);
    setRows((data as Row[]) || []);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobId]);

  // Sanitize filename for safe storage
  function sanitizeFilename(filename: string): string {
    // Remove or replace problematic characters
    return filename
      .replace(/[~`!@#$%^&*()+=[\]{}\\|;:'",<>?]/g, '_') // Replace special chars with underscore
      .replace(/\s+/g, '_') // Replace spaces with underscore
      .replace(/_+/g, '_') // Replace multiple underscores with single
      .replace(/^_|_$/g, '') // Remove leading/trailing underscores
      .toLowerCase(); // Convert to lowercase for consistency
  }

  async function upload(file: File) {
    setBusy(true);
    setMsg(null);
    const ext = (file.name.split(".").pop() || "").toLowerCase();
    
    // Sanitize filename for storage
    const sanitizedName = sanitizeFilename(file.name);
    const path = `jobs/${jobId}/docs/${Date.now()}-${sanitizedName}`;
    
    // console.log(`Uploading file: ${file.name} -> ${path}`);
    
    // upload
    const up = await supabase.storage.from(bucket).upload(path, file, { upsert: true, contentType: file.type });
    if (up.error) {
      console.error('Upload error:', up.error);
      setMsg(up.error.message);
      setBusy(false);
      return;
    }
    // insert row - keep original filename as title for display
    const { error } = await supabase.from("job_documents").insert({
      job_id: jobId,
      title: file.name, // Keep original name for display
      doc_type: null,
      storage_path: path, // Use sanitized path for storage
      file_ext: ext,
      bytes: file.size
    });
    if (error) {
      console.error('Database insert error:', error);
      setMsg(error.message);
    }
    setBusy(false);
    await load();
  }

  async function download(row: Row) {
    // console.log('Attempting to download:', row.storage_path);
    try {
      const signed = await supabase.storage.from(bucket).createSignedUrl(row.storage_path, 60 * 60);
      if (signed.error) {
        console.error('Download error for path:', row.storage_path, signed.error);
        setMsg(`Download failed: ${signed.error.message}. The file path may contain invalid characters.`);
        setTimeout(() => setMsg(null), 5000);
        return;
      }
      window.open(signed.data.signedUrl, "_blank");
    } catch (error: unknown) {
      console.error('Download error:', error);
      setMsg(`Download failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setTimeout(() => setMsg(null), 5000);
    }
  }

  async function remove(row: Row) {
    if (!canManage) return;
    if (!confirm("Delete this document?")) return;
    setBusy(true);
    // best-effort: delete storage first; then row
    await supabase.storage.from(bucket).remove([row.storage_path]).catch(() => {});
    const { error } = await supabase.from("job_documents").delete().eq("id", row.id);
    if (error) setMsg(error.message);
    setBusy(false);
    await load();
  }

  async function handleSendTo(document: Row, module: SendToModule) {
    setProcessing(document.id);
    setMsg(null);
    
    try {
      // Store the document selection
      documentSelectionService.addSelection(
        jobId,
        document.id,
        document.title,
        module as ModuleType
      );
      
      switch (module) {
        case "taskGeneration":
          setMsg(`✅ ${document.title} sent to Task Generation. Go to Task Generation tab to generate tasks from selected documents.`);
          setTimeout(() => setMsg(null), 5000);
          break;
          
        case "smartQuote":
          setMsg(`✅ ${document.title} sent to SmartQuote. Integration coming soon...`);
          setTimeout(() => setMsg(null), 5000);
          break;
          
        case "floorPlanner":
          setMsg(`✅ ${document.title} sent to Floor Planner. Integration coming soon...`);
          setTimeout(() => setMsg(null), 5000);
          break;
      }
    } catch (error: unknown) {
      setMsg(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setProcessing(null);
    }
  }

  // Close send-to menu when clicking outside
  useEffect(() => {
    function handleClickOutside(_event: MouseEvent) {
      if (sendToMenuOpen) {
        setSendToMenuOpen(null);
      }
    }
    
    if (sendToMenuOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [sendToMenuOpen]);

  return (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <div style={{ fontWeight: 600 }}>Documents</div>
        <div style={{ marginLeft: "auto", color: theme.colors.textSubtle }}>{rows.length} file(s)</div>
        {canManage && (
          <label
            style={{
              padding: "8px 12px",
              borderRadius: 8,
              border: `1px solid ${theme.colors.border}`,
              background: theme.colors.panel,
              color: theme.colors.text,
              cursor: "pointer",
              opacity: busy ? 0.7 : 1
            }}
          >
            Upload
            <input
              type="file"
              style={{ display: "none" }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) upload(f);
                e.currentTarget.value = "";
              }}
            />
          </label>
        )}
      </div>

      <div
        style={{
          border: `1px solid ${theme.colors.border}`,
          borderRadius: 10,
          overflow: "hidden"
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#0f151c", color: theme.colors.textSubtle }}>
              <th style={{ textAlign: "left", padding: "10px 12px" }}>Title</th>
              <th style={{ textAlign: "left", padding: "10px 12px" }}>Type</th>
              <th style={{ textAlign: "right", padding: "10px 12px" }}>Size</th>
              <th style={{ textAlign: "right", padding: "10px 12px", width: 180 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} style={{ borderTop: `1px solid ${theme.colors.border}` }}>
                <td style={{ padding: "10px 12px", color: theme.colors.text }}>{r.title}</td>
                <td style={{ padding: "10px 12px", color: theme.colors.textSubtle }}>{r.doc_type ?? "—"}</td>
                <td style={{ padding: "10px 12px", color: theme.colors.textSubtle, textAlign: "right" }}>
                  {r.bytes != null ? `${Math.round(r.bytes / 1024)} KB` : "—"}
                </td>
                <td style={{ padding: "10px 12px", textAlign: "right", position: "relative" }}>
                  <button
                    onClick={() => download(r)}
                    style={{
                      padding: "6px 10px",
                      borderRadius: 8,
                      border: `1px solid ${theme.colors.border}`,
                      background: theme.colors.panel,
                      color: theme.colors.text,
                      marginRight: 8
                    }}
                  >
                    Open
                  </button>
                  
                  {/* Send To Button */}
                  <div style={{ display: "inline-block", position: "relative", marginRight: 8 }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSendToMenuOpen(sendToMenuOpen === r.id ? null : r.id);
                      }}
                      style={{
                        padding: "6px 10px",
                        borderRadius: 8,
                        border: `1px solid ${theme.colors.accent}`,
                        background: processing === r.id ? "rgba(59, 130, 246, 0.2)" : theme.colors.panel,
                        color: theme.colors.accent,
                        cursor: processing === r.id ? "wait" : "pointer",
                        opacity: processing === r.id ? 0.7 : 1
                      }}
                      disabled={processing === r.id}
                    >
                      {processing === r.id ? "Sending..." : "Send to"}
                    </button>
                    
                    {sendToMenuOpen === r.id && (
                      <SendToMenu
                        documentId={r.id}
                        onSendTo={(module) => handleSendTo(r, module)}
                        onClose={() => setSendToMenuOpen(null)}
                      />
                    )}
                  </div>
                  
                  {canManage && (
                    <button
                      onClick={() => remove(r)}
                      style={{
                        padding: "6px 10px",
                        borderRadius: 8,
                        border: `1px solid ${theme.colors.border}`,
                        background: "#1a1313",
                        color: "#ffb4b4"
                      }}
                      disabled={busy}
                    >
                      Delete
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={4} style={{ padding: 16, color: theme.colors.textSubtle }}>
                  No documents yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {msg && (
        <div
          style={{
            padding: 10,
            borderLeft: `4px solid ${theme.colors.accent}`,
            background: "#0f151c",
            color: theme.colors.text,
            borderRadius: 8
          }}
        >
          {msg}
        </div>
      )}
    </div>
  );
}
