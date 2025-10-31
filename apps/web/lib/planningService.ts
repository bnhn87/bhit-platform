/**
 * Planning Service - Central engine for planning-driven architecture
 * Coordinates planning workflows across the BHIT Work OS system
 */

import { supabase } from './supabaseClient';

export interface PlanningProject {
  id: string;
  name: string;
  jobId?: string;
  status: 'draft' | 'active' | 'completed' | 'on_hold';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  createdAt: string;
  updatedAt: string;
  metadata: {
    floorPlanUrl?: string;
    totalItems?: number;
    estimatedHours?: number;
    complexity?: 'simple' | 'moderate' | 'complex';
  };
}

export interface PlanningTask {
  id: string;
  projectId: string;
  type: 'installation' | 'measurement' | 'preparation' | 'logistics' | 'review';
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
  assignedTo?: string;
  estimatedDuration: number; // in hours
  dependencies: string[]; // task IDs that must be completed first
  position: {
    x: number;
    y: number;
    floor?: string;
    room?: string;
  };
  metadata: {
    productCodes?: string[];
    tools?: string[];
    skillLevel?: 'basic' | 'intermediate' | 'advanced';
  };
}

export interface PlanningWorkflow {
  id: string;
  name: string;
  projectId: string;
  steps: PlanningWorkflowStep[];
  currentStep: number;
  status: 'active' | 'completed' | 'paused';
}

export interface PlanningWorkflowStep {
  id: string;
  name: string;
  type: 'planning' | 'quoting' | 'scheduling' | 'execution' | 'review';
  status: 'pending' | 'active' | 'completed' | 'skipped';
  requiredData: string[];
  outputs: string[];
  estimatedDuration: number;
}

class PlanningService {
  private static instance: PlanningService;
  private cache = new Map<string, PlanningProject | PlanningTask | PlanningWorkflow>();

  static getInstance(): PlanningService {
    if (!PlanningService.instance) {
      PlanningService.instance = new PlanningService();
    }
    return PlanningService.instance;
  }

  /**
   * Create a new planning project
   */
  async createProject(data: {
    name: string;
    jobId?: string;
    priority?: PlanningProject['priority'];
    metadata?: PlanningProject['metadata'];
  }): Promise<PlanningProject> {
    const project: PlanningProject = {
      id: crypto.randomUUID(),
      name: data.name,
      jobId: data.jobId,
      status: 'draft',
      priority: data.priority || 'medium',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      metadata: data.metadata || {}
    };

    // Store in database if available, otherwise cache locally
    try {
      const { data: dbProject, error } = await supabase
        .from('planning_projects')
        .insert(project)
        .select()
        .single();

      if (!error && dbProject) {
        return dbProject;
      }
    } catch {
      console.warn('Database not available for planning projects, using local cache');
    }

    // Fallback to local storage
    this.cache.set(`project_${project.id}`, project);
    return project;
  }

  /**
   * Get all planning projects
   */
  async getProjects(): Promise<PlanningProject[]> {
    try {
      const { data, error } = await supabase
        .from('planning_projects')
        .select('*')
        .order('updated_at', { ascending: false });

      if (!error && data) {
        return data;
      }
    } catch {
      console.warn('Database not available, using cached projects');
    }

    // Fallback to cached projects
    const cachedProjects: PlanningProject[] = [];
    this.cache.forEach((value, key) => {
      if (key.startsWith('project_')) {
        cachedProjects.push(value as PlanningProject);
      }
    });

    return cachedProjects.sort((a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }

  /**
   * Update a planning project
   */
  async updateProject(id: string, updates: Partial<PlanningProject>): Promise<PlanningProject | null> {
    const updatedProject = {
      ...updates,
      id,
      updatedAt: new Date().toISOString()
    };

    try {
      const { data, error } = await supabase
        .from('planning_projects')
        .update(updatedProject)
        .eq('id', id)
        .select()
        .single();

      if (!error && data) {
        return data;
      }
    } catch {
      console.warn('Database not available, updating cached project');
    }

    // Fallback to cache update
    const existing = this.cache.get(`project_${id}`);
    if (existing) {
      const updated = { ...(existing as PlanningProject), ...updatedProject };
      this.cache.set(`project_${id}`, updated);
      return updated as PlanningProject;
    }

    return null;
  }

  /**
   * Create tasks for a project using AI-powered analysis
   */
  async generateTasksForProject(projectId: string, _floorPlanData?: { imageUrl?: string; furniture?: unknown[] }): Promise<PlanningTask[]> {
    // This would typically use AI to analyze floor plans and generate tasks
    // For now, we'll create some basic task templates

    const baseTaskTemplates = [
      {
        type: 'preparation' as const,
        title: 'Site preparation and measurement',
        description: 'Prepare the installation site and take accurate measurements',
        estimatedDuration: 2,
        metadata: { skillLevel: 'basic' as const }
      },
      {
        type: 'installation' as const,
        title: 'Main installation work',
        description: 'Install products according to floor plan',
        estimatedDuration: 6,
        metadata: { skillLevel: 'intermediate' as const }
      },
      {
        type: 'review' as const,
        title: 'Quality review and cleanup',
        description: 'Final quality check and site cleanup',
        estimatedDuration: 1,
        metadata: { skillLevel: 'basic' as const }
      }
    ];

    const tasks: PlanningTask[] = baseTaskTemplates.map((template, index) => ({
      id: crypto.randomUUID(),
      projectId,
      type: template.type,
      title: template.title,
      description: template.description,
      status: 'pending' as const,
      estimatedDuration: template.estimatedDuration,
      dependencies: index > 0 ? [baseTaskTemplates[index - 1].title] : [],
      position: { x: 100, y: 100 + (index * 100) },
      metadata: template.metadata
    }));

    return tasks;
  }

  /**
   * Create a standard workflow for a project
   */
  async createWorkflowForProject(projectId: string, workflowType: 'standard' | 'complex' | 'express'): Promise<PlanningWorkflow> {
    const workflowTemplates = {
      standard: [
        { name: 'Initial Planning', type: 'planning' as const, estimatedDuration: 2 },
        { name: 'Quote Generation', type: 'quoting' as const, estimatedDuration: 1 },
        { name: 'Schedule Planning', type: 'scheduling' as const, estimatedDuration: 1 },
        { name: 'Installation Execution', type: 'execution' as const, estimatedDuration: 8 },
        { name: 'Final Review', type: 'review' as const, estimatedDuration: 1 }
      ],
      complex: [
        { name: 'Detailed Site Survey', type: 'planning' as const, estimatedDuration: 4 },
        { name: 'Technical Planning', type: 'planning' as const, estimatedDuration: 3 },
        { name: 'Comprehensive Quoting', type: 'quoting' as const, estimatedDuration: 2 },
        { name: 'Resource Scheduling', type: 'scheduling' as const, estimatedDuration: 2 },
        { name: 'Installation Phase 1', type: 'execution' as const, estimatedDuration: 6 },
        { name: 'Installation Phase 2', type: 'execution' as const, estimatedDuration: 6 },
        { name: 'Quality Assurance', type: 'review' as const, estimatedDuration: 2 }
      ],
      express: [
        { name: 'Quick Planning', type: 'planning' as const, estimatedDuration: 1 },
        { name: 'Fast Quote', type: 'quoting' as const, estimatedDuration: 0.5 },
        { name: 'Installation', type: 'execution' as const, estimatedDuration: 4 },
        { name: 'Quick Review', type: 'review' as const, estimatedDuration: 0.5 }
      ]
    };

    const template = workflowTemplates[workflowType];
    const workflow: PlanningWorkflow = {
      id: crypto.randomUUID(),
      name: `${workflowType.charAt(0).toUpperCase() + workflowType.slice(1)} Workflow`,
      projectId,
      currentStep: 0,
      status: 'active',
      steps: template.map((step, index) => ({
        id: crypto.randomUUID(),
        name: step.name,
        type: step.type,
        status: index === 0 ? 'active' as const : 'pending' as const,
        requiredData: this.getRequiredDataForStep(step.type),
        outputs: this.getOutputsForStep(step.type),
        estimatedDuration: step.estimatedDuration
      }))
    };

    return workflow;
  }

  /**
   * Get integration points with other system components
   */
  getIntegrationPoints() {
    return {
      smartQuote: {
        generateQuote: (projectId: string) => this.generateQuoteFromProject(projectId),
        updateFromQuote: (projectId: string, quoteData: Record<string, unknown>) => this.updateProjectFromQuote(projectId, quoteData)
      },
      floorPlanner: {
        createFromFloorPlan: (floorPlanData: { imageUrl?: string; furniture?: unknown[] }) => this.createProjectFromFloorPlan(floorPlanData),
        updateFloorPlan: (projectId: string, floorPlanData: { imageUrl?: string; furniture?: unknown[] }) => this.updateProjectFloorPlan(projectId, floorPlanData)
      },
      jobManagement: {
        createJob: (projectId: string) => this.createJobFromProject(projectId),
        syncWithJob: (projectId: string, jobId: string) => this.syncProjectWithJob(projectId, jobId)
      },
      labour: {
        generateLabourPlan: (projectId: string) => this.generateLabourPlanFromProject(projectId),
        updateLabourAllocations: (projectId: string, allocations: Record<string, unknown>) => this.updateProjectLabour(projectId, allocations)
      }
    };
  }

  private getRequiredDataForStep(stepType: PlanningWorkflowStep['type']): string[] {
    const requirements = {
      planning: ['site_details', 'client_requirements', 'floor_plan'],
      quoting: ['materials_list', 'labour_hours', 'project_scope'],
      scheduling: ['quote_approval', 'resource_availability', 'client_schedule'],
      execution: ['approved_schedule', 'materials_delivery', 'crew_assignment'],
      review: ['installation_complete', 'client_walkthrough', 'final_photos']
    };
    return requirements[stepType] || [];
  }

  private getOutputsForStep(stepType: PlanningWorkflowStep['type']): string[] {
    const outputs = {
      planning: ['project_plan', 'materials_list', 'risk_assessment'],
      quoting: ['detailed_quote', 'pricing_breakdown', 'terms_conditions'],
      scheduling: ['installation_schedule', 'resource_allocation', 'milestone_dates'],
      execution: ['progress_updates', 'completion_photos', 'quality_checklist'],
      review: ['final_report', 'client_signoff', 'warranty_documentation']
    };
    return outputs[stepType] || [];
  }

  private async generateQuoteFromProject(projectId: string): Promise<{ projectId: string; quoteGenerated: boolean }> {
    // Integration point with SmartQuote system
    return { projectId, quoteGenerated: true };
  }

  private async updateProjectFromQuote(_projectId: string, _quoteData: Record<string, unknown>): Promise<void> {
    // Update project with quote information
  }

  private async createProjectFromFloorPlan(floorPlanData: { imageUrl?: string; furniture?: unknown[] }): Promise<PlanningProject> {
    return this.createProject({
      name: 'Project from Floor Plan',
      metadata: {
        floorPlanUrl: floorPlanData.imageUrl,
        totalItems: floorPlanData.furniture?.length || 0
      }
    });
  }

  private async updateProjectFloorPlan(projectId: string, floorPlanData: { imageUrl?: string; furniture?: unknown[] }): Promise<void> {
    await this.updateProject(projectId, {
      metadata: {
        floorPlanUrl: floorPlanData.imageUrl,
        totalItems: floorPlanData.furniture?.length || 0
      }
    });
  }

  private async createJobFromProject(projectId: string): Promise<{ projectId: string; jobCreated: boolean }> {
    // Integration point with job management system
    return { projectId, jobCreated: true };
  }

  private async syncProjectWithJob(projectId: string, jobId: string): Promise<void> {
    await this.updateProject(projectId, { jobId });
  }

  private async generateLabourPlanFromProject(projectId: string): Promise<{ projectId: string; labourPlanGenerated: boolean }> {
    // Integration point with labour management system
    return { projectId, labourPlanGenerated: true };
  }

  private async updateProjectLabour(_projectId: string, _allocations: Record<string, unknown>): Promise<void> {
    // Update project with labour allocations
  }
}

export const planningService = PlanningService.getInstance();