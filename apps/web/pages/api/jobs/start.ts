// apps/web/pages/api/jobs/start.ts
import type { NextApiRequest, NextApiResponse } from "next";

import { getUserIdFromRequest } from "../../../lib/authTokenParser";
import { logJobStatusChanged } from "../../../lib/activityLogger";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";

type Body = { jobId?: string; pin?: string };

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { jobId, pin } = (req.body || {}) as Body;
  if (!jobId || !pin) return res.status(400).json({ error: "jobId and pin are required" });

  // Verify PIN
  const { data: jp, error: pinErr } = await supabaseAdmin.from("job_pins").select("job_id,pin").eq("job_id", jobId).single();
  if (pinErr || !jp) return res.status(404).json({ error: "PIN not set for job" });

  // Type assertion for job pin data
  const jobPin = jp as { job_id: string; pin: string };
  if (jobPin.pin !== pin) return res.status(401).json({ error: "Invalid PIN" });

  // Start job
  const { data, error: updErr } = await supabaseAdmin.from("jobs").update({ status: "in_progress" } as never).eq("id", jobId).select("id,title,status").single();
  if (updErr) return res.status(500).json({ error: updErr.message });

  // Log the status change activity
  const userId = await getUserIdFromRequest(req);
  const jobTitle = (data as any)?.title || 'Unknown Job';
  await logJobStatusChanged(jobId, jobTitle, 'planned', 'in_progress', userId || undefined);

  return res.status(200).json({ job: data });
}
