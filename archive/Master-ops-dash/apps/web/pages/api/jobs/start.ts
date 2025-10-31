// apps/web/pages/api/jobs/start.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";

type Body = { jobId?: string; pin?: string };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { jobId, pin } = (req.body || {}) as Body;
  if (!jobId || !pin) return res.status(400).json({ error: "jobId and pin are required" });

  // Verify PIN
  const { data: jp, error: pinErr } = await supabaseAdmin.from("job_pins").select("job_id,pin").eq("job_id", jobId).single();
  if (pinErr || !jp) return res.status(404).json({ error: "PIN not set for job" });
  if (jp.pin !== pin) return res.status(401).json({ error: "Invalid PIN" });

  // Start job
  const { data, error: updErr } = await supabaseAdmin.from("jobs").update({ status: "in_progress" }).eq("id", jobId).select("id,title,status").single();
  if (updErr) return res.status(500).json({ error: updErr.message });

  return res.status(200).json({ job: data });
}
