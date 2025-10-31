
export interface BaseFurniture {
  id: string;
  name: string;
  width_cm: number;
  depth_cm: number;
  rotation: number;
  x?: number; // position on canvas
  y?: number; // position on canvas
  groupId?: string; // Identifier for items grouped together
  color?: string; // Automatically assigned color for the product type
  stackId?: string; // Identifier for items stacked together
  productCode?: string; // New field for product identifier
  lineNumber?: number; // New field for order line number
}

export interface RichFurniture extends BaseFurniture {
  w: number; // calculated width in pixels
  h: number; // calculated height in pixels
}

export interface Project {
  id:string;
  name: string;
  createdAt: unknown; // Allow for Firestore Timestamp
  floorPlanUrl: string | null;
  furniture: BaseFurniture[]; // Stored furniture data
  scale: number | null; // Represents pixels per centimeter
  floorPlanWidth?: number; // Natural width of the floor plan image
  floorPlanHeight?: number; // Natural height of the floor plan image
}

export interface NotificationMessage {
  message: string;
  type: 'info' | 'success' | 'error';
  key: number;
}

export interface AiMessage {
  text: string;
  type: 'info' | 'success' | 'warning';
}

export interface PlacementMode {
    itemToPlace: Omit<BaseFurniture, 'id' | 'x' | 'y'> | null;
    quantity: number;
    remaining: number;
}

export type TidyDirection = 'horizontal-center' | 'vertical-center';

export interface ViewTransform {
  scale: number;
  offsetX: number;
  offsetY: number;
}

export interface LayoutIssue {
  type: 'error' | 'suggestion';
  message: string;
  itemIds: string[];
}

export interface PlacementDimensionLine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  label: string;
  referenceType: string;
}

export interface ManualMeasureLine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  label: string;
}

// Extend the global Window interface to include modern browser APIs for type safety.
declare global {
  interface Window {
    showOpenFilePicker(options?: unknown): Promise<[FileSystemFileHandle]>;
  }
}
