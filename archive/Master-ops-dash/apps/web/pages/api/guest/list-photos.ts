// apps/web/pages/api/guest/list-photos.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../lib/server/supabaseAdmin";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const token = (req.method === "GET" ? req.query.token : req.body?.token) as string | undefined;
  const pin   = (req.method === "GET" ? req.query.pin   : req.body?.pin) as string | undefined;
  if (!token || !pin) return res.status(400).json({ error: "token and pin required" });

  // Settings gate: guest_enabled && guest_photos_read
  const { data: org } = await supabaseAdmin.from("org_settings").select("guest_enabled, guest_photos_read").eq("id", 1).single();
  if (!org?.guest_enabled || !org?.guest_photos_read) {
    return res.status(403).json({ error: "Guest photo view is disabled" });
  }

  // Verify token + pin → get job
  const { data: rows, error: vErr } = await supabaseAdmin.rpc("verify_guest_pin", { token, pin });
  if (vErr) return res.status(400).json({ error: vErr.message });
  const job = Array.isArray(rows) ? rows[0] : rows;
  if (!job?.id) return res.status(401).json({ error: "Invalid token or PIN" });

  const bucket = "job-photos";
  const folder = `${job.id}`;

  // List objects under job folder
  const { data: objects, error: listErr } = await supabaseAdmin.storage.from(bucket).list(folder, {
    limit: 100,
    sortBy: { column: "created_at", order: "desc" },
  });
  if (listErr) return res.status(500).json({ error: listErr.message });

  // Sign each for short-lived read (10 minutes)
  const results: { name: string; path: string; url: string }[] = [];
  for (const obj of objects || []) {
    const key = `${folder}/${obj.name}`;
    const { data: signed, error: signErr } = await supabaseAdmin.storage.from(bucket).createSignedUrl(key, 600);
    if (!signErr && signed?.signedUrl) {
      results.push({ name: obj.name, path: key, url: signed.signedUrl });
    }
  }

  return res.status(200).json({ items: results });
}
