// apps/web/pages/api/dev/admin-create-user.ts
// TEMPORARY: create a user with password and set director role.
// Remove this file after you create your account.
import type { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // server-side only

const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: "email and password required" });

  // 1) Create (or fetch) auth user
  const { data: existing } = await admin.auth.admin.listUsers({ page: 1, perPage: 1, email });
  let userId = existing?.users?.[0]?.id as string | undefined;

  if (!userId) {
    const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    if (error) return res.status(400).json({ error: error.message });
    userId = data.user?.id || undefined;
  } else {
    // ensure password set
    const { error } = await admin.auth.admin.updateUserById(userId, { password });
    if (error) return res.status(400).json({ error: error.message });
  }

  if (!userId) return res.status(500).json({ error: "No user id returned" });

  // 2) Upsert users row as director
  const { error: uErr } = await admin.from("users").upsert({ id: userId, email, role: "director" }, { onConflict: "id" });
  if (uErr) return res.status(400).json({ error: uErr.message });

  return res.status(200).json({ ok: true, userId });
}
