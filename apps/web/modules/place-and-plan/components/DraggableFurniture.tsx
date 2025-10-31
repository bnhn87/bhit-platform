
'use client';

import { RotateCcw, Layers2 as _Layers2 } from 'lucide-react';
import React, { useState, useRef, useEffect } from 'react';

import { RichFurniture, BaseFurniture } from '../types';

interface DraggableFurnitureProps {
  item: RichFurniture & { quantity?: number };
  isSidebar: boolean;
  onMove?: (id: string, newProps: { x?: number, y?: number }) => void;
  onMoveEnd?: (id: string, newProps: Partial<BaseFurniture>) => void;
  isSelected?: boolean;
  onSelect?: (id: string | null, isMulti: boolean) => void;
  onSidebarItemClick?: () => void;
  viewScale?: number;
  isSpaceDown?: boolean;
  isError?: boolean;
  stackItems?: RichFurniture[];
  isPlacementModeActive?: boolean;
  onItemDoubleClick?: (event: React.MouseEvent) => void;
}

const StackPopover: React.FC<{ items: RichFurniture[], scale: number }> = ({ items, scale }) => (
    <div className="absolute bottom-full mb-2 w-max max-w-xs bg-gray-900 border border-gray-700 rounded-lg shadow-xl p-3 z-30 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" style={{ transform: `scale(${1 / scale})`, transformOrigin: 'bottom center' }}>
        <h4 className="font-bold text-md text-white border-b border-gray-600 pb-1 mb-2">Stack Contents ({items.length})</h4>
        <div className="max-h-48 overflow-y-auto text-sm space-y-1.5 pr-2">
            {items.map(i => (
                <div key={i.id} className="grid grid-cols-[auto,1fr] gap-x-2 text-gray-300">
                    <span className="font-mono text-gray-500">{i.lineNumber ? `L${i.lineNumber}:` : ''}</span>
                    <span className="truncate" title={i.name}>{i.name}</span>
                    {i.productCode && <span className="col-span-2 text-xs text-gray-500 pl-4 -mt-1">{i.productCode}</span>}
                </div>
            ))}
        </div>
    </div>
);


export default function DraggableFurniture({ item, isSidebar, onMove, onMoveEnd, isSelected, onSelect, onSidebarItemClick, viewScale = 1, isSpaceDown = false, isError = false, stackItems, isPlacementModeActive = false, onItemDoubleClick }: DraggableFurnitureProps) {
  const [isDragging, setIsDragging] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const itemStartPos = useRef({ x: 0, y: 0 });

  const isStack = stackItems && stackItems.length > 0;

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
      if (isSidebar || !onMove || isSpaceDown || isPlacementModeActive) return;
      
      e.preventDefault();
      e.stopPropagation();

      setIsDragging(true);
      dragStartPos.current = { x: e.clientX, y: e.clientY };
      itemStartPos.current = { x: item.x || 0, y: item.y || 0 };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging || isSidebar || !onMove) return;

      const dx = (e.clientX - dragStartPos.current.x) / viewScale;
      const dy = (e.clientY - dragStartPos.current.y) / viewScale;
      
      // onMove is now the lightweight function that doesn't trigger a full history update
      onMove(item.id, { x: itemStartPos.current.x + dx, y: itemStartPos.current.y + dy });
    };

    const handleMouseUp = (e: MouseEvent) => {
        if (isDragging && onMoveEnd) {
            const dx = (e.clientX - dragStartPos.current.x) / viewScale;
            const dy = (e.clientY - dragStartPos.current.y) / viewScale;
            // onMoveEnd commits the final change to the history
            onMoveEnd(item.id, { x: itemStartPos.current.x + dx, y: itemStartPos.current.y + dy });
        }
        setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp, { once: true });
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, onMove, onMoveEnd, item.id, isSidebar, viewScale]);

  const handleDragStartSidebar = (e: React.DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData("application/json", JSON.stringify({ id: item.id, isSidebar: true, itemW: item.w, itemH: item.h }));
  };

  const handleRotate = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    if(onMoveEnd) {
        const newRotation = (item.rotation + 45) % 360;
        onMoveEnd(item.id, { rotation: newRotation });
    }
  };
  
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
      e.stopPropagation(); 
      if (isSidebar && onSidebarItemClick) {
          onSidebarItemClick();
      } else if (onSelect) {
          onSelect(item.id, e.shiftKey);
      }
  }

  const handleDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (onItemDoubleClick && !isSidebar) {
        onItemDoubleClick(e);
    }
  }

  if (isSidebar) {
    return (
      <div
        draggable
        onDragStart={handleDragStartSidebar}
        onClick={handleClick}
        className="p-2 bg-gray-700 rounded-lg flex items-center gap-2 cursor-grab active:cursor-grabbing border border-gray-600 hover:bg-gray-600 transition-colors"
        title={`Click to place multiple, or drag to place one.`}
      >
        <div className="w-4 h-4 rounded-sm flex-shrink-0" style={{backgroundColor: item.color || '#4a5568'}}></div>
        <span className="text-sm truncate select-none flex-grow">{item.name}</span>
        {item.quantity && item.quantity > 0 && (
          <span className="ml-2 font-mono text-xs bg-gray-800 text-gray-300 px-2 py-0.5 rounded-full">
            {item.quantity}
          </span>
        )}
      </div>
    );
  }

  return (
    <div
      onMouseDown={handleMouseDown}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      className={`absolute flex items-center justify-center rounded-md transition-all duration-100 group ${isDragging ? 'cursor-grabbing shadow-2xl z-20' : isPlacementModeActive ? 'cursor-copy' : 'cursor-grab'} ${isStack ? 'hover:z-30' : ''}`}
      style={{
        left: `${item.x}px`,
        top: `${item.y}px`,
        width: `${item.w}px`,
        height: `${item.h}px`,
        transform: `rotate(${item.rotation}deg)`,
        transformOrigin: 'center center',
        backgroundColor: isError ? 'rgba(239, 68, 68, 0.7)' : (item.color || 'rgba(59, 130, 246, 0.7)'),
        boxShadow: isSelected ? '0 0 15px rgba(59, 130, 246, 0.5)' : '0 4px 6px rgba(0,0,0,0.2)',
        outline: isError 
          ? `3px solid #f87171` 
          : (isSelected 
            ? `3px solid #60a5fa` 
            : (isStack ? '2px dashed #14b8a6' : '1px solid rgba(0,0,0,0.3)')),
        outlineOffset: '2px',
        pointerEvents: (isSpaceDown || isPlacementModeActive) ? 'none' : 'auto',
      }}
    >
      {isStack && stackItems && <StackPopover items={stackItems} scale={viewScale} />}
      <span className={`text-black font-semibold px-1 select-none ${isSelected ? 'text-sm' : 'text-xs truncate'}`} style={{ transform: `rotate(${-item.rotation}deg)` }}>
          {isStack ? "Stack" : item.name}
      </span>
      {isSelected && !isError && !isStack && (
        <button
          onClick={handleRotate}
          className="absolute -top-3 -right-3 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center text-white hover:bg-green-400 transition-transform hover:scale-110 shadow-lg"
          style={{ transform: `rotate(${-item.rotation}deg) scale(${1 / viewScale})` }}
          title="Rotate 45 degrees"
        >
          <RotateCcw size={14} />
        </button>
      )}
       {isStack && (
        <div 
          className="absolute -top-3 -left-3 w-6 h-6 bg-teal-500 rounded-full flex items-center justify-center text-white shadow-lg font-bold text-xs"
          style={{ transform: `scale(${1/viewScale})`, transformOrigin: 'top left' }}
        >
          {stackItems?.length}
        </div>
      )}
    </div>
  );
}
