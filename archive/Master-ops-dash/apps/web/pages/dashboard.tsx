import StatCard from "../components/ui/StatCard";
import RingGauge from "../components/ui/RingGauge";
import ProgressBar from "../components/ui/ProgressBar";
import BarChart from "../components/charts/BarChart";
import Heatmap from "../components/charts/Heatmap";
import MapPanel from "../components/MapPanel";
import ActivityFeed from "../components/ActivityFeed";
import { useRequireAuth } from "../hooks/useRequireAuth";
import { useDashboardData } from "../hooks/useDashboardData";
import { theme } from "../lib/theme";
import { useRouter } from "next/router";

// Define panelStyle based on theme
const panelStyle = {
  background: theme.colors.panel,
  border: `1px solid ${theme.colors.border}`,
  borderRadius: theme.radii.md,
};

const bigNumStyle: React.CSSProperties = { letterSpacing: 0.2, fontWeight: 800 };
function SkeletonCard() {
  return <div style={{ ...panelStyle, padding: 18, minHeight: 108, opacity: 0.5 }} />;
}

export default function Dashboard() {
  useRequireAuth();
  const router = useRouter();
  const { data, loading } = useDashboardData();

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ color: theme.colors.text }}>Dashboard</h1>
        <div style={{ display: "flex", gap: 12 }}>
          <button
            onClick={() => router.push('/today')}
            style={{
              border: `1px solid ${theme.colors.border}`,
              background: theme.colors.panel,
              padding: "8px 12px",
              borderRadius: theme.radii.sm,
              cursor: "pointer",
              color: theme.colors.text,
            }}
          >
            Today
          </button>
          <button
            onClick={() => router.push('/jobs')}
            style={{
              border: `1px solid ${theme.colors.border}`,
              background: theme.colors.panel,
              padding: "8px 12px",
              borderRadius: theme.radii.sm,
              cursor: "pointer",
              color: theme.colors.text,
            }}
          >
            All Jobs
          </button>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 16,
        }}
      >
        {loading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          <>
            <StatCard title="JOBS IN PROGRESS" value={data!.jobsInProgress} />
            <StatCard title="QUOTES PENDING" value={data!.quotesPending} />
            <StatCard title="CREW UTILIZATION" value="" right={<RingGauge percent={Math.round(data!.crewUtilization)} />} />
            <StatCard title="VEHICLES IN USE" value={data!.vehiclesInUse} />
            <StatCard title="WASTE LOADS BOOKED" value={data!.wasteLoadsToday} />
            <StatCard title="AVG BUFFER USED" value={`${Math.round(data!.avgBufferUsed)}%`} right={<ProgressBar value={data!.avgBufferUsed} />} />
            <StatCard title="NET MARGIN" value={`€${(data!.netMargin / 1000).toFixed(1)}k`} />
          </>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 16 }}>
        {loading ? (
          <div style={{ ...panelStyle, height: 260 }} />
        ) : (
          <BarChart title="Crew vs Install Days" x={data!.installsX} series={data!.installsSeries} />
        )}
        {loading ? <div style={{ ...panelStyle, height: 300 }} /> : <MapPanel pins={data!.pins} />}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {loading ? <div style={{ ...panelStyle, height: 220 }} /> : <ActivityFeed title="Activity Feed" rows={data!.feed} />}
        {loading ? (
          <div style={{ ...panelStyle, height: 220 }} />
        ) : (
          <Heatmap title="Pipeline Heatmap" cols={data!.heatCols} rows={data!.heatRows} data={data!.heatValues} />
        )}
      </div>
    </div>
  );
}