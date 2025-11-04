/**
 * Test page for floor planner database integration
 * This page allows testing the floor planner database operations
 */

import React, { useState } from 'react';

import { JobFloorPlan, PlacedFurniture, InstallationTask } from '@/components/floorplanner/types';
import { getFloorPlanForJob, saveFloorPlan, getGeneratedTasksForJob, saveGeneratedTasks } from '@/lib/floorPlannerDB';

export default function TestFloorPlanner() {
  const [jobId, setJobId] = useState('');
  const [floorPlan, setFloorPlan] = useState<JobFloorPlan | null>(null);
  const [tasks, setTasks] = useState<InstallationTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const _testJobId = 'test-job-123';
  const testFurniture: PlacedFurniture[] = [
    {
      id: 'test-furniture-1',
      name: 'Executive Chair',
      productCode: 'CHR001',
      width_cm: 65,
      depth_cm: 70,
      rotation: 0,
      x: 100,
      y: 100
    },
    {
      id: 'test-furniture-2',
      name: 'Executive Desk',
      productCode: 'DSK001',
      width_cm: 160,
      depth_cm: 80,
      rotation: 0,
      x: 200,
      y: 200
    }
  ];

  const loadFloorPlan = async () => {
    if (!jobId) return;
    
    setLoading(true);
    try {
      const plan = await getFloorPlanForJob(jobId);
      setFloorPlan(plan);
      setMessage(`Loaded floor plan: ${plan ? plan.name : 'None found'}`);
    } catch (error: unknown) {
      setMessage(`Error loading floor plan: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const saveTestFloorPlan = async () => {
    setLoading(true);
    try {
      const newFloorPlan: JobFloorPlan = {
        id: `floorplan-${Date.now()}`,
        jobId: jobId,
        name: `Test Floor Plan ${new Date().toISOString()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        floorPlanUrl: null,
        furniture: testFurniture,
        scale: 10
      };

      await saveFloorPlan(newFloorPlan);
      setFloorPlan(newFloorPlan);
      setMessage('Floor plan saved successfully!');
    } catch (error: unknown) {
      setMessage(`Error saving floor plan: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const loadTasks = async () => {
    if (!jobId) return;
    
    setLoading(true);
    try {
      const loadedTasks = await getGeneratedTasksForJob(jobId);
      setTasks(loadedTasks);
      setMessage(`Loaded ${loadedTasks.length} tasks`);
    } catch (error: unknown) {
      setMessage(`Error loading tasks: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const saveTestTasks = async () => {
    setLoading(true);
    try {
      const newTasks: InstallationTask[] = [
        {
          id: `task-${Date.now()}-1`,
          jobId: jobId,
          title: 'Install Executive Chair',
          description: 'Install executive chair at position (100, 100)',
          installOrder: 1,
          furnitureIds: ['test-furniture-1'],
          estimatedTimeMinutes: 30,
          isGenerated: true
        },
        {
          id: `task-${Date.now()}-2`,
          jobId: jobId,
          title: 'Install Executive Desk',
          description: 'Install executive desk at position (200, 200)',
          installOrder: 2,
          furnitureIds: ['test-furniture-2'],
          estimatedTimeMinutes: 45,
          isGenerated: true
        }
      ];

      await saveGeneratedTasks(newTasks);
      setTasks(newTasks);
      setMessage('Tasks saved successfully!');
    } catch (error: unknown) {
      setMessage(`Error saving tasks: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 20, maxWidth: 800, margin: '0 auto' }}>
      <h1>Floor Planner Database Integration Test</h1>
      
      <div style={{ marginBottom: 20 }}>
        <label>
          Job ID:
          <input
            type="text"
            value={jobId}
            onChange={(e) => setJobId(e.target.value)}
            placeholder="Enter a job ID for testing"
            style={{ 
              display: 'block', 
              width: '100%', 
              padding: 8, 
              marginTop: 4,
              borderRadius: 4,
              border: '1px solid #ccc'
            }}
          />
        </label>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 20 }}>
        <button 
          onClick={loadFloorPlan}
          disabled={loading || !jobId}
          style={{ padding: 10, backgroundColor: '#0070f3', color: 'white', border: 'none', borderRadius: 4 }}
        >
          Load Floor Plan
        </button>
        
        <button 
          onClick={saveTestFloorPlan}
          disabled={loading || !jobId}
          style={{ padding: 10, backgroundColor: '#0070f3', color: 'white', border: 'none', borderRadius: 4 }}
        >
          Save Test Floor Plan
        </button>
        
        <button 
          onClick={loadTasks}
          disabled={loading || !jobId}
          style={{ padding: 10, backgroundColor: '#0070f3', color: 'white', border: 'none', borderRadius: 4 }}
        >
          Load Tasks
        </button>
        
        <button 
          onClick={saveTestTasks}
          disabled={loading || !jobId}
          style={{ padding: 10, backgroundColor: '#0070f3', color: 'white', border: 'none', borderRadius: 4 }}
        >
          Save Test Tasks
        </button>
      </div>

      {message && (
        <div style={{ 
          padding: 10, 
          marginBottom: 20, 
          backgroundColor: '#f0f0f0', 
          borderRadius: 4,
          border: '1px solid #ccc'
        }}>
          {message}
        </div>
      )}

      {floorPlan && (
        <div style={{ 
          padding: 15, 
          marginBottom: 20, 
          backgroundColor: '#f9f9f9', 
          borderRadius: 4,
          border: '1px solid #ddd'
        }}>
          <h3>Floor Plan Data</h3>
          <pre>{JSON.stringify(floorPlan, null, 2)}</pre>
        </div>
      )}

      {tasks.length > 0 && (
        <div style={{ 
          padding: 15, 
          marginBottom: 20, 
          backgroundColor: '#f9f9f9', 
          borderRadius: 4,
          border: '1px solid #ddd'
        }}>
          <h3>Tasks Data</h3>
          <pre>{JSON.stringify(tasks, null, 2)}</pre>
        </div>
      )}

      <div style={{ 
        padding: 15, 
        backgroundColor: '#fff8e1', 
        borderRadius: 4,
        border: '1px solid #ffd54f'
      }}>
        <h3>Test Instructions</h3>
        <ol>
          <li>Enter a job ID (e.g., &quot;test-job-123&quot;)</li>
          <li>Click &quot;Save Test Floor Plan&quot; to create a test floor plan</li>
          <li>Click &quot;Load Floor Plan&quot; to verify it was saved</li>
          <li>Click &quot;Save Test Tasks&quot; to create test tasks</li>
          <li>Click &quot;Load Tasks&quot; to verify tasks were saved</li>
        </ol>
        <p><strong>Note:</strong> This is a test page for development purposes only.</p>
      </div>
    </div>
  );
}