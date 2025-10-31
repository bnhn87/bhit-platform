/**
 * Advanced Floor Plan Canvas - Integrated with BHIT Work OS
 * Interactive canvas with sophisticated drag-and-drop, zoom, and AI integration
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';

import { theme } from '../../lib/theme';
import { PlacedFurniture } from '../floorplanner/types';

import { RichFurniture, PlacementMode, PlacementDimensionLine, ManualMeasureLine } from './useAiPlanner';

interface ViewTransform {
  scale: number;
  offsetX: number;
  offsetY: number;
}

interface FloorPlanCanvasProps {
  imageUrl: string | null;
  furniture: RichFurniture[];
  onMove: (id: string, newProps: { x?: number, y?: number }) => void;
  onMoveEnd: (id: string, newProps: Partial<PlacedFurniture>) => void;
  selectedIds: string[];
  onSelect: (id: string | null, isMulti: boolean) => void;
  isLoading: boolean;
  isScalingMode: boolean;
  onCanvasClickForScaling: (point: { x: number; y: number }) => void;
  scaleLineStart: { x: number; y: number } | null;
  scaleReferenceBox: { x: number; y: number; size: number } | null;
  placementMode: PlacementMode;
  onPlaceItem: (x: number, y: number, getSnapshot?: (x: number, y: number, w: number, h: number) => Promise<string | null>) => void;
  viewTransform: ViewTransform;
  setViewTransform: React.Dispatch<React.SetStateAction<ViewTransform>>;
  errorItemIds: Set<string>;
  placementDimensions: PlacementDimensionLine[] | null;
  isMarqueeSelectMode: boolean;
  onMarqueeSelect: (ids: string[]) => void;
  onStackClick: (stackId: string, position?: {x: number, y: number}) => void;
  onItemDoubleClick: (item: RichFurniture, event?: React.MouseEvent) => void;
  isMeasuringMode: boolean;
  onCanvasClickForMeasuring: (point: { x: number; y: number }) => void;
  manualMeasureStartPoint: { x: number; y: number } | null;
  manualMeasureLine: ManualMeasureLine | null;
}

const DraggableFurniture = ({ 
  item, 
  onMove, 
  onMoveEnd, 
  isSelected, 
  onSelect, 
  viewTransform,
  hasError,
  onDoubleClick,
  onStackClick
}: {
  item: RichFurniture;
  onMove: (id: string, newProps: { x?: number, y?: number }) => void;
  onMoveEnd: (id: string, newProps: Partial<PlacedFurniture>) => void;
  isSelected: boolean;
  onSelect: (id: string | null, isMulti: boolean) => void;
  viewTransform: ViewTransform;
  hasError: boolean;
  onDoubleClick: (item: RichFurniture, event: React.MouseEvent) => void;
  onStackClick: (stackId: string, position: {x: number, y: number}) => void;
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const dragOffset = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const dx = (e.clientX - dragStart.x) / viewTransform.scale;
      const dy = (e.clientY - dragStart.y) / viewTransform.scale;
      onMove(item.id, { 
        x: Math.max(0, item.x! + dx), 
        y: Math.max(0, item.y! + dy) 
      });
      setDragStart({ x: e.clientX, y: e.clientY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      onMoveEnd(item.id, {});
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragStart, item.id, item.x, item.y, onMove, onMoveEnd, viewTransform.scale]);

  if (item.x === undefined || item.y === undefined) return null;

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!isSelected) {
      onSelect(item.id, e.ctrlKey || e.metaKey);
    }
    
    setIsDragging(true);
    const rect = e.currentTarget.getBoundingClientRect();
    dragOffset.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDoubleClick(item, e);
  };

  const handleStackClick = (e: React.MouseEvent) => {
    if (item.stackId) {
      e.preventDefault();
      e.stopPropagation();
      onStackClick(item.stackId, { x: e.clientX, y: e.clientY });
    }
  };

  return (
    <div
      style={{
        position: 'absolute',
        left: item.x,
        top: item.y,
        width: item.w,
        height: item.h,
        background: hasError ? theme.colors.danger + '40' : (item.color || theme.colors.accent),
        border: `2px solid ${isSelected ? theme.colors.accentAlt : (hasError ? theme.colors.danger : 'transparent')}`,
        borderRadius: 4,
        cursor: isDragging ? 'grabbing' : 'grab',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontSize: Math.min(item.w, item.h) / 6,
        fontWeight: 600,
        textAlign: 'center',
        userSelect: 'none',
        transition: isDragging ? 'none' : 'all 0.2s ease',
        boxShadow: isSelected ? `0 0 0 2px ${theme.colors.accentAlt}` : undefined,
        zIndex: isSelected ? 10 : (item.stackId ? 5 : 1),
        opacity: isDragging ? 0.8 : 1
      }}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
      onClick={item.stackId ? handleStackClick : undefined}
      title={`${item.name} (${item.width_cm}×${item.depth_cm}cm)`}
    >
      <div style={{
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        maxWidth: '90%'
      }}>
        {item.name}
      </div>
      
      {item.stackId && (
        <div style={{
          position: 'absolute',
          top: -2,
          right: -2,
          background: theme.colors.accent,
          color: 'white',
          borderRadius: '50%',
          width: 16,
          height: 16,
          fontSize: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 700
        }}>
          S
        </div>
      )}

      {item.productCode && (
        <div style={{
          position: 'absolute',
          bottom: -2,
          left: 2,
          background: theme.colors.panelAlt,
          color: theme.colors.text,
          padding: '2px 4px',
          borderRadius: 3,
          fontSize: 8,
          fontWeight: 500,
          opacity: 0.9
        }}>
          {item.productCode}
        </div>
      )}
    </div>
  );
};

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
  scaleReferenceBox: _scaleReferenceBox,
  placementMode,
  onPlaceItem,
  viewTransform,
  setViewTransform,
  errorItemIds,
  placementDimensions: _placementDimensions,
  isMarqueeSelectMode,
  onMarqueeSelect,
  onStackClick,
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

  // Debug log
  // eslint-disable-next-line no-console
  // console.log('FloorPlanCanvas imageUrl:', imageUrl);

  // Coordinate transformation
  const screenToWorld = (screenX: number, screenY: number) => {
    if (!viewportRef.current) return { x: 0, y: 0 };
    const rect = viewportRef.current.getBoundingClientRect();
    const worldX = (screenX - rect.left - viewTransform.offsetX) / viewTransform.scale;
    const worldY = (screenY - rect.top - viewTransform.offsetY) / viewTransform.scale;
    return { x: worldX, y: worldY };
  };

  // Snapshot function for AI analysis
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

  // Zoom and pan handling
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

  // Keyboard shortcuts
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

  const handleCanvasClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return;
    
    const worldPos = screenToWorld(e.clientX, e.clientY);
    
    if (isScalingMode) {
      onCanvasClickForScaling(worldPos);
    } else if (isMeasuringMode) {
      onCanvasClickForMeasuring(worldPos);
    } else if (placementMode.itemToPlace && placementMode.remaining > 0) {
      onPlaceItem(worldPos.x, worldPos.y, getPlacementSnapshot);
    } else {
      onSelect(null, false);
    }
  };

  const placedFurniture = furniture.filter(f => f.x !== undefined && f.y !== undefined);

  return (
    <div
      ref={viewportRef}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        background: theme.colors.bg,
        cursor: isPanning ? 'grabbing' : (isSpaceDown ? 'grab' : (isScalingMode ? 'crosshair' : (isMeasuringMode ? 'crosshair' : 'default')))
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onClick={handleCanvasClick}
    >
      {/* Background Image */}
      {imageUrl && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            transform: `translate(${viewTransform.offsetX}px, ${viewTransform.offsetY}px) scale(${viewTransform.scale})`,
            transformOrigin: '0 0',
            backgroundImage: `url(${imageUrl})`,
            backgroundSize: 'contain',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'top left',
            width: '100%',
            height: '100%',
            minWidth: 800,
            minHeight: 600
          }}
        />
      )}

      {/* Furniture Layer */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          transform: `translate(${viewTransform.offsetX}px, ${viewTransform.offsetY}px) scale(${viewTransform.scale})`,
          transformOrigin: '0 0'
        }}
      >
        {placedFurniture.map(item => (
          <DraggableFurniture
            key={item.id}
            item={item}
            onMove={onMove}
            onMoveEnd={onMoveEnd}
            isSelected={selectedIds.includes(item.id)}
            onSelect={onSelect}
            viewTransform={viewTransform}
            hasError={errorItemIds.has(item.id)}
            onDoubleClick={onItemDoubleClick}
            onStackClick={onStackClick}
          />
        ))}

        {/* Placement Preview */}
        {placementMode.itemToPlace && placementMode.remaining > 0 && (
          <div
            style={{
              position: 'absolute',
              left: mousePos.x - (placementMode.itemToPlace.width_cm * 0.5 || 25),
              top: mousePos.y - (placementMode.itemToPlace.depth_cm * 0.5 || 25),
              width: placementMode.itemToPlace.width_cm || 50,
              height: placementMode.itemToPlace.depth_cm || 50,
              background: theme.colors.accent + '80',
              border: `2px dashed ${theme.colors.accent}`,
              borderRadius: 4,
              pointerEvents: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: 12,
              fontWeight: 600
            }}
          >
            {placementMode.itemToPlace.name}
          </div>
        )}

        {/* Scale Line */}
        {isScalingMode && scaleLineStart && (
          <svg
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              pointerEvents: 'none'
            }}
          >
            <line
              x1={scaleLineStart.x}
              y1={scaleLineStart.y}
              x2={mousePos.x}
              y2={mousePos.y}
              stroke={theme.colors.accent}
              strokeWidth="2"
              strokeDasharray="5,5"
            />
            <circle cx={scaleLineStart.x} cy={scaleLineStart.y} r="4" fill={theme.colors.accent} />
            <circle cx={mousePos.x} cy={mousePos.y} r="4" fill={theme.colors.accent} />
          </svg>
        )}

        {/* Measuring Line */}
        {isMeasuringMode && manualMeasureStartPoint && (
          <svg
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              pointerEvents: 'none'
            }}
          >
            <line
              x1={manualMeasureStartPoint.x}
              y1={manualMeasureStartPoint.y}
              x2={mousePos.x}
              y2={mousePos.y}
              stroke={theme.colors.accentAlt}
              strokeWidth="2"
            />
            <circle cx={manualMeasureStartPoint.x} cy={manualMeasureStartPoint.y} r="3" fill={theme.colors.accentAlt} />
            <circle cx={mousePos.x} cy={mousePos.y} r="3" fill={theme.colors.accentAlt} />
          </svg>
        )}

        {/* Completed Manual Measure Line */}
        {manualMeasureLine && (
          <svg
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              pointerEvents: 'none'
            }}
          >
            <line
              x1={manualMeasureLine.x1}
              y1={manualMeasureLine.y1}
              x2={manualMeasureLine.x2}
              y2={manualMeasureLine.y2}
              stroke={theme.colors.accentAlt}
              strokeWidth="2"
            />
            <text
              x={(manualMeasureLine.x1 + manualMeasureLine.x2) / 2}
              y={(manualMeasureLine.y1 + manualMeasureLine.y2) / 2 - 5}
              fill={theme.colors.accentAlt}
              fontSize="12"
              fontWeight="600"
              textAnchor="middle"
            >
              {manualMeasureLine.label}
            </text>
          </svg>
        )}
      </div>

      {/* Marquee Selection */}
      {marqueeRect && (
        <div
          style={{
            position: 'fixed',
            left: Math.min(marqueeRect.x1, marqueeRect.x2),
            top: Math.min(marqueeRect.y1, marqueeRect.y2),
            width: Math.abs(marqueeRect.x2 - marqueeRect.x1),
            height: Math.abs(marqueeRect.y2 - marqueeRect.y1),
            background: theme.colors.accent + '20',
            border: `1px solid ${theme.colors.accent}`,
            pointerEvents: 'none',
            zIndex: 1000
          }}
        />
      )}

      {/* Loading Overlay */}
      {isLoading && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: theme.colors.bg + 'CC',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
        >
          <div style={{
            padding: 20,
            background: theme.colors.panel,
            borderRadius: 8,
            border: `1px solid ${theme.colors.border}`,
            color: theme.colors.text,
            display: 'flex',
            alignItems: 'center',
            gap: 12
          }}>
            <div style={{
              width: 20,
              height: 20,
              border: `2px solid ${theme.colors.accent}`,
              borderTop: '2px solid transparent',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }} />
            Processing...
          </div>
        </div>
      )}

      {/* Help Text */}
      {!imageUrl && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            textAlign: 'center',
            color: theme.colors.textSubtle,
            fontSize: 16
          }}
        >
          <div style={{ fontSize: 48, marginBottom: 16 }}>📐</div>
          <div>Upload a floor plan to get started</div>
          <div style={{ fontSize: 14, marginTop: 8 }}>
            Supports images and PDFs
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}