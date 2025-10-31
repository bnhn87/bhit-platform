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

  pins: { id: string; x: number; y: number; title: string }[];

  heatRows: string[];
  heatCols: string[];
  heatValues: number[];    // row-major

  feed: { id: string; text: string; occurred_at: string }[];
};

function startOfTodayISO(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export function useDashboardData() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    (async () => {
      setLoading(true);

      const todayISO = startOfTodayISO();

      // Top KPIs
      const [
        cInProg,
        cQuotes,
        cVehicles,
        cWasteToday,
        crewUsage,
        bufferUsage,
        finance,
        installs,
        heat,
        feed,
        pins
      ] = await Promise.all([
        supabase.from("jobs").select("*", { count: "exact", head: true }).eq("status", "in_progress"),
        supabase.from("quotes").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("vehicles").select("*", { count: "exact", head: true }).eq("in_use", true),
        supabase.from("waste_loads").select("*", { count: "exact", head: true }).gte("booked_at", todayISO),
        supabase.from("crew_usage").select("d, utilization").order("d", { ascending: false }).limit(1),
        supabase.from("buffer_usage").select("d, percent").order("d", { ascending: false }).limit(1),
        supabase.from("finance_metrics").select("d, net_margin").order("d", { ascending: false }).limit(1),
        supabase.from("installs_by_day").select("*").order("d", { ascending: true }).limit(30),
        supabase.from("pipeline_heatmap").select("*"),
        supabase.from("activity_log").select("id, text, occurred_at").order("occurred_at", { ascending: false }).limit(12),
        supabase.from("jobs").select("id, title, location_x, location_y").is("location_x", null, false).is("location_y", null, false)
      ]);

      if (!active) return;

      // Installs series → labels + 2 series
      const instRows = (installs.data || []) as { d: string; installs: number; crews: number }[];
      const installsX = instRows.map((r) => new Date(r.d).toLocaleDateString(undefined, { month: "short", day: "numeric" }));
      const installsSeries = [
        { name: "Installs", data: instRows.map((r) => r.installs) },
        { name: "Crews", data: instRows.map((r) => r.crews) }
      ];

      // Heatmap → unique rows/cols + dense matrix
      const heatRowsSet = new Set<string>();
      const heatColsSet = new Set<string>();
      const heatRowsList = (heat.data || []) as { row_label: string; col_label: string; value: number }[];
      heatRowsList.forEach((h) => { heatRowsSet.add(h.row_label); heatColsSet.add(h.col_label); });
      const heatRowsSorted = Array.from(heatRowsSet);
      const heatColsSorted = Array.from(heatColsSet);
      // preserve insertion order as inserted (can sort if needed)
      const heatIndex = new Map<string, number>();
      const values = new Array(heatRowsSorted.length * heatColsSorted.length).fill(0);
      heatRowsSorted.forEach((r, ri) => {
        heatColsSorted.forEach((c, ci) => {
          heatIndex.set(`${r}||${c}`, ri * heatColsSorted.length + ci);
        });
      });
      heatRowsList.forEach((h) => {
        const idx = heatIndex.get(`${h.row_label}||${h.col_label}`);
        if (typeof idx === "number") values[idx] = h.value;
      });

      // Pins
      const pinRows = (pins.data || []) as { id: string; title: string; location_x: number | null; location_y: number | null }[];
      const pinsOut = pinRows
        .filter((p) => typeof p.location_x === "number" && typeof p.location_y === "number")
        .map((p) => ({ id: p.id, title: p.title, x: p.location_x as number, y: p.location_y as number }));

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

        pins: pinsOut,

        heatRows: heatRowsSorted,
        heatCols: heatColsSorted,
        heatValues: values,

        feed: (feed.data || []) as any
      });

      setLoading(false);
    })();

    return () => {
      active = false;
    };
  }, []);

  return { data, loading };
}
