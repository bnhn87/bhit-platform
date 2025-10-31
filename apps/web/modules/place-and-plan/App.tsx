
import { LayoutGrid } from 'lucide-react';
import React, { useState, useEffect, useRef } from 'react';

import PlanningInterface from './components/PlanningInterface';
import ProjectDashboard from './components/ProjectDashboard';
import { Project } from './types';

const STORAGE_KEY = 'ai_planner_projects';

const getSampleProject = (): Project => ({
  id: `proj_${Date.now()}`,
  name: "My First Project",
  createdAt: new Date().toISOString(),
  floorPlanUrl: null,
  furniture: [],
  scale: null,
});

export default function App() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const saveTimeoutRef = useRef<number | null>(null);


  // Load projects from localStorage on initial render
  useEffect(() => {
    try {
      const storedProjects = localStorage.getItem(STORAGE_KEY);
      if (storedProjects) {
        setProjects(JSON.parse(storedProjects));
      } else {
        // If no projects, start with a sample one
        setProjects([getSampleProject()]);
      }
    } catch (error) {
      console.error("Failed to load projects from storage, creating a sample project.", error);
      setProjects([getSampleProject()]);
    }
    setIsLoaded(true);
  }, []);

  // Save projects to localStorage whenever they change
  useEffect(() => {
    if (isLoaded) {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
        } catch (error) {
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
  };

  const handleUpdateProject = (updatedProject: Project) => {
    if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
    }
    setSaveStatus('saving');

    setProjects(currentProjects =>
      currentProjects.map(p => (p.id === updatedProject.id ? updatedProject : p))
    );

    saveTimeoutRef.current = window.setTimeout(() => {
        setSaveStatus('saved');
        saveTimeoutRef.current = window.setTimeout(() => setSaveStatus('idle'), 2000);
    }, 500); // Debounce/throttle saving visual feedback
  };

  const forceSave = () => {
    if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
    }
    setSaveStatus('saving');
    // The useEffect that saves to localStorage will still handle the actual persistence.
    // This just triggers the UI feedback immediately for the user.
    saveTimeoutRef.current = window.setTimeout(() => {
        setSaveStatus('saved');
        saveTimeoutRef.current = window.setTimeout(() => setSaveStatus('idle'), 2000);
    }, 100); 
  };

  const handleBackToDashboard = () => {
    setSelectedProjectId(null);
  };

  if (!isLoaded) {
    return (
      <div className="w-full h-screen bg-gray-800 flex items-center justify-center">
        <div className="animate-spin rounded-full h-24 w-24 border-t-4 border-b-4 border-blue-500"></div>
      </div>
    );
  }

  const selectedProject = projects.find(p => p.id === selectedProjectId) || null;

  return (
    <div className="bg-gray-800 text-gray-100 font-sans h-screen flex flex-col antialiased">
      <header className="flex items-center justify-between p-4 bg-gray-900 border-b border-gray-700 shadow-lg z-20">
        <div className="flex items-center gap-3">
          <LayoutGrid className="text-blue-400" size={24} />
          <h1 className="text-xl font-bold">AI Furniture Installation Planner</h1>
        </div>
      </header>
      <main className="flex-grow overflow-hidden">
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
      </main>
    </div>
  );
}