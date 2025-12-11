import React, { useState } from 'react';

import AppNav from '../components/AppNav';
import PlanningDashboard from '../components/planning/PlanningDashboard';
import { PlanningProject } from '../lib/planningService';

export default function PlanningPage() {
  const [selectedProject, setSelectedProject] = useState<string | null>(null);

  const handleCreateProject = (project: PlanningProject) => {
    // Auto-select the new project
    setSelectedProject(project.id);
  };

  const handleSelectProject = (projectId: string) => {
    setSelectedProject(projectId);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <AppNav />
      <main style={{
        flex: 1,
        padding: 24,
        backgroundColor: '#0b1118',
        color: '#e8eef6'
      }}>
        <div style={{
          maxWidth: 1400,
          margin: '0 auto'
        }}>
          <PlanningDashboard
            onCreateProject={handleCreateProject}
            onSelectProject={handleSelectProject}
          />

          {selectedProject && (
            <div className="mt-8 p-6 bg-blue-600/10 border border-blue-600/20 rounded-2xl">
              <h3 className="text-lg font-semibold text-blue-400 mb-2">
                Planning-Driven Architecture Demo
              </h3>
              <p className="text-blue-300 text-sm mb-4">
                Project &quot;{selectedProject}&quot; is selected. In a fully implemented planning-driven system,
                this would trigger integrations with:
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="p-3 bg-blue-600/5 rounded-lg">
                  <div className="font-medium text-blue-400">SmartQuote</div>
                  <div className="text-blue-300">Auto-generate quote from project data</div>
                </div>
                <div className="p-3 bg-blue-600/5 rounded-lg">
                  <div className="font-medium text-blue-400">Floor Planner</div>
                  <div className="text-blue-300">Load/create floor plans for visualization</div>
                </div>
                <div className="p-3 bg-blue-600/5 rounded-lg">
                  <div className="font-medium text-blue-400">Job System</div>
                  <div className="text-blue-300">Create or link to existing job</div>
                </div>
                <div className="p-3 bg-blue-600/5 rounded-lg">
                  <div className="font-medium text-blue-400">Labour Calendar</div>
                  <div className="text-blue-300">Schedule resources based on project</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}