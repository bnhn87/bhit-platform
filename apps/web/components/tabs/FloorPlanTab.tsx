import React, { useState, useEffect } from "react";

import { supabase } from "@/lib/supabaseClient";
import { theme } from "@/lib/theme";

export default function FloorPlanTab({ jobId, canManage: _canManage }: { jobId: string; canManage?: boolean }) {
  const [hasFloorPlan, setHasFloorPlan] = useState(false);
  const [loading, setLoading] = useState(true);

  // Check if floor plan exists for this job
  useEffect(() => {
    const checkFloorPlan = async () => {
      if (!jobId) return;
      
      try {
        const { data, error } = await supabase
          .from('job_floorplans')
          .select('id')
          .eq('job_id', jobId)
          .single();
          
        if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows" error
          console.error('Error checking floor plan:', error);
        }
        
        setHasFloorPlan(!!data);
      } catch (error: unknown) {
        console.error('Error checking floor plan:', error);
      } finally {
        setLoading(false);
      }
    };
    
    checkFloorPlan();
  }, [jobId]);

  const openJobFloorPlanner = () => {
    // Open job-specific floor planner in a pop-out window
    const url = `/job/${jobId}/floorplan`;
    window.open(url, 'floor-planner-job', 'width=1400,height=900,scrollbars=yes,resizable=yes,toolbar=no,menubar=no');
  };

  const openStandaloneFloorPlanner = () => {
    // Open standalone floor planner in a pop-out window
    const url = `/floor-planner`;
    window.open(url, 'floor-planner-standalone', 'width=1400,height=900,scrollbars=yes,resizable=yes,toolbar=no,menubar=no');
  };

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ 
        padding: 20, 
        background: theme.colors.panelAlt, 
        borderRadius: 8, 
        border: `1px solid ${theme.colors.border}` 
      }}>
        <h3 style={{ margin: "0 0 16px 0", color: theme.colors.text, fontSize: 18 }}>
          🏗️ Floor Plan & Installation Planner
        </h3>
        <p style={{ margin: "0 0 20px 0", color: theme.colors.textSubtle, fontSize: 14, lineHeight: 1.5 }}>
          Create interactive floor plans with AI-powered furniture placement. 
          Import work orders, drag and drop furniture items, and automatically 
          generate installation tasks for your team.
        </p>

        <div style={{
          display: "grid", 
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 16,
          marginBottom: 20
        }}>
          {/* Job-Specific Planner */}
          <div style={{
            padding: 16,
            background: theme.colors.panel,
            borderRadius: 8,
            border: `1px solid ${theme.colors.border}`
          }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 12
            }}>
              <div style={{
                width: 32,
                height: 32,
                background: theme.colors.accent,
                borderRadius: 6,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 16
              }}>
                📋
              </div>
              <div>
                <h4 style={{ margin: 0, color: theme.colors.text, fontSize: 14, fontWeight: 600 }}>
                  Job Floor Planner
                </h4>
                <div style={{ fontSize: 12, color: theme.colors.textSubtle }}>
                  {hasFloorPlan ? "Plan exists" : "No plan yet"} • Job #{jobId}
                </div>
              </div>
            </div>
            <p style={{ margin: "0 0 16px 0", color: theme.colors.textSubtle, fontSize: 13, lineHeight: 1.4 }}>
              Plan furniture layout specifically for this job. Links to job data and saves progress automatically.
            </p>
            <button
              onClick={openJobFloorPlanner}
              style={{
                padding: "10px 16px",
                borderRadius: 6,
                background: theme.colors.accent,
                border: "none",
                color: "white",
                cursor: "pointer",
                fontWeight: 600,
                fontSize: 14,
                width: "100%"
              }}
            >
              🚀 Open Job Planner
            </button>
          </div>

          {/* Standalone Planner */}
          <div style={{
            padding: 16,
            background: theme.colors.panel,
            borderRadius: 8,
            border: `1px solid ${theme.colors.border}`
          }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 12
            }}>
              <div style={{
                width: 32,
                height: 32,
                background: theme.colors.accentAlt,
                borderRadius: 6,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 16
              }}>
                🎨
              </div>
              <div>
                <h4 style={{ margin: 0, color: theme.colors.text, fontSize: 14, fontWeight: 600 }}>
                  Standalone Planner
                </h4>
                <div style={{ fontSize: 12, color: theme.colors.textSubtle }}>
                  Independent projects
                </div>
              </div>
            </div>
            <p style={{ margin: "0 0 16px 0", color: theme.colors.textSubtle, fontSize: 13, lineHeight: 1.4 }}>
              Create general floor plans and layouts. Perfect for testing ideas or creating templates.
            </p>
            <button
              onClick={openStandaloneFloorPlanner}
              style={{
                padding: "10px 16px",
                borderRadius: 6,
                background: theme.colors.accentAlt,
                border: "none",
                color: "white",
                cursor: "pointer",
                fontWeight: 600,
                fontSize: 14,
                width: "100%"
              }}
            >
              ✨ Open Standalone Planner
            </button>
          </div>
        </div>

        {/* Status and Info */}
        <div style={{
          padding: 12,
          background: theme.colors.bg,
          borderRadius: 6,
          border: `1px solid ${theme.colors.border}`,
          fontSize: 12,
          color: theme.colors.textSubtle
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span>ℹ️</span>
            <div>
              Floor planners open in pop-out windows for the best experience. 
              {loading ? " Checking for existing plans..." : 
                hasFloorPlan ? " This job already has floor plan data." : 
                " No floor plan data found for this job yet."
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}