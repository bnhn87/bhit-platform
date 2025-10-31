/**
 * ULTIMATE CONSTRUCTION MANAGEMENT PLATFORM
 * Surpassing FieldWire, Bluebeam, and Procore with industry-leading features
 * Complete testing environment for all functionality
 */

import React, { useState, useRef, useEffect } from 'react';

import { usePWA } from '@/lib/pwa-utils';
import { theme } from '@/lib/theme';

// Enhanced data structures for comprehensive construction management
type Project = {
  id: string;
  title: string;
  clientName: string;
  address: string;
  startDate: string;
  endDate: string;
  status: 'quote' | 'approved' | 'in_progress' | 'completed' | 'on_hold';
  priority: 'low' | 'medium' | 'high' | 'critical';
  budget: {
    allocated: number;
    spent: number;
    remaining: number;
    forecasted: number;
  };
  team: TeamMember[];
  documents: Document[];
  drawings: Drawing[];
  floorPlans: FloorPlan[];
  tasks: EnhancedTask[];
  schedule: ScheduleEvent[];
  images: JobImage[];
  rfi: RFI[];
  submittals: Submittal[];
  changeOrders: ChangeOrder[];
  inspections: Inspection[];
  materials: Material[];
  equipment: Equipment[];
  safety: SafetyReport[];
  quality: QualityReport[];
  closeDay?: CloseDayReport;
  damages?: DamageReport[];
  snags?: SnagReport[];
  bim?: BIMModel;
  collaboration: CollaborationActivity[];
};

type TeamMember = {
  id: string;
  name: string;
  role: 'project_manager' | 'superintendent' | 'foreman' | 'installer' | 'specialist';
  skills: string[];
  availability: string;
  contact: string;
  location?: string;
  status: 'available' | 'busy' | 'offline';
};

type Document = {
  id: string;
  name: string;
  type: 'contract' | 'spec' | 'drawing' | 'photo' | 'report' | 'other';
  url: string;
  version: string;
  uploadDate: string;
  uploadedBy: string;
  markups: Markup[];
  approvalStatus: 'pending' | 'approved' | 'rejected' | 'needs_revision';
  tags: string[];
};

type Markup = {
  id: string;
  type: 'annotation' | 'highlight' | 'arrow' | 'callout' | 'measurement' | 'stamp';
  coordinates: { x: number; y: number; width?: number; height?: number };
  content: string;
  author: string;
  timestamp: string;
  color: string;
  resolved: boolean;
};

type Drawing = {
  id: string;
  name: string;
  discipline: 'architectural' | 'structural' | 'mechanical' | 'electrical' | 'plumbing';
  version: string;
  scale: string;
  url: string;
  thumbnailUrl: string;
  markups: Markup[];
  comparisons: DrawingComparison[];
  hyperlinks: DrawingHyperlink[];
};

type DrawingComparison = {
  id: string;
  originalVersion: string;
  newVersion: string;
  changes: ChangeHighlight[];
  reviewStatus: 'pending' | 'reviewed' | 'approved';
};

type ChangeHighlight = {
  area: { x: number; y: number; width: number; height: number };
  type: 'addition' | 'deletion' | 'modification';
  description: string;
};

type DrawingHyperlink = {
  area: { x: number; y: number; width: number; height: number };
  targetDrawing: string;
  targetView?: string;
  description: string;
};

type FloorPlan = {
  id: string;
  name: string;
  level: string;
  url: string;
  scale: number;
  furniture: FurnitureItem[];
  zones: Zone[];
  measurements: Measurement[];
  utilities: Utility[];
};

type FurnitureItem = {
  id: string;
  type: string;
  position: { x: number; y: number; rotation: number };
  dimensions: { width: number; height: number; depth: number };
  specifications: Record<string, unknown>;
  installationNotes: string;
  linkedTasks: string[];
};

type Zone = {
  id: string;
  name: string;
  type: 'room' | 'area' | 'equipment_zone' | 'work_zone';
  polygon: { x: number; y: number }[];
  assignments: string[];
  restrictions: string[];
};

type Measurement = {
  id: string;
  type: 'linear' | 'area' | 'count';
  points: { x: number; y: number }[];
  value: number;
  unit: string;
  label: string;
  accuracy: number;
};

type Utility = {
  id: string;
  type: 'electrical' | 'plumbing' | 'hvac' | 'gas' | 'data';
  path: { x: number; y: number }[];
  specifications: Record<string, unknown>;
  connections: string[];
};

type EnhancedTask = {
  id: string;
  title: string;
  description: string;
  type: 'installation' | 'demolition' | 'preparation' | 'finishing' | 'inspection';
  total_qty: number;
  uplifted_qty: number;
  placed_qty: number;
  built_qty: number;
  missing_qty: number;
  damaged_qty: number;
  damage_notes?: string;
  room_zone?: string;
  assignedTo: string[];
  dependencies: string[];
  prerequisites: string[];
  duration: number;
  startDate: string;
  endDate: string;
  actualStartDate?: string;
  actualEndDate?: string;
  progress: number;
  materials: TaskMaterial[];
  equipment: TaskEquipment[];
  safety: SafetyRequirement[];
  quality: QualityCheck[];
  cost: {
    estimated: number;
    actual: number;
    variance: number;
  };
  linkedDrawings: string[];
  linkedDocuments: string[];
  photos: string[];
  notes: TaskNote[];
  status: 'not_started' | 'in_progress' | 'completed' | 'on_hold' | 'blocked';
  approvalRequired: boolean;
  approvalStatus?: 'pending' | 'approved' | 'rejected';
};

type TaskMaterial = {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  cost: number;
  supplier: string;
  deliveryDate: string;
  status: 'ordered' | 'delivered' | 'installed' | 'damaged';
};

type TaskEquipment = {
  id: string;
  name: string;
  type: string;
  availabilityStart: string;
  availabilityEnd: string;
  cost: number;
  operator?: string;
  status: 'available' | 'in_use' | 'maintenance' | 'unavailable';
};

type SafetyRequirement = {
  id: string;
  type: 'ppe' | 'training' | 'permit' | 'inspection' | 'procedure';
  description: string;
  mandatory: boolean;
  completionRequired: boolean;
  status: 'pending' | 'completed' | 'overdue';
};

type QualityCheck = {
  id: string;
  checkpoint: string;
  criteria: string;
  inspector: string;
  status: 'pending' | 'passed' | 'failed' | 'na';
  notes?: string;
  photos?: string[];
  date?: string;
};

type TaskNote = {
  id: string;
  content: string;
  author: string;
  timestamp: string;
  type: 'general' | 'issue' | 'change' | 'safety' | 'quality';
  attachments: string[];
};

type ScheduleEvent = {
  id: string;
  title: string;
  type: 'task' | 'meeting' | 'delivery' | 'inspection' | 'milestone';
  startDate: string;
  endDate: string;
  duration: number;
  assignedTo: string[];
  location: string;
  description: string;
  dependencies: string[];
  criticalPath: boolean;
  floatTime: number;
  status: 'scheduled' | 'in_progress' | 'completed' | 'delayed' | 'cancelled';
  actualStart?: string;
  actualEnd?: string;
  resources: ResourceAllocation[];
};

type ResourceAllocation = {
  resourceId: string;
  resourceType: 'person' | 'equipment' | 'material';
  quantity: number;
  unit: string;
  cost: number;
};

type JobImage = {
  id: string;
  url: string;
  thumbnailUrl: string;
  caption: string;
  category: 'before' | 'progress' | 'after' | 'damage' | 'snag' | 'safety' | 'quality';
  timestamp: string;
  location: { x: number; y: number } | null;
  linkedTasks: string[];
  linkedDrawings: string[];
  tags: string[];
  metadata: {
    camera: string;
    resolution: string;
    fileSize: number;
    gpsCoordinates?: { lat: number; lng: number };
  };
  approvalStatus: 'pending' | 'approved' | 'rejected';
  annotations: ImageAnnotation[];
};

type ImageAnnotation = {
  id: string;
  type: 'point' | 'rectangle' | 'arrow' | 'text';
  coordinates: { x: number; y: number; width?: number; height?: number };
  content: string;
  author: string;
  timestamp: string;
  color: string;
};

type RFI = {
  id: string;
  title: string;
  description: string;
  requestedBy: string;
  assignedTo: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: 'design' | 'specification' | 'coordination' | 'material' | 'other';
  linkedDrawings: string[];
  linkedTasks: string[];
  attachments: string[];
  status: 'open' | 'in_review' | 'answered' | 'closed';
  dateCreated: string;
  dateRequired: string;
  dateAnswered?: string;
  response?: string;
  responseAttachments?: string[];
  cost: {
    estimated: number;
    approved: number;
  };
  timeImpact: number;
  workflow: RFIWorkflow[];
};

type RFIWorkflow = {
  stage: string;
  assignee: string;
  status: 'pending' | 'completed' | 'skipped';
  timestamp?: string;
  notes?: string;
};

type Submittal = {
  id: string;
  title: string;
  type: 'product_data' | 'shop_drawings' | 'samples' | 'certificates' | 'warranties';
  submittedBy: string;
  reviewedBy: string;
  specSection: string;
  status: 'submitted' | 'under_review' | 'approved' | 'approved_as_noted' | 'rejected';
  priority: 'standard' | 'expedited' | 'rush';
  dateSubmitted: string;
  dateRequired: string;
  dateReviewed?: string;
  revisionNumber: number;
  documents: string[];
  markups: Markup[];
  reviewComments: string;
  linkedTasks: string[];
  approvalWorkflow: SubmittalWorkflow[];
};

type SubmittalWorkflow = {
  reviewer: string;
  role: string;
  status: 'pending' | 'approved' | 'rejected' | 'skipped';
  timestamp?: string;
  comments?: string;
};

type ChangeOrder = {
  id: string;
  title: string;
  description: string;
  requestedBy: string;
  approvedBy: string;
  reason: 'design_change' | 'field_condition' | 'client_request' | 'code_requirement' | 'other';
  status: 'draft' | 'submitted' | 'under_review' | 'approved' | 'rejected' | 'implemented';
  priority: 'low' | 'medium' | 'high' | 'critical';
  costImpact: {
    materials: number;
    labor: number;
    equipment: number;
    overhead: number;
    total: number;
  };
  timeImpact: number;
  affectedTasks: string[];
  affectedDrawings: string[];
  documentation: string[];
  dateCreated: string;
  dateRequired: string;
  dateApproved?: string;
  approvalWorkflow: ChangeOrderWorkflow[];
};

type ChangeOrderWorkflow = {
  approver: string;
  role: string;
  status: 'pending' | 'approved' | 'rejected';
  timestamp?: string;
  comments?: string;
};

type Inspection = {
  id: string;
  title: string;
  type: 'safety' | 'quality' | 'code' | 'client' | 'final';
  inspector: string;
  scheduledDate: string;
  actualDate?: string;
  status: 'scheduled' | 'in_progress' | 'passed' | 'failed' | 'conditional' | 'cancelled';
  checklist: InspectionItem[];
  findings: InspectionFinding[];
  photos: string[];
  report: string;
  linkedTasks: string[];
  linkedDrawings: string[];
  correctionRequired: boolean;
  reinspectionRequired: boolean;
  certificateIssued: boolean;
};

type InspectionItem = {
  id: string;
  description: string;
  requirement: string;
  status: 'pass' | 'fail' | 'na' | 'pending';
  notes?: string;
  photos?: string[];
};

type InspectionFinding = {
  id: string;
  type: 'deficiency' | 'non_compliance' | 'safety_issue' | 'recommendation';
  description: string;
  severity: 'minor' | 'major' | 'critical';
  correctionRequired: boolean;
  deadline?: string;
  assignedTo?: string;
  status: 'open' | 'in_progress' | 'resolved' | 'verified';
  photos: string[];
};

type Material = {
  id: string;
  name: string;
  category: string;
  supplier: string;
  specifications: Record<string, unknown>;
  cost: {
    unitCost: number;
    totalCost: number;
    currency: string;
  };
  quantity: {
    ordered: number;
    delivered: number;
    installed: number;
    remaining: number;
    unit: string;
  };
  delivery: {
    scheduledDate: string;
    actualDate?: string;
    location: string;
    status: 'ordered' | 'in_transit' | 'delivered' | 'delayed';
  };
  storage: {
    location: string;
    requirements: string[];
    condition: 'good' | 'damaged' | 'expired';
  };
  linkedTasks: string[];
  linkedDrawings: string[];
  warranty: {
    period: number;
    terms: string;
    contact: string;
  };
  certifications: string[];
  photos: string[];
};

type Equipment = {
  id: string;
  name: string;
  type: string;
  model: string;
  serialNumber: string;
  owner: 'company' | 'rental' | 'client';
  operator: string;
  location: string;
  status: 'available' | 'in_use' | 'maintenance' | 'unavailable' | 'broken';
  schedule: EquipmentSchedule[];
  maintenance: MaintenanceRecord[];
  cost: {
    hourly: number;
    daily: number;
    rental: number;
  };
  certifications: string[];
  safety: {
    requirements: string[];
    lastInspection: string;
    nextInspection: string;
  };
  performance: EquipmentMetrics;
};

type EquipmentSchedule = {
  startDate: string;
  endDate: string;
  task: string;
  operator: string;
  location: string;
  status: 'scheduled' | 'active' | 'completed' | 'cancelled';
};

type MaintenanceRecord = {
  date: string;
  type: 'preventive' | 'corrective' | 'emergency';
  description: string;
  technician: string;
  cost: number;
  partsReplaced: string[];
  nextService: string;
};

type EquipmentMetrics = {
  totalHours: number;
  utilizationRate: number;
  downtime: number;
  efficiency: number;
  fuelConsumption: number;
};

type SafetyReport = {
  id: string;
  type: 'incident' | 'near_miss' | 'hazard' | 'training' | 'inspection';
  title: string;
  description: string;
  reportedBy: string;
  date: string;
  location: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  injuryType?: 'first_aid' | 'medical' | 'lost_time' | 'fatality';
  peopleInvolved: string[];
  witnessess: string[];
  photos: string[];
  investigation: {
    rootCause: string;
    contributingFactors: string[];
    correctiveActions: CorrectiveAction[];
    preventiveMeasures: string[];
  };
  status: 'reported' | 'investigating' | 'closed';
  followUp: FollowUpItem[];
};

type CorrectiveAction = {
  action: string;
  assignedTo: string;
  dueDate: string;
  status: 'pending' | 'in_progress' | 'completed';
  verifiedBy?: string;
  verificationDate?: string;
};

type FollowUpItem = {
  date: string;
  action: string;
  performedBy: string;
  notes: string;
};

type QualityReport = {
  id: string;
  type: 'inspection' | 'test' | 'deficiency' | 'rework' | 'approval';
  title: string;
  description: string;
  inspector: string;
  date: string;
  location: string;
  standard: string;
  criteria: QualityCriteria[];
  results: QualityResult[];
  photos: string[];
  status: 'pass' | 'fail' | 'conditional' | 'pending';
  nonConformances: NonConformance[];
  correctionRequired: boolean;
  reinspectionRequired: boolean;
};

type QualityCriteria = {
  parameter: string;
  specification: string;
  tolerance: string;
  method: string;
  required: boolean;
};

type QualityResult = {
  parameter: string;
  measured: string;
  specification: string;
  status: 'pass' | 'fail' | 'na';
  variance?: number;
  notes?: string;
};

type NonConformance = {
  id: string;
  description: string;
  severity: 'minor' | 'major' | 'critical';
  correctionRequired: boolean;
  deadline?: string;
  assignedTo?: string;
  status: 'open' | 'in_progress' | 'resolved' | 'verified';
  resolution?: string;
  photos: string[];
};

type CloseDayReport = {
  date: string;
  weather: string;
  hoursWorked: number;
  tasksCompleted: string[];
  tasksInProgress: string[];
  issuesEncountered: Issue[];
  tomorrowPriorities: string[];
  photos: string[];
  teamPresent: TeamAttendance[];
  materialDeliveries: MaterialDelivery[];
  equipmentUsage: EquipmentUsage[];
  safetyNotes: string[];
  qualityNotes: string[];
  clientCommunication: ClientCommunication[];
  costsIncurred: DailyCost[];
  productivity: ProductivityMetric[];
};

type Issue = {
  description: string;
  severity: 'minor' | 'major' | 'critical';
  impact: string;
  resolution: string;
  assignedTo: string;
  dueDate: string;
  photos: string[];
};

type TeamAttendance = {
  member: string;
  role: string;
  hoursWorked: number;
  tasks: string[];
  efficiency: number;
  notes?: string;
};

type MaterialDelivery = {
  supplier: string;
  materials: string[];
  quantity: number;
  condition: 'good' | 'damaged' | 'incomplete';
  storageLocation: string;
  photos: string[];
};

type EquipmentUsage = {
  equipment: string;
  hoursUsed: number;
  operator: string;
  task: string;
  efficiency: number;
  fuelUsed: number;
  issues?: string;
};

type ClientCommunication = {
  type: 'email' | 'call' | 'meeting' | 'text';
  contact: string;
  summary: string;
  actionItems: string[];
  timestamp: string;
};

type DailyCost = {
  category: 'labor' | 'materials' | 'equipment' | 'other';
  description: string;
  amount: number;
  approvedBy: string;
};

type ProductivityMetric = {
  task: string;
  planned: number;
  actual: number;
  efficiency: number;
  unit: string;
  factors: string[];
};

type DamageReport = {
  id: string;
  taskId: string;
  description: string;
  severity: 'minor' | 'major' | 'critical';
  photos: string[];
  cause: 'installation_error' | 'material_defect' | 'accident' | 'vandalism' | 'weather' | 'other';
  responsibility: 'contractor' | 'supplier' | 'client' | 'third_party' | 'unknown';
  repairRequired: boolean;
  cost: {
    estimated: number;
    actual?: number;
    approved?: number;
  };
  timeImpact: number;
  insuranceClaim: boolean;
  assignedTo: string;
  status: 'reported' | 'assessing' | 'repairing' | 'completed' | 'disputed';
  timestamp: string;
  workflow: DamageWorkflow[];
  resolution?: DamageResolution;
};

type DamageWorkflow = {
  stage: 'assessment' | 'approval' | 'repair' | 'verification' | 'billing';
  assignee: string;
  status: 'pending' | 'in_progress' | 'completed';
  timestamp?: string;
  notes?: string;
  photos?: string[];
};

type DamageResolution = {
  method: 'repair' | 'replace' | 'credit' | 'insurance';
  cost: number;
  timeline: string;
  warranty: string;
  completedBy: string;
  completedDate: string;
  clientApproval: boolean;
  photos: string[];
};

type SnagReport = {
  id: string;
  description: string;
  location: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  category: 'cosmetic' | 'functional' | 'safety' | 'compliance';
  photos: string[];
  assignedTo: string;
  reportedBy: string;
  dueDate: string;
  estimatedHours: number;
  status: 'open' | 'in_progress' | 'resolved' | 'verified' | 'deferred';
  resolution?: SnagResolution;
  linkedTasks: string[];
  linkedDrawings: string[];
  timestamp: string;
  clientVisible: boolean;
  workflow: SnagWorkflow[];
};

type SnagResolution = {
  method: string;
  materials: string[];
  hours: number;
  cost: number;
  completedBy: string;
  completedDate: string;
  verifiedBy: string;
  verificationDate: string;
  photos: string[];
  notes: string;
};

type SnagWorkflow = {
  stage: 'triage' | 'assignment' | 'work' | 'verification' | 'client_approval';
  assignee: string;
  status: 'pending' | 'completed';
  timestamp?: string;
  notes?: string;
};

type BIMModel = {
  id: string;
  name: string;
  version: string;
  url: string;
  format: 'ifc' | 'revit' | 'sketchup' | 'autocad' | 'other';
  level: 'lod_100' | 'lod_200' | 'lod_300' | 'lod_400' | 'lod_500';
  disciplines: string[];
  lastUpdated: string;
  federated: boolean;
  clashDetection: ClashResult[];
  quantityTakeoffs: QuantityTakeoff[];
  visualizations: BIMVisualization[];
  linkedDocuments: string[];
  linkedTasks: string[];
  coordination: CoordinationModel[];
};

type ClashResult = {
  id: string;
  type: 'hard' | 'soft' | 'workflow';
  severity: 'minor' | 'major' | 'critical';
  disciplines: string[];
  location: { x: number; y: number; z: number };
  description: string;
  status: 'active' | 'resolved' | 'approved' | 'ignored';
  assignedTo: string;
  dueDate: string;
  resolution?: string;
  photos: string[];
};

type QuantityTakeoff = {
  element: string;
  category: string;
  quantity: number;
  unit: string;
  properties: { [key: string]: unknown };
  linkedMaterials: string[];
  cost: number;
};

type BIMVisualization = {
  id: string;
  name: string;
  type: 'section' | 'elevation' | 'plan' | '3d' | 'animation';
  viewpoint: Record<string, unknown>;
  annotations: BIMAnnotation[];
  linkedTasks: string[];
  url: string;
};

type BIMAnnotation = {
  id: string;
  type: 'issue' | 'note' | 'measurement' | 'markup';
  position: { x: number; y: number; z: number };
  content: string;
  author: string;
  timestamp: string;
  status: 'open' | 'resolved';
};

type CoordinationModel = {
  discipline: string;
  model: string;
  version: string;
  lastSync: string;
  conflicts: number;
  status: 'current' | 'outdated' | 'syncing' | 'error';
};

type CollaborationActivity = {
  id: string;
  type: 'comment' | 'markup' | 'approval' | 'revision' | 'meeting' | 'call';
  user: string;
  timestamp: string;
  content: string;
  linkedItems: string[];
  attachments: string[];
  mentions: string[];
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'active' | 'resolved' | 'archived';
  responses: CollaborationResponse[];
};

type CollaborationResponse = {
  user: string;
  timestamp: string;
  content: string;
  attachments: string[];
};

// Main component
const UltimateConstructionPlatform: React.FC = () => {
  const [activeSection, setActiveSection] = useState<string>('dashboard');
  const [_activeSubSection, setActiveSubSection] = useState<string>('');
  const [testProject, setTestProject] = useState<Project>(createTestProject());
  const { isOnline, syncQueueLength, pwa: _pwa } = usePWA();
  
  // File upload refs
  const documentUploadRef = useRef<HTMLInputElement>(null);
  const drawingUploadRef = useRef<HTMLInputElement>(null);
  const _imageUploadRef = useRef<HTMLInputElement>(null);
  const bimUploadRef = useRef<HTMLInputElement>(null);

  // Real-time data simulation
  useEffect(() => {
    const interval = setInterval(() => {
      // Simulate real-time updates
      setTestProject(prev => ({
        ...prev,
        collaboration: [
          ...prev.collaboration,
          {
            id: `activity-${Date.now()}`,
            type: 'comment' as const,
            user: 'System',
            timestamp: new Date().toISOString(),
            content: 'Automated progress update',
            linkedItems: [],
            attachments: [],
            mentions: [],
            priority: 'low' as const,
            status: 'active' as const,
            responses: []
          }
        ].slice(-10) // Keep only last 10 activities
      }));
    }, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, []);

  // Navigation sections with enhanced categories
  const sections = [
    { 
      id: 'dashboard', 
      title: 'Command Center', 
      icon: '🎯',
      description: 'Real-time project overview and KPIs'
    },
    { 
      id: 'documents', 
      title: 'Document Hub', 
      icon: '📋',
      description: 'Advanced document management with markup tools'
    },
    { 
      id: 'drawings', 
      title: 'Drawing Center', 
      icon: '📐',
      description: 'Professional drawing tools and comparisons'
    },
    { 
      id: 'bim', 
      title: 'BIM Coordination', 
      icon: '🏗️',
      description: '3D modeling, clash detection, and coordination'
    },
    { 
      id: 'scheduling', 
      title: 'Master Schedule', 
      icon: '📅',
      description: 'Advanced scheduling with critical path analysis'
    },
    { 
      id: 'tasks', 
      title: 'Task Engine', 
      icon: '✅',
      description: 'Intelligent task management and automation'
    },
    { 
      id: 'field', 
      title: 'Field Operations', 
      icon: '🚧',
      description: 'Mobile-first field tools and reporting'
    },
    { 
      id: 'quality', 
      title: 'Quality Assurance', 
      icon: '⭐',
      description: 'Quality control and inspection management'
    },
    { 
      id: 'safety', 
      title: 'Safety Central', 
      icon: '🦺',
      description: 'Safety management and incident tracking'
    },
    { 
      id: 'resources', 
      title: 'Resource Hub', 
      icon: '📦',
      description: 'Materials, equipment, and team management'
    },
    { 
      id: 'financial', 
      title: 'Financial Control', 
      icon: '💰',
      description: 'Budget tracking and cost management'
    },
    { 
      id: 'collaboration', 
      title: 'Team Sync', 
      icon: '👥',
      description: 'Real-time collaboration and communication'
    },
    { 
      id: 'reports', 
      title: 'Analytics Suite', 
      icon: '📊',
      description: 'Advanced reporting and business intelligence'
    },
    { 
      id: 'ai', 
      title: 'AI Assistant', 
      icon: '🤖',
      description: 'AI-powered insights and automation'
    }
  ];

  // Render functions for each section
  const renderDashboard = () => (
    <div style={contentStyle()}>
      <div style={dashboardHeaderStyle()}>
        <div>
          <h1 style={dashboardTitleStyle()}>🎯 Command Center</h1>
          <p style={dashboardSubtitleStyle()}>Real-time project overview and key performance indicators</p>
        </div>
        <div style={statusIndicatorsStyle()}>
          <div style={statusIndicatorStyle(isOnline ? 'online' : 'offline')}>
            {isOnline ? '🟢 Online' : '🔴 Offline'}
          </div>
          <div style={statusIndicatorStyle('synced')}>
            🔄 Sync: {syncQueueLength} pending
          </div>
          <div style={statusIndicatorStyle('alert')}>
            ⚠️ 3 Critical Issues
          </div>
        </div>
      </div>

      {/* Project Overview Cards */}
      <div style={kpiGridStyle()}>
        <div style={kpiCardStyle()}>
          <div style={kpiHeaderStyle()}>
            <span style={kpiIconStyle()}>📈</span>
            <h3>Project Progress</h3>
          </div>
          <div style={kpiValueStyle()}>68%</div>
          <div style={kpiSubValueStyle()}>+5% this week</div>
          <div style={kpiTrendStyle('up')}>▲ On track</div>
        </div>

        <div style={kpiCardStyle()}>
          <div style={kpiHeaderStyle()}>
            <span style={kpiIconStyle()}>💰</span>
            <h3>Budget Status</h3>
          </div>
          <div style={kpiValueStyle()}>£{testProject.budget.spent.toLocaleString()}</div>
          <div style={kpiSubValueStyle()}>of £{testProject.budget.allocated.toLocaleString()}</div>
          <div style={kpiTrendStyle('neutral')}>─ Within budget</div>
        </div>

        <div style={kpiCardStyle()}>
          <div style={kpiHeaderStyle()}>
            <span style={kpiIconStyle()}>👥</span>
            <h3>Team Status</h3>
          </div>
          <div style={kpiValueStyle()}>{testProject.team.filter(t => t.status === 'available').length}</div>
          <div style={kpiSubValueStyle()}>of {testProject.team.length} active</div>
          <div style={kpiTrendStyle('up')}>▲ Full capacity</div>
        </div>

        <div style={kpiCardStyle()}>
          <div style={kpiHeaderStyle()}>
            <span style={kpiIconStyle()}>🔧</span>
            <h3>Active Issues</h3>
          </div>
          <div style={kpiValueStyle()}>7</div>
          <div style={kpiSubValueStyle()}>3 critical, 4 minor</div>
          <div style={kpiTrendStyle('down')}>▼ -2 resolved today</div>
        </div>
      </div>

      {/* Real-time Activity Feed */}
      <div style={activityFeedStyle()}>
        <h3 style={sectionHeaderStyle()}>🔄 Live Activity Feed</h3>
        <div style={activityListStyle()}>
          {testProject.collaboration.slice(-5).reverse().map(activity => (
            <div key={activity.id} style={activityItemStyle()}>
              <div style={activityTimeStyle()}>
                {new Date(activity.timestamp).toLocaleTimeString()}
              </div>
              <div style={activityContentStyle()}>
                <strong>{activity.user}</strong> {activity.content}
              </div>
              <div style={activityTypeStyle(activity.type)}>
                {activity.type}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Critical Path Timeline */}
      <div style={timelineContainerStyle()}>
        <h3 style={sectionHeaderStyle()}>📊 Critical Path Timeline</h3>
        <div style={timelineStyle()}>
          {testProject.schedule.filter(event => event.criticalPath).slice(0, 5).map(event => (
            <div key={event.id} style={timelineItemStyle()}>
              <div style={timelineDateStyle()}>{new Date(event.startDate).toLocaleDateString()}</div>
              <div style={timelineContentStyle()}>
                <div style={timelineTitleStyle()}>{event.title}</div>
                <div style={timelineDescStyle()}>{event.description}</div>
                <div style={timelineStatusStyle(event.status)}>{event.status}</div>
              </div>
              <div style={timelineDurationStyle()}>{event.duration}h</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderDocuments = () => (
    <div style={contentStyle()}>
      <h2 style={sectionTitleStyle()}>📋 Document Hub - Advanced Management</h2>
      
      {/* Document Upload and Organization */}
      <div style={cardStyle()}>
        <div style={cardHeaderWithActionsStyle()}>
          <h3>📤 Document Center</h3>
          <div style={documentActionsStyle()}>
            <input
              ref={documentUploadRef}
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.xls,.xlsx,.dwg,.png,.jpg"
              style={{ display: 'none' }}
              onChange={(e) => {
                if (e.target.files) {
                  // console.log('Uploading documents:', e.target.files.length);
                }
              }}
            />
            <button
              onClick={() => documentUploadRef.current?.click()}
              style={primaryButtonStyle()}
            >
              📤 Upload Documents
            </button>
            <button style={secondaryButtonStyle()}>🔍 Advanced Search</button>
            <button style={secondaryButtonStyle()}>📁 Organize</button>
          </div>
        </div>

        {/* Document Categories */}
        <div style={documentCategoriesStyle()}>
          {[
            { type: 'contract', icon: '📄', count: 12, color: '#4CAF50' },
            { type: 'spec', icon: '📋', count: 28, color: '#2196F3' },
            { type: 'drawing', icon: '📐', count: 156, color: '#FF9800' },
            { type: 'photo', icon: '📸', count: 342, color: '#9C27B0' },
            { type: 'report', icon: '📊', count: 67, color: '#F44336' },
            { type: 'other', icon: '📁', count: 89, color: '#607D8B' }
          ].map(category => (
            <div key={category.type} style={documentCategoryStyle(category.color)}>
              <div style={categoryIconStyle()}>{category.icon}</div>
              <div style={categoryNameStyle()}>{category.type}</div>
              <div style={categoryCountStyle()}>{category.count}</div>
            </div>
          ))}
        </div>

        {/* Advanced Markup Tools */}
        <div style={markupToolsStyle()}>
          <h4>🎨 Professional Markup Tools</h4>
          <div style={markupButtonsStyle()}>
            <button style={markupButtonStyle()}>✏️ Annotate</button>
            <button style={markupButtonStyle()}>🔍 Highlight</button>
            <button style={markupButtonStyle()}>➡️ Arrow</button>
            <button style={markupButtonStyle()}>💬 Callout</button>
            <button style={markupButtonStyle()}>📏 Measure</button>
            <button style={markupButtonStyle()}>🏷️ Stamp</button>
            <button style={markupButtonStyle()}>📎 Link</button>
            <button style={markupButtonStyle()}>🔄 Compare</button>
          </div>
        </div>

        {/* Document List with Advanced Features */}
        <div style={documentListStyle()}>
          <div style={documentListHeaderStyle()}>
            <div>Document</div>
            <div>Type</div>
            <div>Version</div>
            <div>Status</div>
            <div>Markups</div>
            <div>Actions</div>
          </div>
          {testProject.documents.slice(0, 5).map(doc => (
            <div key={doc.id} style={documentItemStyle()}>
              <div style={documentNameStyle()}>
                <span style={documentIconStyle()}>{getDocumentIcon(doc.type)}</span>
                {doc.name}
              </div>
              <div style={documentTypeStyle()}>{doc.type}</div>
              <div style={documentVersionStyle()}>{doc.version}</div>
              <div style={documentStatusStyle(doc.approvalStatus)}>
                {doc.approvalStatus}
              </div>
              <div style={documentMarkupsStyle()}>{doc.markups.length}</div>
              <div style={documentActionsListStyle()}>
                <button style={actionButtonStyle()}>👁️</button>
                <button style={actionButtonStyle()}>✏️</button>
                <button style={actionButtonStyle()}>📤</button>
                <button style={actionButtonStyle()}>🔗</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Features Showcase */}
      <div style={featuresGridStyle()}>
        <div style={featureCardStyle()}>
          <h4>🔍 Smart Search</h4>
          <ul style={featureListStyle()}>
            <li>Full-text OCR search</li>
            <li>Metadata filtering</li>
            <li>AI-powered categorization</li>
            <li>Version history tracking</li>
          </ul>
        </div>

        <div style={featureCardStyle()}>
          <h4>🎨 Advanced Markup</h4>
          <ul style={featureListStyle()}>
            <li>Professional annotation tools</li>
            <li>Collaborative markup</li>
            <li>Measurement tools</li>
            <li>Hyperlink creation</li>
          </ul>
        </div>

        <div style={featureCardStyle()}>
          <h4>🔄 Version Control</h4>
          <ul style={featureListStyle()}>
            <li>Automatic versioning</li>
            <li>Change tracking</li>
            <li>Approval workflows</li>
            <li>Rollback capability</li>
          </ul>
        </div>

        <div style={featureCardStyle()}>
          <h4>📱 Mobile Access</h4>
          <ul style={featureListStyle()}>
            <li>Offline document access</li>
            <li>Mobile markup tools</li>
            <li>Field capture integration</li>
            <li>Real-time sync</li>
          </ul>
        </div>
      </div>
    </div>
  );

  const renderDrawings = () => (
    <div style={contentStyle()}>
      <h2 style={sectionTitleStyle()}>📐 Drawing Center - Professional Tools</h2>
      
      {/* Drawing Management */}
      <div style={cardStyle()}>
        <div style={cardHeaderWithActionsStyle()}>
          <h3>🗂️ Drawing Management</h3>
          <div style={drawingActionsStyle()}>
            <input
              ref={drawingUploadRef}
              type="file"
              multiple
              accept=".dwg,.pdf,.png,.jpg"
              style={{ display: 'none' }}
              onChange={(e) => {
                if (e.target.files) {
                  // console.log('Uploading drawings:', e.target.files.length);
                }
              }}
            />
            <button
              onClick={() => drawingUploadRef.current?.click()}
              style={primaryButtonStyle()}
            >
              📐 Upload Drawings
            </button>
            <button style={secondaryButtonStyle()}>🔄 Compare Versions</button>
            <button style={secondaryButtonStyle()}>🔗 Create Hyperlinks</button>
            <button style={secondaryButtonStyle()}>📏 Calibrate Scale</button>
          </div>
        </div>

        {/* Drawing Disciplines */}
        <div style={disciplineGridStyle()}>
          {[
            { discipline: 'architectural', icon: '🏠', count: 45, color: '#4CAF50' },
            { discipline: 'structural', icon: '🏗️', count: 23, color: '#FF9800' },
            { discipline: 'mechanical', icon: '⚙️', count: 18, color: '#2196F3' },
            { discipline: 'electrical', icon: '⚡', count: 31, color: '#FFC107' },
            { discipline: 'plumbing', icon: '🚰', count: 12, color: '#00BCD4' }
          ].map(disc => (
            <div key={disc.discipline} style={disciplineCardStyle(disc.color)}>
              <div style={disciplineIconStyle()}>{disc.icon}</div>
              <div style={disciplineNameStyle()}>{disc.discipline}</div>
              <div style={disciplineCountStyle()}>{disc.count} drawings</div>
            </div>
          ))}
        </div>

        {/* Drawing Comparison Tool */}
        <div style={comparisonToolStyle()}>
          <h4>🔄 Drawing Comparison</h4>
          <div style={comparisonControlsStyle()}>
            <select style={selectStyle()}>
              <option>Select Original Drawing...</option>
              {testProject.drawings.map(drawing => (
                <option key={drawing.id} value={drawing.id}>{drawing.name}</option>
              ))}
            </select>
            <select style={selectStyle()}>
              <option>Select Revised Drawing...</option>
              {testProject.drawings.map(drawing => (
                <option key={drawing.id} value={drawing.id}>{drawing.name}</option>
              ))}
            </select>
            <button style={primaryButtonStyle()}>🔍 Compare</button>
          </div>
          
          {/* Comparison Results */}
          <div style={comparisonResultsStyle()}>
            <div style={comparisonStatsStyle()}>
              <div style={comparisonStatStyle('addition')}>
                <span>➕</span>
                <div>
                  <div>12 Additions</div>
                  <div>New elements added</div>
                </div>
              </div>
              <div style={comparisonStatStyle('deletion')}>
                <span>➖</span>
                <div>
                  <div>5 Deletions</div>
                  <div>Elements removed</div>
                </div>
              </div>
              <div style={comparisonStatStyle('modification')}>
                <span>🔄</span>
                <div>
                  <div>8 Modifications</div>
                  <div>Elements changed</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Hyperlink Management */}
        <div style={hyperlinkToolStyle()}>
          <h4>🔗 Hyperlink Management</h4>
          <div style={hyperlinkListStyle()}>
            <div style={hyperlinkItemStyle()}>
              <div>📐 Floor Plan Level 1 → 🔌 Electrical Plan Level 1</div>
              <button style={actionButtonStyle()}>✏️</button>
            </div>
            <div style={hyperlinkItemStyle()}>
              <div>🏗️ Structural Frame → 📋 Connection Details</div>
              <button style={actionButtonStyle()}>✏️</button>
            </div>
            <div style={hyperlinkItemStyle()}>
              <div>⚙️ HVAC Plan → 📊 Equipment Schedule</div>
              <button style={actionButtonStyle()}>✏️</button>
            </div>
          </div>
          <button style={secondaryButtonStyle()}>➕ Add Hyperlink</button>
        </div>
      </div>

      {/* Professional Features */}
      <div style={featuresGridStyle()}>
        <div style={featureCardStyle()}>
          <h4>📏 Measurement Tools</h4>
          <ul style={featureListStyle()}>
            <li>Precision measurement</li>
            <li>Area calculations</li>
            <li>Scale calibration</li>
            <li>Quantity takeoffs</li>
          </ul>
        </div>

        <div style={featureCardStyle()}>
          <h4>🎨 Markup Suite</h4>
          <ul style={featureListStyle()}>
            <li>Professional symbols</li>
            <li>Cloud annotations</li>
            <li>Revision tracking</li>
            <li>Comment management</li>
          </ul>
        </div>

        <div style={featureCardStyle()}>
          <h4>🔄 Version Control</h4>
          <ul style={featureListStyle()}>
            <li>Automatic change detection</li>
            <li>Side-by-side comparison</li>
            <li>Overlay analysis</li>
            <li>Change logs</li>
          </ul>
        </div>

        <div style={featureCardStyle()}>
          <h4>🔗 Integration</h4>
          <ul style={featureListStyle()}>
            <li>BIM model linking</li>
            <li>Task integration</li>
            <li>Document references</li>
            <li>Real-time updates</li>
          </ul>
        </div>
      </div>
    </div>
  );

  const renderBIM = () => (
    <div style={contentStyle()}>
      <h2 style={sectionTitleStyle()}>🏗️ BIM Coordination - 3D Intelligence</h2>
      
      {/* BIM Model Management */}
      <div style={cardStyle()}>
        <div style={cardHeaderWithActionsStyle()}>
          <h3>🎯 BIM Model Center</h3>
          <div style={bimActionsStyle()}>
            <input
              ref={bimUploadRef}
              type="file"
              multiple
              accept=".ifc,.rvt,.skp,.dwg"
              style={{ display: 'none' }}
              onChange={(e) => {
                if (e.target.files) {
                  // console.log('Uploading BIM models:', e.target.files.length);
                }
              }}
            />
            <button
              onClick={() => bimUploadRef.current?.click()}
              style={primaryButtonStyle()}
            >
              🏗️ Upload Model
            </button>
            <button style={secondaryButtonStyle()}>🔍 Clash Detection</button>
            <button style={secondaryButtonStyle()}>📊 Quantity Takeoff</button>
            <button style={secondaryButtonStyle()}>🎮 3D Viewer</button>
          </div>
        </div>

        {/* Model Information */}
        {testProject.bim && (
          <div style={bimInfoStyle()}>
            <div style={bimInfoItemStyle()}>
              <strong>Model:</strong> {testProject.bim.name}
            </div>
            <div style={bimInfoItemStyle()}>
              <strong>Version:</strong> {testProject.bim.version}
            </div>
            <div style={bimInfoItemStyle()}>
              <strong>Format:</strong> {testProject.bim.format.toUpperCase()}
            </div>
            <div style={bimInfoItemStyle()}>
              <strong>Level of Detail:</strong> {testProject.bim.level.replace('_', ' ').toUpperCase()}
            </div>
            <div style={bimInfoItemStyle()}>
              <strong>Last Updated:</strong> {new Date(testProject.bim.lastUpdated).toLocaleDateString()}
            </div>
            <div style={bimInfoItemStyle()}>
              <strong>Federated:</strong> {testProject.bim.federated ? 'Yes' : 'No'}
            </div>
          </div>
        )}

        {/* Clash Detection Results */}
        <div style={clashDetectionStyle()}>
          <h4>⚔️ Clash Detection Results</h4>
          <div style={clashSummaryStyle()}>
            <div style={clashStatStyle('critical')}>
              <span>🔴</span>
              <div>
                <div>12 Critical</div>
                <div>Hard clashes</div>
              </div>
            </div>
            <div style={clashStatStyle('major')}>
              <span>🟡</span>
              <div>
                <div>8 Major</div>
                <div>Soft clashes</div>
              </div>
            </div>
            <div style={clashStatStyle('minor')}>
              <span>🟢</span>
              <div>
                <div>3 Minor</div>
                <div>Workflow clashes</div>
              </div>
            </div>
            <div style={clashStatStyle('resolved')}>
              <span>✅</span>
              <div>
                <div>45 Resolved</div>
                <div>This week</div>
              </div>
            </div>
          </div>

          {/* Clash List */}
          <div style={clashListStyle()}>
            <div style={clashListHeaderStyle()}>
              <div>Type</div>
              <div>Disciplines</div>
              <div>Description</div>
              <div>Severity</div>
              <div>Assigned</div>
              <div>Status</div>
              <div>Actions</div>
            </div>
            {testProject.bim?.clashDetection.slice(0, 5).map(clash => (
              <div key={clash.id} style={clashItemStyle()}>
                <div style={clashTypeStyle(clash.type)}>{clash.type}</div>
                <div style={clashDisciplinesStyle()}>
                  {clash.disciplines.join(' vs ')}
                </div>
                <div style={clashDescStyle()}>{clash.description}</div>
                <div style={clashSeverityStyle(clash.severity)}>{clash.severity}</div>
                <div style={clashAssignedStyle()}>{clash.assignedTo}</div>
                <div style={clashStatusStyle(clash.status)}>{clash.status}</div>
                <div style={clashActionsStyle()}>
                  <button style={actionButtonStyle()}>👁️</button>
                  <button style={actionButtonStyle()}>✏️</button>
                  <button style={actionButtonStyle()}>📍</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 3D Viewer Interface */}
        <div style={viewerInterfaceStyle()}>
          <h4>🎮 3D Model Viewer</h4>
          <div style={viewerControlsStyle()}>
            <div style={viewerButtonGroupStyle()}>
              <button style={viewerButtonStyle()}>🏠 Home View</button>
              <button style={viewerButtonStyle()}>📋 Plan View</button>
              <button style={viewerButtonStyle()}>🔄 Section</button>
              <button style={viewerButtonStyle()}>📐 Elevation</button>
            </div>
            <div style={viewerButtonGroupStyle()}>
              <button style={viewerButtonStyle()}>🎨 Render Mode</button>
              <button style={viewerButtonStyle()}>🔍 Isolate</button>
              <button style={viewerButtonStyle()}>👁️ Hide/Show</button>
              <button style={viewerButtonStyle()}>📏 Measure</button>
            </div>
          </div>
          
          {/* Mock 3D Viewer */}
          <div style={mockViewerStyle()}>
            <div style={viewerPlaceholderStyle()}>
              <div style={viewerIconStyle()}>🏗️</div>
              <div>Interactive 3D Model Viewer</div>
              <div style={viewerSubtextStyle()}>
                WebGL-based rendering with real-time navigation
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* BIM Features */}
      <div style={featuresGridStyle()}>
        <div style={featureCardStyle()}>
          <h4>🔍 Clash Detection</h4>
          <ul style={featureListStyle()}>
            <li>Automated clash detection</li>
            <li>Multi-discipline coordination</li>
            <li>Priority-based resolution</li>
            <li>Real-time notifications</li>
          </ul>
        </div>

        <div style={featureCardStyle()}>
          <h4>📊 Quantity Takeoffs</h4>
          <ul style={featureListStyle()}>
            <li>Automated quantity extraction</li>
            <li>Material scheduling</li>
            <li>Cost estimation</li>
            <li>Change impact analysis</li>
          </ul>
        </div>

        <div style={featureCardStyle()}>
          <h4>🎮 Visualization</h4>
          <ul style={featureListStyle()}>
            <li>Immersive 3D navigation</li>
            <li>Virtual reality support</li>
            <li>Augmented reality overlay</li>
            <li>4D scheduling visualization</li>
          </ul>
        </div>

        <div style={featureCardStyle()}>
          <h4>🔄 Coordination</h4>
          <ul style={featureListStyle()}>
            <li>Multi-model federation</li>
            <li>Version synchronization</li>
            <li>Change tracking</li>
            <li>Stakeholder collaboration</li>
          </ul>
        </div>
      </div>
    </div>
  );

  // Helper function to create test project
  function createTestProject(): Project {
    return {
      id: 'project-001',
      title: 'Modern Office Complex - Phase 1',
      clientName: 'TechCorp Industries Ltd',
      address: '456 Innovation Drive, Tech City, TC2 3BC',
      startDate: '2025-01-15',
      endDate: '2025-06-30',
      status: 'in_progress',
      priority: 'high',
      budget: {
        allocated: 2500000,
        spent: 1200000,
        remaining: 1300000,
        forecasted: 2450000
      },
      team: [
        {
          id: 'tm-001',
          name: 'Sarah Johnson',
          role: 'project_manager',
          skills: ['leadership', 'scheduling', 'budgeting'],
          availability: 'full_time',
          contact: 'sarah@bhit.com',
          status: 'available'
        },
        {
          id: 'tm-002',
          name: 'Mike Chen',
          role: 'superintendent',
          skills: ['site_management', 'quality_control', 'safety'],
          availability: 'full_time',
          contact: 'mike@bhit.com',
          status: 'busy'
        },
        {
          id: 'tm-003',
          name: 'Lisa Rodriguez',
          role: 'foreman',
          skills: ['carpentry', 'finishing', 'team_leadership'],
          availability: 'full_time',
          contact: 'lisa@bhit.com',
          status: 'available'
        }
      ],
      documents: [
        {
          id: 'doc-001',
          name: 'Project Contract - Amendment 2',
          type: 'contract',
          url: '/documents/contract-v2.pdf',
          version: '2.1',
          uploadDate: '2025-01-10',
          uploadedBy: 'Sarah Johnson',
          markups: [
            {
              id: 'markup-001',
              type: 'annotation',
              coordinates: { x: 100, y: 200 },
              content: 'Updated payment schedule',
              author: 'Sarah Johnson',
              timestamp: '2025-01-10T10:30:00Z',
              color: '#FF6B6B',
              resolved: false
            }
          ],
          approvalStatus: 'approved',
          tags: ['contract', 'amendment', 'payment']
        }
      ],
      drawings: [
        {
          id: 'dwg-001',
          name: 'Ground Floor Plan',
          discipline: 'architectural',
          version: 'A-002',
          scale: '1:100',
          url: '/drawings/ground-floor-a002.pdf',
          thumbnailUrl: '/drawings/thumbs/ground-floor-a002.jpg',
          markups: [],
          comparisons: [],
          hyperlinks: []
        }
      ],
      floorPlans: [
        {
          id: 'fp-001',
          name: 'Ground Floor',
          level: 'Level 0',
          url: '/floorplans/ground-floor.pdf',
          scale: 1.0,
          furniture: [],
          zones: [],
          measurements: [],
          utilities: []
        }
      ],
      tasks: [
        {
          id: 'task-001',
          title: 'Foundation Excavation',
          description: 'Excavate foundation areas according to structural drawings',
          type: 'preparation',
          total_qty: 500,
          uplifted_qty: 500,
          placed_qty: 450,
          built_qty: 400,
          missing_qty: 0,
          damaged_qty: 5,
          room_zone: 'Foundation Area',
          assignedTo: ['tm-002', 'tm-003'],
          dependencies: [],
          prerequisites: ['site_survey', 'permits'],
          duration: 120,
          startDate: '2025-01-15',
          endDate: '2025-01-22',
          actualStartDate: '2025-01-15',
          progress: 80,
          materials: [],
          equipment: [],
          safety: [],
          quality: [],
          cost: {
            estimated: 50000,
            actual: 48500,
            variance: -1500
          },
          linkedDrawings: ['dwg-001'],
          linkedDocuments: ['doc-001'],
          photos: [],
          notes: [],
          status: 'in_progress',
          approvalRequired: false
        }
      ],
      schedule: [
        {
          id: 'sch-001',
          title: 'Foundation Complete',
          type: 'milestone',
          startDate: '2025-01-22',
          endDate: '2025-01-22',
          duration: 0,
          assignedTo: ['tm-002'],
          location: 'Foundation Area',
          description: 'Foundation work completion milestone',
          dependencies: ['task-001'],
          criticalPath: true,
          floatTime: 0,
          status: 'scheduled',
          resources: []
        }
      ],
      images: [],
      rfi: [],
      submittals: [],
      changeOrders: [],
      inspections: [],
      materials: [],
      equipment: [],
      safety: [],
      quality: [],
      damages: [],
      snags: [],
      bim: {
        id: 'bim-001',
        name: 'Office Complex Master Model',
        version: '2.3',
        url: '/bim/office-complex-v23.ifc',
        format: 'ifc',
        level: 'lod_300',
        disciplines: ['architectural', 'structural', 'mechanical', 'electrical'],
        lastUpdated: '2025-01-14',
        federated: true,
        clashDetection: [
          {
            id: 'clash-001',
            type: 'hard',
            severity: 'critical',
            disciplines: ['structural', 'mechanical'],
            location: { x: 125.5, y: 67.3, z: 15.2 },
            description: 'Beam conflicts with HVAC duct',
            status: 'active',
            assignedTo: 'Mike Chen',
            dueDate: '2025-01-20',
            photos: []
          }
        ],
        quantityTakeoffs: [],
        visualizations: [],
        linkedDocuments: [],
        linkedTasks: [],
        coordination: []
      },
      collaboration: [
        {
          id: 'collab-001',
          type: 'comment',
          user: 'Sarah Johnson',
          timestamp: '2025-01-14T14:30:00Z',
          content: 'Foundation excavation ahead of schedule',
          linkedItems: ['task-001'],
          attachments: [],
          mentions: ['Mike Chen'],
          priority: 'medium',
          status: 'active',
          responses: []
        }
      ]
    };
  }

  // Helper functions
  const getDocumentIcon = (type: string) => {
    const icons = {
      contract: '📄',
      spec: '📋',
      drawing: '📐',
      photo: '📸',
      report: '📊',
      other: '📁'
    };
    return icons[type as keyof typeof icons] || '📁';
  };

  return (
    <div style={containerStyle()}>
      {/* Enhanced Navigation */}
      <div style={navigationStyle()}>
        <div style={navHeaderStyle()}>
          <h1 style={titleStyle()}>🏗️ Ultimate Construction Management Platform</h1>
          <p style={subtitleStyle()}>Surpassing industry leaders with next-generation tools</p>
        </div>
        
        <div style={navGridStyle()}>
          {sections.map(section => (
            <button
              key={section.id}
              onClick={() => {
                setActiveSection(section.id);
                setActiveSubSection('');
              }}
              style={{
                ...navCardStyle(),
                ...(activeSection === section.id ? activeNavCardStyle() : {})
              }}
            >
              <div style={navCardIconStyle()}>{section.icon}</div>
              <div style={navCardTitleStyle()}>{section.title}</div>
              <div style={navCardDescStyle()}>{section.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div style={mainContentStyle()}>
        {activeSection === 'dashboard' && renderDashboard()}
        {activeSection === 'documents' && renderDocuments()}
        {activeSection === 'drawings' && renderDrawings()}
        {activeSection === 'bim' && renderBIM()}
        {/* Additional sections will be implemented */}
        
        {/* Placeholder for other sections */}
        {!['dashboard', 'documents', 'drawings', 'bim'].includes(activeSection) && (
          <div style={contentStyle()}>
            <h2 style={sectionTitleStyle()}>
              {sections.find(s => s.id === activeSection)?.icon} {sections.find(s => s.id === activeSection)?.title}
            </h2>
            <div style={cardStyle()}>
              <h3>🚧 Advanced Features Coming Soon</h3>
              <p>This section will include industry-leading capabilities that surpass FieldWire, Bluebeam, and Procore:</p>
              <ul style={featureListStyle()}>
                <li>AI-powered automation and insights</li>
                <li>Real-time collaboration tools</li>
                <li>Advanced analytics and reporting</li>
                <li>Mobile-first field operations</li>
                <li>Integrated quality and safety management</li>
                <li>Comprehensive resource management</li>
                <li>Financial control and forecasting</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Enhanced Styles
const containerStyle = (): React.CSSProperties => ({
  minHeight: '100vh',
  background: 'linear-gradient(135deg, #0a0f1a 0%, #1a1f2e 50%, #242938 100%)',
  color: '#ffffff',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Inter", sans-serif'
});

const navigationStyle = (): React.CSSProperties => ({
  background: 'linear-gradient(135deg, rgba(26, 31, 46, 0.95) 0%, rgba(36, 41, 56, 0.95) 100%)',
  backdropFilter: 'blur(20px)',
  padding: '30px',
  borderBottom: '1px solid rgba(255,255,255,0.1)',
  boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
});

const navHeaderStyle = (): React.CSSProperties => ({
  textAlign: 'center',
  marginBottom: '30px'
});

const titleStyle = (): React.CSSProperties => ({
  margin: '0 0 8px 0',
  fontSize: '32px',
  fontWeight: '700',
  background: 'linear-gradient(135deg, #64B5F6 0%, #42A5F5 50%, #2196F3 100%)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text'
});

const subtitleStyle = (): React.CSSProperties => ({
  margin: 0,
  fontSize: '16px',
  color: '#8892a0',
  fontWeight: '400'
});

const navGridStyle = (): React.CSSProperties => ({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
  gap: '16px'
});

const navCardStyle = (): React.CSSProperties => ({
  padding: '20px',
  borderRadius: '12px',
  border: '1px solid rgba(255,255,255,0.08)',
  background: 'rgba(255,255,255,0.03)',
  cursor: 'pointer',
  transition: 'all 0.3s ease',
  textAlign: 'left',
  position: 'relative',
  overflow: 'hidden'
});

const activeNavCardStyle = (): React.CSSProperties => ({
  background: 'linear-gradient(135deg, rgba(33, 150, 243, 0.2) 0%, rgba(33, 150, 243, 0.1) 100%)',
  borderColor: theme.colors.accent,
  transform: 'translateY(-2px)',
  boxShadow: '0 12px 24px rgba(33, 150, 243, 0.15)'
});

const navCardIconStyle = (): React.CSSProperties => ({
  fontSize: '24px',
  marginBottom: '8px',
  display: 'block'
});

const navCardTitleStyle = (): React.CSSProperties => ({
  fontSize: '16px',
  fontWeight: '600',
  marginBottom: '4px',
  color: '#ffffff'
});

const navCardDescStyle = (): React.CSSProperties => ({
  fontSize: '13px',
  color: '#8892a0',
  lineHeight: '1.4'
});

const mainContentStyle = (): React.CSSProperties => ({
  padding: '30px',
  maxWidth: '1400px',
  margin: '0 auto'
});

const contentStyle = (): React.CSSProperties => ({
  display: 'flex',
  flexDirection: 'column',
  gap: '24px'
});

const sectionTitleStyle = (): React.CSSProperties => ({
  fontSize: '32px',
  fontWeight: '700',
  margin: '0 0 24px 0',
  background: 'linear-gradient(135deg, #ffffff 0%, #e3f2fd 100%)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text'
});

const cardStyle = (): React.CSSProperties => ({
  background: 'linear-gradient(135deg, rgba(26, 31, 46, 0.6) 0%, rgba(36, 41, 56, 0.8) 100%)',
  backdropFilter: 'blur(20px)',
  borderRadius: '16px',
  padding: '24px',
  border: '1px solid rgba(255,255,255,0.08)',
  boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
  position: 'relative',
  overflow: 'hidden'
});

const dashboardHeaderStyle = (): React.CSSProperties => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  marginBottom: '32px',
  flexWrap: 'wrap',
  gap: '16px'
});

const dashboardTitleStyle = (): React.CSSProperties => ({
  fontSize: '36px',
  fontWeight: '700',
  margin: '0 0 8px 0',
  background: 'linear-gradient(135deg, #64B5F6 0%, #2196F3 100%)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text'
});

const dashboardSubtitleStyle = (): React.CSSProperties => ({
  margin: 0,
  fontSize: '16px',
  color: '#8892a0'
});

const statusIndicatorsStyle = (): React.CSSProperties => ({
  display: 'flex',
  gap: '12px',
  flexWrap: 'wrap'
});

const statusIndicatorStyle = (type: string): React.CSSProperties => ({
  padding: '8px 16px',
  borderRadius: '20px',
  fontSize: '12px',
  fontWeight: '600',
  background: type === 'online' ? 'rgba(76, 175, 80, 0.2)' :
              type === 'offline' ? 'rgba(244, 67, 54, 0.2)' :
              type === 'synced' ? 'rgba(33, 150, 243, 0.2)' :
              'rgba(255, 152, 0, 0.2)',
  border: `1px solid ${type === 'online' ? '#4CAF50' :
                       type === 'offline' ? '#F44336' :
                       type === 'synced' ? '#2196F3' :
                       '#FF9800'}20`
});

const kpiGridStyle = (): React.CSSProperties => ({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
  gap: '20px',
  marginBottom: '32px'
});

const kpiCardStyle = (): React.CSSProperties => ({
  background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
  borderRadius: '12px',
  padding: '20px',
  border: '1px solid rgba(255,255,255,0.1)',
  position: 'relative',
  overflow: 'hidden'
});

const kpiHeaderStyle = (): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  marginBottom: '16px'
});

const kpiIconStyle = (): React.CSSProperties => ({
  fontSize: '24px'
});

const kpiValueStyle = (): React.CSSProperties => ({
  fontSize: '28px',
  fontWeight: '700',
  color: '#ffffff',
  marginBottom: '4px'
});

const kpiSubValueStyle = (): React.CSSProperties => ({
  fontSize: '14px',
  color: '#8892a0',
  marginBottom: '8px'
});

const kpiTrendStyle = (trend: string): React.CSSProperties => ({
  fontSize: '12px',
  fontWeight: '600',
  color: trend === 'up' ? '#4CAF50' :
         trend === 'down' ? '#F44336' :
         '#FFC107'
});

const activityFeedStyle = (): React.CSSProperties => ({
  ...cardStyle(),
  marginBottom: '32px'
});

const sectionHeaderStyle = (): React.CSSProperties => ({
  fontSize: '20px',
  fontWeight: '600',
  marginBottom: '16px',
  color: '#ffffff'
});

const activityListStyle = (): React.CSSProperties => ({
  display: 'flex',
  flexDirection: 'column',
  gap: '12px'
});

const activityItemStyle = (): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  gap: '16px',
  padding: '12px',
  borderRadius: '8px',
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.05)'
});

const activityTimeStyle = (): React.CSSProperties => ({
  fontSize: '12px',
  color: '#8892a0',
  minWidth: '60px'
});

const activityContentStyle = (): React.CSSProperties => ({
  flex: 1,
  fontSize: '14px'
});

const activityTypeStyle = (_type: string): React.CSSProperties => ({
  padding: '4px 8px',
  borderRadius: '4px',
  fontSize: '10px',
  fontWeight: '600',
  textTransform: 'uppercase',
  background: 'rgba(33, 150, 243, 0.2)',
  color: '#64B5F6'
});

const timelineContainerStyle = (): React.CSSProperties => ({
  ...cardStyle()
});

const timelineStyle = (): React.CSSProperties => ({
  display: 'flex',
  flexDirection: 'column',
  gap: '16px'
});

const timelineItemStyle = (): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  gap: '16px',
  padding: '16px',
  borderRadius: '8px',
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.05)'
});

const timelineDateStyle = (): React.CSSProperties => ({
  fontSize: '12px',
  color: '#8892a0',
  minWidth: '80px'
});

const timelineContentStyle = (): React.CSSProperties => ({
  flex: 1
});

const timelineTitleStyle = (): React.CSSProperties => ({
  fontSize: '14px',
  fontWeight: '600',
  marginBottom: '4px'
});

const timelineDescStyle = (): React.CSSProperties => ({
  fontSize: '12px',
  color: '#8892a0',
  marginBottom: '8px'
});

const timelineStatusStyle = (status: string): React.CSSProperties => ({
  padding: '2px 8px',
  borderRadius: '4px',
  fontSize: '10px',
  fontWeight: '600',
  textTransform: 'uppercase',
  background: status === 'completed' ? 'rgba(76, 175, 80, 0.2)' :
              status === 'in_progress' ? 'rgba(33, 150, 243, 0.2)' :
              'rgba(255, 152, 0, 0.2)',
  color: status === 'completed' ? '#81C784' :
         status === 'in_progress' ? '#64B5F6' :
         '#FFB74D'
});

const timelineDurationStyle = (): React.CSSProperties => ({
  fontSize: '12px',
  color: '#8892a0',
  minWidth: '40px',
  textAlign: 'right'
});

const cardHeaderWithActionsStyle = (): React.CSSProperties => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '20px',
  flexWrap: 'wrap',
  gap: '16px'
});

const documentActionsStyle = (): React.CSSProperties => ({
  display: 'flex',
  gap: '8px',
  flexWrap: 'wrap'
});

const primaryButtonStyle = (): React.CSSProperties => ({
  padding: '10px 16px',
  borderRadius: '8px',
  border: 'none',
  background: 'linear-gradient(135deg, #2196F3 0%, #1976D2 100%)',
  color: '#ffffff',
  fontWeight: '600',
  cursor: 'pointer',
  fontSize: '14px',
  transition: 'all 0.2s ease'
});

const secondaryButtonStyle = (): React.CSSProperties => ({
  padding: '10px 16px',
  borderRadius: '8px',
  border: '1px solid rgba(255,255,255,0.2)',
  background: 'rgba(255,255,255,0.05)',
  color: '#ffffff',
  fontWeight: '500',
  cursor: 'pointer',
  fontSize: '14px',
  transition: 'all 0.2s ease'
});

const documentCategoriesStyle = (): React.CSSProperties => ({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
  gap: '12px',
  marginBottom: '24px'
});

const documentCategoryStyle = (color: string): React.CSSProperties => ({
  padding: '16px 12px',
  borderRadius: '8px',
  background: `${color}15`,
  border: `1px solid ${color}30`,
  textAlign: 'center',
  cursor: 'pointer',
  transition: 'all 0.2s ease'
});

const categoryIconStyle = (): React.CSSProperties => ({
  fontSize: '24px',
  marginBottom: '8px',
  display: 'block'
});

const categoryNameStyle = (): React.CSSProperties => ({
  fontSize: '12px',
  fontWeight: '600',
  textTransform: 'capitalize',
  marginBottom: '4px'
});

const categoryCountStyle = (): React.CSSProperties => ({
  fontSize: '10px',
  color: '#8892a0'
});

const markupToolsStyle = (): React.CSSProperties => ({
  marginBottom: '24px'
});

const markupButtonsStyle = (): React.CSSProperties => ({
  display: 'flex',
  gap: '8px',
  flexWrap: 'wrap',
  marginTop: '12px'
});

const markupButtonStyle = (): React.CSSProperties => ({
  padding: '8px 12px',
  borderRadius: '6px',
  border: '1px solid rgba(255,255,255,0.2)',
  background: 'rgba(255,255,255,0.05)',
  color: '#ffffff',
  fontSize: '12px',
  cursor: 'pointer',
  transition: 'all 0.2s ease'
});

const documentListStyle = (): React.CSSProperties => ({
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '8px',
  overflow: 'hidden'
});

const documentListHeaderStyle = (): React.CSSProperties => ({
  display: 'grid',
  gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr',
  gap: '16px',
  padding: '12px 16px',
  background: 'rgba(255,255,255,0.05)',
  fontSize: '12px',
  fontWeight: '600',
  color: '#8892a0',
  textTransform: 'uppercase'
});

const documentItemStyle = (): React.CSSProperties => ({
  display: 'grid',
  gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr',
  gap: '16px',
  padding: '12px 16px',
  borderTop: '1px solid rgba(255,255,255,0.05)',
  alignItems: 'center',
  fontSize: '14px'
});

const documentNameStyle = (): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  gap: '8px'
});

const documentIconStyle = (): React.CSSProperties => ({
  fontSize: '16px'
});

const documentTypeStyle = (): React.CSSProperties => ({
  textTransform: 'capitalize',
  color: '#8892a0'
});

const documentVersionStyle = (): React.CSSProperties => ({
  fontFamily: 'monospace',
  fontSize: '12px',
  color: '#8892a0'
});

const documentStatusStyle = (status: string): React.CSSProperties => ({
  padding: '4px 8px',
  borderRadius: '4px',
  fontSize: '10px',
  fontWeight: '600',
  textTransform: 'uppercase',
  background: status === 'approved' ? 'rgba(76, 175, 80, 0.2)' :
              status === 'pending' ? 'rgba(255, 152, 0, 0.2)' :
              'rgba(244, 67, 54, 0.2)',
  color: status === 'approved' ? '#81C784' :
         status === 'pending' ? '#FFB74D' :
         '#EF5350'
});

const documentMarkupsStyle = (): React.CSSProperties => ({
  fontSize: '12px',
  color: '#8892a0'
});

const documentActionsListStyle = (): React.CSSProperties => ({
  display: 'flex',
  gap: '4px'
});

const actionButtonStyle = (): React.CSSProperties => ({
  padding: '4px 8px',
  borderRadius: '4px',
  border: 'none',
  background: 'rgba(255,255,255,0.1)',
  color: '#ffffff',
  cursor: 'pointer',
  fontSize: '12px',
  transition: 'all 0.2s ease'
});

const featuresGridStyle = (): React.CSSProperties => ({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
  gap: '20px'
});

const featureCardStyle = (): React.CSSProperties => ({
  background: 'rgba(255,255,255,0.03)',
  borderRadius: '8px',
  padding: '20px',
  border: '1px solid rgba(255,255,255,0.1)'
});

const featureListStyle = (): React.CSSProperties => ({
  fontSize: '14px',
  color: '#8892a0',
  lineHeight: '1.6',
  paddingLeft: '16px'
});

const drawingActionsStyle = (): React.CSSProperties => ({
  display: 'flex',
  gap: '8px',
  flexWrap: 'wrap'
});

const disciplineGridStyle = (): React.CSSProperties => ({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
  gap: '12px',
  marginBottom: '24px'
});

const disciplineCardStyle = (color: string): React.CSSProperties => ({
  padding: '16px 12px',
  borderRadius: '8px',
  background: `${color}15`,
  border: `1px solid ${color}30`,
  textAlign: 'center',
  cursor: 'pointer',
  transition: 'all 0.2s ease'
});

const disciplineIconStyle = (): React.CSSProperties => ({
  fontSize: '24px',
  marginBottom: '8px',
  display: 'block'
});

const disciplineNameStyle = (): React.CSSProperties => ({
  fontSize: '12px',
  fontWeight: '600',
  textTransform: 'capitalize',
  marginBottom: '4px'
});

const disciplineCountStyle = (): React.CSSProperties => ({
  fontSize: '10px',
  color: '#8892a0'
});

const comparisonToolStyle = (): React.CSSProperties => ({
  marginBottom: '24px'
});

const comparisonControlsStyle = (): React.CSSProperties => ({
  display: 'flex',
  gap: '12px',
  marginTop: '12px',
  marginBottom: '16px',
  flexWrap: 'wrap'
});

const selectStyle = (): React.CSSProperties => ({
  padding: '8px 12px',
  borderRadius: '6px',
  border: '1px solid rgba(255,255,255,0.2)',
  background: 'rgba(0,0,0,0.3)',
  color: '#ffffff',
  fontSize: '14px',
  minWidth: '200px'
});

const comparisonResultsStyle = (): React.CSSProperties => ({
  marginTop: '16px'
});

const comparisonStatsStyle = (): React.CSSProperties => ({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
  gap: '12px'
});

const comparisonStatStyle = (type: string): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  padding: '12px',
  borderRadius: '8px',
  background: type === 'addition' ? 'rgba(76, 175, 80, 0.1)' :
              type === 'deletion' ? 'rgba(244, 67, 54, 0.1)' :
              'rgba(255, 152, 0, 0.1)',
  border: `1px solid ${type === 'addition' ? '#4CAF50' :
                       type === 'deletion' ? '#F44336' :
                       '#FF9800'}30`
});

const hyperlinkToolStyle = (): React.CSSProperties => ({
  marginTop: '24px'
});

const hyperlinkListStyle = (): React.CSSProperties => ({
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
  marginTop: '12px',
  marginBottom: '16px'
});

const hyperlinkItemStyle = (): React.CSSProperties => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '12px',
  borderRadius: '6px',
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.1)',
  fontSize: '14px'
});

const bimActionsStyle = (): React.CSSProperties => ({
  display: 'flex',
  gap: '8px',
  flexWrap: 'wrap'
});

const bimInfoStyle = (): React.CSSProperties => ({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
  gap: '12px',
  marginBottom: '24px',
  padding: '16px',
  borderRadius: '8px',
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.1)'
});

const bimInfoItemStyle = (): React.CSSProperties => ({
  fontSize: '14px',
  color: '#8892a0'
});

const clashDetectionStyle = (): React.CSSProperties => ({
  marginBottom: '24px'
});

const clashSummaryStyle = (): React.CSSProperties => ({
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
  gap: '12px',
  marginTop: '12px',
  marginBottom: '20px'
});

const clashStatStyle = (type: string): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  gap: '12px',
  padding: '12px',
  borderRadius: '8px',
  background: type === 'critical' ? 'rgba(244, 67, 54, 0.1)' :
              type === 'major' ? 'rgba(255, 152, 0, 0.1)' :
              type === 'minor' ? 'rgba(76, 175, 80, 0.1)' :
              'rgba(33, 150, 243, 0.1)',
  border: `1px solid ${type === 'critical' ? '#F44336' :
                       type === 'major' ? '#FF9800' :
                       type === 'minor' ? '#4CAF50' :
                       '#2196F3'}30`
});

const clashListStyle = (): React.CSSProperties => ({
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '8px',
  overflow: 'hidden'
});

const clashListHeaderStyle = (): React.CSSProperties => ({
  display: 'grid',
  gridTemplateColumns: '80px 120px 2fr 80px 100px 80px 100px',
  gap: '12px',
  padding: '12px 16px',
  background: 'rgba(255,255,255,0.05)',
  fontSize: '12px',
  fontWeight: '600',
  color: '#8892a0',
  textTransform: 'uppercase'
});

const clashItemStyle = (): React.CSSProperties => ({
  display: 'grid',
  gridTemplateColumns: '80px 120px 2fr 80px 100px 80px 100px',
  gap: '12px',
  padding: '12px 16px',
  borderTop: '1px solid rgba(255,255,255,0.05)',
  alignItems: 'center',
  fontSize: '14px'
});

const clashTypeStyle = (type: string): React.CSSProperties => ({
  padding: '4px 8px',
  borderRadius: '4px',
  fontSize: '10px',
  fontWeight: '600',
  textTransform: 'uppercase',
  background: type === 'hard' ? 'rgba(244, 67, 54, 0.2)' :
              type === 'soft' ? 'rgba(255, 152, 0, 0.2)' :
              'rgba(33, 150, 243, 0.2)',
  color: type === 'hard' ? '#EF5350' :
         type === 'soft' ? '#FFB74D' :
         '#64B5F6'
});

const clashDisciplinesStyle = (): React.CSSProperties => ({
  fontSize: '12px',
  color: '#8892a0'
});

const clashDescStyle = (): React.CSSProperties => ({
  fontSize: '13px'
});

const clashSeverityStyle = (severity: string): React.CSSProperties => ({
  padding: '4px 8px',
  borderRadius: '4px',
  fontSize: '10px',
  fontWeight: '600',
  textTransform: 'uppercase',
  background: severity === 'critical' ? 'rgba(244, 67, 54, 0.2)' :
              severity === 'major' ? 'rgba(255, 152, 0, 0.2)' :
              'rgba(76, 175, 80, 0.2)',
  color: severity === 'critical' ? '#EF5350' :
         severity === 'major' ? '#FFB74D' :
         '#81C784'
});

const clashAssignedStyle = (): React.CSSProperties => ({
  fontSize: '12px',
  color: '#8892a0'
});

const clashStatusStyle = (status: string): React.CSSProperties => ({
  padding: '4px 8px',
  borderRadius: '4px',
  fontSize: '10px',
  fontWeight: '600',
  textTransform: 'uppercase',
  background: status === 'resolved' ? 'rgba(76, 175, 80, 0.2)' :
              status === 'active' ? 'rgba(244, 67, 54, 0.2)' :
              'rgba(255, 152, 0, 0.2)',
  color: status === 'resolved' ? '#81C784' :
         status === 'active' ? '#EF5350' :
         '#FFB74D'
});

const clashActionsStyle = (): React.CSSProperties => ({
  display: 'flex',
  gap: '4px'
});

const viewerInterfaceStyle = (): React.CSSProperties => ({
  marginTop: '24px'
});

const viewerControlsStyle = (): React.CSSProperties => ({
  display: 'flex',
  flexDirection: 'column',
  gap: '12px',
  marginTop: '12px',
  marginBottom: '16px'
});

const viewerButtonGroupStyle = (): React.CSSProperties => ({
  display: 'flex',
  gap: '8px',
  flexWrap: 'wrap'
});

const viewerButtonStyle = (): React.CSSProperties => ({
  padding: '8px 16px',
  borderRadius: '6px',
  border: '1px solid rgba(255,255,255,0.2)',
  background: 'rgba(255,255,255,0.05)',
  color: '#ffffff',
  fontSize: '12px',
  cursor: 'pointer',
  transition: 'all 0.2s ease'
});

const mockViewerStyle = (): React.CSSProperties => ({
  height: '300px',
  borderRadius: '8px',
  background: 'linear-gradient(135deg, rgba(255,255,255,0.02) 0%, rgba(255,255,255,0.05) 100%)',
  border: '1px solid rgba(255,255,255,0.1)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  position: 'relative',
  overflow: 'hidden'
});

const viewerPlaceholderStyle = (): React.CSSProperties => ({
  textAlign: 'center',
  color: '#8892a0'
});

const viewerIconStyle = (): React.CSSProperties => ({
  fontSize: '48px',
  marginBottom: '16px',
  display: 'block'
});

const viewerSubtextStyle = (): React.CSSProperties => ({
  fontSize: '12px',
  marginTop: '8px',
  opacity: 0.7
});

export default UltimateConstructionPlatform;