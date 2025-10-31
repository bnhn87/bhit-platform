
'use client';

import { Ruler, X } from 'lucide-react';
import React, { useState, useEffect } from 'react';

interface ScaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (lengthCm: number) => void;
  pixelLength: number;
}

export default function ScaleModal({ isOpen, onClose, onSubmit, pixelLength }: ScaleModalProps) {
  const [length, setLength] = useState('');
  const [unit, setUnit] = useState<'m' | 'ft' | 'mm'>('m');

  useEffect(() => {
    // Reset form when modal is opened for a new measurement
    if (isOpen) {
      setLength('');
      setUnit('m');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numericLength = parseFloat(length);
    if (isNaN(numericLength) || numericLength <= 0) {
        // Here you could show an error message inside the modal
        return;
    };

    let lengthInCm: number;
    if (unit === 'm') {
      lengthInCm = numericLength * 100;
    } else if (unit === 'ft') {
      lengthInCm = numericLength * 30.48;
    } else { // 'mm'
      lengthInCm = numericLength / 10;
    }
    onSubmit(lengthInCm);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fade-in" onClick={onClose}>
      <div className="bg-gray-800 rounded-lg shadow-2xl p-8 border border-gray-700 w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold flex items-center gap-3"><Ruler /> Set Scale</h2>
          <button onClick={onClose} className="p-1 rounded-full text-gray-400 hover:bg-gray-700">
            <X size={24} />
          </button>
        </div>
        <p className="text-gray-400 mb-6">Enter the real-world length of the line you just drew ({Math.round(pixelLength)} pixels).</p>
        
        <form onSubmit={handleSubmit}>
          <div className="flex gap-4">
            <input
              type="number"
              value={length}
              onChange={(e) => setLength(e.target.value)}
              placeholder="e.g., 3.5"
              autoFocus
              className="flex-grow p-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              required
              step="any"
            />
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value as 'm' | 'ft' | 'mm')}
              className="p-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="m">meters (m)</option>
              <option value="ft">feet (ft)</option>
              <option value="mm">millimeters (mm)</option>
            </select>
          </div>
          <div className="mt-8 flex justify-end gap-4">
             <button type="button" onClick={onClose} className="px-6 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg font-semibold transition-colors">
                Cancel
             </button>
             <button type="submit" className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition-colors">
                Set Scale
             </button>
          </div>
        </form>
      </div>
    </div>
  );
}
