import { supabase } from "./supabaseClient";

export type JobRowUI = {
  id: string;
  reference: string | null;
  title: string | null;
  client_name: string | null;
  status: string | null;
  lead_installer_name: string | null;
  created_at: string | null;
};

/**
 * Jobs loader that queries the jobs table directly
 */
export async function loadJobsSafe(): Promise<{ data: JobRowUI[]; error: string | null }> {
  // Query the jobs table directly since the view doesn't exist
  const r = await supabase
    .from("jobs")
    .select(`
      id, reference, title, status, created_at,
      clients:client_id ( name ),
      users:lead_installer_id ( full_name )
    `)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (r.error) {
    return { data: [], error: r.error.message };
  }

  const map = (rows: unknown[]): JobRowUI[] =>
    (rows ?? []).map((x) => {
      const row = x as Record<string, unknown>;
      const clients = row.clients as { name?: string } | undefined;
      const users = row.users as { full_name?: string } | undefined;
      return {
        id: String(row.id),
        reference: row.reference ? String(row.reference) : null,
        title: row.title ? String(row.title) : null,
        client_name: clients?.name ? String(clients.name) : null,
        status: row.status ? String(row.status) : null,
        lead_installer_name: users?.full_name ? String(users.full_name) : null,
        created_at: row.created_at ? String(row.created_at) : null,
      };
    });

  return { data: map(r.data as unknown[]), error: null };
}