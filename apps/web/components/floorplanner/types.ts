// BHIT Floor Planner Types
// Integrated types for floor planning within BHIT Work OS job system

export interface JobFloorPlan {
  id: string;
  jobId: string; // Link to BHIT job system
  name: string;
  createdAt: string;
  updatedAt: string;
  floorPlanUrl: string | null;
  furniture: PlacedFurniture[];
  scale: number | null; // pixels per centimeter
  floorPlanWidth?: number;
  floorPlanHeight?: number;
}

export interface PlacedFurniture {
  id: string;
  name: string;
  productCode?: string; // Links to SmartQuote products
  lineNumber?: number; // Links to work order line
  width_cm: number;
  depth_cm: number;
  rotation: number;
  x: number; // Canvas position
  y: number; // Canvas position
  groupId?: string; // Installation group
  installOrder?: number; // Sequence for task generation
  roomZone?: string; // Room/area identifier
  color?: string;
  stackId?: string;
}

export interface InstallationTask {
  id: string;
  jobId: string;
  title: string;
  description: string;
  installOrder: number;
  roomZone?: string;
  furnitureIds: string[];
  estimatedTimeMinutes?: number;
  dependencies?: string[]; // Other task IDs that must complete first
  isGenerated: boolean; // Distinguishes auto-generated from manual tasks
}

export interface FloorPlanState {
  currentPlan: JobFloorPlan | null;
  selectedItems: string[];
  placementMode: PlacementMode | null;
  viewTransform: ViewTransform;
  showMeasurements: boolean;
  isDirty: boolean;
}

export interface PlacementMode {
  itemToPlace: Omit<PlacedFurniture, 'id' | 'x' | 'y'> | null;
  quantity: number;
  remaining: number;
}

export interface ViewTransform {
  scale: number;
  offsetX: number;
  offsetY: number;
}

export interface TaskGenerationOptions {
  groupByRoom: boolean;
  includePreparation: boolean;
  includeCleanup: boolean;
  estimateTimeFromProducts: boolean;
}