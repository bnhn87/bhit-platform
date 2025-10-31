import React from "react";

import { theme } from "../lib/theme";

type ActivityFeedProps = {
  title: string;
  rows?: { id: string; text: string; occurred_at: string }[];
};

export default function ActivityFeed({ title, rows = [] }: ActivityFeedProps) {
  return (
    <div style={{ padding: 16 }}>
      <div style={{ fontWeight: 600, marginBottom: 8 }}>{title}</div>
      {rows.length === 0 ? (
        <div style={{ color: theme.colors.textSubtle, fontSize: 14 }}>
          No recent activity. (Component is working!)
        </div>
      ) : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {rows.map((row) => (
            <li key={row.id} style={{ marginBottom: 6, fontSize: 14 }}>
              <span style={{ color: theme.colors.textSubtle, marginRight: 8 }}>
                {new Date(row.occurred_at).toLocaleString()}
              </span>
              {row.text}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
