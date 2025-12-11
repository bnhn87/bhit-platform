
'use client';


import {
  Check, ArrowLeft, Save, Download, RefreshCw, Loader2, Upload,
  ClipboardList, Sparkles, AlertTriangle, ArrowDownUp, ArrowLeftRight,
  CheckCircle, Layers, Layers2, Ratio, RefreshCcw, Ruler, Scan, ShieldAlert, X,
  Undo2, Redo2, Trash2
} from 'lucide-react';
import React, { useEffect, useState } from 'react';

import { useAiPlanner } from '../hooks/useAiPlanner';
import { Project, RichFurniture, ViewTransform, BaseFurniture as _BaseFurniture } from '../types';

import DraggableFurniture from './DraggableFurniture';
import EditableProjectTitle from './EditableProjectTitle';
import ExportModal from './ExportModal';
import FileUploadOverlay from './FileUploadOverlay';
import FloorPlanCanvas from './FloorPlanCanvas';
import ItemActionsMenu from './ItemActionsMenu';
import Notification from './Notification';
import PlaceQuantityModal from './PlaceQuantityModal';
import ScaleModal from './ScaleModal';
import StackActionsMenu from './StackActionsMenu';
import ViewControls from './ViewControls';

interface PlanningInterfaceProps {
  project: Project;
  onBack: () => void;
  onUpdateProject: (project: Project) => void;
  saveStatus: 'idle' | 'saving' | 'saved';
  forceSave: () => void;
}

const SaveStatusIndicator = ({ status }: { status: 'idle' | 'saving' | 'saved' }) => {
  if (status === 'idle') return null;
  
  let content;
  if (status === 'saving') {
    content = <>Saving...</>;
  } else {
    content = <><Check size={14} className="mr-1" /> All changes saved</>;
  }

  return (
    <div className="text-xs text-gray-400 flex items-center justify-center p-2 bg-gray-800 rounded-lg">
      {content}
    </div>
  );
};


export default function PlanningInterface({ project: initialProject, onBack, onUpdateProject, saveStatus, forceSave }: PlanningInterfaceProps) {
  const {
    project,
    floorPlanUrl,
    unplacedFurnitureSummary,
    placedFurniture,
    furnitureSummary,
    selectedIds,
    isProcessing,
    processingStatus,
    notification,
    aiMessages,
    isScalingMode,
    scaleLineStart,
    drawnLinePixels,
    placementMode,
    selectionInfo,
    scaleReferenceBox,
    errorItemIds,
    analysisResults,
    isMarqueeSelectMode,
    contextualMenu,
    itemActionMenu,
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
    commitScale,
    startPlacementMode,
    handlePlaceItem,
    stackSelectedItems,
    unstackItems,
    deleteSelectedFurniture,
    tidySelectedFurniture,
    arrangeOnLargest,
    handleCheckLayout,
    clearAnalysisResults,
    toggleMarqueeSelectMode,
    handleMarqueeSelect,
    reStackItems,
    clearContextualMenu,
    handleItemDoubleClick,
    placeAnother,
    clearItemActionMenu,
    undo,
    redo,
    handleShowPlacementDimensions,
    toggleMeasureMode,
    handleCanvasClickForMeasuring,
    renameProject,
  } = useAiPlanner(initialProject, onUpdateProject);
  
  const [isPlaceQuantityModalOpen, setPlaceQuantityModalOpen] = useState(false);
  const [itemToPlace, setItemToPlace] = useState<{item: RichFurniture, maxQuantity: number} | null>(null);
  const [viewTransform, setViewTransform] = useState<ViewTransform>({ scale: 1, offsetX: 0, offsetY: 0 });
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);


  const isLoading = isProcessing && processingStatus.includes('plan');

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

  const handleSidebarItemClick = (item: RichFurniture, quantity: number) => {
      setItemToPlace({ item, maxQuantity: quantity });
      setPlaceQuantityModalOpen(true);
  };
  
  const handleStartPlacement = (quantity: number) => {
      if (itemToPlace) {
          startPlacementMode(itemToPlace.item, quantity);
      }
      setPlaceQuantityModalOpen(false);
      setItemToPlace(null);
  };

  const fileInputRefFloor = React.useRef<HTMLInputElement>(null);
  const fileInputRefProduct = React.useRef<HTMLInputElement>(null);

  const handleOpenFilePicker = async (acceptTypes: { [key: string]: string[] }) => {
    if ('showOpenFilePicker' in window) {
      try {
        const [fileHandle] = await window.showOpenFilePicker({
            types: [{ description: 'Files', accept: acceptTypes }],
            multiple: false
        });
        return await fileHandle.getFile();
      } catch {
        // User cancelled picker, do nothing.
        return null;
      }
    } else {
      // Fallback for older browsers
      const inputRef = Object.keys(acceptTypes).some(type => type.startsWith('image/'))
        ? fileInputRefFloor
        : fileInputRefProduct;
      
      return new Promise<File | null>((resolve) => {
          const changeListener = (event: Event) => {
              const target = event.target as HTMLInputElement;
              resolve(target.files ? target.files[0] : null);
              target.value = ''; // Reset for next selection
              inputRef.current?.removeEventListener('change', changeListener);
          };
          inputRef.current?.addEventListener('change', changeListener, { once: true });
          inputRef.current?.click();
      });
    }
  };
  
  const handleFloorPlanClick = async () => {
    const file = await handleOpenFilePicker({ 'image/*': ['.png', '.jpg', '.jpeg', '.webp'], 'application/pdf': ['.pdf'] });
    if (file) handleFloorPlanUpload(file);
  };
  
  const handleProductListClick = async () => {
    const file = await handleOpenFilePicker({ 'text/csv': ['.csv'], 'application/json': ['.json'], 'application/pdf': ['.pdf'] });
    if (file) handleProductListUpload(file);
  };


  const unplacedCount = unplacedFurnitureSummary.reduce((sum, { quantity }) => sum + quantity, 0);

  return (
    <div className="flex h-full bg-gray-800">
      {isDraggingFile && (
        <FileUploadOverlay
          onDragLeave={() => setIsDraggingFile(false)}
          onDropFloorPlan={(file) => {
            handleFloorPlanUpload(file);
            setIsDraggingFile(false);
          }}
          onDropProductList={(file) => {
            handleProductListUpload(file);
            setIsDraggingFile(false);
          }}
          isProductListDisabled={!project.scale}
        />
      )}

      {notification.key && (
          <Notification
              notification={{
                  message: notification.message,
                  type: notification.type,
                  key: notification.key
              }}
              onDismiss={dismissNotification}
          />
      )}
      
      <ScaleModal
        isOpen={drawnLinePixels !== null}
        onClose={() => commitScale(0)}
        onSubmit={commitScale}
        pixelLength={drawnLinePixels || 0}
      />
      
      {itemToPlace && (
          <PlaceQuantityModal
            isOpen={isPlaceQuantityModalOpen}
            onClose={() => setPlaceQuantityModalOpen(false)}
            onSubmit={handleStartPlacement}
            itemName={itemToPlace.item.name}
            maxQuantity={itemToPlace.maxQuantity}
          />
      )}
      
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        project={project}
      />


      {contextualMenu && (
        <StackActionsMenu
          x={contextualMenu.x}
          y={contextualMenu.y}
          onDelete={deleteSelectedFurniture}
          onRestack={reStackItems}
          onClose={clearContextualMenu}
        />
      )}

      {itemActionMenu && (
        <ItemActionsMenu
          x={itemActionMenu.x}
          y={itemActionMenu.y}
          isStack={itemActionMenu.isStack}
          onPlaceAnother={placeAnother}
          onUnstack={itemActionMenu.isStack && itemActionMenu.item.stackId ? () => unstackItems(itemActionMenu.item.stackId!, {x: itemActionMenu.x, y: itemActionMenu.y}) : undefined}
          onClose={clearItemActionMenu}
        />
      )}


      {/* Left Panel */}
      <aside className="w-80 bg-gray-900 p-4 flex flex-col space-y-4 overflow-y-auto shadow-lg z-10 border-r border-gray-700">
        <div className="flex gap-2">
            <button onClick={onBack} className="flex-grow p-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm flex items-center gap-2 transition-colors justify-center">
              <ArrowLeft size={16} />
              <span>Back to Projects</span>
            </button>
        </div>
        
        <EditableProjectTitle title={project.name} onRename={renameProject} />
        <SaveStatusIndicator status={saveStatus} />


        <div className="space-y-2 border-t border-b border-gray-700 py-4">
            <input type='file' className="hidden" ref={fileInputRefFloor} disabled={isProcessing} accept="image/*,application/pdf" />
            <button onClick={handleFloorPlanClick} disabled={isProcessing} className="w-full text-white font-bold py-2 px-4 rounded-lg inline-flex items-center justify-center transition-colors bg-blue-600 hover:bg-blue-700 disabled:bg-gray-500 disabled:cursor-wait">
              <Upload className="w-4 h-4 mr-2" />
              <span>{isLoading ? processingStatus : 'Upload Floor Plan'}</span>
            </button>

            {isScalingMode ? (
                <button onClick={cancelScaling} className="w-full text-white font-bold py-2 px-4 rounded-lg inline-flex items-center justify-center transition-colors bg-red-600 hover:bg-red-700">
                  <X className="w-4 h-4 mr-2" />
                  <span>Cancel Scaling</span>
                </button>
            ) : (
                <button onClick={startScaling} disabled={!floorPlanUrl || isProcessing} className="w-full text-white font-bold py-2 px-4 rounded-lg inline-flex items-center justify-center transition-colors bg-purple-600 hover:bg-purple-700 disabled:bg-gray-500 disabled:cursor-not-allowed">
                  <Ruler className="w-4 h-4 mr-2" />
                  <span>{project.scale ? 'Reset Scale' : 'Set Scale'}</span>
                </button>
            )}

            <input type='file' className="hidden" ref={fileInputRefProduct} disabled={isProcessing} accept=".csv,.json,.pdf" />
            <button onClick={handleProductListClick} disabled={isProcessing || !project.scale} className="w-full text-white font-bold py-2 px-4 rounded-lg inline-flex items-center justify-center transition-colors bg-green-600 hover:bg-green-700 disabled:bg-gray-500 disabled:cursor-not-allowed">
              <Upload className="w-4 h-4 mr-2" />
              <span>{isProcessing && !isLoading ? processingStatus : 'Import Products'}</span>
            </button>
            
            <button onClick={handleShowPlacementDimensions} disabled={isProcessing || !((selectionInfo.selection.length === 1 && !selectionInfo.isStack) || selectionInfo.isSingleStackSelected)} className="w-full text-white font-bold py-2 px-4 rounded-lg inline-flex items-center justify-center transition-colors bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-500 disabled:cursor-not-allowed">
                <Ratio className="w-4 h-4 mr-2" />
                <span>Show Placement Dimensions</span>
            </button>

            <button onClick={handleCheckLayout} disabled={isProcessing || !project.scale || placedFurniture.length === 0} className="w-full text-white font-bold py-2 px-4 rounded-lg inline-flex items-center justify-center transition-colors bg-amber-600 hover:bg-amber-700 disabled:bg-gray-500 disabled:cursor-not-allowed">
              <ShieldAlert className="w-4 h-4 mr-2" />
              <span>Check Layout</span>
            </button>
            {analysisResults !== null && (
              <button onClick={clearAnalysisResults} className="w-full text-white font-bold py-2 px-4 rounded-lg inline-flex items-center justify-center transition-colors bg-gray-600 hover:bg-gray-500">
                <RefreshCcw className="w-4 h-4 mr-2" />
                <span>Clear Analysis</span>
              </button>
            )}
        </div>
        
        {/* Item Actions */}
        <div className="space-y-2">
            <div className="p-3 bg-gray-800 rounded-lg space-y-2">
                <h4 className="text-xs font-bold text-gray-400 mb-1 px-1">ACTIONS</h4>
                
                <div className="flex gap-2">
                    <button onClick={forceSave} className="flex-1 text-white font-bold py-2 px-2 rounded-lg inline-flex items-center justify-center transition-colors bg-green-700 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed" title="Save Project">
                      <Save className="w-4 h-4 mr-1.5" />
                      Save
                    </button>
                    <button onClick={() => setIsExportModalOpen(true)} className="flex-1 text-white font-bold py-2 px-2 rounded-lg inline-flex items-center justify-center transition-colors bg-gray-700 hover:bg-gray-600" title="Export Project">
                        <Download className="w-4 h-4 mr-1.5" />
                        Export
                    </button>
                </div>
                <div className="flex gap-2">
                    <button onClick={undo} disabled={!canUndo} className="flex-1 text-white font-bold py-2 px-2 rounded-lg inline-flex items-center justify-center transition-colors bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed" title="Undo (Ctrl+Z)">
                      <Undo2 className="w-4 h-4 mr-1.5" />
                      Undo
                    </button>
                    <button onClick={redo} disabled={!canRedo} className="flex-1 text-white font-bold py-2 px-2 rounded-lg inline-flex items-center justify-center transition-colors bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed" title="Redo (Ctrl+Y)">
                       <Redo2 className="w-4 h-4 mr-1.5" />
                       Redo
                    </button>
                </div>

                <button 
                  onClick={toggleMeasureMode} 
                  disabled={!project.scale || isProcessing}
                  className={`w-full font-bold py-2 px-4 rounded-lg inline-flex items-center justify-center transition-colors disabled:bg-gray-500 disabled:cursor-not-allowed ${isMeasuringMode ? 'bg-cyan-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>
                    <Ruler className="w-4 h-4 mr-2" />
                    <span>Measure Distance</span>
                </button>

                <button onClick={toggleMarqueeSelectMode} className={`w-full font-bold py-2 px-4 rounded-lg inline-flex items-center justify-center transition-colors ${isMarqueeSelectMode ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>
                    <Scan className="w-4 h-4 mr-2" />
                    <span>Box Select</span>
                </button>
                {selectionInfo.selection.length > 1 && (
                     <div className="space-y-2 pt-2 border-t border-gray-700/50">
                        <div className="flex gap-2">
                            <button onClick={() => tidySelectedFurniture('vertical-center')} className="flex-1 text-white font-bold py-2 px-2 rounded-lg inline-flex items-center justify-center transition-colors bg-sky-600 hover:bg-sky-700 text-xs" title="Align Vertical Center">
                              <ArrowDownUp className="w-4 h-4 mr-1.5" />
                              Vert
                            </button>
                            <button onClick={() => tidySelectedFurniture('horizontal-center')} className="flex-1 text-white font-bold py-2 px-2 rounded-lg inline-flex items-center justify-center transition-colors bg-sky-600 hover:bg-sky-700 text-xs" title="Align Horizontal Center">
                               <ArrowLeftRight className="w-4 h-4 mr-1.5" />
                               Horiz
                            </button>
                        </div>
                        <button onClick={arrangeOnLargest} className="w-full text-white font-bold py-2 px-2 rounded-lg inline-flex items-center justify-center transition-colors bg-sky-600 hover:bg-sky-700 text-xs" title="Arrange smaller items on the largest item">
                          <Layers className="w-4 h-4 mr-1.5" />
                          Arrange on Largest
                        </button>
                    </div>
                )}
                {selectionInfo.canStack && (
                    <button onClick={stackSelectedItems} className="w-full text-white font-bold py-2 px-4 rounded-lg inline-flex items-center justify-center transition-colors bg-teal-600 hover:bg-teal-700">
                      <Layers2 className="w-4 h-4 mr-2" />
                      <span>Combine {selectedIds.length} Items</span>
                    </button>
                )}
                {selectedIds.length > 0 && (
                    <button onClick={deleteSelectedFurniture} className="w-full text-white font-bold py-2 px-4 rounded-lg inline-flex items-center justify-center transition-colors bg-red-600 hover:bg-red-700">
                        <Trash2 className="w-4 h-4 mr-2" />
                        <span>Delete {selectedIds.length} Item(s)</span>
                    </button>
                )}
            </div>
        </div>

        {furnitureSummary.length > 0 && (
          <div className="flex-shrink-0 pt-4 border-t border-gray-700">
            <h3 className="font-bold mb-2 text-lg flex items-center gap-2"><ClipboardList size={20} /> Placed Summary</h3>
            <div className="space-y-1.5 text-sm">
              {furnitureSummary.map(item => (
                <div key={item.name} className="p-2 bg-gray-800 rounded-md flex items-center gap-2.5">
                  <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{backgroundColor: item.color || '#4a5568'}}></div>
                  <span className="flex-grow truncate select-none text-gray-300">{item.name}</span>
                  <span className="font-mono text-white bg-gray-700 px-2 py-0.5 rounded-md">
                    {item.placed}
                    {item.unplaced > 0 && <span className="text-gray-400 ml-1">({item.unplaced})</span>}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex-grow pt-4 border-t border-gray-700">
          <h3 className="font-bold mb-2 text-lg">Unplaced Items ({unplacedCount})</h3>
          <div className="space-y-2">
            {unplacedFurnitureSummary.length > 0 ? (
              unplacedFurnitureSummary.map(({ item, quantity }) => (
                <DraggableFurniture
                  key={item.name}
                  item={{ ...item, quantity }}
                  isSidebar={true}
                  onSidebarItemClick={() => handleSidebarItemClick(item, quantity)}
                />
              ))
            ) : project.furniture.length > 0 ? (
              <p className="text-gray-400 text-sm p-2">All items have been placed!</p>
            ) : (
              <p className="text-gray-400 text-sm p-2">Import a product list to begin.</p>
            )}
          </div>
        </div>
      </aside>

      {/* Center Panel */}
      <main className="flex-1 bg-gray-800 p-4 flex items-center justify-center overflow-hidden relative">
        <FloorPlanCanvas
          imageUrl={floorPlanUrl}
          furniture={placedFurniture}
          onMove={updateFurniturePosition}
          onMoveEnd={commitFurnitureUpdate}
          selectedIds={selectedIds}
          onSelect={handleSelection}
          isLoading={isLoading}
          isScalingMode={isScalingMode}
          onCanvasClickForScaling={handleCanvasClickForScaling}
          scaleLineStart={scaleLineStart}
          scaleReferenceBox={scaleReferenceBox}
          placementMode={placementMode}
          onPlaceItem={handlePlaceItem}
          viewTransform={viewTransform}
          setViewTransform={setViewTransform}
          errorItemIds={Array.from(errorItemIds)}
          placementDimensions={placementDimensions}
          isMarqueeSelectMode={isMarqueeSelectMode}
          onMarqueeSelect={handleMarqueeSelect}
          onStackClick={unstackItems}
          onItemDoubleClick={handleItemDoubleClick}
          isMeasuringMode={isMeasuringMode}
          onCanvasClickForMeasuring={handleCanvasClickForMeasuring}
          manualMeasureStartPoint={manualMeasureStartPoint}
          manualMeasureLine={manualMeasureLine}
        />
        {floorPlanUrl && !isLoading && <ViewControls viewTransform={viewTransform} setViewTransform={setViewTransform} />}
      </main>

      {/* Right Panel */}
      <aside className="w-80 bg-gray-900 p-4 overflow-y-auto border-l border-gray-700">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="text-yellow-400" />
          <h3 className="font-bold text-lg">AI Assistant</h3>
        </div>
        <div className="space-y-3">
          {aiMessages.map((msg, i) => (
            <div key={i} className={`p-3 rounded-lg flex items-start gap-3 text-sm animate-fade-in ${
              msg.type === 'warning' ? 'bg-yellow-900/50 text-yellow-300 border border-yellow-700/50' :
              msg.type === 'success' ? 'bg-green-900/50 text-green-300 border border-green-700/50' : 'bg-blue-900/50 text-blue-300 border border-blue-700/50'
            }`}>
              {msg.type === 'warning' && <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0" />}
              {msg.type === 'success' && <CheckCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />}
              {msg.type === 'info' && <Sparkles className="w-5 h-5 mt-0.5 flex-shrink-0" />}
              <p>{msg.text}</p>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}