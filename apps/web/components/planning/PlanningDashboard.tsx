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
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        <span className="ml-3 text-neutral-300">Loading planning projects...</span>
      </div>
    );
  }

  return (
    <div style={{
      background: theme.colors.background,
      color: theme.colors.text,
      minHeight: '100%'
    }}>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2">Planning Central</h1>
            <p className="text-neutral-400">
              Coordinate all planning activities and workflows
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            New Planning Project
          </button>
        </div>

        {/* Feature Flag Indicators */}
        <div className="mt-4 flex gap-2">
          {experimentalPlanningEnabled && (
            <div className="px-3 py-1 bg-purple-600/20 text-purple-400 text-xs rounded-full border border-purple-600/30">
              Experimental Planning Engine Active
            </div>
          )}
          {betaFloorPlannerEnabled && (
            <div className="px-3 py-1 bg-green-600/20 text-green-400 text-xs rounded-full border border-green-600/30">
              Beta Floor Planner Available
            </div>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
          <div className="text-2xl font-bold text-neutral-100">
            {projects.filter(p => p.status === 'active').length}
          </div>
          <div className="text-sm text-neutral-400">Active Projects</div>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
          <div className="text-2xl font-bold text-neutral-100">
            {projects.filter(p => p.priority === 'urgent').length}
          </div>
          <div className="text-sm text-neutral-400">Urgent Priority</div>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
          <div className="text-2xl font-bold text-neutral-100">
            {projects.filter(p => p.status === 'completed').length}
          </div>
          <div className="text-sm text-neutral-400">Completed</div>
        </div>

        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6">
          <div className="text-2xl font-bold text-neutral-100">
            {Math.round(projects.reduce((acc, p) => acc + (p.metadata.estimatedHours || 0), 0))}h
          </div>
          <div className="text-sm text-neutral-400">Total Estimated</div>
        </div>
      </div>

      {/* Projects List */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl">
        <div className="p-6 border-b border-neutral-800">
          <h2 className="text-xl font-semibold text-neutral-100">Planning Projects</h2>
        </div>

        <div className="p-6">
          {projects.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-neutral-400 mb-4">No planning projects yet</div>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Create Your First Project
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {projects.map((project) => (
                <div
                  key={project.id}
                  className="p-4 bg-neutral-800 rounded-lg border border-neutral-700 hover:border-neutral-600 transition-colors cursor-pointer"
                  onClick={() => {
                    setSelectedProject(project);
                    if (onSelectProject) {
                      onSelectProject(project.id);
                    }
                  }}
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold text-neutral-100">
                      {project.name}
                    </h3>
                    <div className="flex items-center gap-2">
                      <span
                        className="px-2 py-1 text-xs rounded-full font-medium"
                        style={{
                          backgroundColor: getPriorityColor(project.priority) + '20',
                          color: getPriorityColor(project.priority),
                          border: `1px solid ${getPriorityColor(project.priority)}30`
                        }}
                      >
                        {project.priority.toUpperCase()}
                      </span>
                      <span
                        className="px-2 py-1 text-xs rounded-full font-medium"
                        style={{
                          backgroundColor: getStatusColor(project.status) + '20',
                          color: getStatusColor(project.status),
                          border: `1px solid ${getStatusColor(project.status)}30`
                        }}
                      >
                        {project.status.replace('_', ' ').toUpperCase()}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <div className="text-neutral-400">Created</div>
                      <div className="text-neutral-300">
                        {new Date(project.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div>
                      <div className="text-neutral-400">Items</div>
                      <div className="text-neutral-300">
                        {project.metadata.totalItems || 0}
                      </div>
                    </div>
                    <div>
                      <div className="text-neutral-400">Est. Hours</div>
                      <div className="text-neutral-300">
                        {project.metadata.estimatedHours || 0}h
                      </div>
                    </div>
                    <div>
                      <div className="text-neutral-400">Complexity</div>
                      <div className="text-neutral-300 capitalize">
                        {project.metadata.complexity || 'simple'}
                      </div>
                    </div>
                  </div>

                  {project.jobId && (
                    <div className="mt-3 pt-3 border-t border-neutral-700">
                      <div className="text-xs text-blue-400">
                        Linked to Job: {project.jobId.substring(0, 8)}...
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 w-full max-w-md">
        <h2 className="text-xl font-semibold text-neutral-100 mb-4">
          Create Planning Project
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Project Name
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full p-3 bg-neutral-800 border border-neutral-700 rounded-lg text-neutral-100 focus:border-blue-500 focus:outline-none"
              placeholder="Enter project name"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Priority
            </label>
            <select
              value={formData.priority}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                priority: e.target.value as PlanningProject['priority']
              }))}
              className="w-full p-3 bg-neutral-800 border border-neutral-700 rounded-lg text-neutral-100 focus:border-blue-500 focus:outline-none"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-300 mb-2">
              Link to Job ID (Optional)
            </label>
            <input
              type="text"
              value={formData.jobId}
              onChange={(e) => setFormData(prev => ({ ...prev, jobId: e.target.value }))}
              className="w-full p-3 bg-neutral-800 border border-neutral-700 rounded-lg text-neutral-100 focus:border-blue-500 focus:outline-none"
              placeholder="Enter existing job ID"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 px-4 bg-neutral-700 hover:bg-neutral-600 text-neutral-300 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
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
    <div className={`p-4 rounded-lg border transition-colors ${
      enabled
        ? 'bg-neutral-900 border-neutral-800 hover:border-neutral-700'
        : 'bg-neutral-950 border-neutral-800 opacity-50'
    }`}>
      <div className="text-2xl mb-2">{icon}</div>
      <h3 className={`font-medium mb-1 ${
        enabled ? 'text-neutral-100' : 'text-neutral-500'
      }`}>
        {title}
      </h3>
      <p className={`text-sm ${
        enabled ? 'text-neutral-400' : 'text-neutral-600'
      }`}>
        {description}
      </p>
      {!enabled && (
        <div className="mt-2 text-xs text-amber-500">
          Feature flag disabled
        </div>
      )}
    </div>
  );
}