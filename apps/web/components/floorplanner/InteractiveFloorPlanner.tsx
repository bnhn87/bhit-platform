/**
 * Enhanced Interactive Floor Planner Component
 * Full drag-and-drop furniture placement with measurements and task generation
 */

import React, { useState, useRef, useCallback } from 'react';

import { theme } from '../../lib/theme';

import { SMART_QUOTE_FURNITURE, getFurnitureByCategory, FURNITURE_CATEGORIES } from './SmartQuoteFurniture';
import { JobFloorPlan, PlacedFurniture, InstallationTask } from './types';

interface Props {
  floorPlan: JobFloorPlan | null;
  onFloorPlanUpdate: (plan: JobFloorPlan) => void;
  onGenerateTasks: (tasks: InstallationTask[]) => void;
  canManage: boolean;
}

interface DragState {
  isDragging: boolean;
  draggedItem: PlacedFurniture | null;
  offset: { x: number; y: number };
}

export default function InteractiveFloorPlanner({ 
  floorPlan, 
  onFloorPlanUpdate, 
  onGenerateTasks, 
  canManage 
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    draggedItem: null,
    offset: { x: 0, y: 0 }
  });
  const [selectedRoom, setSelectedRoom] = useState<string>('main');
  const [selectedCategory, setSelectedCategory] = useState<string>(FURNITURE_CATEGORIES.SEATING);
  const [scale] = useState(floorPlan?.scale || 2);

  // Convert cm to pixels
  const cmToPx = useCallback((cm: number) => cm * scale, [scale]);
  const _pxToCm = useCallback((px: number) => px / scale, [scale]);

  // Get furniture for selected category
  const availableFurniture = getFurnitureByCategory(selectedCategory);

  // Add furniture to floor plan
  const addFurniture = useCallback((furnitureType: typeof SMART_QUOTE_FURNITURE[0]) => {
    if (!floorPlan || !canManage) return;

    const newItem: PlacedFurniture = {
      id: `${furnitureType.id}_${Date.now()}`,
      name: furnitureType.name,
      productCode: furnitureType.productCode,
      width_cm: furnitureType.width_cm,
      depth_cm: furnitureType.depth_cm,
      x: 100,
      y: 100,
      rotation: 0,
      roomZone: selectedRoom,
      color: furnitureType.color,
      installOrder: floorPlan.furniture.length + 1
    };

    const updatedPlan = {
      ...floorPlan,
      furniture: [...floorPlan.furniture, newItem],
      updatedAt: new Date().toISOString()
    };

    onFloorPlanUpdate(updatedPlan);
  }, [floorPlan, canManage, selectedRoom, onFloorPlanUpdate]);

  // Handle mouse down on furniture
  const handleMouseDown = useCallback((e: React.MouseEvent, item: PlacedFurniture) => {
    if (!canManage) return;
    
    e.preventDefault();
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    setDragState({
      isDragging: true,
      draggedItem: item,
      offset: {
        x: e.clientX - rect.left - item.x,
        y: e.clientY - rect.top - item.y
      }
    });
  }, [canManage]);

  // Handle mouse move
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragState.isDragging || !dragState.draggedItem || !canManage) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const newX = Math.max(0, e.clientX - rect.left - dragState.offset.x);
    const newY = Math.max(0, e.clientY - rect.top - dragState.offset.y);

    if (floorPlan) {
      const updatedFurniture = floorPlan.furniture.map(item => 
        item.id === dragState.draggedItem!.id 
          ? { ...item, x: newX, y: newY }
          : item
      );

      const updatedPlan = {
        ...floorPlan,
        furniture: updatedFurniture,
        updatedAt: new Date().toISOString()
      };

      onFloorPlanUpdate(updatedPlan);
    }
  }, [dragState, canManage, floorPlan, onFloorPlanUpdate]);

  // Handle mouse up
  const handleMouseUp = useCallback(() => {
    setDragState({
      isDragging: false,
      draggedItem: null,
      offset: { x: 0, y: 0 }
    });
  }, []);

  // Remove furniture item
  const removeFurniture = useCallback((itemId: string) => {
    if (!floorPlan || !canManage) return;

    const updatedPlan = {
      ...floorPlan,
      furniture: floorPlan.furniture.filter(item => item.id !== itemId),
      updatedAt: new Date().toISOString()
    };

    onFloorPlanUpdate(updatedPlan);
  }, [floorPlan, canManage, onFloorPlanUpdate]);

  // Generate tasks from current furniture layout
  const generateTasks = useCallback(() => {
    if (!floorPlan?.furniture.length) return;

    const tasks: InstallationTask[] = [];
    let taskOrder = 1;

    // Group by room
    const roomGroups = floorPlan.furniture.reduce((groups, item) => {
      const room = item.roomZone || 'main';
      if (!groups[room]) groups[room] = [];
      groups[room].push(item);
      return groups;
    }, {} as Record<string, PlacedFurniture[]>);

    // Site preparation
    tasks.push({
      id: `prep_${floorPlan.jobId}`,
      jobId: floorPlan.jobId,
      title: 'Site Preparation',
      description: 'Clear area and prepare for furniture installation',
      installOrder: taskOrder++,
      furnitureIds: [],
      estimatedTimeMinutes: 30,
      isGenerated: true
    });

    // Room-by-room installation
    Object.entries(roomGroups).forEach(([room, furniture]) => {
      const sortedFurniture = [...furniture].sort((a, b) => 
        (a.installOrder || 0) - (b.installOrder || 0)
      );

      tasks.push({
        id: `install_${room}_${floorPlan.jobId}`,
        jobId: floorPlan.jobId,
        title: `Install Furniture - ${room}`,
        description: `Install: ${sortedFurniture.map(f => f.name).join(', ')}`,
        installOrder: taskOrder++,
        roomZone: room,
        furnitureIds: sortedFurniture.map(f => f.id),
        estimatedTimeMinutes: sortedFurniture.length * 20,
        isGenerated: true
      });
    });

    // Final inspection
    tasks.push({
      id: `inspection_${floorPlan.jobId}`,
      jobId: floorPlan.jobId,
      title: 'Final Inspection & Cleanup',
      description: 'Quality check and cleanup',
      installOrder: taskOrder++,
      furnitureIds: [],
      estimatedTimeMinutes: 15,
      dependencies: tasks.filter(t => t.title.includes('Install')).map(t => t.id),
      isGenerated: true
    });

    onGenerateTasks(tasks);
  }, [floorPlan, onGenerateTasks]);

  // Render furniture item
  const renderFurniture = (item: PlacedFurniture) => {
    const width = cmToPx(item.width_cm);
    const height = cmToPx(item.depth_cm);
    
    return (
      <div
        key={item.id}
        style={{
          position: 'absolute',
          left: item.x,
          top: item.y,
          width,
          height,
          background: item.color || theme.colors.accent,
          border: `2px solid ${theme.colors.border}`,
          borderRadius: 4,
          cursor: canManage ? 'move' : 'default',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 10,
          color: 'white',
          fontWeight: 600,
          transform: `rotate(${item.rotation}deg)`,
          zIndex: dragState.draggedItem?.id === item.id ? 1000 : 1,
          opacity: dragState.draggedItem?.id === item.id ? 0.8 : 1,
          userSelect: 'none'
        }}
        onMouseDown={(e) => handleMouseDown(e, item)}
        onDoubleClick={() => canManage && removeFurniture(item.id)}
        title={`${item.name} ${item.productCode ? `(${item.productCode})` : ''} - Double-click to remove`}
      >
        <span style={{ textAlign: 'center', padding: 2 }}>
          {item.name.split(' ').map(word => word.slice(0, 3)).join(' ')}
        </span>
      </div>
    );
  };

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      {/* Toolbar */}
      {canManage && (
        <div style={{
          display: 'flex',
          gap: 8,
          flexWrap: 'wrap',
          padding: 12,
          background: theme.colors.panelAlt,
          border: `1px solid ${theme.colors.border}`,
          borderRadius: 8
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ fontSize: 12, color: theme.colors.textSubtle }}>Room:</label>
            <select 
              value={selectedRoom}
              onChange={(e) => setSelectedRoom(e.target.value)}
              style={{
                padding: '4px 8px',
                borderRadius: 4,
                border: `1px solid ${theme.colors.border}`,
                background: theme.colors.panel,
                color: theme.colors.text
              }}
            >
              <option value="main">Main Area</option>
              <option value="office">Office</option>
              <option value="meeting">Meeting Room</option>
              <option value="reception">Reception</option>
              <option value="kitchen">Kitchen</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <label style={{ fontSize: 12, color: theme.colors.textSubtle }}>Category:</label>
            <select 
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              style={{
                padding: '4px 8px',
                borderRadius: 4,
                border: `1px solid ${theme.colors.border}`,
                background: theme.colors.panel,
                color: theme.colors.text
              }}
            >
              {Object.values(FURNITURE_CATEGORIES).map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            {availableFurniture.slice(0, 4).map(furniture => (
              <button
                key={furniture.id}
                onClick={() => addFurniture(furniture)}
                style={{
                  padding: '6px 10px',
                  fontSize: 11,
                  borderRadius: 4,
                  border: `1px solid ${theme.colors.border}`,
                  background: theme.colors.panel,
                  color: theme.colors.text,
                  cursor: 'pointer'
                }}
                title={`Add ${furniture.name} (${furniture.width_cm}×${furniture.depth_cm}cm) - $${furniture.price}`}
              >
                {furniture.name}
              </button>
            ))}
          </div>

          <button
            onClick={generateTasks}
            disabled={!floorPlan?.furniture.length}
            style={{
              padding: '6px 12px',
              borderRadius: 4,
              border: `1px solid ${theme.colors.accent}`,
              background: theme.colors.accent,
              color: 'white',
              cursor: floorPlan?.furniture.length ? 'pointer' : 'not-allowed',
              fontWeight: 600
            }}
          >
            Generate Tasks ({floorPlan?.furniture.length || 0} items)
          </button>
        </div>
      )}

      {/* Canvas Area */}
      <div style={{
        position: 'relative',
        width: '100%',
        height: 500,
        background: theme.colors.panelAlt,
        border: `1px solid ${theme.colors.border}`,
        borderRadius: 8,
        overflow: 'hidden'
      }}>
        <canvas
          ref={canvasRef}
          width={800}
          height={500}
          style={{ 
            width: '100%', 
            height: '100%',
            cursor: dragState.isDragging ? 'grabbing' : 'default'
          }}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />
        
        {/* Render furniture items */}
        {floorPlan?.furniture.map(renderFurniture)}
        
        {/* Grid overlay */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundImage: `
            linear-gradient(to right, rgba(255,255,255,0.1) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(255,255,255,0.1) 1px, transparent 1px)
          `,
          backgroundSize: `${cmToPx(50)}px ${cmToPx(50)}px`,
          pointerEvents: 'none'
        }} />
      </div>

      {/* Status */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 8,
        fontSize: 12,
        color: theme.colors.textSubtle
      }}>
        <span>{floorPlan?.furniture.length || 0} furniture items placed</span>
        <span>Scale: {scale}px/cm | Grid: 50cm</span>
      </div>
    </div>
  );
}