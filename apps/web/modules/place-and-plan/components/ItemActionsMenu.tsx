
'use client';

import { PackagePlus, UnfoldVertical } from 'lucide-react';
import React, { useEffect, useRef } from 'react';

interface ItemActionsMenuProps {
  x: number;
  y: number;
  isStack: boolean;
  onPlaceAnother: () => void;
  onUnstack?: () => void;
  onClose: () => void;
}

export default function ItemActionsMenu({ x, y, isStack, onPlaceAnother, onUnstack, onClose }: ItemActionsMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    // Use timeout to prevent the same click that opened the menu from closing it
    setTimeout(() => document.addEventListener('mousedown', handleClickOutside), 0);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      className="fixed bg-gray-800 border border-gray-600 rounded-lg shadow-2xl p-2 flex flex-col gap-1 z-50 animate-fade-in"
      style={{
        left: `${x + 15}px`,
        top: `${y + 15}px`,
      }}
    >
      <div className="text-xs font-bold text-gray-400 px-2 pb-1 border-b border-gray-700">Item Actions</div>
      <button
        onClick={onPlaceAnother}
        className="flex items-center gap-2 w-full text-left p-2 rounded-md hover:bg-blue-600 hover:text-white transition-colors text-sm"
      >
        <PackagePlus size={16} />
        <span>Place Another</span>
      </button>
      {isStack && onUnstack && (
        <button
          onClick={onUnstack}
          className="flex items-center gap-2 w-full text-left p-2 rounded-md hover:bg-teal-600 hover:text-white transition-colors text-sm"
        >
          <UnfoldVertical size={16} />
          <span>Unstack Items</span>
        </button>
      )}
    </div>
  );
}
