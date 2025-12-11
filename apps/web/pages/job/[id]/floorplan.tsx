/**
 * Dedicated Floor Plan Page for BHIT Work OS
 * Full-page floor planner with navigation tabs
 */

import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import React from 'react';

import JobFloorPlanner from '@/components/floorplanner/JobFloorPlanner';
import { useUserRole } from '@/hooks/useUserRole';
import { theme } from '@/lib/theme';

export default function FloorPlanPage() {
  const router = useRouter();
  const { id: jobId } = router.query;
  const { role } = useUserRole();
  const canManage = role === 'director' || role === 'ops';

  if (!jobId || typeof jobId !== 'string') {
    return (
      <div style={{ padding: 20, color: theme.colors.textSubtle }}>
        Loading...
      </div>
    );
  }

  const activePath = router.asPath;
  const tabs = [
    { label: "Overview", href: `/job/${jobId}`, active: activePath === `/job/${jobId}` },
    { label: "Floor Plan", href: `/job/${jobId}/floorplan`, active: true },
    { label: "Tasks", href: `/job/${jobId}#tasks`, active: false },
    { label: "Documents", href: `/job/${jobId}/documents`, active: false },
    { label: "Products", href: `/job/${jobId}/products`, active: false },
  ];

  const tabLink = (active: boolean): React.CSSProperties => ({
    padding: "8px 12px",
    borderRadius: 8,
    border: `1px solid ${theme.colors.border}`,
    background: active ? theme.colors.panel : theme.colors.panelAlt,
    color: theme.colors.text,
    textDecoration: "none",
    fontWeight: active ? 800 : 700,
  });

  const btn = (solid = false): React.CSSProperties => ({
    padding: "10px 14px",
    borderRadius: 10,
    border: solid ? `1px solid ${theme.colors.accent}` : `1px solid ${theme.colors.border}`,
    background: solid ? theme.colors.accent : theme.colors.panelAlt,
    color: solid ? "#fff" : theme.colors.text,
    fontWeight: 800,
    textDecoration: "none",
    cursor: "pointer",
  });

  return (
    <>
      <Head>
        <title>Floor Plan - Job {jobId} | BHIT Work OS</title>
      </Head>
      
      <div style={{
        minHeight: '100vh',
        background: theme.colors.bg,
        padding: 20
      }}>
        {/* Navigation Tabs */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
          {tabs.map((t) => (
            <Link key={t.href} href={t.href} style={tabLink(t.active)}>
              {t.label}
            </Link>
          ))}
          <span style={{ marginLeft: "auto" }} />
          <Link href="/jobs" style={btn(false)}>Back to Jobs</Link>
          <button
            onClick={async () => {
              const url = `${window.location.origin}/job/${jobId}/floorplan`;
              try {
                const nav = navigator as unknown as { share?: (data: { title: string; url: string }) => Promise<void>; clipboard: { writeText: (text: string) => Promise<void> } };
                if ('share' in navigator && nav.share) {
                  await nav.share({ title: "Job Floor Plan", url });
                } else {
                  await nav.clipboard.writeText(url);
                  alert("Link copied.");
                }
              } catch {
                const nav = navigator as unknown as { clipboard: { writeText: (text: string) => Promise<void> } };
                await nav.clipboard.writeText(url);
                alert("Link copied.");
              }
            }}
            style={btn(false)}
          >
            Share
          </button>
        </div>

        {/* Floor Planner Component */}
        <div style={{
          background: theme.colors.panel,
          border: `1px solid ${theme.colors.border}`,
          borderRadius: 8,
          padding: 16
        }}>
          <JobFloorPlanner 
            jobId={jobId}
            canManage={canManage}
            onGenerateTasks={(tasks) => {
              alert(`Generated ${tasks.length} installation tasks! View them in the Tasks tab.`);
            }}
          />
        </div>

        {/* Information Panel */}
        <div style={{
          marginTop: 16,
          padding: 16,
          background: theme.colors.panelAlt,
          border: `1px solid ${theme.colors.border}`,
          borderRadius: 8
        }}>
          <h3 style={{ margin: "0 0 12px 0", color: theme.colors.text }}>Floor Planner Guide</h3>
          <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))" }}>
            <div>
              <h4 style={{ margin: "0 0 8px 0", color: theme.colors.text }}>Getting Started</h4>
              <ul style={{ margin: 0, paddingLeft: 20, fontSize: 14, color: theme.colors.textSubtle }}>
                <li>Create a new project or load existing one</li>
                <li>Import work orders from PDF/CSV files</li>
                <li>Drag and drop furniture items</li>
                <li>Arrange items in your space</li>
              </ul>
            </div>
            <div>
              <h4 style={{ margin: "0 0 8px 0", color: theme.colors.text }}>Features</h4>
              <ul style={{ margin: 0, paddingLeft: 20, fontSize: 14, color: theme.colors.textSubtle }}>
                <li>AI-powered furniture placement</li>
                <li>Automatic task generation</li>
                <li>SmartQuote product integration</li>
                <li>Real-time collaboration</li>
              </ul>
            </div>
            <div>
              <h4 style={{ margin: "0 0 8px 0", color: theme.colors.text }}>Tips</h4>
              <ul style={{ margin: 0, paddingLeft: 20, fontSize: 14, color: theme.colors.textSubtle }}>
                <li>Set scale for accurate measurements</li>
                <li>Group related items together</li>
                <li>Use room zones for organization</li>
                <li>Generate tasks when planning is complete</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}