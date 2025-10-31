
import React, { useState, useEffect, useMemo, useCallback } from 'react';

import { parseFurnitureFromPdf, checkLayoutWithAi, getPlacementDimensions, getRotationFromImage } from '../services/geminiService';
import { Project, BaseFurniture, RichFurniture, NotificationMessage, AiMessage, PlacementMode, TidyDirection, LayoutIssue, PlacementDimensionLine, ManualMeasureLine } from '../types';

/**
 * Generates a consistent, visually pleasing color from a string.
 * Uses HSL color space to create a varied palette.
 * @param str The string to hash into a color.
 * @returns An HSL color string.
 */
const generateColorFromName = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = hash % 360;
  // Use pastel-like colors: high saturation, high lightness
  return `hsl(${h}, 60%, 75%)`;
};


/**
 * Parses a product list from a text-based file (CSV or JSON).
 * @param file The file to parse.
 * @returns A promise that resolves to an array of product data.
 */
const parseProductFile = (file: File): Promise<unknown[]> => {
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
               // Ensure quantity is present
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
    reader.onerror = (error) => reject(error);
    reader.readAsText(file);
  });
};

export const useAiPlanner = (initialProject: Project, onUpdateProject: (project: Project) => void) => {
  const [history, setHistory] = useState([initialProject]);
  const [historyIndex, setHistoryIndex] = useState(0);

  const project = useMemo(() => history[historyIndex], [history, historyIndex]);
  const { floorPlanUrl, scale } = project;

  // UI-only state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('');
  const [notification, setNotification] = useState<Omit<NotificationMessage, 'key'> & { key?: number }>({ message: '', type: 'info' });
  const [isScalingMode, setIsScalingMode] = useState(false);
  const [scaleLineStart, setScaleLineStart] = useState<{ x: number, y: number } | null>(null);
  const [drawnLinePixels, setDrawnLinePixels] = useState<number | null>(null);
  const [placementMode, setPlacementMode] = useState<PlacementMode>({ itemToPlace: null, quantity: 0, remaining: 0 });
  const [scaleReferenceBox, setScaleReferenceBox] = useState<{x: number, y: number, size: number} | null>(null);
  const [analysisResults, setAnalysisResults] = useState<LayoutIssue[] | null>(null);
  const [isMarqueeSelectMode, setIsMarqueeSelectMode] = useState(false);
  const [contextualMenu, setContextualMenu] = useState<{x: number, y: number, items: RichFurniture[]} | null>(null);
  const [itemActionMenu, setItemActionMenu] = useState<{x: number, y: number, item: RichFurniture, isStack: boolean} | null>(null);
  const [placementDimensions, setPlacementDimensions] = useState<PlacementDimensionLine[] | null>(null);
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
          // For non-history events (like live dragging), just update the current state
          const newHistory = [...history];
          newHistory[historyIndex] = newProject;
          setHistory(newHistory);
      }
      
      onUpdateProject(newProject);
  }, [history, historyIndex, onUpdateProject]);
  
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
            // Use the first item as the representative for the group
            summary.set(item.name, { item: item, quantity: 0 });
        }
        const current = summary.get(item.name)!;
        current.quantity += 1;
    });
    return Array.from(summary.values()).sort((a,b) => a.item.name.localeCompare(b.item.name));
  }, [unplacedFurniture]);

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

    const canStack = selection.length > 1 && selection.every(f => !f.stackId);

    return { selection, canGroup, isGroup, canStack, isStack, isSingleStackSelected };
  }, [selectedIds, richFurniture]);

  const furnitureSummary = useMemo(() => {
    if (project.furniture.length === 0) return [];
    
    const summary = new Map<string, { total: number; placed: number; color?: string }>();

    project.furniture.forEach(item => {
        if (!summary.has(item.name)) {
            summary.set(item.name, { total: 0, placed: 0, color: item.color });
        }
        const current = summary.get(item.name)!;
        current.total += 1;
        if (item.x !== undefined && item.y !== undefined) {
            current.placed += 1;
        }
    });

    return Array.from(summary.entries()).map(([name, data]) => ({
        name,
        placed: data.placed,
        unplaced: data.total - data.placed,
        color: data.color
    })).filter(item => item.placed > 0).sort((a,b) => a.name.localeCompare(b.name));
  }, [project.furniture]);

  const clearContextualMenu = useCallback(() => {
    setContextualMenu(null);
  }, []);

  const clearItemActionMenu = useCallback(() => {
    setItemActionMenu(null);
  }, []);
  
  const clearDimensions = useCallback(() => {
    setPlacementDimensions(null);
  }, []);

  const aiMessages = useMemo<AiMessage[]>(() => {
    const messages: AiMessage[] = [];
    
    if (isProcessing) {
        messages.push({ type: 'info', text: processingStatus });
        return messages;
    }

    if (isMeasuringMode) {
      if (manualMeasureStartPoint) {
        messages.push({ type: 'info', text: "Click a second point to finish the measurement." });
      } else {
        messages.push({ type: 'info', text: "Measurement Mode: Click a start point on the canvas." });
      }
      return messages;
    }
    
    if (placementDimensions && placementDimensions.length > 0) {
        messages.push({ type: 'success', text: `AI has generated ${placementDimensions.length} placement dimension lines for the selected item.` });
    }

    if (analysisResults) { 
        if (analysisResults.length > 0) {
            analysisResults.forEach(result => {
                messages.push({
                    text: result.message,
                    type: result.type === 'error' ? 'warning' : 'info'
                });
            });
            messages.push({
                type: 'success', text: `Analysis complete. Found ${analysisResults.length} potential issues. Related items are highlighted.`
            });
        } else {
            messages.push({
                type: 'success',
                text: 'AI analysis complete: I reviewed your layout and everything looks great! No collisions, boundary issues, or major flow problems were detected.'
            });
        }
        return messages; 
    }
    
    if (isMarqueeSelectMode) {
        messages.push({ type: 'info', text: "Box Select Mode: Click and drag on the canvas to select multiple items." });
    } else if (scaleReferenceBox) {
        messages.push({ type: 'success', text: "Scale set! A 1-meter reference square is shown on the canvas. If it looks correct, start importing products." });
    } else if (isScalingMode) {
        messages.push({ type: 'info', text: scaleLineStart ? 'Click a second point to finish the line.' : 'Click a start point on a known dimension (e.g., a doorway).' });
    } else if (placementMode.itemToPlace) {
        messages.push({ type: 'success', text: `Placing ${placementMode.itemToPlace.name}. ${placementMode.remaining} remaining. Click on the plan. (Press Esc to cancel)` });
    } else if (!floorPlanUrl) {
        messages.push({ type: 'info', text: "Start by uploading a floor plan (PDF, JPG, PNG)." });
    } else if (!scale) {
        messages.push({ type: 'warning', text: "Set the scale of your floor plan. Furniture sizes are illustrative until scale is set." });
    } else if (project.furniture.length === 0) {
        messages.push({ type: 'info', text: "Now, import a product list (CSV, JSON, or PDF)." });
    } else if (unplacedFurniture.length > 0) {
        messages.push({ type: 'info', text: `${unplacedFurniture.length} items are waiting to be placed.` });
    } else {
        messages.push({ type: 'success', text: "All items placed! You can now arrange your layout." });
    }
    
    if (selectionInfo.selection.length > 1) {
        messages.push({ type: 'info', text: `${selectionInfo.selection.length} items selected. You can stack, delete, or tidy them.` });
    } else if (selectionInfo.selection.length === 1) {
        const selected = selectionInfo.selection[0];
        messages.push({ type: 'info', text: `Selected: ${selected.name} (${selected.width_cm}cm x ${selected.depth_cm}cm).` });
    }
    return messages;
  }, [isProcessing, processingStatus, isScalingMode, scaleLineStart, placementMode, floorPlanUrl, scale, project.furniture.length, unplacedFurniture.length, selectionInfo, scaleReferenceBox, analysisResults, isMarqueeSelectMode, placementDimensions, isMeasuringMode, manualMeasureStartPoint]);

  const handleFloorPlanUpload = async (file: File) => {
    setIsProcessing(true);
    setProcessingStatus('Loading floor plan...');

    const processBlob = (blob: Blob) => {
        const objectUrl = URL.createObjectURL(blob); // For dimension reading
        const reader = new FileReader(); // For storing as data URL

        reader.onloadend = () => {
            const dataUrl = reader.result as string;
            const img = new Image();
            img.onload = () => {
                changeProject({
                    floorPlanUrl: dataUrl,
                    scale: null,
                    furniture: [], // Clear furniture on new plan
                    floorPlanWidth: img.naturalWidth,
                    floorPlanHeight: img.naturalHeight,
                });
                showNotification("Floor plan loaded successfully!", "success");
                URL.revokeObjectURL(objectUrl); // Clean up temp URL
                setIsProcessing(false);
                setProcessingStatus('');
            };
            img.onerror = () => {
                showNotification("Failed to read image dimensions.", "error");
                setIsProcessing(false);
                URL.revokeObjectURL(objectUrl);
            };
            img.src = objectUrl;
        };

        reader.onerror = () => {
            showNotification("Failed to read file.", "error");
            setIsProcessing(false);
        };
        
        reader.readAsDataURL(blob);
    };

    if (file.type.startsWith('image/')) {
      processBlob(file);
    } else if (file.type === 'application/pdf') {
      if (!window.pdfjsLib) {
        showNotification("PDF library is loading. Please try again.", "error");
        setIsProcessing(false);
        return;
      }
      try {
        setProcessingStatus('Converting PDF to image...');
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 2.0 });
        const canvas = document.createElement('canvas');
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        const context = canvas.getContext('2d');
        if (!context) throw new Error("Could not get canvas context.");
        await page.render({ canvasContext: context, viewport: viewport }).promise;
        canvas.toBlob(blob => {
          if (blob) processBlob(blob);
          else throw new Error("Canvas to Blob conversion failed.");
        }, 'image/jpeg', 0.95);
      } catch {
        showNotification("Failed to render PDF.", "error");
        setIsProcessing(false);
      }
    } else {
        showNotification("Unsupported file type. Use image or PDF.", "error");
        setIsProcessing(false);
    }
  };

  const handleProductListUpload = async (file: File) => {
      if (!scale) {
          showNotification("Please set the floor plan scale before importing products.", "error");
          return;
      }
      setIsProcessing(true);
      setProcessingStatus('Parsing product list...');
      try {
        let items;
        if (file.name.endsWith('.pdf')) {
            setProcessingStatus('AI is parsing PDF...');
            items = await parseFurnitureFromPdf(file);
        } else {
            items = await parseProductFile(file);
        }

        const newFurniture: BaseFurniture[] = [];
        const existingNames = new Set(project.furniture.map(f => f.name));

        items.forEach((item: { name?: string; width_cm?: number; depth_cm?: number; quantity?: number; productCode?: string; lineNumber?: number }) => {
            const { name, width_cm, depth_cm, quantity = 1, productCode, lineNumber } = item;
            if (!name || !width_cm || !depth_cm) return;

            const color = existingNames.has(name)
                ? project.furniture.find(f => f.name === name)?.color
                : generateColorFromName(name);
            
            for (let i = 0; i < quantity; i++) {
                newFurniture.push({
                    id: `furn_${Date.now()}_${Math.random()}`,
                    name,
                    width_cm: width_cm,
                    depth_cm: depth_cm,
                    rotation: 0,
                    color,
                    productCode,
                    lineNumber,
                });
            }
        });
        
        changeProject({ furniture: [...project.furniture, ...newFurniture] });
        showNotification(`Imported ${newFurniture.length} new items.`, 'success');
      } catch (error: unknown) {
        showNotification(`Import failed: ${(error as Error).message}`, 'error');
      } finally {
        setIsProcessing(false);
        setProcessingStatus('');
      }
  };

  const updateFurniturePosition = useCallback((id: string, newProps: { x?: number, y?: number }) => {
    // This function updates state WITHOUT creating a history event.
    // It's used for live dragging to avoid polluting the undo stack.
    const furnitureToUpdate = project.furniture.find(f => f.id === id);
    if (!furnitureToUpdate) return;

    let updatedFurniture;
    if (furnitureToUpdate.stackId && (newProps.x !== undefined || newProps.y !== undefined)) {
        const stackId = furnitureToUpdate.stackId;
        updatedFurniture = project.furniture.map(f =>
            f.stackId === stackId ? { ...f, ...newProps } : f
        );
    } else {
        updatedFurniture = project.furniture.map(f => f.id === id ? { ...f, ...newProps } : f);
    }
    changeProject({ furniture: updatedFurniture }, false); // isHistoryEvent = false
  }, [project.furniture, changeProject]);
  
  const commitFurnitureUpdate = useCallback((id: string, newProps: Partial<BaseFurniture>) => {
    // This function creates a history event, suitable for on drag end or rotation.
    const furnitureToUpdate = project.furniture.find(f => f.id === id);
    if (!furnitureToUpdate) return;
  
    let updatedFurniture;
    if (furnitureToUpdate.stackId && (newProps.x !== undefined || newProps.y !== undefined)) {
        const stackId = furnitureToUpdate.stackId;
        updatedFurniture = project.furniture.map(f =>
            f.stackId === stackId ? { ...f, ...newProps } : f
        );
    } else {
        updatedFurniture = project.furniture.map(f => f.id === id ? { ...f, ...newProps } : f);
    }
    changeProject({ furniture: updatedFurniture }, true); // isHistoryEvent = true
  }, [project.furniture, changeProject]);
  
  const handleSelection = useCallback((id: string | null, isMulti: boolean) => {
    clearContextualMenu();
    clearItemActionMenu();
    clearDimensions();
    setManualMeasureLine(null);
    if (isMarqueeSelectMode) return; // Don't change selection on single click in marquee mode
    if (!id) {
        setSelectedIds([]);
        return;
    };

    const item = richFurniture.find(f => f.id === id);
    if (item?.stackId && !isMulti) {
        const allInStack = richFurniture.filter(f => f.stackId === item.stackId).map(f => f.id);
        setSelectedIds(allInStack);
        return;
    }

    setSelectedIds(prev => {
        if (isMulti) {
            return prev.includes(id) ? prev.filter(pId => pId !== id) : [...prev, id];
        }
        return [id];
    });
  }, [isMarqueeSelectMode, richFurniture, clearContextualMenu, clearItemActionMenu, clearDimensions]);

  const handleMarqueeSelect = useCallback((ids: string[]) => {
      setSelectedIds(ids);
      clearContextualMenu();
      clearItemActionMenu();
      clearDimensions();
      setManualMeasureLine(null);
  }, [clearContextualMenu, clearItemActionMenu, clearDimensions]);
  
  const toggleMarqueeSelectMode = () => {
      setIsMarqueeSelectMode(prev => !prev);
      setSelectedIds([]);
      clearContextualMenu();
  }
  
  // --- Scaling Logic ---
  const startScaling = () => { setIsScalingMode(true); setScaleLineStart(null); };
  const cancelScaling = () => { setIsScalingMode(false); setScaleLineStart(null); setDrawnLinePixels(null); };
  
  const handleCanvasClickForScaling = (point: { x: number; y: number }) => {
    if (!scaleLineStart) {
      setScaleLineStart(point);
    } else {
      const dx = point.x - scaleLineStart.x;
      const dy = point.y - scaleLineStart.y;
      const pixelLength = Math.sqrt(dx * dx + dy * dy);
      setDrawnLinePixels(pixelLength);
    }
  };
  
  const commitScale = (lengthCm: number) => {
    if (lengthCm > 0 && drawnLinePixels && scaleLineStart) {
      const newScale = drawnLinePixels / lengthCm;
      changeProject({ scale: newScale });
      const refBoxSize = 100 * newScale;
      setScaleReferenceBox({ x: scaleLineStart.x, y: scaleLineStart.y, size: refBoxSize });
      setTimeout(() => setScaleReferenceBox(null), 5000);
      showNotification(`Scale set. A 1-meter square is shown for reference.`, 'success');
    }
    cancelScaling();
  };

  // --- Placement Logic ---
  const startPlacementMode = useCallback((item: RichFurniture, quantity: number) => {
    const { w: _w, h: _h, ...baseItem } = item;
    setPlacementMode({ itemToPlace: baseItem, quantity, remaining: quantity });
  }, []);
  
  const cancelPlacementMode = useCallback(() => {
    setPlacementMode({ itemToPlace: null, quantity: 0, remaining: 0 });
  }, []);
  
  const handlePlaceItem = useCallback(async (x: number, y: number, getSnapshot: (x: number, y: number, w: number, h: number) => Promise<string | null>) => {
    if (!placementMode.itemToPlace || !project.scale) return;
    
    const itemToUpdate = project.furniture.find(f => !f.x && !f.y && f.name === placementMode.itemToPlace?.name);

    if (itemToUpdate) {
        const itemW = itemToUpdate.width_cm * project.scale;
        const itemH = itemToUpdate.depth_cm * project.scale;
        
        // Place immediately with default rotation for responsiveness
        commitFurnitureUpdate(itemToUpdate.id, { x: x - itemW / 2, y: y - itemH / 2, rotation: 0 });

        const remaining = placementMode.remaining - 1;
        if (remaining > 0) {
            setPlacementMode(p => ({ ...p, remaining }));
        } else {
            cancelPlacementMode();
        }
        
        // Asynchronously get rotation from AI and update the item
        const snapshotDataUrl = await getSnapshot(x - itemW / 2, y - itemH / 2, itemW, itemH);
        if (snapshotDataUrl) {
            try {
                const base64Data = snapshotDataUrl.split(',')[1];
                const mimeType = snapshotDataUrl.match(/:(.*?);/)?.[1] || 'image/png';
                const rotation = await getRotationFromImage(base64Data, mimeType);
                if (rotation !== 0) {
                    commitFurnitureUpdate(itemToUpdate.id, { rotation });
                }
            } catch (error) {
                console.error("AI rotation detection failed.", error);
            }
        }
    } else {
        showNotification(`No more unplaced units of ${placementMode.itemToPlace.name}.`, 'error');
        cancelPlacementMode();
    }
  }, [placementMode, project.furniture, project.scale, commitFurnitureUpdate, cancelPlacementMode, showNotification]);
  
  const cancelMeasurementMode = useCallback(() => {
    setIsMeasuringMode(false);
    setManualMeasureStartPoint(null);
  }, []);

  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
          if (e.key === 'Escape') {
              cancelPlacementMode();
              cancelScaling();
              cancelMeasurementMode();
              setSelectedIds([]);
              clearContextualMenu();
              clearItemActionMenu();
              clearDimensions();
              setManualMeasureLine(null);
              if (isMarqueeSelectMode) setIsMarqueeSelectMode(false);
          }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cancelPlacementMode, isMarqueeSelectMode, cancelMeasurementMode, clearContextualMenu, clearItemActionMenu, clearDimensions]);


  // --- Item Actions (Stack, Delete, Tidy) ---
  const stackSelectedItems = useCallback(() => {
    const selection = richFurniture.filter(f => selectedIds.includes(f.id));
    if (selection.length < 2) return;

    const stackId = `stack_${Date.now()}`;
    const largestItem = [...selection].sort((a,b) => (b.w * b.h) - (a.w * a.h))[0];
    const stackX = largestItem.x;
    const stackY = largestItem.y;

    const updatedFurniture = project.furniture.map(f => {
      if (selectedIds.includes(f.id)) {
        return { ...f, stackId, x: stackX, y: stackY };
      }
      return f;
    });

    changeProject({ furniture: updatedFurniture });
  }, [richFurniture, selectedIds, project.furniture, changeProject]);

  const reStackItems = useCallback(() => {
    if (!contextualMenu) return;
    const selection = contextualMenu.items;
    const selectionIds = selection.map(i => i.id);

    const stackId = `stack_${Date.now()}`;
    const largestItem = [...selection].sort((a,b) => (b.w * b.h) - (a.w * a.h))[0];
    const stackX = largestItem.x;
    const stackY = largestItem.y;

    const updatedFurniture = project.furniture.map(f => {
      if (selectionIds.includes(f.id)) {
        return { ...f, stackId, x: stackX, y: stackY };
      }
      return f;
    });

    changeProject({ furniture: updatedFurniture });
    setSelectedIds(selectionIds);
    clearContextualMenu();
  }, [contextualMenu, project.furniture, changeProject, clearContextualMenu]);
  
  const unstackItems = useCallback((stackId: string, position: {x: number, y: number}) => {
      if (!stackId) return;
      const itemsInStack = richFurniture.filter(f => f.stackId === stackId);
      if (itemsInStack.length === 0) return;
  
      const basePos = { x: itemsInStack[0].x || 0, y: itemsInStack[0].y || 0 };
      const radius = Math.max(itemsInStack[0].w, itemsInStack[0].h) * 0.75;
      const angleStep = (2 * Math.PI) / itemsInStack.length;
  
      const updatedFurniture = project.furniture.map(f => {
          if (f.stackId === stackId) {
              const itemIndex = itemsInStack.findIndex(i => i.id === f.id);
              const newX = basePos.x + radius * Math.cos(itemIndex * angleStep);
              const newY = basePos.y + radius * Math.sin(itemIndex * angleStep);
              const { stackId: _, ...rest } = f;
              return { ...rest, x: newX, y: newY };
          }
          return f;
      });
  
      changeProject({ furniture: updatedFurniture });
      const unstackedIds = itemsInStack.map(f => f.id);
      setSelectedIds(unstackedIds);
      setContextualMenu({ x: position.x, y: position.y, items: itemsInStack });
      clearItemActionMenu();
      clearDimensions();
      setManualMeasureLine(null);
  }, [richFurniture, project.furniture, changeProject, clearItemActionMenu, clearDimensions]);

  const deleteSelectedFurniture = () => {
    if (selectedIds.length === 0) return;
    changeProject({ furniture: project.furniture.filter(f => !selectedIds.includes(f.id)) });
    setSelectedIds([]);
    clearContextualMenu();
    clearItemActionMenu();
    clearDimensions();
    setManualMeasureLine(null);
  };

  const tidySelectedFurniture = (direction: TidyDirection) => {
    const selection = richFurniture.filter(f => selectedIds.includes(f.id));
    if (selection.length < 2) return;

    const avgX = selection.reduce((sum, f) => sum + (f.x || 0) + (f.w / 2), 0) / selection.length;
    const avgY = selection.reduce((sum, f) => sum + (f.y || 0) + (f.h / 2), 0) / selection.length;
    
    const updatedFurniture = project.furniture.map(f => {
      const richF = richFurniture.find(rf => rf.id === f.id);
      if (richF && selectedIds.includes(f.id)) {
        if (direction === 'horizontal-center') return { ...f, y: avgY - richF.h/2 };
        if (direction === 'vertical-center') return { ...f, x: avgX - richF.w/2 };
      }
      return f;
    });
    changeProject({ furniture: updatedFurniture });
  };

  const arrangeOnLargest = () => {
    const selection = selectionInfo.selection;
    if (selection.length < 2) return;
    
    const largestItem = [...selection].sort((a,b) => (b.w * b.h) - (a.w * a.h))[0];
    const otherItems = selection.filter(f => f.id !== largestItem.id);
    const largestCenterX = (largestItem.x || 0) + largestItem.w / 2;
    const largestCenterY = (largestItem.y || 0) + largestItem.h / 2;

    let updatedFurniture = [...project.furniture];

    if (largestItem.w > largestItem.h) {
        const totalWidth = otherItems.reduce((sum, item) => sum + item.w, 0);
        const spacing = (largestItem.w - totalWidth) / (otherItems.length + 1);
        let currentX = (largestItem.x || 0) + spacing;
        otherItems.forEach(item => {
            const itemIndex = updatedFurniture.findIndex(f => f.id === item.id);
            if(itemIndex !== -1) {
              updatedFurniture[itemIndex] = {...updatedFurniture[itemIndex], x: currentX, y: largestCenterY - item.h / 2};
              currentX += item.w + spacing;
            }
        });
    } else {
        const totalHeight = otherItems.reduce((sum, item) => sum + item.h, 0);
        const spacing = (largestItem.h - totalHeight) / (otherItems.length + 1);
        let currentY = (largestItem.y || 0) + spacing;
        otherItems.forEach(item => {
           const itemIndex = updatedFurniture.findIndex(f => f.id === item.id);
            if(itemIndex !== -1) {
              updatedFurniture[itemIndex] = {...updatedFurniture[itemIndex], y: currentY, x: largestCenterX - item.w / 2};
              currentY += item.h + spacing;
            }
        });
    }

    changeProject({ furniture: updatedFurniture });
    showNotification(`Arranged ${otherItems.length} items on ${largestItem.name}.`, 'success');
  };

  // --- AI Layout Check ---
  const handleCheckLayout = async () => {
      if (!project.floorPlanWidth || !project.floorPlanHeight) {
          showNotification('Floor plan dimensions not found. Please re-upload the plan.', 'error');
          return;
      }
      if (placedFurniture.length === 0) {
          showNotification('Place some furniture before checking the layout.', 'info');
          return;
      }
      
      setIsProcessing(true);
      setProcessingStatus('AI is analyzing layout...');
      setAnalysisResults(null);
      
      try {
          const issues = await checkLayoutWithAi(placedFurniture, { width: project.floorPlanWidth, height: project.floorPlanHeight });
          setAnalysisResults(issues);
          
          if (issues.length > 0) {
              const itemsWithIssues = new Set(issues.flatMap(issue => issue.itemIds));
              setSelectedIds(Array.from(itemsWithIssues));
          }
      } catch (error: unknown) {
          showNotification(`Analysis failed: ${(error as Error).message}`, 'error');
      } finally {
          setIsProcessing(false);
          setProcessingStatus('');
      }
  };

  const clearAnalysisResults = () => {
      setAnalysisResults(null);
      setSelectedIds([]);
  };

  const handleItemDoubleClick = useCallback((item: RichFurniture, event: React.MouseEvent) => {
    clearContextualMenu();
    clearItemActionMenu();
    if (item.stackId) {
        unstackItems(item.stackId, { x: event.clientX, y: event.clientY });
    } else {
        setItemActionMenu({ x: event.clientX, y: event.clientY, item, isStack: false });
    }
  }, [unstackItems, clearContextualMenu, clearItemActionMenu]);

  const placeAnother = useCallback(() => {
    if (!itemActionMenu) return;
    const itemToPlace = itemActionMenu.item;
    // Find the representative item from the unplaced summary to check availability
    const summaryItem = unplacedFurnitureSummary.find(s => s.item.name === itemToPlace.name);
    if (summaryItem && summaryItem.quantity > 0) {
        startPlacementMode(itemToPlace, 1);
    } else {
        showNotification(`No more unplaced units of ${itemToPlace.name}.`, 'info');
    }
    clearItemActionMenu();
  }, [itemActionMenu, unplacedFurnitureSummary, startPlacementMode, clearItemActionMenu, showNotification]);

  const handleShowPlacementDimensions = async () => {
    let itemForDimensioning: RichFurniture | undefined;
    
    if (selectionInfo.isSingleStackSelected) {
        // It's a stack, find the largest item as the reference
        itemForDimensioning = [...selectionInfo.selection].sort((a,b) => (b.w * b.h) - (a.w * a.h))[0];
    } else if (selectedIds.length === 1) {
        itemForDimensioning = richFurniture.find(f => f.id === selectedIds[0]);
    }

    if (!itemForDimensioning || !project.floorPlanUrl || !project.scale) {
      showNotification('Please select a single item or a single complete stack to measure.', 'info');
      return;
    }
  
    setIsProcessing(true);
    setProcessingStatus('AI is measuring...');
    setPlacementDimensions(null);
  
    try {
      const base64Data = project.floorPlanUrl.split(',')[1];
      const mimeType = project.floorPlanUrl.match(/:(.*?);/)?.[1] || 'image/png';
  
      const itemProps = {
        x: itemForDimensioning.x || 0,
        y: itemForDimensioning.y || 0,
        w: itemForDimensioning.w,
        h: itemForDimensioning.h
      };
  
      const dimensions = await getPlacementDimensions(base64Data, mimeType, itemProps);
      
      const dimensionsWithLabels = dimensions.map(line => {
        const dx = line.x2 - line.x1;
        const dy = line.y2 - line.y1;
        const pixelLength = Math.sqrt(dx * dx + dy * dy);
        const cmLength = pixelLength / project.scale!;
        const meterLength = cmLength / 100;
        return { ...line, label: `${meterLength.toFixed(2)}m` };
      });

      setPlacementDimensions(dimensionsWithLabels);

    } catch (error: unknown) {
        showNotification(`Dimension measurement failed: ${(error as Error).message}`, 'error');
    } finally {
      setIsProcessing(false);
      setProcessingStatus('');
    }
  };

  // Manual Measurement
  const toggleMeasureMode = useCallback(() => {
      setIsMeasuringMode(prev => !prev);
      setManualMeasureStartPoint(null);
      setManualMeasureLine(null);
      if (isScalingMode) cancelScaling();
      if (placementMode.itemToPlace) cancelPlacementMode();
  }, [isScalingMode, placementMode.itemToPlace, cancelPlacementMode]);

  const handleCanvasClickForMeasuring = useCallback((point: { x: number; y: number }) => {
      if (!manualMeasureStartPoint) {
          setManualMeasureStartPoint(point);
          setManualMeasureLine(null);
      } else {
          const dx = point.x - manualMeasureStartPoint.x;
          const dy = point.y - manualMeasureStartPoint.y;
          const pixelLength = Math.sqrt(dx * dx + dy * dy);
          const cmLength = pixelLength / (project.scale || 1);
          const meterLength = cmLength / 100;
          
          setManualMeasureLine({
              x1: manualMeasureStartPoint.x,
              y1: manualMeasureStartPoint.y,
              x2: point.x,
              y2: point.y,
              label: `${meterLength.toFixed(2)}m`
          });

          // End measurement mode after one measurement
          setIsMeasuringMode(false);
          setManualMeasureStartPoint(null);
      }
  }, [manualMeasureStartPoint, project.scale]);

  const renameProject = (newName: string) => {
    if (newName.trim()) {
      changeProject({ name: newName.trim() });
      showNotification("Project renamed!", "success");
    }
  };


  return {
    project,
    richFurniture,
    floorPlanUrl,
    unplacedFurniture,
    unplacedFurnitureSummary,
    placedFurniture,
    furnitureSummary,
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