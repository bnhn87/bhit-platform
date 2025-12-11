/**
 * Advanced AI Planner Hook - Integrated with BHIT Work OS
 * Provides sophisticated floor planning, AI integration, and job system connectivity
 */

import { useState, useMemo, useCallback } from 'react';

import { PlacedFurniture, InstallationTask } from '../floorplanner/types';

// Extended types for advanced functionality
export interface Project {
  id: string;
  name: string;
  createdAt: string;
  jobId?: string; // BHIT Work OS integration
  floorPlanUrl: string | null;
  furniture: PlacedFurniture[];
  scale: number | null;
}

export interface RichFurniture extends PlacedFurniture {
  w: number; // Computed width in pixels
  h: number; // Computed height in pixels
  groupId?: string;
  stackId?: string;
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
  itemToPlace: Omit<PlacedFurniture, 'id' | 'x' | 'y'> | null;
  quantity: number;
  remaining: number;
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

/**
 * Generates a consistent, visually pleasing color from a string.
 * Uses HSL color space to create a varied palette.
 */
const generateColorFromName = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = hash % 360;
  return `hsl(${h}, 60%, 75%)`;
};

/**
 * Parses a product list from a text-based file (CSV or JSON).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const parseProductFile = (file: File): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        if (file.name.endsWith('.csv')) {
          const lines = text.split('\n').filter(line => line.trim() !== '');
          if (lines.length < 2) resolve([]);
          const header = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/ /g, '_'));
          const nameIndex = header.indexOf('name');
          const widthIndex = header.indexOf('width_cm');
          const depthIndex = header.indexOf('depth_cm');
          const quantityIndex = header.indexOf('quantity');
          const codeIndex = header.indexOf('product_code');
          const lineIndex = header.indexOf('line_number');

          if (nameIndex === -1 || widthIndex === -1 || depthIndex === -1) {
            reject(new Error("CSV must contain 'name', 'width_cm', and 'depth_cm' columns. 'quantity', 'product_code', 'line_number' are optional."));
            return;
          }

          const rows = lines.slice(1).map(line => {
            const values = line.split(',');
            return {
              name: values[nameIndex]?.trim(),
              width_cm: parseFloat(values[widthIndex]?.trim() || '50'),
              depth_cm: parseFloat(values[depthIndex]?.trim() || '50'),
              quantity: parseInt(values[quantityIndex]?.trim() || '1', 10),
              productCode: codeIndex > -1 ? values[codeIndex]?.trim() : undefined,
              lineNumber: lineIndex > -1 ? parseInt(values[lineIndex]?.trim()) : undefined,
            };
          });
          resolve(rows);
        } else if (file.name.endsWith('.json')) {
           const data = JSON.parse(text);
           if (Array.isArray(data)) {
               resolve(data.map(item => ({...item, quantity: item.quantity || 1})));
           } else {
               reject(new Error("JSON must be an array of products."));
           }
        } else {
          reject(new Error("Unsupported file type. Use CSV, JSON, or PDF."));
        }
      } catch {
        reject(new Error("Failed to parse file."));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
};

export const useAiPlanner = (
  initialProject: Project, 
  onUpdateProject: (project: Project) => void,
  onGenerateTasks?: (tasks: InstallationTask[]) => void // BHIT Work OS integration
) => {
  const [history, setHistory] = useState([initialProject]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const project = useMemo(() => history[historyIndex], [history, historyIndex]);
  const { floorPlanUrl } = project;

  // UI-only state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');
  const [notification, setNotification] = useState<Omit<NotificationMessage, 'key'> & { key?: number }>({ message: '', type: 'info' });
  const [aiMessages] = useState<AiMessage[]>([]);
  const [isScalingMode, setIsScalingMode] = useState(false);
  const [scaleLineStart, setScaleLineStart] = useState<{ x: number, y: number } | null>(null);
  const [drawnLinePixels, setDrawnLinePixels] = useState<number | null>(null);
  const [placementMode, setPlacementMode] = useState<PlacementMode>({ itemToPlace: null, quantity: 0, remaining: 0 });
  const [scaleReferenceBox, setScaleReferenceBox] = useState<{x: number, y: number, size: number} | null>(null);
  const [analysisResults, setAnalysisResults] = useState<LayoutIssue[] | null>(null);
  const [isMarqueeSelectMode, setIsMarqueeSelectMode] = useState(false);
  const [contextualMenu, setContextualMenu] = useState<{x: number, y: number, items: RichFurniture[]} | null>(null);
  const [itemActionMenu, setItemActionMenu] = useState<{x: number, y: number, item: RichFurniture, isStack: boolean} | null>(null);
  const [placementDimensions] = useState<PlacementDimensionLine[] | null>(null);
  const [isMeasuringMode, setIsMeasuringMode] = useState(false);
  const [manualMeasureStartPoint, setManualMeasureStartPoint] = useState<{ x: number, y: number } | null>(null);
  const [manualMeasureLine, setManualMeasureLine] = useState<ManualMeasureLine | null>(null);

  // Centralized update function to manage history for undo/redo
  const changeProject = useCallback((newProjectData: Partial<Project>, isHistoryEvent = true) => {
      const currentProject = history[historyIndex];
      const newProject = { ...currentProject, ...newProjectData };

      if (isHistoryEvent) {
          const newHistory = history.slice(0, historyIndex + 1);
          newHistory.push(newProject);
          setHistory(newHistory);
          setHistoryIndex(newHistory.length - 1);
      } else {
          const newHistory = [...history];
          newHistory[historyIndex] = newProject;
          setHistory(newHistory);
      }
      
      onUpdateProject(newProject);
      
      // BHIT Work OS Integration: Auto-generate tasks when furniture is placed
      if (newProject.furniture && onGenerateTasks) {
        const placedItems = newProject.furniture.filter(f => f.x !== undefined && f.y !== undefined);
        if (placedItems.length > 0) {
          const tasks: InstallationTask[] = placedItems.map((item, index) => ({
            id: `task_${item.id}`,
            jobId: newProject.jobId || 'standalone',
            title: `Install ${item.name}`,
            description: `Install ${item.name} (${item.productCode || 'Unknown Code'}) in ${item.roomZone}`,
            installOrder: item.installOrder || index + 1,
            roomZone: item.roomZone,
            furnitureIds: [item.id],
            estimatedTimeMinutes: 30, // Default 30 minutes
            dependencies: index > 0 ? [`task_${placedItems[index - 1].id}`] : [],
            isGenerated: true
          }));
          onGenerateTasks(tasks);
        }
      }
  }, [history, historyIndex, onUpdateProject, onGenerateTasks]);
  
  const canUndo = useMemo(() => historyIndex > 0, [historyIndex]);
  const canRedo = useMemo(() => historyIndex < history.length - 1, [historyIndex, history]);

  const undo = useCallback(() => {
    if (canUndo) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        onUpdateProject(history[newIndex]);
    }
  }, [canUndo, historyIndex, history, onUpdateProject]);

  const redo = useCallback(() => {
    if (canRedo) {
        const newIndex = historyIndex + 1;
        setHistoryIndex(newIndex);
        onUpdateProject(history[newIndex]);
    }
  }, [canRedo, historyIndex, history, onUpdateProject]);
  
  const richFurniture = useMemo(() => {
    const currentScale = project.scale || 0;
    return project.furniture.map(f => ({
      ...f,
      w: f.width_cm * currentScale,
      h: f.depth_cm * currentScale,
    }));
  }, [project.furniture, project.scale]);

  const showNotification = useCallback((message: string, type: 'info' | 'success' | 'error' = 'info') => {
    setNotification({ message, type, key: Date.now() });
  }, []);

  const dismissNotification = useCallback(() => {
    setNotification({ message: '', type: 'info', key: 0 });
  }, []);
  
  const unplacedFurniture = useMemo(() => richFurniture.filter(item => item.x === undefined && item.y === undefined), [richFurniture]);
  const placedFurniture = useMemo(() => richFurniture.filter(item => item.x !== undefined && item.y !== undefined), [richFurniture]);
  
  const unplacedFurnitureSummary = useMemo(() => {
    const summary = new Map<string, { item: RichFurniture; quantity: number }>();
    unplacedFurniture.forEach(item => {
        if (!summary.has(item.name)) {
            summary.set(item.name, { item: item, quantity: 0 });
        }
        const current = summary.get(item.name)!;
        current.quantity += 1;
    });
    return Array.from(summary.values()).sort((a,b) => a.item.name.localeCompare(b.item.name));
  }, [unplacedFurniture]);

  const furnitureSummary = useMemo(() => {
    const summary = new Map<string, { item: RichFurniture; quantity: number }>();
    richFurniture.forEach(item => {
        if (!summary.has(item.name)) {
            summary.set(item.name, { item: item, quantity: 0 });
        }
        const current = summary.get(item.name)!;
        current.quantity += 1;
    });
    return Array.from(summary.values()).sort((a,b) => a.item.name.localeCompare(b.item.name));
  }, [richFurniture]);

  const errorItemIds = useMemo(() => {
    return new Set(analysisResults?.flatMap(issue => issue.itemIds) || []);
  }, [analysisResults]);

  const selectionInfo = useMemo(() => {
    const selection = richFurniture.filter(f => selectedIds.includes(f.id));
    if (selection.length === 0) return { selection, canGroup: false, isGroup: false, canStack: false, isStack: false, isSingleStackSelected: false };

    const isGroup = selection.some(f => f.groupId);
    const canGroup = selection.length > 1 && !isGroup;

    const firstStackId = selection[0]?.stackId;
    const isStack = !!firstStackId && selection.every(f => f.stackId === firstStackId);

    let isSingleStackSelected = false;
    if (isStack && firstStackId) {
        const allItemsInThatStack = richFurniture.filter(f => f.stackId === firstStackId);
        isSingleStackSelected = selection.length > 0 && selection.length === allItemsInThatStack.length;
    }

    const canStack = selection.length > 1 && !isStack;

    return { selection, canGroup, isGroup, canStack, isStack, isSingleStackSelected };
  }, [richFurniture, selectedIds]);

  // Placeholder implementations for core functionality
  // These would need to be implemented with the full logic from the original

  const handleFloorPlanUpload = useCallback(async (file: File) => {
    setIsProcessing(true);
    setProcessingStatus('Uploading floor plan...');
    try {
      const blobUrl = URL.createObjectURL(file);
      // eslint-disable-next-line no-console
      changeProject({ floorPlanUrl: blobUrl });
      showNotification('Floor plan uploaded successfully!', 'success');
    } catch (error: unknown) {
      // eslint-disable-next-line no-console
      console.error('Floor plan upload error:', error); // Debug log
      showNotification('Failed to upload floor plan', 'error');
    } finally {
      setIsProcessing(false);
      setProcessingStatus('');
    }
  }, [changeProject, showNotification]);

  const handleProductListUpload = useCallback(async (file: File) => {
    setIsProcessing(true);
    setProcessingStatus('Processing product list...');
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let products: any[] = [];
      
      if (file.type === 'application/pdf') {
        // Use AI parsing for PDFs (placeholder - would need full implementation)
        showNotification('PDF parsing not yet implemented in integrated version', 'info');
        return;
      } else {
        products = await parseProductFile(file);
      }

      const newFurniture: PlacedFurniture[] = products.map((product, index) => ({
        id: `furniture_${Date.now()}_${index}`,
        name: product.name,
        productCode: product.productCode || 'UNKNOWN',
        width_cm: product.width_cm,
        depth_cm: product.depth_cm,
        x: 100 + (index * 80), // Position items in a row, not undefined
        y: 100,
        rotation: 0,
        roomZone: 'main',
        color: generateColorFromName(product.name),
        installOrder: index + 1
      }));

      changeProject({ furniture: [...project.furniture, ...newFurniture] });
      showNotification(`Added ${newFurniture.length} furniture items`, 'success');
    } catch {
      showNotification('Failed to process product list', 'error');
    } finally {
      setIsProcessing(false);
      setProcessingStatus('');
    }
  }, [project.furniture, changeProject, showNotification]);

  // Additional placeholder methods that would need full implementation
  const updateFurniturePosition = useCallback((id: string, x: number, y: number) => {
    const updatedFurniture = project.furniture.map(f => 
      f.id === id ? { ...f, x, y } : f
    );
    changeProject({ furniture: updatedFurniture }, false); // Live update without history
  }, [project.furniture, changeProject]);

  const commitFurnitureUpdate = useCallback(() => {
    // Commit current state to history
    changeProject({}, true);
  }, [changeProject]);

  const handleSelection = useCallback((ids: string[]) => {
    setSelectedIds(ids);
  }, []);

  const startScaling = useCallback(() => {
    setIsScalingMode(true);
    setScaleLineStart(null);
    setDrawnLinePixels(null);
  }, []);

  const cancelScaling = useCallback(() => {
    setIsScalingMode(false);
    setScaleLineStart(null);
    setDrawnLinePixels(null);
    setScaleReferenceBox(null);
  }, []);

  const handleCanvasClickForScaling = useCallback((x: number, y: number) => {
    if (!isScalingMode) return;
    
    if (!scaleLineStart) {
      setScaleLineStart({ x, y });
    } else {
      const distance = Math.sqrt((x - scaleLineStart.x) ** 2 + (y - scaleLineStart.y) ** 2);
      setDrawnLinePixels(distance);
    }
  }, [isScalingMode, scaleLineStart]);

  const commitScale = useCallback((realWorldCm: number) => {
    if (drawnLinePixels && realWorldCm > 0) {
      const newScale = drawnLinePixels / realWorldCm;
      changeProject({ scale: newScale });
      showNotification(`Scale set: ${realWorldCm}cm = ${drawnLinePixels.toFixed(1)}px`, 'success');
    }
    cancelScaling();
  }, [drawnLinePixels, changeProject, showNotification, cancelScaling]);

  const startPlacementMode = useCallback((item: Omit<PlacedFurniture, 'id' | 'x' | 'y'>, quantity: number) => {
    setPlacementMode({ itemToPlace: item, quantity, remaining: quantity });
  }, []);

  const handlePlaceItem = useCallback((x: number, y: number) => {
    if (!placementMode.itemToPlace || placementMode.remaining <= 0) return;

    const newItem: PlacedFurniture = {
      ...placementMode.itemToPlace,
      id: `placed_${Date.now()}_${Math.random()}`,
      x,
      y
    };

    const updatedFurniture = [...project.furniture, newItem];
    changeProject({ furniture: updatedFurniture });

    const remaining = placementMode.remaining - 1;
    if (remaining > 0) {
      setPlacementMode(prev => ({ ...prev, remaining }));
    } else {
      setPlacementMode({ itemToPlace: null, quantity: 0, remaining: 0 });
      showNotification('All items placed successfully!', 'success');
    }
  }, [placementMode, project.furniture, changeProject, showNotification]);

  // More placeholder implementations for advanced features
  const stackSelectedItems = useCallback(() => {
    // Implementation for stacking
    showNotification('Stacking feature not yet implemented', 'info');
  }, [showNotification]);

  const unstackItems = useCallback(() => {
    // Implementation for unstacking
    showNotification('Unstacking feature not yet implemented', 'info');
  }, [showNotification]);

  const deleteSelectedFurniture = useCallback(() => {
    const updatedFurniture = project.furniture.filter(f => !selectedIds.includes(f.id));
    changeProject({ furniture: updatedFurniture });
    setSelectedIds([]);
    showNotification(`Deleted ${selectedIds.length} item(s)`, 'success');
  }, [project.furniture, selectedIds, changeProject, showNotification]);

  const tidySelectedFurniture = useCallback((direction: 'horizontal' | 'vertical') => {
    showNotification(`Tidy ${direction} feature not yet implemented`, 'info');
  }, [showNotification]);

  const arrangeOnLargest = useCallback(() => {
    showNotification('Arrange on largest feature not yet implemented', 'info');
  }, [showNotification]);

  const handleCheckLayout = useCallback(() => {
    showNotification('Layout checking feature not yet implemented', 'info');
  }, [showNotification]);

  const clearAnalysisResults = useCallback(() => {
    setAnalysisResults(null);
  }, []);

  const toggleMarqueeSelectMode = useCallback(() => {
    setIsMarqueeSelectMode(prev => !prev);
  }, []);

  const handleMarqueeSelect = useCallback((ids: string[]) => {
    setSelectedIds(ids);
    setIsMarqueeSelectMode(false);
  }, []);

  const reStackItems = useCallback(() => {
    showNotification('Re-stack feature not yet implemented', 'info');
  }, [showNotification]);

  const clearContextualMenu = useCallback(() => {
    setContextualMenu(null);
  }, []);

  const handleItemDoubleClick = useCallback((item: RichFurniture) => {
    showNotification(`Double-clicked ${item.name}`, 'info');
  }, [showNotification]);

  const placeAnother = useCallback(() => {
    showNotification('Place another feature not yet implemented', 'info');
  }, [showNotification]);

  const clearItemActionMenu = useCallback(() => {
    setItemActionMenu(null);
  }, []);

  const handleShowPlacementDimensions = useCallback(() => {
    showNotification('Placement dimensions feature not yet implemented', 'info');
  }, [showNotification]);

  const toggleMeasureMode = useCallback(() => {
    setIsMeasuringMode(prev => !prev);
    if (isMeasuringMode) {
      setManualMeasureStartPoint(null);
      setManualMeasureLine(null);
    }
  }, [isMeasuringMode]);

  const handleCanvasClickForMeasuring = useCallback((x: number, y: number) => {
    if (!isMeasuringMode) return;
    
    if (!manualMeasureStartPoint) {
      setManualMeasureStartPoint({ x, y });
    } else {
      const distance = Math.sqrt((x - manualMeasureStartPoint.x) ** 2 + (y - manualMeasureStartPoint.y) ** 2);
      const realDistance = project.scale ? distance / project.scale : distance;
      setManualMeasureLine({
        x1: manualMeasureStartPoint.x,
        y1: manualMeasureStartPoint.y,
        x2: x,
        y2: y,
        label: `${realDistance.toFixed(1)}cm`
      });
      setManualMeasureStartPoint(null);
      setIsMeasuringMode(false);
    }
  }, [isMeasuringMode, manualMeasureStartPoint, project.scale]);

  const renameProject = useCallback((newName: string) => {
    changeProject({ name: newName });
  }, [changeProject]);

  return {
    // Project state
    project,
    floorPlanUrl,
    unplacedFurnitureSummary,
    placedFurniture,
    furnitureSummary,
    
    // UI state
    selectedIds,
    isProcessing,
    processingStatus,
    notification,
    aiMessages,
    isScalingMode,
    scaleLineStart,
    drawnLinePixels,
    placementMode,
    selectionInfo,
    scaleReferenceBox,
    errorItemIds,
    analysisResults,
    isMarqueeSelectMode,
    contextualMenu,
    itemActionMenu,
    placementDimensions,
    manualMeasureLine,
    isMeasuringMode,
    manualMeasureStartPoint,
    canUndo,
    canRedo,

    // Actions
    dismissNotification,
    handleFloorPlanUpload,
    handleProductListUpload,
    updateFurniturePosition,
    commitFurnitureUpdate,
    handleSelection,
    startScaling,
    cancelScaling,
    handleCanvasClickForScaling,
    commitScale,
    startPlacementMode,
    handlePlaceItem,
    stackSelectedItems,
    unstackItems,
    deleteSelectedFurniture,
    tidySelectedFurniture,
    arrangeOnLargest,
    handleCheckLayout,
    clearAnalysisResults,
    toggleMarqueeSelectMode,
    handleMarqueeSelect,
    reStackItems,
    clearContextualMenu,
    handleItemDoubleClick,
    placeAnother,
    clearItemActionMenu,
    undo,
    redo,
    handleShowPlacementDimensions,
    toggleMeasureMode,
    handleCanvasClickForMeasuring,
    renameProject,
  };
};