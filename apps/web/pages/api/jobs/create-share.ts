// apps/web/pages/api/jobs/create-share.ts
import type { NextApiRequest, NextApiResponse } from "next";

import { supabaseAdmin } from "../../../lib/supabaseAdmin";

type Body = { jobId?: string; pin?: string; hoursValid?: number };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { jobId, pin, hoursValid = 24 } = (req.body || {}) as Body;
  if (!jobId) return res.status(400).json({ error: "jobId is required" });

  // Check job exists
  const { data: job, error: jobErr } = await supabaseAdmin.from("jobs").select("id,title").eq("id", jobId).single();
  if (jobErr || !job) return res.status(404).json({ error: "Job not found" });

  // Type assertion for job data
  const jobData = job as { id: string; title: string };

  // PIN: use provided or generate 4-digit
  const chosenPin = (pin && /^[0-9]{4}$/.test(pin) ? pin : Math.floor(1000 + Math.random() * 9000).toString());

  // Upsert PIN
  const { error: pinErr } = await supabaseAdmin.from("job_pins").upsert({ job_id: jobId, pin: chosenPin } as never, { onConflict: "job_id" });
  if (pinErr) return res.status(500).json({ error: pinErr.message });

  // Create token valid for N hours
  const token = cryptoRandom(24);
  const { error: tokErr } = await supabaseAdmin.from("temp_access_tokens").upsert({
    token,
    job_id: jobId,
    valid_to: new Date(Date.now() + hoursValid * 3600_000).toISOString(),
  } as never, { onConflict: "token" });
  if (tokErr) return res.status(500).json({ error: tokErr.message });

  const origin =
    (process.env.NEXT_PUBLIC_APP_BASE_URL && process.env.NEXT_PUBLIC_APP_BASE_URL.trim()) ||
    (req.headers["x-forwarded-proto"] && req.headers.host ? `${req.headers["x-forwarded-proto"]}://${req.headers.host}` : `http://${req.headers.host}`);

  const shareUrl = `${origin}/today/guest?t=${encodeURIComponent(token)}`;

  return res.status(200).json({ token, pin: chosenPin, shareUrl, job: { id: jobData.id, title: jobData.title } });
}

function cryptoRandom(n: number) {
  // URL-safe base64 without padding
  const bytes = Buffer.allocUnsafe(n);
  for (let i = 0; i < n; i++) bytes[i] = Math.floor(Math.random() * 256);
  return bytes.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
