// apps/web/pages/api/guest/create-upload-url.ts
import type { NextApiRequest, NextApiResponse } from "next";

import { supabaseAdmin } from "../../../lib/supabaseAdmin";

type Body = { token?: string; pin?: string; filename?: string; contentType?: string };

function slug(s: string) {
  return (s || "file")
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "");
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  const { token, pin, filename, contentType } = (req.body || {}) as Body;
  if (!token || !pin || !filename) return res.status(400).json({ error: "token, pin, filename required" });

  // Settings gate: guest_enabled && guest_photos_upload
  const { data: org } = await supabaseAdmin.from("org_settings").select("guest_enabled, guest_photos_upload").eq("id", 1).single();

  // Handle null case explicitly
  type OrgSettings = { guest_enabled?: boolean; guest_photos_upload?: boolean };
  const orgSettings: OrgSettings = org ? org as OrgSettings : {};

  if (!orgSettings.guest_enabled || !orgSettings.guest_photos_upload) {
    return res.status(403).json({ error: "Guest uploads are disabled" });
  }

  // Verify token + pin → get job
  const { data: rows, error: vErr } = await supabaseAdmin.rpc("verify_guest_pin", { token, pin } as never);
  if (vErr) return res.status(400).json({ error: vErr.message });
  const job = rows ? (Array.isArray(rows) ? rows[0] : rows) : null;
  if (!(job as unknown as { id?: string })?.id) return res.status(401).json({ error: "Invalid token or PIN" });

  const bucket = "job-photos";
  const path = `${(job as unknown as { id: string }).id}/${Date.now()}-${slug(filename!)}`;

  // Create signed upload URL (client will call uploadToSignedUrl with token)
  const { data, error } = await supabaseAdmin.storage.from(bucket).createSignedUploadUrl(path);
  if (error || !data) return res.status(500).json({ error: error?.message || "Failed to create signed upload URL" });

  // Optionally validate contentType client-side during actual upload
  return res.status(200).json({
    bucket,
    path: data.path,
    token: data.token, // required by uploadToSignedUrl
    contentType: contentType || "application/octet-stream",
  });
}
