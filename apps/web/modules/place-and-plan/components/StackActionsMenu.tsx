
'use client';

import { Layers2, Trash2 } from 'lucide-react';
import React, { useEffect, useRef } from 'react';

interface StackActionsMenuProps {
  x: number;
  y: number;
  onRestack: () => void;
  onDelete: () => void;
  onClose: () => void;
}

export default function StackActionsMenu({ x, y, onRestack, onDelete, onClose }: StackActionsMenuProps) {
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
      <div className="text-xs font-bold text-gray-400 px-2 pb-1 border-b border-gray-700">Stack Actions</div>
      <button
        onClick={onRestack}
        className="flex items-center gap-2 w-full text-left p-2 rounded-md hover:bg-teal-600 hover:text-white transition-colors text-sm"
      >
        <Layers2 size={16} />
        <span>Re-stack Items</span>
      </button>
      <button
        onClick={onDelete}
        className="flex items-center gap-2 w-full text-left p-2 rounded-md hover:bg-red-600 hover:text-white transition-colors text-sm"
      >
        <Trash2 size={16} />
        <span>Delete Selected</span>
      </button>
    </div>
  );
}
