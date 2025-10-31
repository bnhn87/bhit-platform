'use client';

import { PackagePlus, X } from 'lucide-react';
import React, { useState, useEffect } from 'react';

interface PlaceQuantityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (quantity: number) => void;
  itemName: string;
  maxQuantity?: number;
}

export default function PlaceQuantityModal({ isOpen, onClose, onSubmit, itemName, maxQuantity }: PlaceQuantityModalProps) {
  const [quantity, setQuantity] = useState('1');

  useEffect(() => {
    // Reset form when modal is opened for a new measurement
    if (isOpen) {
      setQuantity('1');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numericQuantity = parseInt(quantity, 10);
    if (isNaN(numericQuantity) || numericQuantity <= 0 || (maxQuantity && numericQuantity > maxQuantity)) {
        return;
    };
    onSubmit(numericQuantity);
  };

  const handleSetMax = () => {
    if (maxQuantity) {
      setQuantity(maxQuantity.toString());
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-fade-in" onClick={onClose}>
      <div className="bg-gray-800 rounded-lg shadow-2xl p-8 border border-gray-700 w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold flex items-center gap-3"><PackagePlus /> Place Multiple Items</h2>
          <button onClick={onClose} className="p-1 rounded-full text-gray-400 hover:bg-gray-700">
            <X size={24} />
          </button>
        </div>
        <p className="text-gray-400 mb-6">How many units of <strong className="text-white">{itemName}</strong> would you like to place?
          {maxQuantity && <span className="block text-sm mt-1">(Max available: {maxQuantity})</span>}
        </p>
        
        <form onSubmit={handleSubmit}>
          <div className="flex gap-2">
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="e.g., 4"
              autoFocus
              className="flex-grow p-3 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              required
              min="1"
              max={maxQuantity}
              step="1"
            />
            {maxQuantity && (
              <button 
                type="button" 
                onClick={handleSetMax}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg font-semibold transition-colors text-sm"
              >
                Max
              </button>
            )}
          </div>
          <div className="mt-8 flex justify-end gap-4">
             <button type="button" onClick={onClose} className="px-6 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg font-semibold transition-colors">
                Cancel
             </button>
             <button type="submit" className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition-colors">
                Start Placing
             </button>
          </div>
        </form>
      </div>
    </div>
  );
}