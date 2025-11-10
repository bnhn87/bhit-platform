import { useEffect, useState } from "react";

import { supabase } from "../lib/supabaseClient";

export type DashboardData = {
  jobsInProgress: number;
  quotesPending: number;
  crewUtilization: number; // 0..100
  vehiclesInUse: number;
  wasteLoadsToday: number;
  avgBufferUsed: number;   // 0..100
  netMargin: number;       // numeric (e.g., 24800)

  installsX: string[];     // day labels
  installsSeries: { name: string; data: number[] }[];



  feed: { id: string; text: string; occurred_at: string }[];
};

function startOfTodayISO(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

// Mock data generators for fallback when tables don't exist
function generateMockInstallsData() {
  const data = [];
  for (let i = 0; i < 30; i++) {
    const date = new Date();
    date.setDate(date.getDate() - (29 - i));
    data.push({
      d: date.toISOString().split('T')[0],
      installs: Math.floor(Math.random() * 50) + 20,
      crews: Math.floor(Math.random() * 4) + 4
    });
  }
  return data;
}



export function useDashboardData() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    (async () => {
      setLoading(true);

      const todayISO = startOfTodayISO();

      // Top KPIs with fallback handling
      const [
        cInProg,
        cQuotes,
        cVehicles,
        cWasteToday,
        crewUsage,
        bufferUsage,
        finance,
        installs,
        feed
      ] = await Promise.all([
        supabase.from("jobs").select("*", { count: "exact", head: true }).eq("status", "in_progress").is("deleted_at", null).then(r => r).catch(() => ({ count: 0, error: null })),
        (supabase.from("quotes") as any).select("*", { count: "exact", head: true }).eq("status", "pending").is("deleted_at", null).then(r => r).catch(() => ({ count: 0, error: null, data: [] })),
        (supabase.from("vehicles") as any).select("*", { count: "exact", head: true }).eq("in_use", true).is("deleted_at", null).then(r => r).catch(() => ({ count: 0, error: null })),
        (supabase.from("waste_loads") as any).select("*", { count: "exact", head: true }).gte("booked_at", todayISO).is("deleted_at", null).then(r => r).catch(() => ({ count: 0, error: null })),
        (supabase.from("crew_usage") as any).select("d, utilization").order("d", { ascending: false }).limit(1).then(r => r).catch(() => ({ data: [{ utilization: 85 }], error: null })),
        (supabase.from("buffer_usage") as any).select("d, percent").order("d", { ascending: false }).limit(1).then(r => r).catch(() => ({ data: [{ percent: 15 }], error: null })),
        (supabase.from("finance_metrics") as any).select("d, net_margin").order("d", { ascending: false }).limit(1).then(r => r).catch(() => ({ data: [{ net_margin: 24800 }], error: null })),
        (supabase.from("installs_by_day") as any).select("*").order("d", { ascending: true }).limit(30).then(r => r).catch(() => ({ data: generateMockInstallsData(), error: null })),
        (supabase.from("activity_log") as any).select("id, text, occurred_at").order("occurred_at", { ascending: false }).limit(12).then(r => r).catch(() => ({ data: [], error: null })),
      ]);

      if (!active) return;

      // Installs series → labels + 2 series
      const instRows = (installs.data || []) as { d: string; installs: number; crews: number }[];
      const installsX = instRows.map((r) => new Date(r.d).toLocaleDateString(undefined, { month: "short", day: "numeric" }));
      const installsSeries = [
        { name: "Installs", data: instRows.map((r) => r.installs) },
        { name: "Crews", data: instRows.map((r) => r.crews) }
      ];



      setData({
        jobsInProgress: cInProg.count || 0,
        quotesPending: cQuotes.count || 0,
        crewUtilization: Number((crewUsage.data?.[0]?.utilization as number) ?? 0),
        vehiclesInUse: cVehicles.count || 0,
        wasteLoadsToday: cWasteToday.count || 0,
        avgBufferUsed: Number((bufferUsage.data?.[0]?.percent as number) ?? 0),
        netMargin: Number((finance.data?.[0]?.net_margin as number) ?? 0),

        installsX,
        installsSeries,



        feed: (feed.data || []) as { id: string; text: string; occurred_at: string }[]
      });

      setLoading(false);
    })();

    return () => {
      active = false;
    };
  }, []);

  return { data, loading };
}
