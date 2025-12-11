/**
 * Planning Dashboard - Central hub for planning-driven architecture
 * Provides overview and management of all planning activities
 */

import React, { useState, useEffect } from 'react';

import { useFeatureFlag, FEATURE_FLAGS } from '../../lib/featureFlags';
import {
  planningService,
  PlanningProject
} from '../../lib/planningService';
import { theme } from '../../lib/theme';

interface PlanningDashboardProps {
  onCreateProject?: (project: PlanningProject) => void;
  onSelectProject?: (projectId: string) => void;
}

export default function PlanningDashboard({
  onCreateProject,
  onSelectProject
}: PlanningDashboardProps) {
  const [projects, setProjects] = useState<PlanningProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [_selectedProject, setSelectedProject] = useState<PlanningProject | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Feature flags
  const [experimentalPlanningEnabled] = useFeatureFlag(FEATURE_FLAGS.EXPERIMENTAL_PLANNING_ENGINE);
  const [betaFloorPlannerEnabled] = useFeatureFlag(FEATURE_FLAGS.BETA_FLOOR_PLANNER);

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      const projectData = await planningService.getProjects();
      setProjects(projectData);
    } catch (error: unknown) {
      console.error('Failed to load projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async (projectData: {
    name: string;
    priority: PlanningProject['priority'];
    jobId?: string;
  }) => {
    try {
      const newProject = await planningService.createProject(projectData);
      setProjects(prev => [newProject, ...prev]);
      setShowCreateModal(false);

      if (onCreateProject) {
        onCreateProject(newProject);
      }
    } catch (error: unknown) {
      console.error('Failed to create project:', error);
    }
  };

  const getStatusColor = (status: PlanningProject['status']) => {
    const colors = {
      draft: theme.colors.textSubtle,
      active: theme.colors.accentAlt,
      completed: theme.colors.success,
      on_hold: theme.colors.warn
    };
    return colors[status] || theme.colors.textSubtle;
  };

  const getPriorityColor = (priority: PlanningProject['priority']) => {
    const colors = {
      low: theme.colors.textSubtle,
      medium: theme.colors.info,
      high: theme.colors.warn,
      urgent: theme.colors.error
    };
    return colors[priority] || theme.colors.textSubtle;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[var(--accent)]"></div>
        <span className="ml-3 text-[var(--muted)]">Loading planning projects...</span>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-8 pl-1">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2 text-white">Planning Central</h1>
            <p className="text-[var(--muted)]">
              Coordinate all planning activities and workflows (BHi v2.0)
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-3 bg-[var(--accent)] hover:bg-[var(--accent)]/80 text-white rounded font-medium transition-all shadow-[0_0_20px_rgba(243,139,0,0.3)] hover:shadow-[0_0_30px_rgba(243,139,0,0.5)] active:scale-95"
          >
            New Planning Project
          </button>
        </div>

        {/* Feature Flag Indicators */}
        <div className="mt-4 flex gap-2">
          {experimentalPlanningEnabled && (
            <div className="px-3 py-1 bg-[var(--panel)] text-[var(--accent)] text-xs rounded border border-[var(--accent)]/30 backdrop-blur-sm">
              Experimental Planning Engine Active
            </div>
          )}
          {betaFloorPlannerEnabled && (
            <div className="px-3 py-1 bg-[var(--panel)] text-[var(--ok)] text-xs rounded border border-[var(--ok)]/30 backdrop-blur-sm">
              Beta Floor Planner Available
            </div>
          )}
        </div>
      </div>

      {/* Stats Cards - Using .card glass effect */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="card p-6 flex flex-col items-center text-center hover:bg-[var(--panel-2)] transition-colors">
          <div className="text-3xl font-bold text-white mb-1">
            {projects.filter(p => p.status === 'active').length}
          </div>
          <div className="text-xs uppercase tracking-wider text-[var(--muted)] font-bold">Active Projects</div>
        </div>

        <div className="card p-6 flex flex-col items-center text-center hover:bg-[var(--panel-2)] transition-colors">
          <div className="text-3xl font-bold text-[var(--warn)] mb-1">
            {projects.filter(p => p.priority === 'urgent').length}
          </div>
          <div className="text-xs uppercase tracking-wider text-[var(--muted)] font-bold">Urgent Priority</div>
        </div>

        <div className="card p-6 flex flex-col items-center text-center hover:bg-[var(--panel-2)] transition-colors">
          <div className="text-3xl font-bold text-[var(--ok)] mb-1">
            {projects.filter(p => p.status === 'completed').length}
          </div>
          <div className="text-xs uppercase tracking-wider text-[var(--muted)] font-bold">Completed</div>
        </div>

        <div className="card p-6 flex flex-col items-center text-center hover:bg-[var(--panel-2)] transition-colors">
          <div className="text-3xl font-bold text-[var(--info)] mb-1">
            {Math.round(projects.reduce((acc, p) => acc + (p.metadata.estimatedHours || 0), 0))}h
          </div>
          <div className="text-xs uppercase tracking-wider text-[var(--muted)] font-bold">Total Estimated</div>
        </div>
      </div>

      {/* Projects List */}
      <div className="card overflow-hidden">
        <div className="p-6 border-b border-[var(--border)] bg-[var(--panel)]">
          <h2 className="text-xl font-bold text-white">Planning Projects</h2>
        </div>

        <div className="p-6">
          {projects.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-[var(--muted)] mb-4">No planning projects yet</div>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 border border-[var(--accent)] text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white rounded transition-colors"
              >
                Create Your First Project
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {projects.map((project) => (
                <div
                  key={project.id}
                  className="p-6 rounded-xl border border-[var(--border)] bg-[var(--panel)] hover:bg-[var(--panel-2)] hover:border-[var(--accent)] hover:-translate-y-1 transition-all duration-300 cursor-pointer group flex flex-col h-full shadow-lg hover:shadow-[0_10px_30px_rgba(0,0,0,0.5)]"
                  onClick={() => {
                    setSelectedProject(project);
                    if (onSelectProject) {
                      onSelectProject(project.id);
                    }
                  }}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-3 rounded-lg bg-[var(--panel-2)] group-hover:bg-[var(--accent)]/10 transition-colors">
                      <span className="text-2xl">🏗️</span>
                    </div>
                    <span
                      className="px-2 py-1 text-[10px] rounded font-bold uppercase tracking-wider"
                      style={{
                        background: project.priority === 'urgent' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255,255,255,0.05)',
                        color: project.priority === 'urgent' ? 'var(--bad)' : 'var(--muted)',
                        border: `1px solid ${project.priority === 'urgent' ? 'var(--bad)' : 'var(--border)'}`
                      }}
                    >
                      {project.priority}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold text-white group-hover:text-[var(--accent)] transition-colors mb-2 line-clamp-1">
                    {project.name}
                  </h3>

                  <div className="flex items-center gap-2 mb-6">
                    <span className="w-2 h-2 rounded-full" style={{ background: project.status === 'active' ? 'var(--accent)' : 'var(--muted)' }}></span>
                    <span className="text-xs text-[var(--muted)] uppercase tracking-wide font-medium">
                      {project.status.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 mt-auto pt-4 border-t border-[var(--border)]">
                    <div>
                      <div className="text-[var(--muted)] text-[10px] uppercase font-bold tracking-wider">Est. Hours</div>
                      <div className="text-white font-mono font-bold text-lg">
                        {project.metadata.estimatedHours || 0}<span className="text-sm font-normal text-[var(--muted)] ml-0.5">h</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[var(--muted)] text-[10px] uppercase font-bold tracking-wider">Complexity</div>
                      <div className="text-white font-bold capitalize text-sm mt-1">
                        {project.metadata.complexity || 'Simple'}
                      </div>
                    </div>
                  </div>

                  {project.jobId && (
                    <div className="mt-4 pt-3 border-t border-[var(--border)] border-dashed">
                      <div className="text-xs text-[var(--info)] flex items-center gap-2 truncate">
                        <span>🔗</span> <span className="font-mono opacity-80">{project.jobId}</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Project Modal */}
      {showCreateModal && (
        <CreateProjectModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateProject}
        />
      )}

      {/* Integration Points */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <IntegrationCard
          title="SmartQuote"
          description="Generate quotes from planning data"
          icon="💰"
          enabled={true}
        />
        <IntegrationCard
          title="Floor Planner"
          description="Visualize and plan installations"
          icon="📐"
          enabled={betaFloorPlannerEnabled}
        />
        <IntegrationCard
          title="Job Management"
          description="Create jobs from approved plans"
          icon="📋"
          enabled={true}
        />
        <IntegrationCard
          title="Labour Planning"
          description="Schedule crew and resources"
          icon="👥"
          enabled={true}
        />
      </div>
    </div>
  );
}

function CreateProjectModal({
  onClose,
  onCreate
}: {
  onClose: () => void;
  onCreate: (data: { name: string; priority: PlanningProject['priority']; jobId?: string }) => void;
}) {
  const [formData, setFormData] = useState({
    name: '',
    priority: 'medium' as PlanningProject['priority'],
    jobId: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreate({
      name: formData.name,
      priority: formData.priority,
      jobId: formData.jobId || undefined
    });
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-[99999]">
      <div className="card p-8 w-full max-w-md relative shadow-[0_0_50px_rgba(0,0,0,0.7)]">
        <h2 className="text-xl font-bold text-white mb-6 uppercase tracking-wide border-b border-[var(--border)] pb-4">
          Create Planning Project
        </h2>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-[var(--muted)] uppercase mb-2">
              Project Name
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full p-3 bg-[var(--bg)] border border-[var(--border)] rounded text-white focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] transition-all"
              placeholder="Enter project name"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[var(--muted)] uppercase mb-2">
              Priority
            </label>
            <select
              value={formData.priority}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                priority: e.target.value as PlanningProject['priority']
              }))}
              className="w-full p-3 bg-[var(--bg)] border border-[var(--border)] rounded text-white focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] transition-all"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-[var(--muted)] uppercase mb-2">
              Link to Job ID (Optional)
            </label>
            <input
              type="text"
              value={formData.jobId}
              onChange={(e) => setFormData(prev => ({ ...prev, jobId: e.target.value }))}
              className="w-full p-3 bg-[var(--bg)] border border-[var(--border)] rounded text-white focus:border-[var(--accent)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] transition-all"
              placeholder="Enter existing job ID"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 border border-[var(--border)] hover:bg-[var(--panel-2)] text-[var(--muted)] hover:text-white rounded font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-3 px-4 bg-[var(--accent)] hover:bg-[var(--accent)]/80 text-white rounded font-bold uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(243,139,0,0.3)]"
            >
              Create Project
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function IntegrationCard({
  title,
  description,
  icon,
  enabled
}: {
  title: string;
  description: string;
  icon: string;
  enabled: boolean;
}) {
  return (
    <div className={`p-6 rounded border transition-all duration-300 card group ${enabled
      ? 'hover:border-[var(--accent)] hover:-translate-y-1'
      : 'opacity-50 grayscale'
      }`}>
      <div className="text-3xl mb-4 p-3 bg-[var(--panel-2)] rounded-full w-fit group-hover:bg-[var(--accent)]/20 transition-colors">{icon}</div>
      <h3 className={`font-bold mb-2 uppercase tracking-wide text-sm ${enabled ? 'text-white' : 'text-[var(--muted)]'
        }`}>
        {title}
      </h3>
      <p className={`text-sm ${enabled ? 'text-[var(--muted)]' : 'text-neutral-600'
        }`}>
        {description}
      </p>
      {!enabled && (
        <div className="mt-3 text-[10px] uppercase font-bold text-[var(--warn)] border border-[var(--warn)]/30 rounded px-2 py-1 w-fit">
          Feature flag disabled
        </div>
      )}
    </div>
  );
}