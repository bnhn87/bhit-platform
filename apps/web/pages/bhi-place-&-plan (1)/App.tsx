import { LayoutGrid } from 'lucide-react';
import React, { useState, useEffect, useRef } from 'react';

import PlanningInterface from '../../modules/place-and-plan/components/PlanningInterface';
import ProjectDashboard from '../../modules/place-and-plan/components/ProjectDashboard';
import { Project } from '../../modules/place-and-plan/types';

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
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Check if we're in a browser environment
  const isBrowser = typeof window !== 'undefined';

  // Load projects from localStorage on initial render
  useEffect(() => {
    if (!isBrowser) return;
    
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
  }, [isBrowser]);

  // Save projects to localStorage whenever they change
  useEffect(() => {
    if (!isBrowser || !isLoaded) return;
    
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
    } catch (error) {
      console.error("Failed to save projects to storage", error);
    }
  }, [projects, isLoaded, isBrowser]);

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

    if (isBrowser) {
      saveTimeoutRef.current = setTimeout(() => {
          setSaveStatus('saved');
          saveTimeoutRef.current = setTimeout(() => setSaveStatus('idle'), 2000);
      }, 500); // Debounce/throttle saving visual feedback
    }
  };

  const forceSave = () => {
    if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
    }
    setSaveStatus('saving');
    // The useEffect that saves to localStorage will still handle the actual persistence.
    // This just triggers the UI feedback immediately for the user.
    if (isBrowser) {
      saveTimeoutRef.current = setTimeout(() => {
          setSaveStatus('saved');
          saveTimeoutRef.current = setTimeout(() => setSaveStatus('idle'), 2000);
      }, 100);
    }
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
    <div className="bg-gray-800 text-gray-100 font-sans min-h-screen flex flex-col antialiased w-full overflow-x-hidden">
      <header className="flex items-center justify-between p-2 sm:p-4 bg-gray-900 border-b border-gray-700 shadow-lg z-20 flex-shrink-0">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <LayoutGrid className="text-blue-400 flex-shrink-0" size={20} />
          <h1 className="text-sm sm:text-xl font-bold truncate">AI Furniture Installation Planner</h1>
        </div>
      </header>
      <main className="flex-grow overflow-hidden w-full">
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