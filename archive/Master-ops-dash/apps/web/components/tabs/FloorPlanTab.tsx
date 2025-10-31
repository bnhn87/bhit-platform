import React from "react";
import Link from "next/link";

export default function FloorPlanTab({ jobId }: { jobId: string }) {
  return (
    <div style={{ display: "grid", gap: 8 }}>
      <div>Open the full Floor Planner for this job:</div>
      <Link
        href={`/job/${jobId}/floorplan`}
        style={{
          padding: "10px 14px",
          borderRadius: 10,
          background: "#1d91ff",
          color: "#fff",
          textDecoration: "none",
          fontWeight: 800,
          width: "fit-content",
        }}
      >
        Launch Floor Planner
      </Link>
    </div>
  );
}
