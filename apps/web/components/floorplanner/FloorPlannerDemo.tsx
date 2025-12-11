/**
 * Floor Planner Demo Component
 * Demonstrates full floor planner functionality with SmartQuote integration
 */

import React, { useState } from 'react';

import { theme } from '../../lib/theme';

import JobFloorPlanner from './JobFloorPlanner';
import { SMART_QUOTE_FURNITURE } from './SmartQuoteFurniture';
import { JobFloorPlan, PlacedFurniture, InstallationTask } from './types';

interface Props {
  jobId: string;
}

export default function FloorPlannerDemo({ jobId }: Props) {
  const [generatedTasks, setGeneratedTasks] = useState<InstallationTask[]>([]);
  const [showDemo, setShowDemo] = useState(false);

  const handleGenerateTasks = (tasks: InstallationTask[]) => {
    setGeneratedTasks(tasks);
    // eslint-disable-next-line no-console
  };

  const _createDemoFloorPlan = (): JobFloorPlan => {
    const demoFurniture: PlacedFurniture[] = [
      {
        id: 'demo_exec_chair_1',
        name: 'Executive Chair',
        productCode: 'CHR001',
        width_cm: 65,
        depth_cm: 70,
        x: 150,
        y: 120,
        rotation: 0,
        roomZone: 'office',
        color: '#2563eb',
        installOrder: 1
      },
      {
        id: 'demo_exec_desk_1',
        name: 'Executive Desk',
        productCode: 'DSK001',
        width_cm: 160,
        depth_cm: 80,
        x: 200,
        y: 80,
        rotation: 0,
        roomZone: 'office',
        color: '#7c3aed',
        installOrder: 2
      },
      {
        id: 'demo_meeting_table_1',
        name: 'Meeting Table',
        productCode: 'TBL001',
        width_cm: 240,
        depth_cm: 120,
        x: 450,
        y: 150,
        rotation: 0,
        roomZone: 'meeting',
        color: '#be123c',
        installOrder: 3
      }
    ];

    return {
      id: `demo_plan_${jobId}`,
      jobId,
      name: 'Demo Floor Plan',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      floorPlanUrl: null,
      furniture: demoFurniture,
      scale: 2
    };
  };

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      {/* Demo Controls */}
      <div style={{
        padding: 16,
        background: theme.colors.panel,
        border: `1px solid ${theme.colors.border}`,
        borderRadius: 8
      }}>
        <h3 style={{ margin: '0 0 12px 0', color: theme.colors.text }}>
          🎯 BHIT Floor Planner - Fully Working Demo
        </h3>
        <p style={{ 
          margin: '0 0 16px 0', 
          color: theme.colors.textSubtle, 
          fontSize: 14,
          lineHeight: 1.5 
        }}>
          Complete floor planning system with SmartQuote integration, drag-and-drop furniture placement, 
          and automated task generation for installation workflows.
        </p>
        
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button
            onClick={() => setShowDemo(!showDemo)}
            style={{
              padding: '8px 16px',
              borderRadius: 6,
              border: `1px solid ${theme.colors.accent}`,
              background: showDemo ? theme.colors.accent : theme.colors.panel,
              color: showDemo ? 'white' : theme.colors.accent,
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            {showDemo ? 'Hide Demo Features' : 'Show Demo Features'}
          </button>
          
          <div style={{
            padding: '8px 12px',
            background: theme.colors.panelAlt,
            borderRadius: 6,
            fontSize: 12,
            color: theme.colors.textSubtle
          }}>
            💡 Features: Drag & Drop • Task Generation • SmartQuote Integration • Room Management
          </div>
        </div>
      </div>

      {/* Demo Feature List */}
      {showDemo && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 12,
          padding: 16,
          background: theme.colors.panelAlt,
          border: `1px solid ${theme.colors.border}`,
          borderRadius: 8
        }}>
          <div>
            <h4 style={{ margin: '0 0 8px 0', color: theme.colors.text, fontSize: 14 }}>
              ✨ Interactive Features
            </h4>
            <ul style={{ margin: 0, paddingLeft: 16, color: theme.colors.textSubtle, fontSize: 12 }}>
              <li>Drag and drop furniture placement</li>
              <li>Real-time position updates</li>
              <li>Multi-room organization</li>
              <li>Double-click to remove items</li>
            </ul>
          </div>
          
          <div>
            <h4 style={{ margin: '0 0 8px 0', color: theme.colors.text, fontSize: 14 }}>
              🛠️ SmartQuote Integration
            </h4>
            <ul style={{ margin: 0, paddingLeft: 16, color: theme.colors.textSubtle, fontSize: 12 }}>
              <li>{SMART_QUOTE_FURNITURE.length}+ furniture products</li>
              <li>Product codes and pricing</li>
              <li>Category-based selection</li>
              <li>Installation time estimates</li>
            </ul>
          </div>
          
          <div>
            <h4 style={{ margin: '0 0 8px 0', color: theme.colors.text, fontSize: 14 }}>
              📋 Task Generation
            </h4>
            <ul style={{ margin: 0, paddingLeft: 16, color: theme.colors.textSubtle, fontSize: 12 }}>
              <li>Automated task creation</li>
              <li>Room-by-room sequences</li>
              <li>Time estimation</li>
              <li>Dependency management</li>
            </ul>
          </div>
        </div>
      )}

      {/* Main Floor Planner */}
      <JobFloorPlanner 
        jobId={jobId}
        canManage={true}
        onGenerateTasks={handleGenerateTasks}
      />

      {/* Generated Tasks Display */}
      {generatedTasks.length > 0 && (
        <div style={{
          padding: 16,
          background: theme.colors.panel,
          border: `1px solid ${theme.colors.border}`,
          borderRadius: 8
        }}>
          <h3 style={{ margin: '0 0 12px 0', color: theme.colors.text }}>
            📋 Generated Installation Tasks ({generatedTasks.length})
          </h3>
          <div style={{ display: 'grid', gap: 8 }}>
            {generatedTasks.map((task, index) => (
              <div
                key={task.id}
                style={{
                  padding: 12,
                  background: theme.colors.panelAlt,
                  border: `1px solid ${theme.colors.border}`,
                  borderRadius: 6,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div>
                  <div style={{ 
                    fontWeight: 600, 
                    color: theme.colors.text,
                    marginBottom: 4
                  }}>
                    {index + 1}. {task.title}
                  </div>
                  <div style={{ 
                    fontSize: 12, 
                    color: theme.colors.textSubtle
                  }}>
                    {task.description}
                    {task.roomZone && ` • Room: ${task.roomZone}`}
                  </div>
                </div>
                <div style={{
                  padding: '4px 8px',
                  background: theme.colors.accent,
                  color: 'white',
                  borderRadius: 4,
                  fontSize: 11,
                  fontWeight: 600
                }}>
                  {task.estimatedTimeMinutes}min
                </div>
              </div>
            ))}
          </div>
          
          <div style={{
            marginTop: 12,
            padding: 12,
            background: theme.colors.bg,
            borderRadius: 6,
            fontSize: 12,
            color: theme.colors.textSubtle
          }}>
            💡 Total estimated time: {generatedTasks.reduce((sum, task) => sum + (task.estimatedTimeMinutes || 0), 0)} minutes
          </div>
        </div>
      )}
    </div>
  );
}