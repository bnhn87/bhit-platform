'use client';

import { FileImage, FileText } from 'lucide-react';
import React, { useState } from 'react';

interface FileUploadOverlayProps {
  onDragLeave: () => void;
  onDropFloorPlan: (file: File) => void;
  onDropProductList: (file: File) => void;
  isProductListDisabled: boolean;
}

const FileUploadOverlay: React.FC<FileUploadOverlayProps> = ({
  onDragLeave,
  onDropFloorPlan,
  onDropProductList,
  isProductListDisabled,
}) => {
  const [isOverFloorPlan, setIsOverFloorPlan] = useState(false);
  const [isOverProductList, setIsOverProductList] = useState(false);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, type: 'floorplan' | 'productlist') => {
    e.preventDefault();
    e.stopPropagation();

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (type === 'floorplan') {
        onDropFloorPlan(file);
      } else if (type === 'productlist' && !isProductListDisabled) {
        onDropProductList(file);
      }
      e.dataTransfer.clearData();
    }
    onDragLeave(); // Hide overlay after drop
  };
  
  const handleOverlayDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    // This checks if the drag is leaving the overlay div itself, which is a good proxy for leaving the window
    if (e.target === e.currentTarget) {
        onDragLeave();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-gray-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-8 animate-fade-in"
      onDragOver={handleDragOver}
      onDragLeave={handleOverlayDragLeave}
      onDrop={onDragLeave} // Catch drops outside the zones to just close the overlay
    >
      <div className="w-full h-full grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Floor Plan Drop Zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsOverFloorPlan(true); }}
          onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsOverFloorPlan(false); }}
          onDrop={(e) => handleDrop(e, 'floorplan')}
          className={`w-full h-full border-4 border-dashed rounded-2xl flex flex-col items-center justify-center transition-all duration-300 ${isOverFloorPlan ? 'bg-blue-500/30 border-blue-400 scale-105' : 'bg-gray-800/50 border-gray-600'}`}
        >
          <FileImage size={64} className={`transition-transform duration-300 ${isOverFloorPlan ? 'scale-110' : ''}`} />
          <h3 className="text-3xl font-bold mt-4">Drop Floor Plan</h3>
          <p className="text-gray-400 mt-2">Images (PNG, JPG) or PDF files</p>
        </div>

        {/* Product List Drop Zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); if (!isProductListDisabled) setIsOverProductList(true); }}
          onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsOverProductList(false); }}
          onDrop={(e) => handleDrop(e, 'productlist')}
          className={`w-full h-full border-4 border-dashed rounded-2xl flex flex-col items-center justify-center transition-all duration-300 ${
            isProductListDisabled
              ? 'bg-gray-800/30 border-gray-700 cursor-not-allowed'
              : isOverProductList
              ? 'bg-green-500/30 border-green-400 scale-105'
              : 'bg-gray-800/50 border-gray-600'
          }`}
        >
          <FileText size={64} className={`transition-transform duration-300 ${isOverProductList && !isProductListDisabled ? 'scale-110' : ''}`} />
          <h3 className="text-3xl font-bold mt-4">Drop Product List</h3>
          {isProductListDisabled ? (
            <p className="text-yellow-400 mt-2 font-semibold">Please upload a Floor Plan and Set the Scale first.</p>
          ) : (
            <p className="text-gray-400 mt-2">CSV, JSON, or PDF files</p>
          )}
        </div>
      </div>
       <p className="absolute bottom-8 text-gray-500 text-lg">Drag your file into a zone above to upload, or move your cursor away to cancel.</p>
    </div>
  );
};

export default FileUploadOverlay;
