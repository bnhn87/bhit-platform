'use client';

import { ZoomIn, ZoomOut, Maximize as _Maximize } from 'lucide-react';
import React from 'react';

import { ViewTransform } from '../types';

interface ViewControlsProps {
  viewTransform: ViewTransform;
  setViewTransform: React.Dispatch<React.SetStateAction<ViewTransform>>;
}

export default function ViewControls({ viewTransform, setViewTransform }: ViewControlsProps) {
  const handleZoom = (direction: 'in' | 'out') => {
    const zoomFactor = 1.2;
    const newScale = direction === 'in' ? viewTransform.scale * zoomFactor : viewTransform.scale / zoomFactor;
    const clampedScale = Math.max(0.1, Math.min(newScale, 10));

    // This simple zoom focuses on the center. A better implementation would zoom to cursor.
    // The wheel-to-zoom on the canvas provides cursor-focused zooming.
    setViewTransform(vt => ({...vt, scale: clampedScale}));
  };

  const handleReset = () => {
    setViewTransform({ scale: 1, offsetX: 0, offsetY: 0 });
  };
  
  return (
    <div className="absolute bottom-4 right-4 bg-gray-900/80 border border-gray-700 rounded-lg shadow-lg flex items-center p-1 gap-1 z-10">
      <button 
        onClick={() => handleZoom('out')} 
        className="p-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded-md transition-colors"
        title="Zoom Out"
      >
        <ZoomOut size={20} />
      </button>
      <button 
        onClick={handleReset} 
        className="p-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded-md transition-colors text-sm font-mono w-16 text-center"
        title="Reset View"
      >
        {Math.round(viewTransform.scale * 100)}%
      </button>
      <button 
        onClick={() => handleZoom('in')} 
        className="p-2 text-gray-300 hover:text-white hover:bg-gray-700 rounded-md transition-colors"
        title="Zoom In"
      >
        <ZoomIn size={20} />
      </button>
    </div>
  );
}
