'use client';

import { X, FileImage, FileText, FileJson, Download } from 'lucide-react';
import React from 'react';

import { exportAsPng, exportAsPdf, exportAsJson } from '../services/exportService';
import { Project } from '../types';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
}

const ExportButton = ({ icon, title, description, onClick, disabled = false }: { icon: React.ReactNode, title: string, description: string, onClick: () => void, disabled?: boolean }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className="flex items-center gap-4 p-4 w-full text-left rounded-lg transition-all border border-gray-700 hover:bg-gray-700 hover:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
  >
    <div className="p-3 bg-gray-600 rounded-md">
      {icon}
    </div>
    <div>
      <h4 className="font-bold text-white">{title}</h4>
      <p className="text-sm text-gray-400">{description}</p>
    </div>
  </button>
);


export default function ExportModal({ isOpen, onClose, project }: ExportModalProps) {
  if (!isOpen) return null;

  const handleExport = async (type: 'png' | 'pdf' | 'json') => {
    try {
      if (type === 'png') await exportAsPng(project.name);
      if (type === 'pdf') await exportAsPdf(project);
      if (type === 'json') exportAsJson(project);
    } catch (error: unknown) {
        console.error("Export failed:", error);
        // You could show a notification here
    } finally {
        onClose();
    }
  };

  const hasPlacedItems = project.furniture.some(f => f.x !== undefined);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fade-in" onClick={onClose}>
      <div className="bg-gray-800 rounded-lg shadow-2xl p-8 border border-gray-700 w-full max-w-lg" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold flex items-center gap-3"><Download /> Export Project</h2>
          <button onClick={onClose} className="p-1 rounded-full text-gray-400 hover:bg-gray-700">
            <X size={24} />
          </button>
        </div>
        
        <div className="space-y-4">
          <ExportButton
            icon={<FileImage className="text-blue-400" />}
            title="Image (PNG)"
            description="Export the current view as a high-resolution image."
            onClick={() => handleExport('png')}
          />
          <ExportButton
            icon={<FileText className="text-red-400" />}
            title="Document (PDF)"
            description="A multi-page PDF with the layout and an inventory list."
            onClick={() => handleExport('pdf')}
            disabled={!hasPlacedItems}
          />
          <ExportButton
            icon={<FileJson className="text-green-400" />}
            title="Project Data (JSON)"
            description="Export placed item data for backups or other systems."
            onClick={() => handleExport('json')}
            disabled={!hasPlacedItems}
          />
        </div>
      </div>
    </div>
  );
}