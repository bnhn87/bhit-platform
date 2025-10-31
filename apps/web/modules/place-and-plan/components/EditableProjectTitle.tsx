'use client';

import { Edit3 } from 'lucide-react';
import React, { useState, useEffect } from 'react';

interface EditableProjectTitleProps {
  title: string;
  onRename: (newTitle: string) => void;
}

export default function EditableProjectTitle({ title, onRename }: EditableProjectTitleProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [currentTitle, setCurrentTitle] = useState(title);

  useEffect(() => {
    setCurrentTitle(title);
  }, [title]);

  const handleBlur = () => {
    setIsEditing(false);
    if (currentTitle.trim() && currentTitle !== title) {
      onRename(currentTitle);
    } else {
      setCurrentTitle(title); // Revert if empty or unchanged
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    } else if (e.key === 'Escape') {
      setCurrentTitle(title);
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <input
        type="text"
        value={currentTitle}
        onChange={(e) => setCurrentTitle(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        autoFocus
        className="w-full bg-gray-600 text-white text-lg font-bold p-2 rounded-md outline-none ring-2 ring-blue-500"
      />
    );
  }

  return (
    <div
      onClick={() => setIsEditing(true)}
      className="group flex items-center gap-2 p-2 rounded-md hover:bg-gray-700 cursor-pointer transition-colors"
      title="Click to rename project"
    >
      <h2 className="text-lg font-bold text-white truncate flex-grow">{title}</h2>
      <Edit3 size={16} className="text-gray-500 group-hover:text-white transition-colors flex-shrink-0" />
    </div>
  );
}