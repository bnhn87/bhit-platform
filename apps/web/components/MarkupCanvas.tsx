// MarkupCanvas - Draw bounding boxes on documents for AI training
// Uses Konva.js for canvas manipulation

import React, { useState, useRef, useEffect } from 'react';
import { Stage, Layer, Rect, Text, Transformer, Image as KonvaImage } from 'react-konva';
import { theme } from '../lib/theme';
import type { TemplateField } from '../lib/templateService';

export interface BoundingBox {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  field_name: string;
  field_label: string;
  confidence_level: 'always' | 'usually' | 'sometimes' | 'fallback';
  priority: number;
  notes?: string;
  isSelected?: boolean;
}

interface MarkupCanvasProps {
  documentImage: HTMLImageElement | null;
  boxes: BoundingBox[];
  onBoxesChange: (boxes: BoundingBox[]) => void;
  onBoxSelect: (box: BoundingBox | null) => void;
  mode: 'draw' | 'select' | 'view';
  width: number;
  height: number;
}

export default function MarkupCanvas({
  documentImage,
  boxes,
  onBoxesChange,
  onBoxSelect,
  mode,
  width,
  height,
}: MarkupCanvasProps) {
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentBox, setCurrentBox] = useState<BoundingBox | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const stageRef = useRef<any>(null);

  // Get confidence color
  const getConfidenceColor = (level: string) => {
    switch (level) {
      case 'always': return '#10b981'; // green
      case 'usually': return '#3b82f6'; // blue
      case 'sometimes': return '#f59e0b'; // orange
      case 'fallback': return '#9ca3af'; // gray
      default: return '#3b82f6';
    }
  };

  // Handle mouse down - start drawing
  const handleMouseDown = (e: any) => {
    if (mode !== 'draw') return;

    const stage = e.target.getStage();
    const pos = stage.getPointerPosition();

    setIsDrawing(true);
    setCurrentBox({
      id: `box_${Date.now()}`,
      x: pos.x,
      y: pos.y,
      width: 0,
      height: 0,
      field_name: '',
      field_label: 'Unlabeled Field',
      confidence_level: 'usually',
      priority: boxes.length,
    });
  };

  // Handle mouse move - draw box
  const handleMouseMove = (e: any) => {
    if (!isDrawing || !currentBox) return;

    const stage = e.target.getStage();
    const pos = stage.getPointerPosition();

    setCurrentBox({
      ...currentBox,
      width: pos.x - currentBox.x,
      height: pos.y - currentBox.y,
    });
  };

  // Handle mouse up - finish drawing
  const handleMouseUp = () => {
    if (!isDrawing || !currentBox) return;

    // Only add box if it has meaningful size
    if (Math.abs(currentBox.width) > 10 && Math.abs(currentBox.height) > 10) {
      // Normalize box (handle negative width/height from dragging right-to-left or bottom-to-top)
      const normalizedBox = {
        ...currentBox,
        x: currentBox.width < 0 ? currentBox.x + currentBox.width : currentBox.x,
        y: currentBox.height < 0 ? currentBox.y + currentBox.height : currentBox.y,
        width: Math.abs(currentBox.width),
        height: Math.abs(currentBox.height),
      };

      const newBoxes = [...boxes, normalizedBox];
      onBoxesChange(newBoxes);
      onBoxSelect(normalizedBox);
      setSelectedId(normalizedBox.id);
    }

    setIsDrawing(false);
    setCurrentBox(null);
  };

  // Handle box click - select
  const handleBoxClick = (box: BoundingBox) => {
    if (mode === 'view') return;

    setSelectedId(box.id);
    onBoxSelect(box);
  };

  // Handle box drag end - update position
  const handleBoxDragEnd = (boxId: string, e: any) => {
    const newBoxes = boxes.map(box =>
      box.id === boxId
        ? { ...box, x: e.target.x(), y: e.target.y() }
        : box
    );
    onBoxesChange(newBoxes);
  };

  // Handle box transform end - update size
  const handleBoxTransformEnd = (boxId: string, e: any) => {
    const node = e.target;
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();

    // Reset scale after transform
    node.scaleX(1);
    node.scaleY(1);

    const newBoxes = boxes.map(box =>
      box.id === boxId
        ? {
            ...box,
            x: node.x(),
            y: node.y(),
            width: Math.max(5, node.width() * scaleX),
            height: Math.max(5, node.height() * scaleY),
          }
        : box
    );
    onBoxesChange(newBoxes);
  };

  // Delete selected box
  const handleDelete = () => {
    if (selectedId) {
      const newBoxes = boxes.filter(box => box.id !== selectedId);
      onBoxesChange(newBoxes);
      setSelectedId(null);
      onBoxSelect(null);
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        handleDelete();
      }
      if (e.key === 'Escape') {
        setSelectedId(null);
        onBoxSelect(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedId]);

  return (
    <div style={{
      width,
      height,
      overflow: 'auto',
      background: '#1a1a1a',
      border: `1px solid ${theme.colors.border}`,
      borderRadius: theme.radii.md,
      cursor: mode === 'draw' ? 'crosshair' : 'default',
    }}>
      <Stage
        width={width}
        height={height}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        ref={stageRef}
      >
        <Layer>
          {/* Document image */}
          {documentImage && (
            <KonvaImage
              image={documentImage}
              x={0}
              y={0}
              width={documentImage.width}
              height={documentImage.height}
            />
          )}

          {/* Existing bounding boxes */}
          {boxes.map(box => {
            const isSelected = box.id === selectedId;
            const color = getConfidenceColor(box.confidence_level);

            return (
              <React.Fragment key={box.id}>
                {/* Rectangle */}
                <Rect
                  x={box.x}
                  y={box.y}
                  width={box.width}
                  height={box.height}
                  stroke={isSelected ? '#fff' : color}
                  strokeWidth={isSelected ? 3 : 2}
                  fill={`${color}20`}
                  draggable={mode === 'select'}
                  onClick={() => handleBoxClick(box)}
                  onTap={() => handleBoxClick(box)}
                  onDragEnd={(e) => handleBoxDragEnd(box.id, e)}
                  onTransformEnd={(e) => handleBoxTransformEnd(box.id, e)}
                />

                {/* Label */}
                <Text
                  x={box.x}
                  y={box.y - 20}
                  text={box.field_label}
                  fontSize={12}
                  fontFamily="Inter, sans-serif"
                  fill={color}
                  padding={4}
                  listening={false}
                />
              </React.Fragment>
            );
          })}

          {/* Current drawing box */}
          {currentBox && (
            <>
              <Rect
                x={currentBox.x}
                y={currentBox.y}
                width={currentBox.width}
                height={currentBox.height}
                stroke="#3b82f6"
                strokeWidth={2}
                dash={[5, 5]}
                fill="rgba(59, 130, 246, 0.1)"
                listening={false}
              />
            </>
          )}
        </Layer>
      </Stage>

      {/* Instructions overlay */}
      {mode === 'draw' && boxes.length === 0 && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          color: theme.colors.textSubtle,
          pointerEvents: 'none',
        }}>
          <p style={{ fontSize: '1.25rem', fontWeight: 500 }}>
            Click and drag to draw a box around a field
          </p>
          <p style={{ fontSize: '0.875rem', marginTop: '0.5rem' }}>
            Then label it in the properties panel →
          </p>
        </div>
      )}
    </div>
  );
}
