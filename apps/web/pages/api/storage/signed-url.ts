// apps/web/pages/api/storage/signed-url.ts
import type { NextApiRequest, NextApiResponse } from "next";

import { supabaseAdmin } from "../../../lib/supabaseAdmin";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { bucket, path, expiresIn = 60 } = req.body || {};
  if (!bucket || !path) return res.status(400).json({ error: "bucket and path are required" });

  const { data, error } = await supabaseAdmin.storage.from(bucket).createSignedUrl(path, expiresIn);
  if (error || !data?.signedUrl) return res.status(500).json({ error: error?.message || "Unable to sign URL" });

  return res.status(200).json({ url: data.signedUrl });
}