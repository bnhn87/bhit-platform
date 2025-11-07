/**
 * Complete Google Studio BHI Place & Plan Application
 * Embedded within BHIT Work OS job system with full functionality
 */

import React, { useState, useEffect, useRef } from 'react';

import { getFloorPlanForJob, saveFloorPlan } from '../../lib/floorPlannerDB';
import { supabase as _supabase } from '../../lib/supabaseClient';
import { theme } from '../../lib/theme';
import PlanningInterface from '../../modules/place-and-plan/components/PlanningInterface';
import ProjectDashboard from '../../modules/place-and-plan/components/ProjectDashboard';
import { Project } from '../../modules/place-and-plan/types';

import { JobFloorPlan, PlacedFurniture, InstallationTask } from './types';
import WorkOrderImport from './WorkOrderImport';

// Import complete Google Studio app components

const STORAGE_KEY = 'ai_planner_projects';

const getSampleProject = (): Project => ({
  id: `proj_${Date.now()}`,
  name: "Job Floor Plan Project",
  createdAt: new Date().toISOString(),
  floorPlanUrl: null,
  furniture: [],
  scale: null,
});

interface Props {
  jobId: string;
  canManage: boolean;
  onGenerateTasks?: (tasks: InstallationTask[]) => void;
}

export default function JobFloorPlanner({ jobId, canManage, onGenerateTasks }: Props) {
  // Complete Google Studio App State
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const saveTimeoutRef = useRef<number | null>(null);
  const [showInteractivePlanner, setShowInteractivePlanner] = useState(false);
  const [showWorkOrderImport, setShowWorkOrderImport] = useState(false);
  const [importMessage, setImportMessage] = useState<string | null>(null);

  // Load projects from localStorage on initial render
  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      setIsLoaded(true);
      return;
    }
    
    try {
      const storedProjects = localStorage.getItem(STORAGE_KEY);
      if (storedProjects) {
        setProjects(JSON.parse(storedProjects));
      } else {
        // If no projects, start with a sample one
        const initialProject = getSampleProject();
        setProjects([initialProject]);
        setSelectedProjectId(initialProject.id); // Auto-select for job context
      }
    } catch (error: unknown) {
      console.error("Failed to load projects from storage, creating a sample project.", error);
      const initialProject = getSampleProject();
      setProjects([initialProject]);
      setSelectedProjectId(initialProject.id);
    }
    setIsLoaded(true);
  }, []);

  // Load floor plan from database
  useEffect(() => {
    const loadFloorPlanFromDB = async () => {
      if (!jobId) return;
      
      try {
        const floorPlan = await getFloorPlanForJob(jobId);
        
        if (floorPlan) {
          // Convert database format to Google Studio format
          const project: Project = {
            id: floorPlan.id,
            name: floorPlan.name,
            createdAt: floorPlan.createdAt,
            floorPlanUrl: floorPlan.floorPlanUrl,
            furniture: floorPlan.furniture,
            scale: floorPlan.scale
          };
          
          setProjects([project]);
          setSelectedProjectId(project.id);
        }
      } catch (error: unknown) {
        console.error('Error loading floor plan from database:', error);
      }
    };
    
    loadFloorPlanFromDB();
  }, [jobId]);

  // Save projects to localStorage whenever they change
  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return;
    }
    
    if (isLoaded) {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
        } catch (error: unknown) {
          console.error("Failed to save projects to storage", error);
        }
    }
  }, [projects, isLoaded]);

  const handleCreateProject = async (projectName: string) => {
    const newProject: Project = {
        id: `proj_${Date.now()}`,
        name: projectName,
        createdAt: new Date().toISOString(),
        floorPlanUrl: null,
        furniture: [],
        scale: null,
    };
    setProjects(currentProjects => [...currentProjects, newProject]);
    setSelectedProjectId(newProject.id);
  };

  const handleSelectProject = (project: Project) => {
    setSelectedProjectId(project.id);
    setShowInteractivePlanner(true); // Auto-start interactive planner when project selected
  };

  const handleUpdateProject = async (updatedProject: Project) => {
    if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
    }
    setSaveStatus('saving');

    setProjects(currentProjects =>
      currentProjects.map(p => (p.id === updatedProject.id ? updatedProject : p))
    );

    // Save to database
    try {
      // Convert BaseFurniture to PlacedFurniture by ensuring x and y are numbers
      const placedFurniture: PlacedFurniture[] = updatedProject.furniture.map(item => ({
        ...item,
        x: item.x ?? 0,
        y: item.y ?? 0
      }));

      const projectToSave: JobFloorPlan = {
        id: updatedProject.id,
        jobId: jobId,
        name: updatedProject.name,
        createdAt: String(updatedProject.createdAt),
        updatedAt: new Date().toISOString(),
        floorPlanUrl: updatedProject.floorPlanUrl,
        furniture: placedFurniture,
        scale: updatedProject.scale,
        floorPlanWidth: undefined,
        floorPlanHeight: undefined
      };

      await saveFloorPlan(projectToSave);
    } catch (error: unknown) {
      console.error('Error saving floor plan to database:', error);
    }

    // Generate tasks from furniture placement if callback provided
    if (onGenerateTasks && updatedProject.furniture.length > 0) {
      const tasks: InstallationTask[] = updatedProject.furniture.map((item, index) => ({
        id: `task_${item.id}`,
        jobId,
        title: `Install ${item.name}`,
        description: `Install ${item.name} at position (${Math.round(item.x || 0)}, ${Math.round(item.y || 0)})`,
        installOrder: index + 1,
        furnitureIds: [item.id],
        estimatedTimeMinutes: 30,
        isGenerated: true
      }));
      onGenerateTasks(tasks);
    }

    saveTimeoutRef.current = (typeof window !== 'undefined' ? window.setTimeout(() => {
        setSaveStatus('saved');
        saveTimeoutRef.current = typeof window !== 'undefined' ? window.setTimeout(() => setSaveStatus('idle'), 2000) : null;
    }, 500) : null);
  };

  const forceSave = () => {
    if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
    }
    setSaveStatus('saving');
    saveTimeoutRef.current = (typeof window !== 'undefined' ? window.setTimeout(() => {
        setSaveStatus('saved');
        saveTimeoutRef.current = typeof window !== 'undefined' ? window.setTimeout(() => setSaveStatus('idle'), 2000) : null;
    }, 100) : null);
  };

  const handleBackToDashboard = () => {
    setSelectedProjectId(null);
    setShowInteractivePlanner(false);
  };

  const handleWorkOrderImport = (furniture: PlacedFurniture[], summary: string) => {
    // Convert BHIT furniture to Google Studio format
    const convertedFurniture = furniture.map(item => ({
      id: item.id,
      name: item.name,
      width_cm: item.width_cm,
      depth_cm: item.depth_cm,
      rotation: item.rotation,
      x: item.x,
      y: item.y,
      groupId: item.groupId,
      color: item.color,
      stackId: item.stackId,
      productCode: item.productCode,
      lineNumber: item.lineNumber
    }));
    
    const selectedProject = projects.find(p => p.id === selectedProjectId);
    if (selectedProject) {
      const updatedProject = {
        ...selectedProject,
        furniture: [...selectedProject.furniture, ...convertedFurniture]
      };
      handleUpdateProject(updatedProject);
    }
    
    setImportMessage(summary);
    setShowWorkOrderImport(false);
    setTimeout(() => setImportMessage(null), 5000);
  };

  if (!isLoaded) {
    return (
      <div style={{
        width: '100%',
        height: '400px',
        background: theme.colors.panelAlt,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          width: '48px',
          height: '48px',
          border: `4px solid ${theme.colors.accent}`,
          borderTop: '4px solid transparent',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
      </div>
    );
  }

  const selectedProject = projects.find(p => p.id === selectedProjectId) || null;

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      {/* BHIT Job System Integration Controls */}
      {!showInteractivePlanner && (
        <div style={{ 
          padding: 16, 
          background: theme.colors.panel, 
          border: `1px solid ${theme.colors.border}`, 
          borderRadius: 8 
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            marginBottom: 16
          }}>
            <h3 style={{ margin: 0, color: theme.colors.text }}>Floor Plan</h3>
            <div style={{ display: 'flex', gap: 8 }}>
              {canManage && (
                <>
                  <button
                    onClick={() => setShowWorkOrderImport(true)}
                    style={{
                      padding: '8px 16px',
                      borderRadius: 6,
                      border: `1px solid ${theme.colors.accentAlt}`,
                      background: theme.colors.accentAlt,
                      color: 'white',
                      cursor: 'pointer',
                      fontWeight: 600
                    }}
                  >
                    📋 Add Work Order
                  </button>
                  <button
                    onClick={() => setShowInteractivePlanner(true)}
                    style={{
                      padding: '8px 16px',
                      borderRadius: 6,
                      border: `1px solid ${theme.colors.accent}`,
                      background: theme.colors.accent,
                      color: 'white',
                      cursor: 'pointer',
                      fontWeight: 600
                    }}
                  >
                    🚀 Show Interactive Planner
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Project Summary */}
          {selectedProject && (
            <div style={{
              padding: 12,
              background: theme.colors.panelAlt,
              borderRadius: 6,
              fontSize: 14,
              color: theme.colors.textSubtle
            }}>
              <div><strong>Project:</strong> {selectedProject.name}</div>
              <div><strong>Furniture Items:</strong> {selectedProject.furniture.length}</div>
              <div><strong>Scale:</strong> {selectedProject.scale ? `${selectedProject.scale} px/cm` : 'Not set'}</div>
            </div>
          )}
        </div>
      )}

      {/* Complete Google Studio Floor Planner */}
      {showInteractivePlanner ? (
        <div style={{
          background: '#0a0f16',
          borderRadius: 8,
          overflow: 'hidden',
          minHeight: '80vh'
        }}>
          {/* Google Studio App Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: 16,
            background: '#1a1f2e',
            borderBottom: '1px solid #374151'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 24,
                height: 24,
                background: '#3b82f6',
                borderRadius: 4,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: 12,
                fontWeight: 'bold'
              }}>⊞</div>
              <h1 style={{ margin: 0, fontSize: 18, fontWeight: 'bold', color: '#e5e7eb' }}>
                AI Furniture Installation Planner
              </h1>
            </div>
            <button
              onClick={handleBackToDashboard}
              style={{
                padding: '8px 16px',
                borderRadius: 6,
                border: '1px solid #374151',
                background: '#374151',
                color: '#e5e7eb',
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              ← Back to Job
            </button>
          </div>

          {/* Google Studio App Content */}
          <div style={{ overflow: 'hidden' }}>
            {selectedProject ? (
              <PlanningInterface
                key={selectedProject.id}
                project={selectedProject}
                onBack={handleBackToDashboard}
                onUpdateProject={handleUpdateProject}
                saveStatus={saveStatus}
                forceSave={forceSave}
              />
            ) : (
              <ProjectDashboard
                projects={projects}
                onSelectProject={handleSelectProject}
                onCreateProject={handleCreateProject}
              />
            )}
          </div>
        </div>
      ) : null}

      {/* Import Success Message */}
      {importMessage && (
        <div style={{
          padding: 12,
          background: theme.colors.accentAlt,
          color: 'white',
          borderRadius: 6,
          fontSize: 14,
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: 8
        }}>
          ✓ {importMessage}
        </div>
      )}

      {/* Work Order Import Modal */}
      {showWorkOrderImport && (
        <WorkOrderImport
          onImportComplete={handleWorkOrderImport}
          onClose={() => setShowWorkOrderImport(false)}
        />
      )}
    </div>
  );
}