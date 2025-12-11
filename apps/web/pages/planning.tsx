import React, { useState } from 'react';

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
    <div className="min-h-screen flex flex-col p-6">
      <main className="flex-1 w-full max-w-[1600px] mx-auto">
        <PlanningDashboard
          onCreateProject={handleCreateProject}
          onSelectProject={handleSelectProject}
        />

        {selectedProject && (
          <div className="mt-8 p-6 card border-0 bg-[var(--panel)]">
            <h3 className="text-lg font-semibold text-[var(--info)] mb-2">
              Planning-Driven Architecture Demo
            </h3>
            <p className="text-[var(--muted)] text-sm mb-4">
              Project &quot;{selectedProject}&quot; is selected. In a fully implemented planning-driven system,
              this would trigger integrations with:
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="p-4 rounded-lg bg-[rgba(49,130,206,0.1)] border border-[rgba(49,130,206,0.2)]">
                <div className="font-medium text-[var(--info)]">SmartQuote</div>
                <div className="text-[var(--muted)] mt-1">Auto-generate quote from project data</div>
              </div>
              <div className="p-4 rounded-lg bg-[rgba(49,130,206,0.1)] border border-[rgba(49,130,206,0.2)]">
                <div className="font-medium text-[var(--info)]">Floor Planner</div>
                <div className="text-[var(--muted)] mt-1">Load/create floor plans for visualization</div>
              </div>
              <div className="p-4 rounded-lg bg-[rgba(49,130,206,0.1)] border border-[rgba(49,130,206,0.2)]">
                <div className="font-medium text-[var(--info)]">Job System</div>
                <div className="text-[var(--muted)] mt-1">Create or link to existing job</div>
              </div>
              <div className="p-4 rounded-lg bg-[rgba(49,130,206,0.1)] border border-[rgba(49,130,206,0.2)]">
                <div className="font-medium text-[var(--info)]">Labour Calendar</div>
                <div className="text-[var(--muted)] mt-1">Schedule resources based on project</div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}