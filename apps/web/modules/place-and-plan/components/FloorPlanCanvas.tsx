
'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';

import { RichFurniture, BaseFurniture, PlacementMode, ViewTransform, PlacementDimensionLine, ManualMeasureLine } from '../types';

import DraggableFurniture from './DraggableFurniture';

interface FloorPlanCanvasProps {
  imageUrl: string | null;
  furniture: RichFurniture[];
  onMove: (id: string, newProps: { x?: number, y?: number }) => void;
  onMoveEnd: (id:string, newProps: Partial<BaseFurniture>) => void;
  selectedIds: string[];
  onSelect: (id: string | null, isMulti: boolean) => void;
  isLoading: boolean;
  isScalingMode: boolean;
  onCanvasClickForScaling: (point: { x: number; y: number }) => void;
  scaleLineStart: { x: number; y: number } | null;
  scaleReferenceBox: { x: number; y: number; size: number } | null;
  placementMode: PlacementMode;
  onPlaceItem: (x: number, y: number, getSnapshot: (x: number, y: number, w: number, h: number) => Promise<string | null>) => void;
  viewTransform: ViewTransform;
  setViewTransform: React.Dispatch<React.SetStateAction<ViewTransform>>;
  errorItemIds: string[];
  placementDimensions: PlacementDimensionLine[] | null;
  isMarqueeSelectMode: boolean;
  onMarqueeSelect: (ids: string[]) => void;
  onStackClick: (stackId: string, position: {x: number, y: number}) => void;
  onItemDoubleClick: (item: RichFurniture, event: React.MouseEvent) => void;
  isMeasuringMode: boolean;
  onCanvasClickForMeasuring: (point: { x: number; y: number }) => void;
  manualMeasureStartPoint: { x: number; y: number } | null;
  manualMeasureLine: ManualMeasureLine | null;
}

export default function FloorPlanCanvas({
  imageUrl,
  furniture,
  onMove,
  onMoveEnd,
  selectedIds,
  onSelect,
  isLoading,
  isScalingMode,
  onCanvasClickForScaling,
  scaleLineStart,
  scaleReferenceBox,
  placementMode,
  onPlaceItem,
  viewTransform,
  setViewTransform,
  errorItemIds,
  placementDimensions,
  isMarqueeSelectMode,
  onMarqueeSelect,
  onStackClick: _onStackClick,
  onItemDoubleClick,
  isMeasuringMode,
  onCanvasClickForMeasuring,
  manualMeasureStartPoint,
  manualMeasureLine,
}: FloorPlanCanvasProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0 });
  const [isSpaceDown, setIsSpaceDown] = useState(false);
  const [marqueeRect, setMarqueeRect] = useState<{x1:number, y1:number, x2:number, y2:number} | null>(null);

  // --- Coordinate Transformation ---
  const screenToWorld = (screenX: number, screenY: number) => {
    if (!viewportRef.current) return { x: 0, y: 0 };
    const rect = viewportRef.current.getBoundingClientRect();
    const worldX = (screenX - rect.left - viewTransform.offsetX) / viewTransform.scale;
    const worldY = (screenY - rect.top - viewTransform.offsetY) / viewTransform.scale;
    return { x: worldX, y: worldY };
  };

  // --- Snapshot function for AI analysis ---
  const getPlacementSnapshot = useCallback(async (x: number, y: number, w: number, h: number): Promise<string | null> => {
    if (!imageUrl) return null;

    const img = new Image();
    img.crossOrigin = 'anonymous'; 

    const promise = new Promise<string | null>((resolve) => {
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const padding = Math.max(w, h) * 0.2; 
            canvas.width = w + padding * 2;
            canvas.height = h + padding * 2;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                resolve(null);
                return;
            }
            ctx.drawImage(img, x - padding, y - padding, w + padding * 2, h + padding * 2, 0, 0, w + padding * 2, h + padding * 2);
            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = () => resolve(null);
    });

    img.src = imageUrl;
    return promise;
  }, [imageUrl]);

  // --- Event Handlers ---
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    
    const handleWheel = (e: WheelEvent) => {
        e.preventDefault();
        const rect = viewport.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const zoomFactor = 1.1;
        const newScale = e.deltaY < 0 ? viewTransform.scale * zoomFactor : viewTransform.scale / zoomFactor;
        const clampedScale = Math.max(0.1, Math.min(newScale, 10));

        const newOffsetX = mouseX - (mouseX - viewTransform.offsetX) * (clampedScale / viewTransform.scale);
        const newOffsetY = mouseY - (mouseY - viewTransform.offsetY) * (clampedScale / viewTransform.scale);

        setViewTransform({ scale: clampedScale, offsetX: newOffsetX, offsetY: newOffsetY });
    };

    viewport.addEventListener('wheel', handleWheel, { passive: false });
    return () => viewport.removeEventListener('wheel', handleWheel);
  }, [viewTransform, setViewTransform]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.code === 'Space' && !e.repeat) setIsSpaceDown(true);
    };
    const handleKeyUp = (e: KeyboardEvent) => {
        if (e.code === 'Space') setIsSpaceDown(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);
    }
  }, []);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isMarqueeSelectMode) {
        e.preventDefault();
        e.stopPropagation();
        setMarqueeRect({ x1: e.clientX, y1: e.clientY, x2: e.clientX, y2: e.clientY });
        return;
    }
    if (e.button === 0 && (isSpaceDown || selectedIds.length === 0)) {
      e.preventDefault();
      e.stopPropagation();
      setIsPanning(true);
      panStart.current = { x: e.clientX, y: e.clientY };
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (marqueeRect) {
        setMarqueeRect(r => r ? {...r, x2: e.clientX, y2: e.clientY } : null);
    } else if (isPanning) {
      const dx = e.clientX - panStart.current.x;
      const dy = e.clientY - panStart.current.y;
      setViewTransform(vt => ({...vt, offsetX: vt.offsetX + dx, offsetY: vt.offsetY + dy}));
      panStart.current = { x: e.clientX, y: e.clientY };
    }
    const worldPos = screenToWorld(e.clientX, e.clientY);
    setMousePos(worldPos);
  };
  
  const handleMouseUp = () => {
    if (marqueeRect && viewportRef.current) {
        const start = screenToWorld(marqueeRect.x1, marqueeRect.y1);
        const end = screenToWorld(marqueeRect.x2, marqueeRect.y2);
        const worldMarquee = {
            x: Math.min(start.x, end.x),
            y: Math.min(start.y, end.y),
            width: Math.abs(start.x - end.x),
            height: Math.abs(start.y - end.y)
        };

        const intersectingIds = furniture.filter(f => {
            if (f.x === undefined || f.y === undefined) return false;
            // Simple AABB collision detection
            return f.x < worldMarquee.x + worldMarquee.width &&
                   f.x + f.w > worldMarquee.x &&
                   f.y < worldMarquee.y + worldMarquee.height &&
                   f.y + f.h > worldMarquee.y;
        }).map(f => f.id);
        
        onMarqueeSelect(intersectingIds);
        setMarqueeRect(null);
    }
    if (isPanning) setIsPanning(false);
  };

  const handleDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!viewportRef.current || isScalingMode || isMeasuringMode) return;
    if (e.target !== viewportRef.current?.firstChild) return; 

    const rect = viewportRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const targetScale = Math.abs(viewTransform.scale - 1.5) < 0.01 ? 1.0 : 1.5;

    const newOffsetX = mouseX - (mouseX - viewTransform.offsetX) * (targetScale / viewTransform.scale);
    const newOffsetY = mouseY - (mouseY - viewTransform.offsetY) * (targetScale / viewTransform.scale);

    setViewTransform({ scale: targetScale, offsetX: newOffsetX, offsetY: newOffsetY });
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (isScalingMode || placementMode.itemToPlace) return;
    const data = e.dataTransfer.getData("application/json");
    if (!data) return;

    const { id, isSidebar, itemW, itemH } = JSON.parse(data);
    if (!isSidebar) return;
    
    const {x, y} = screenToWorld(e.clientX, e.clientY);

    onMoveEnd(id, { x: x - itemW / 2, y: y - itemH / 2 });
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };
  
  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
      if ((e.target as HTMLElement).id !== 'floorplan-background') return;

      const {x, y} = screenToWorld(e.clientX, e.clientY);

      if (isMeasuringMode) {
          onCanvasClickForMeasuring({ x, y });
          return;
      }
      if (isScalingMode) {
          onCanvasClickForScaling({ x, y });
          return;
      }
      if (placementMode.itemToPlace) {
          onPlaceItem(x, y, getPlacementSnapshot);
          return;
      }
      onSelect(null, false);
  }

  const renderedFurniture = useMemo(() => {
    const stacks = new Map<string, RichFurniture[]>();
    const singles: RichFurniture[] = [];
    const isPlacementModeActive = !!placementMode.itemToPlace;

    furniture.forEach(item => {
        if (item.stackId) {
            if (!stacks.has(item.stackId)) {
                stacks.set(item.stackId, []);
            }
            stacks.get(item.stackId)!.push(item);
        } else {
            singles.push(item);
        }
    });

    const rendered: JSX.Element[] = [];

    // Render single items
    singles.forEach(item => {
        rendered.push(
            <DraggableFurniture
              key={item.id}
              item={item}
              isSidebar={false}
              onMove={onMove}
              onMoveEnd={onMoveEnd}
              isSelected={selectedIds.includes(item.id)}
              isError={errorItemIds.includes(item.id)}
              onSelect={onSelect}
              viewScale={viewTransform.scale}
              isSpaceDown={isSpaceDown}
              isPlacementModeActive={isPlacementModeActive}
              onItemDoubleClick={(e) => onItemDoubleClick(item, e)}
            />
        );
    });

    // Render stacks
    stacks.forEach((items, stackId) => {
        const baseItem = items.sort((a,b) => (b.w * b.h) - (a.w * a.h))[0];
        const isStackSelected = items.some(i => selectedIds.includes(i.id));
        rendered.push(
            <DraggableFurniture
                key={stackId}
                item={baseItem}
                stackItems={items}
                isSidebar={false}
                onMove={onMove}
                onMoveEnd={onMoveEnd}
                isSelected={isStackSelected}
                isError={items.some(i => errorItemIds.includes(i.id))}
                onSelect={onSelect}
                viewScale={viewTransform.scale}
                isSpaceDown={isSpaceDown}
                isPlacementModeActive={isPlacementModeActive}
                onItemDoubleClick={(e) => onItemDoubleClick(baseItem, e)}
            />
        );
    });
    return rendered;
  }, [furniture, onMove, onMoveEnd, selectedIds, onSelect, errorItemIds, viewTransform.scale, isSpaceDown, placementMode.itemToPlace, onItemDoubleClick]);


  if (isLoading) {
    return (
      <div className="w-full h-full border-2 border-dashed border-gray-600 rounded-lg flex flex-col items-center justify-center text-gray-500 bg-gray-700/20">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500 mb-4"></div>
        <p>Processing Floor Plan...</p>
      </div>
    );
  }

  if (!imageUrl) {
    return (
      <div className="w-full h-full border-2 border-dashed border-gray-600 rounded-lg flex items-center justify-center text-center p-4 text-gray-500 bg-gray-700/20">
        Upload a floor plan to begin your design.
      </div>
    );
  }

  const getCursorClass = () => {
    if (isMeasuringMode || isScalingMode) return 'cursor-crosshair';
    if (isMarqueeSelectMode) return 'cursor-crosshair';
    if (placementMode.itemToPlace) return 'cursor-copy';
    if (isPanning) return 'cursor-grabbing';
    if (isSpaceDown || (selectedIds.length === 0 && !isMarqueeSelectMode)) return 'cursor-grab';
    return 'cursor-default';
  };
  
  const marqueeStyle: React.CSSProperties = marqueeRect ? {
    position: 'fixed',
    left: Math.min(marqueeRect.x1, marqueeRect.x2),
    top: Math.min(marqueeRect.y1, marqueeRect.y2),
    width: Math.abs(marqueeRect.x1 - marqueeRect.x2),
    height: Math.abs(marqueeRect.y1 - marqueeRect.y2),
    border: '1px solid #3b82f6',
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    zIndex: 100,
    pointerEvents: 'none'
  } : {};

  return (
    <>
      {marqueeRect && <div style={marqueeStyle}></div>}
      <div
        ref={viewportRef}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className="w-full h-full shadow-inner rounded-lg"
        style={{ backgroundColor: '#1a202c', cursor: getCursorClass() }}
      >
          <div 
              id="floorplan-background"
              className="w-full h-full bg-no-repeat bg-center bg-contain"
              onClick={handleCanvasClick}
              onDoubleClick={handleDoubleClick}
              style={{ 
                  backgroundImage: `url(${imageUrl})`, 
                  transform: `translate(${viewTransform.offsetX}px, ${viewTransform.offsetY}px) scale(${viewTransform.scale})`,
                  transformOrigin: 'top left'
              }}
          >
            {renderedFurniture}

            <svg className="absolute top-0 left-0 w-full h-full" style={{ pointerEvents: 'none' }}>
                {/* Scaling Line */}
                {isScalingMode && scaleLineStart && (
                    <g>
                        <line x1={scaleLineStart.x} y1={scaleLineStart.y} x2={mousePos.x} y2={mousePos.y} stroke="#3b82f6" strokeWidth={2 / viewTransform.scale} strokeDasharray="5,5" />
                        <circle cx={scaleLineStart.x} cy={scaleLineStart.y} r={4 / viewTransform.scale} fill="#3b82f6" />
                        <circle cx={mousePos.x} cy={mousePos.y} r={4 / viewTransform.scale} fill="#3b82f6" />
                    </g>
                )}

                {/* Manual Measurement Live Line */}
                {isMeasuringMode && manualMeasureStartPoint && (
                    <g>
                      <line x1={manualMeasureStartPoint.x} y1={manualMeasureStartPoint.y} x2={mousePos.x} y2={mousePos.y} stroke="#22d3ee" strokeWidth={2 / viewTransform.scale} strokeDasharray="5,5" />
                      <circle cx={manualMeasureStartPoint.x} cy={manualMeasureStartPoint.y} r={4 / viewTransform.scale} fill="#22d3ee" />
                      <circle cx={mousePos.x} cy={mousePos.y} r={4 / viewTransform.scale} fill="#22d3ee" />
                    </g>
                )}
                
                {/* Manual Measurement Final Line */}
                {manualMeasureLine && (
                    <g>
                        <line x1={manualMeasureLine.x1} y1={manualMeasureLine.y1} x2={manualMeasureLine.x2} y2={manualMeasureLine.y2} stroke="#22d3ee" strokeWidth={2 / viewTransform.scale} />
                        <text
                          x={(manualMeasureLine.x1 + manualMeasureLine.x2) / 2}
                          y={(manualMeasureLine.y1 + manualMeasureLine.y2) / 2 - (10 / viewTransform.scale)}
                          fill="#22d3ee"
                          fontSize={12 / viewTransform.scale}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          className="font-sans font-semibold"
                        >
                          {manualMeasureLine.label}
                        </text>
                    </g>
                )}
                
                {/* AI Placement Dimensions */}
                {placementDimensions && placementDimensions.map((line, i) => {
                  const isVertical = Math.abs(line.x1 - line.x2) < Math.abs(line.y1 - line.y2);
                  const angle = isVertical ? -90 : 0;
                  const textOffset = 10 / viewTransform.scale;
                  const textX = (line.x1 + line.x2) / 2 + (isVertical ? textOffset : 0);
                  const textY = (line.y1 + line.y2) / 2 - (isVertical ? 0 : textOffset);
                  
                  const refTextX = line.x2 + (isVertical ? (line.x2 > line.x1 ? 5 : -5) / viewTransform.scale : 0);
                  const refTextY = line.y2 + (isVertical ? 0 : (line.y2 > line.y1 ? 15 : -5) / viewTransform.scale);

                  return (
                    <g key={`ai-${i}`}>
                      <line
                        x1={line.x1} y1={line.y1}
                        x2={line.x2} y2={line.y2}
                        stroke="#f97316"
                        strokeWidth={1.5 / viewTransform.scale}
                        strokeDasharray={`4,${4 / viewTransform.scale}`}
                      />
                      <text
                        x={textX}
                        y={textY}
                        fill="#f97316"
                        fontSize={12 / viewTransform.scale}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        className="font-sans font-semibold"
                        style={{ transform: `rotate(${angle}deg)`, transformOrigin: `${textX}px ${textY}px` }}
                      >
                        {line.label}
                      </text>
                      {line.referenceType && (
                        <text
                          x={refTextX}
                          y={refTextY}
                          fill="#f97316"
                          fontSize={10 / viewTransform.scale}
                          textAnchor={isVertical ? (line.x2 > line.x1 ? 'start' : 'end') : 'middle'}
                          dominantBaseline="middle"
                          className="font-sans"
                        >
                          ({line.referenceType})
                        </text>
                      )}
                    </g>
                  )
                })}
            </svg>

            {scaleReferenceBox && (
              <div 
                className="absolute border-2 border-dashed border-cyan-400 flex items-center justify-center"
                style={{
                  left: `${scaleReferenceBox.x}px`,
                  top: `${scaleReferenceBox.y}px`,
                  width: `${scaleReferenceBox.size}px`,
                  height: `${scaleReferenceBox.size}px`,
                  pointerEvents: 'none',
                }}
              >
                <span className="text-cyan-400 bg-gray-900/70 px-2 py-1 rounded text-xs font-bold" style={{transform: `scale(${1 / viewTransform.scale})`}}>1 meter</span>
              </div>
            )}
          </div>
      </div>
    </>
  );
}