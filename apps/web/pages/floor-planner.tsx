/**
 * Standalone Floor Planner - BHIT Work OS
 * Built to match original AI Furniture Installation Planner functionality
 */

import { LayoutGrid } from 'lucide-react';
import dynamic from 'next/dynamic';
import Head from 'next/head';
import Script from 'next/script';
import React, { useState, useEffect, useRef } from 'react';

import { theme } from '../lib/theme';

// Dynamically import components to avoid webpack bundling issues
const PlanningInterface = dynamic(() => import('../modules/place-and-plan/components/PlanningInterface'), {
  ssr: false,
  loading: () => <div style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    color: '#e5e7eb'
  }}>Loading Planning Interface...</div>
});

const ProjectDashboard = dynamic(() => import('../modules/place-and-plan/components/ProjectDashboard'), {
  ssr: false,
  loading: () => <div style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    color: theme.colors.textSubtle
  }}>Loading Project Dashboard...</div>
});

// Import types statically since they don't have runtime dependencies
import type { Project } from '../modules/place-and-plan/types';

const STORAGE_KEY = 'ai_planner_projects';

// Storage management utilities
const getStorageUsage = () => {
  if (typeof localStorage === 'undefined') return { used: 0, total: 0, percentage: 0 };

  let used = 0;
  for (let key in localStorage) {
    if (localStorage.hasOwnProperty(key)) {
      used += localStorage[key].length + key.length;
    }
  }

  // Most browsers have 5-10MB limit for localStorage
  const total = 5 * 1024 * 1024; // 5MB estimate
  const percentage = (used / total) * 100;

  return { used, total, percentage };
};

const shouldCleanupStorage = () => {
  const { percentage } = getStorageUsage();
  return percentage > 85; // Cleanup when over 85% full (more conservative)
};

const shouldWarnStorage = () => {
  const { percentage } = getStorageUsage();
  return percentage > 90; // Only warn when very close to full
};

const getSampleProject = (): Project => ({
  id: `proj_${Date.now()}`,
  name: "My First Project",
  createdAt: new Date().toISOString(),
  floorPlanUrl: null,
  furniture: [],
  scale: null,
});

export default function StandaloneFloorPlannerPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [storageWarning, setStorageWarning] = useState<string | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Check if we're in a browser environment
  const isBrowser = typeof window !== 'undefined';

  // Load projects from localStorage on initial render
  useEffect(() => {
    if (!isBrowser) return;

    try {
      const storedProjects = localStorage.getItem(STORAGE_KEY);
      if (storedProjects) {
        let parsedProjects = JSON.parse(storedProjects);

        // Proactive cleanup if storage is getting full
        if (shouldCleanupStorage() && parsedProjects.length > 3) {
          // Proactively cleaning up storage
          parsedProjects = parsedProjects
            .sort((a: Project, b: Project) => new Date(String(b.createdAt)).getTime() - new Date(String(a.createdAt)).getTime())
            .slice(0, 3);

          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(parsedProjects));
          } catch {
            // Failed to save cleaned projects
          }
        }

        setProjects(parsedProjects);
      } else {
        // If no projects, start with a sample one
        setProjects([getSampleProject()]);
      }
    } catch {
      // Failed to load projects from storage, creating a sample project
      // Clear corrupted data and start fresh
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        // Failed to clear corrupted storage
      }
      setProjects([getSampleProject()]);
    }
    setIsLoaded(true);
  }, [isBrowser]);

  // Save projects to localStorage whenever they change
  useEffect(() => {
    if (!isBrowser || !isLoaded) return;

    const saveProjects = (projectsToSave: Project[]) => {
      try {
        const dataToSave = JSON.stringify(projectsToSave);
        localStorage.setItem(STORAGE_KEY, dataToSave);
        return true;
      } catch (error: unknown) {
        if (error instanceof Error && error.name === 'QuotaExceededError') {
          return false;
        }
        // Failed to save projects to storage
        return false;
      }
    };

    // Try to save projects
    if (!saveProjects(projects)) {
      // Storage quota exceeded, cleaning up
      setStorageWarning('Storage quota exceeded. Cleaning up old projects...');

      // Progressive cleanup strategy
      const cleanupStrategies = [
        () => projects.slice(0, 3), // Keep 3 most recent
        () => projects.slice(0, 2), // Keep 2 most recent
        () => projects.slice(0, 1), // Keep 1 most recent
        () => []                    // Clear all
      ];

      // First, clear existing data to make space
      try {
        localStorage.removeItem(STORAGE_KEY);

        // Try each cleanup strategy until one works
        for (const strategy of cleanupStrategies) {
          const cleanedProjects = strategy();
          if (saveProjects(cleanedProjects)) {
            setProjects(cleanedProjects);
            setStorageWarning(`Cleaned up to ${cleanedProjects.length} projects due to storage quota. Consider exporting important projects.`);
            // Cleaned up projects due to storage quota
            // Clear warning after 5 seconds
            setTimeout(() => setStorageWarning(null), 5000);
            return;
          }
        }

        // If all strategies fail, just clear everything and show warning
        // Unable to save any projects due to storage constraints
        setStorageWarning('Unable to save projects due to storage constraints. All projects cleared.');
        setProjects([]);
        setTimeout(() => setStorageWarning(null), 10000);

      } catch {
        // Failed to cleanup storage
        setStorageWarning('Storage cleanup failed. Please clear browser data manually.');
        // Emergency fallback - clear everything
        try {
          localStorage.clear();
          setProjects([]);
        } catch {
          // Emergency storage clear failed
        }
        setTimeout(() => setStorageWarning(null), 10000);
      }
    } else {
      // Check if we should warn about storage getting full
      if (shouldWarnStorage()) {
        setStorageWarning('Storage is getting full. Consider exporting or deleting old projects.');
        setTimeout(() => setStorageWarning(null), 5000);
      } else {
        setStorageWarning(null);
      }
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
      }, 500);
    }
  };

  const forceSave = () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    setSaveStatus('saving');
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
      <div style={{
        width: '100%',
        height: '100vh',
        background: theme.colors.bg,
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
    <>
      <Head>
        <title>AI Furniture Installation Planner - BHIT Work OS</title>
        <script async src="https://cdn.tailwindcss.com"></script>
      </Head>

      {/* Load PDF.js for PDF parsing functionality */}
      <Script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js" strategy="afterInteractive" />
      <Script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js" strategy="lazyOnload" />

      <div style={{
        background: theme.colors.bg,
        color: theme.colors.text,
        fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
        minHeight: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        width: '100%',
        flex: 1
      }}>
        {/* Storage Warning */}
        {storageWarning && (
          <div style={{
            position: 'fixed',
            top: 80,
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#dc2626',
            color: 'white',
            padding: '12px 24px',
            borderRadius: 8,
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            zIndex: 1000,
            maxWidth: '90%',
            textAlign: 'center',
            fontSize: 14
          }}>
            ⚠️ {storageWarning}
          </div>
        )}

        <main style={{
          flexGrow: 1,
          overflow: 'hidden',
          width: '100%'
        }}>
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
    </>
  );
}