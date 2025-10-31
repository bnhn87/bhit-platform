import React from "react";

export default function ProductsTab({
  jobId,
  canManage,
}: {
  jobId: string;
  canManage: boolean;
}) {
  return (
    <div style={{ opacity: 0.9 }}>
      Products placeholder for job <b>{jobId}</b>. Wire to Smart Quote output
      and product lines. {canManage ? "(manage enabled later)" : ""}
    </div>
  );
}
