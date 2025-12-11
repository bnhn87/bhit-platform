/**
 * Advanced Planning Interface - Integrated with BHIT Work OS
 * Sophisticated floor planning with AI integration and job system connectivity
 */

import { 
  ArrowLeft, Ruler, X, BoxSelect, Trash2, ArrowDownUp, 
  ArrowLeftRight, Layers, ShieldAlert, RefreshCcw, 
  Undo2, Redo2, Check, Save, 
  Download, ZoomIn, ZoomOut, Upload
} from 'lucide-react';
import React, { useEffect, useState, useRef, useCallback } from 'react';

import { theme } from '../../lib/theme';
import { InstallationTask } from '../floorplanner/types';

import FloorPlanCanvas from './FloorPlanCanvas';
import { Project, useAiPlanner } from './useAiPlanner';

// Icon imports from SmartQuote components

interface AdvancedPlanningInterfaceProps {
  project: Project;
  onBack: () => void;
  onUpdateProject: (project: Project) => void;
  onGenerateTasks?: (tasks: InstallationTask[]) => void;
  saveStatus: 'idle' | 'saving' | 'saved';
  forceSave: () => void;
}

const SaveStatusIndicator = ({ status }: { status: 'idle' | 'saving' | 'saved' }) => {
  if (status === 'idle') return null;
  
  let content;
  if (status === 'saving') {
    content = <>Saving...</>;
  } else {
    content = <><Check size={14} /> All changes saved</>;
  }

  return (
    <div style={{
      fontSize: 12,
      color: theme.colors.textSubtle,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 8,
      background: theme.colors.panelAlt,
      borderRadius: 6
    }}>
      {content}
    </div>
  );
};

const EditableProjectTitle = ({ title, onRename }: { title: string; onRename: (name: string) => void }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(title);

  const handleSave = () => {
    if (editValue.trim() && editValue !== title) {
      onRename(editValue.trim());
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setEditValue(title);
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <input
        type="text"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        autoFocus
        style={{
          width: '100%',
          padding: '8px 12px',
          borderRadius: 6,
          border: `1px solid ${theme.colors.accent}`,
          background: theme.colors.panelAlt,
          color: theme.colors.text,
          fontSize: 16,
          fontWeight: 600
        }}
      />
    );
  }

  return (
    <h2
      onClick={() => setIsEditing(true)}
      style={{
        margin: 0,
        color: theme.colors.text,
        fontSize: 16,
        fontWeight: 600,
        cursor: 'pointer',
        padding: '8px 12px',
        borderRadius: 6,
        border: `1px solid transparent`,
        transition: 'all 0.2s ease'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = theme.colors.panelAlt;
        e.currentTarget.style.borderColor = theme.colors.border;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent';
        e.currentTarget.style.borderColor = 'transparent';
      }}
      title="Click to rename project"
    >
      {title}
    </h2>
  );
};

const ActionButton = ({ 
  onClick, 
  disabled = false, 
  variant = 'primary',
  children,
  title,
  fullWidth = false
}: {
  onClick: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger' | 'success';
  children: React.ReactNode;
  title?: string;
  fullWidth?: boolean;
}) => {
  const getVariantStyle = () => {
    switch (variant) {
      case 'primary':
        return {
          background: disabled ? theme.colors.textSubtle + '40' : theme.colors.accent,
          color: 'white'
        };
      case 'secondary':
        return {
          background: disabled ? theme.colors.textSubtle + '40' : theme.colors.panelAlt,
          color: disabled ? theme.colors.textSubtle : theme.colors.text,
          border: `1px solid ${disabled ? theme.colors.textSubtle + '40' : theme.colors.border}`
        };
      case 'danger':
        return {
          background: disabled ? theme.colors.textSubtle + '40' : theme.colors.danger,
          color: 'white'
        };
      case 'success':
        return {
          background: disabled ? theme.colors.textSubtle + '40' : theme.colors.accentAlt,
          color: 'white'
        };
      default:
        return {};
    }
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        width: fullWidth ? '100%' : 'auto',
        padding: '8px 16px',
        borderRadius: 6,
        border: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontSize: 14,
        fontWeight: 600,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        transition: 'all 0.2s ease',
        opacity: disabled ? 0.6 : 1,
        ...getVariantStyle()
      }}
    >
      {children}
    </button>
  );
};

export default function AdvancedPlanningInterface({ 
  project: initialProject, 
  onBack, 
  onUpdateProject, 
  onGenerateTasks,
  saveStatus, 
  forceSave 
}: AdvancedPlanningInterfaceProps) {
  
  const {
    project,
    floorPlanUrl,
    unplacedFurnitureSummary,
    placedFurniture,
    furnitureSummary: _furnitureSummary,
    selectedIds,
    isProcessing,
    processingStatus,
    notification,
    aiMessages: _aiMessages,
    isScalingMode,
    scaleLineStart,
    drawnLinePixels: _drawnLinePixels,
    placementMode,
    selectionInfo,
    scaleReferenceBox,
    errorItemIds,
    analysisResults,
    isMarqueeSelectMode,
    contextualMenu: _contextualMenu,
    itemActionMenu: _itemActionMenu,
    placementDimensions,
    manualMeasureLine,
    isMeasuringMode,
    manualMeasureStartPoint,
    canUndo,
    canRedo,
    dismissNotification,
    handleFloorPlanUpload,
    handleProductListUpload,
    updateFurniturePosition,
    commitFurnitureUpdate,
    handleSelection,
    startScaling,
    cancelScaling,
    handleCanvasClickForScaling,
    commitScale: _commitScale,
    startPlacementMode: _startPlacementMode,
    handlePlaceItem,
    stackSelectedItems,
    unstackItems: _unstackItems,
    deleteSelectedFurniture,
    tidySelectedFurniture,
    arrangeOnLargest: _arrangeOnLargest,
    handleCheckLayout,
    clearAnalysisResults,
    toggleMarqueeSelectMode,
    handleMarqueeSelect,
    reStackItems,
    clearContextualMenu: _clearContextualMenu,
    handleItemDoubleClick,
    placeAnother: _placeAnother,
    clearItemActionMenu: _clearItemActionMenu,
    undo,
    redo,
    handleShowPlacementDimensions: _handleShowPlacementDimensions,
    toggleMeasureMode,
    handleCanvasClickForMeasuring,
    renameProject,
  } = useAiPlanner(initialProject, onUpdateProject, onGenerateTasks);

  const [_isDraggingFile, setIsDraggingFile] = useState(false);
  const [_isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [viewTransform, setViewTransform] = useState({ scale: 1, offsetX: 0, offsetY: 0 });
  
  const fileInputRefFloor = useRef<HTMLInputElement>(null);
  const fileInputRefProduct = useRef<HTMLInputElement>(null);

  // File drag and drop handling
  useEffect(() => {
    const handleDragEnter = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.dataTransfer && Array.from(e.dataTransfer.types).includes('Files')) {
        setIsDraggingFile(true);
      }
    };
    window.addEventListener('dragenter', handleDragEnter);
    return () => {
      window.removeEventListener('dragenter', handleDragEnter);
    };
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedIds.length > 0) {
        const activeEl = document.activeElement;
        if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
          return;
        }
        e.preventDefault();
        deleteSelectedFurniture();
      }

      if (e.metaKey || e.ctrlKey) {
        if (e.key === 'z') {
          e.preventDefault();
          if (e.shiftKey) {
            redo();
          } else {
            undo();
          }
        }
        if (e.key === 'y') {
          e.preventDefault();
          redo();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedIds, deleteSelectedFurniture, undo, redo]);

  const handleFileUpload = useCallback((type: 'floor' | 'product') => {
    const input = type === 'floor' ? fileInputRefFloor.current : fileInputRefProduct.current;
    if (input) {
      input.click();
    }
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>, type: 'floor' | 'product') => {
    const file = e.target.files?.[0];
    if (file) {
      if (type === 'floor') {
        handleFloorPlanUpload(file);
      } else {
        handleProductListUpload(file);
      }
    }
    e.target.value = ''; // Reset for next selection
  }, [handleFloorPlanUpload, handleProductListUpload]);

  const unplacedCount = unplacedFurnitureSummary.reduce((sum, { quantity }) => sum + quantity, 0);

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      background: theme.colors.bg,
      color: theme.colors.text
    }}>
      {/* Notification */}
      {notification.key && (
        <div style={{
          position: 'fixed',
          top: 20,
          right: 20,
          zIndex: 1000,
          padding: 16,
          borderRadius: 8,
          background: notification.type === 'error' ? theme.colors.danger : 
                     notification.type === 'success' ? theme.colors.accentAlt : theme.colors.accent,
          color: 'white',
          boxShadow: theme.shadow,
          maxWidth: 400
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{notification.message}</span>
            <button 
              onClick={dismissNotification}
              style={{
                background: 'none',
                border: 'none',
                color: 'white',
                cursor: 'pointer',
                marginLeft: 12,
                padding: 4
              }}
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Left Sidebar Panel */}
      <aside style={{
        width: 320,
        background: theme.colors.panel,
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        overflowY: 'auto',
        borderRight: `1px solid ${theme.colors.border}`,
        boxShadow: theme.shadow
      }}>
        {/* Header Actions */}
        <div style={{ display: 'flex', gap: 8 }}>
          <ActionButton onClick={onBack} variant="secondary" fullWidth>
            <ArrowLeft size={16} />
            Back to Projects
          </ActionButton>
        </div>
        
        <EditableProjectTitle title={project.name} onRename={renameProject} />
        <SaveStatusIndicator status={saveStatus} />

        {/* File Upload Section */}
        <div style={{
          padding: 16,
          background: theme.colors.panelAlt,
          borderRadius: 8,
          border: `1px solid ${theme.colors.border}`
        }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: 14, fontWeight: 600 }}>Setup</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <input 
              type='file' 
              ref={fileInputRefFloor} 
              onChange={(e) => handleFileChange(e, 'floor')}
              accept="image/*,application/pdf" 
              style={{ display: 'none' }}
            />
            <ActionButton 
              onClick={() => handleFileUpload('floor')} 
              disabled={isProcessing}
              variant="primary"
              fullWidth
            >
              <Upload size={16} />
              {isProcessing && processingStatus.includes('plan') ? processingStatus : 'Upload Floor Plan'}
            </ActionButton>

            {isScalingMode ? (
              <ActionButton onClick={cancelScaling} variant="danger" fullWidth>
                <X size={16} />
                Cancel Scaling
              </ActionButton>
            ) : (
              <ActionButton 
                onClick={startScaling} 
                disabled={!floorPlanUrl || isProcessing}
                variant="secondary"
                fullWidth
              >
                <Ruler size={16} />
                {project.scale ? 'Reset Scale' : 'Set Scale'}
              </ActionButton>
            )}

            <input 
              type='file' 
              ref={fileInputRefProduct} 
              onChange={(e) => handleFileChange(e, 'product')}
              accept=".csv,.json,.pdf" 
              style={{ display: 'none' }}
            />
            <ActionButton 
              onClick={() => handleFileUpload('product')} 
              disabled={isProcessing || !project.scale}
              variant="success"
              fullWidth
            >
              <Upload size={16} />
              {isProcessing && !processingStatus.includes('plan') ? processingStatus : 'Import Products'}
            </ActionButton>
          </div>
        </div>

        {/* Tools Section */}
        <div style={{
          padding: 16,
          background: theme.colors.panelAlt,
          borderRadius: 8,
          border: `1px solid ${theme.colors.border}`
        }}>
          <h3 style={{ margin: '0 0 12px 0', fontSize: 14, fontWeight: 600 }}>Tools</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <ActionButton onClick={undo} disabled={!canUndo} variant="secondary" title="Undo (Ctrl+Z)">
                <Undo2 size={16} />
                Undo
              </ActionButton>
              <ActionButton onClick={redo} disabled={!canRedo} variant="secondary" title="Redo (Ctrl+Y)">
                <Redo2 size={16} />
                Redo
              </ActionButton>
            </div>

            <ActionButton 
              onClick={toggleMeasureMode} 
              disabled={!project.scale || isProcessing}
              variant={isMeasuringMode ? 'primary' : 'secondary'}
              fullWidth
            >
              <Ruler size={16} />
              Measure Distance
            </ActionButton>

            <ActionButton 
              onClick={toggleMarqueeSelectMode}
              variant={isMarqueeSelectMode ? 'primary' : 'secondary'}
              fullWidth
            >
              <BoxSelect size={16} />
              Box Select
            </ActionButton>

            <ActionButton 
              onClick={handleCheckLayout} 
              disabled={isProcessing || !project.scale || placedFurniture.length === 0}
              variant="secondary"
              fullWidth
            >
              <ShieldAlert size={16} />
              Check Layout
            </ActionButton>

            {analysisResults !== null && (
              <ActionButton onClick={clearAnalysisResults} variant="secondary" fullWidth>
                <RefreshCcw size={16} />
                Clear Analysis
              </ActionButton>
            )}
          </div>
        </div>

        {/* Selection Actions */}
        {selectionInfo.selection.length > 0 && (
          <div style={{
            padding: 16,
            background: theme.colors.panelAlt,
            borderRadius: 8,
            border: `1px solid ${theme.colors.accent}`
          }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: 14, fontWeight: 600 }}>
              Selected ({selectionInfo.selection.length})
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {selectionInfo.selection.length > 1 && (
                <div style={{ display: 'flex', gap: 8 }}>
                  <ActionButton 
                    onClick={() => tidySelectedFurniture('vertical')} 
                    variant="secondary"
                    title="Align Vertical Center"
                  >
                    <ArrowDownUp size={16} />
                  </ActionButton>
                  <ActionButton 
                    onClick={() => tidySelectedFurniture('horizontal')} 
                    variant="secondary"
                    title="Align Horizontal Center"
                  >
                    <ArrowLeftRight size={16} />
                  </ActionButton>
                  {selectionInfo.canStack && (
                    <ActionButton onClick={stackSelectedItems} variant="secondary" title="Stack Items">
                      <Layers size={16} />
                    </ActionButton>
                  )}
                </div>
              )}
              
              <ActionButton onClick={deleteSelectedFurniture} variant="danger" fullWidth>
                <Trash2 size={16} />
                Delete Selected
              </ActionButton>
            </div>
          </div>
        )}

        {/* Unplaced Furniture */}
        {unplacedCount > 0 && (
          <div style={{
            padding: 16,
            background: theme.colors.panelAlt,
            borderRadius: 8,
            border: `1px solid ${theme.colors.border}`
          }}>
            <h3 style={{ margin: '0 0 12px 0', fontSize: 14, fontWeight: 600 }}>
              Unplaced Items ({unplacedCount})
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 200, overflowY: 'auto' }}>
              {unplacedFurnitureSummary.map(({ item, quantity }) => (
                <div
                  key={item.name}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: 8,
                    background: theme.colors.panel,
                    borderRadius: 6,
                    border: `1px solid ${theme.colors.border}`,
                    cursor: 'pointer'
                  }}
                  onClick={() => {/* Handle item click for placement */}}
                >
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{item.name}</div>
                    <div style={{ fontSize: 12, color: theme.colors.textSubtle }}>
                      {item.width_cm}×{item.depth_cm}cm
                    </div>
                  </div>
                  <div style={{
                    background: theme.colors.accent,
                    color: 'white',
                    padding: '4px 8px',
                    borderRadius: 4,
                    fontSize: 12,
                    fontWeight: 600
                  }}>
                    {quantity}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Project Actions */}
        <div style={{ marginTop: 'auto' }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <ActionButton onClick={forceSave} variant="success" title="Save Project">
              <Save size={16} />
              Save
            </ActionButton>
            <ActionButton onClick={() => setIsExportModalOpen(true)} variant="secondary" title="Export Project">
              <Download size={16} />
              Export
            </ActionButton>
          </div>
        </div>
      </aside>

      {/* Main Canvas Area */}
      <main style={{
        flex: 1,
        position: 'relative',
        overflow: 'hidden',
        background: theme.colors.bg
      }}>
        {/* Canvas placeholder - would need FloorPlanCanvas component */}
        {!floorPlanUrl ? (
          <div style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: `repeating-linear-gradient(
              45deg,
              ${theme.colors.panelAlt}00,
              ${theme.colors.panelAlt}00 10px,
              ${theme.colors.panelAlt}40 10px,
              ${theme.colors.panelAlt}40 20px
            )`
          }}>
            <div style={{
              textAlign: 'center',
              padding: 40,
              background: theme.colors.panel,
              borderRadius: 12,
              border: `2px dashed ${theme.colors.border}`,
              maxWidth: 400
            }}>
              <Upload size={48} />
              <h3 style={{ margin: '0 0 8px 0', color: theme.colors.text }}>Upload Floor Plan</h3>
              <p style={{ margin: 0, color: theme.colors.textSubtle, fontSize: 14 }}>
                Upload an image or PDF of your floor plan to get started
              </p>
            </div>
          </div>
        ) : (
          <FloorPlanCanvas
            imageUrl={floorPlanUrl}
            furniture={placedFurniture}
            onMove={(id, newProps) => {
              updateFurniturePosition(id, newProps.x || 0, newProps.y || 0);
            }}
            onMoveEnd={commitFurnitureUpdate}
            selectedIds={selectedIds}
            onSelect={(id, _isMulti) => handleSelection(id ? [id] : [])}
            isLoading={isProcessing}
            isScalingMode={isScalingMode}
            onCanvasClickForScaling={(point) => handleCanvasClickForScaling(point.x, point.y)}
            scaleLineStart={scaleLineStart}
            scaleReferenceBox={scaleReferenceBox}
            placementMode={placementMode}
            onPlaceItem={handlePlaceItem}
            viewTransform={viewTransform}
            setViewTransform={setViewTransform}
            errorItemIds={errorItemIds}
            placementDimensions={placementDimensions}
            isMarqueeSelectMode={isMarqueeSelectMode}
            onMarqueeSelect={handleMarqueeSelect}
            onStackClick={reStackItems}
            onItemDoubleClick={handleItemDoubleClick}
            isMeasuringMode={isMeasuringMode}
            onCanvasClickForMeasuring={(point) => handleCanvasClickForMeasuring(point.x, point.y)}
            manualMeasureStartPoint={manualMeasureStartPoint}
            manualMeasureLine={manualMeasureLine}
          />
        )}

        {/* Canvas Controls */}
        <div style={{
          position: 'absolute',
          bottom: 20,
          right: 20,
          display: 'flex',
          flexDirection: 'column',
          gap: 8
        }}>
          <ActionButton onClick={() => {/* Zoom in */}} variant="secondary">
            <ZoomIn size={16} />
          </ActionButton>
          <ActionButton onClick={() => {/* Zoom out */}} variant="secondary">
            <ZoomOut size={16} />
          </ActionButton>
          <ActionButton onClick={() => {/* Reset view */}} variant="secondary">
            <RefreshCcw size={16} />
          </ActionButton>
        </div>
      </main>
    </div>
  );
}