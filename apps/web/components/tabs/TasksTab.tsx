/**
 * TaskGenerationTab - Generates and manages tasks based on floor plans
 * Follows the same pattern as SmartQuote's product parsing with floor-based grouping
 */

import React, { useState, useEffect, useCallback } from "react";

import { documentSelectionService, type DocumentSelection } from "@/lib/documentSelection";
import { type GeneratedTaskData as _GeneratedTaskData } from "@/lib/pdfTaskGeneration";
import { supabase } from "@/lib/supabaseClient";
import { theme } from "@/lib/theme";

// Types for our task generation system
type GeneratedTask = {
  id: string;
  job_id: string;
  title: string;
  description: string | null;
  install_order: number;
  sort_order?: number;
  room_zone: string | null;
  furniture_ids: string[];
  estimated_time_minutes: number | null;
  dependencies: string[];
  is_generated: boolean;
  is_done?: boolean;
  created_at: string;
  updated_at: string;
  // Progress tracking fields
  status: 'Uplift' | 'Placed' | 'Built' | 'Incomplete' | 'Missing';
  completed_qty: number;
  total_qty: number;
  missing_notes: string | null;
  // New granular tracking
  uplifted_qty?: number;
  placed_qty?: number;
  built_qty?: number;
  missing_qty?: number;
  damaged_qty?: number;
  damage_notes?: string | null;
};

type FloorPlan = {
  id: string;
  job_id: string;
  name: string;
  created_at: string;
  updated_at: string;
  floor_plan_url: string | null;
  furniture: unknown[];
  scale: number | null;
  floor_plan_width: number | null;
  floor_plan_height: number | null;
};

type TaskGroup = {
  floor: string;
  tasks: GeneratedTask[];
  completionPercentage: number;
};

const TasksTab: React.FC<{ jobId: string }> = ({ jobId }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [_floorPlans, setFloorPlans] = useState<FloorPlan[]>([]);
  const [generatedTasks, setGeneratedTasks] = useState<GeneratedTask[]>([]);
  const [groupedTasks, setGroupedTasks] = useState<TaskGroup[]>([]);
  const [missingNotes, setMissingNotes] = useState<Record<string, string>>({});
  const [missingQty, setMissingQty] = useState<Record<string, number>>({});
  const [showMissingModal, setShowMissingModal] = useState<string | null>(null);
  const [damageNotes, setDamageNotes] = useState<Record<string, string>>({});
  const [damageQty, setDamageQty] = useState<Record<string, number>>({});
  const [showDamageModal, setShowDamageModal] = useState<string | null>(null);
  const [schemaError, setSchemaError] = useState<boolean>(false);
  const [dbError, setDbError] = useState<string | null>(null);
  const [missingTables, setMissingTables] = useState<string[]>([]);
  const [selectedDocuments, setSelectedDocuments] = useState<DocumentSelection[]>([]);

  // Local granular quantities (until schema cache resolves)
  const [localGranularQty, setLocalGranularQty] = useState<Record<string, {
    uplifted_qty: number;
    placed_qty: number;
    built_qty: number;
  }>>({});

  // Manual task creation state
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDescription, setNewTaskDescription] = useState("");
  const [newTaskQty, setNewTaskQty] = useState(1);
  const [manualTasks, setManualTasks] = useState<GeneratedTask[]>([]);

  // Undo functionality state
  const [undoAction, setUndoAction] = useState<{
    taskId: string;
    type: 'quantity' | 'status';
    previousValue: number | 'Uplift' | 'Placed' | 'Built' | 'Incomplete' | 'Missing';
    newValue: number | 'Uplift' | 'Placed' | 'Built' | 'Incomplete' | 'Missing';
    taskTitle: string;
    timestamp: number;
  } | null>(null);
  const [showUndoToast, setShowUndoToast] = useState(false);

  // Auto-hide undo toast after 5 seconds
  useEffect(() => {
    if (showUndoToast && undoAction) {
      const timer = setTimeout(() => {
        setShowUndoToast(false);
        setUndoAction(null);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [showUndoToast, undoAction]);

  // Create undo action helper
  const createUndoAction = (taskId: string, type: 'quantity' | 'status', previousValue: number | GeneratedTask['status'], newValue: number | GeneratedTask['status']) => {
    const task = generatedTasks.find(t => t.id === taskId);
    if (!task) return;
    
    setUndoAction({
      taskId,
      type,
      previousValue,
      newValue,
      taskTitle: task.title,
      timestamp: Date.now()
    });
    setShowUndoToast(true);
  };

  // Execute undo action
  const executeUndo = async () => {
    if (!undoAction) return;
    
    try {
      if (undoAction.type === 'quantity' && typeof undoAction.previousValue === 'number') {
        await updateCompletedQty(undoAction.taskId, undoAction.previousValue, true);
      } else if (undoAction.type === 'status' && typeof undoAction.previousValue === 'string') {
        await updateTaskStatus(undoAction.taskId, undoAction.previousValue as GeneratedTask['status'], true);
      }
    } catch (err) {
      console.error('Undo failed:', err);
    } finally {
      setUndoAction(null);
      setShowUndoToast(false);
    }
  };

  // Clean task titles by removing 'Install' and other action words
  const cleanTaskTitle = (title: string) => {
    return title
      .replace(/^Install\s+\d+x?\s*/i, '')  // "Install 13x " or "Install 13 "
      .replace(/^Install\s+/i, '')          // "Install "
      .replace(/^Set up\s+\d+x?\s*/i, '')   // "Set up 13x "
      .replace(/^Set up\s+/i, '')           // "Set up "
      .replace(/^Place\s+\d+x?\s*/i, '')    // "Place 13x "
      .replace(/^Place\s+/i, '')            // "Place "
      .replace(/^Position\s+\d+x?\s*/i, '') // "Position 13x "
      .replace(/^Position\s+/i, '')         // "Position "
      .replace(/^Mount\s+\d+x?\s*/i, '')    // "Mount 13x "
      .replace(/^Mount\s+/i, '')            // "Mount "
      .trim();
  };

  // Helper functions for granular quantities
  const getTaskGranularQty = (taskId: string, field: 'uplifted_qty' | 'placed_qty' | 'built_qty') => {
    return localGranularQty[taskId]?.[field] || 0;
  };

  const updateTaskGranularQty = async (taskId: string, field: 'uplifted_qty' | 'placed_qty' | 'built_qty', newValue: number) => {
    const task = generatedTasks.find(t => t.id === taskId);
    if (!task) return;

    // Update local granular state
    setLocalGranularQty(prev => ({
      ...prev,
      [taskId]: {
        uplifted_qty: prev[taskId]?.uplifted_qty || 0,
        placed_qty: prev[taskId]?.placed_qty || 0,
        built_qty: prev[taskId]?.built_qty || 0,
        [field]: Math.max(0, Math.min(newValue, task.total_qty))
      }
    }));

    // Calculate new completed_qty as the maximum of the three stages
    const currentLocal = localGranularQty[taskId] || { uplifted_qty: 0, placed_qty: 0, built_qty: 0 };
    const updatedLocal = { ...currentLocal, [field]: Math.max(0, Math.min(newValue, task.total_qty)) };
    const newCompletedQty = Math.max(updatedLocal.uplifted_qty, updatedLocal.placed_qty, updatedLocal.built_qty);

    // Update the database with the new completed_qty
    await updateCompletedQty(taskId, newCompletedQty);
  };

  // Load selected documents for task generation
  const refreshSelectedDocuments = useCallback(() => {
    const selections = documentSelectionService.getSelectionsForModule(jobId, 'taskGeneration');
    setSelectedDocuments(selections);
  }, [jobId]);
  
  useEffect(() => {
    refreshSelectedDocuments();
  }, [jobId, refreshSelectedDocuments]);

  // Refresh selected documents when tab becomes visible
  useEffect(() => {
    const handleFocus = () => {
      refreshSelectedDocuments();
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key && e.key.startsWith('job_document_selections_')) {
        refreshSelectedDocuments();
      }
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [jobId, refreshSelectedDocuments]);

  // Load floor plans and generated tasks
  useEffect(() => {
    const loadData = async () => {
      try {
        // console.log(`🚀 TaskGenerationTab loading data for job: ${jobId}`);
        setLoading(true);
        setError(null);
        setSchemaError(false);
        setDbError(null);
        setMissingTables([]);

        // Floor plans are optional - don't fail if table doesn't exist
        let floorPlansData: FloorPlan[] = [];
        let _floorPlansError = false;
        
        try {
          const { data, error } = await supabase
            .from("job_floorplans")
            .select("*")
            .eq("job_id", jobId);
            
          if (!error) {
            floorPlansData = (data as FloorPlan[]) || [];
            // console.log(`✅ Loaded ${floorPlansData.length} floor plans`);
          } else {
            // console.log("Floor plans not available:", error.message);
            // Floor plans are optional, so don't treat this as an error
            _floorPlansError = false; // Don't fail for floor plans
          }
        } catch {
          // console.log("Floor plans table not available - this is optional");
          // Floor plans are optional, so don't treat this as an error
          _floorPlansError = false; // Don't fail for floor plans
        }

        // Load generated tasks using API endpoint
        let tasksData: GeneratedTask[] = [];
        let tasksError = false;
        
        try {
          // console.log(`🔍 Fetching generated tasks for job: ${jobId}`);
          const response = await fetch(`/api/jobs/${jobId}/generated-tasks`);
          // console.log(`📡 API response status: ${response.status}`);
          
          if (response.ok) {
            const result = await response.json();
            tasksData = result.data || [];
            // console.log(`✅ Loaded ${tasksData.length} generated tasks:`, tasksData);
          } else {
            const errorResult = await response.json();
            console.error("❌ Generated tasks API error:", errorResult.error);
            setDbError(prev => prev ? `${prev}; Tasks: ${errorResult.error}` : `Tasks: ${errorResult.error}`);
            
            // Check if the error indicates missing table
            if (errorResult.error && 
                (errorResult.error.includes("generated_tasks") || 
                 errorResult.error.includes("not found") || 
                 errorResult.error.includes("relation") || 
                 errorResult.error.includes("does not exist") ||
                 errorResult.error.includes("42P01"))) {
              tasksError = true;
              setMissingTables(prev => [...prev, "generated_tasks"]);
            } else {
              throw new Error(errorResult.error);
            }
          }
        } catch (err: unknown) {
          console.error("❌ Generated tasks fetch failed:", err);
          const errMessage = err instanceof Error ? err.message : String(err);
          setDbError(prev => prev ? `${prev}; Tasks: ${errMessage}` : `Tasks: ${errMessage}`);
          tasksError = true;
          setMissingTables(prev => [...prev, "generated_tasks"]);
        }

        // Only set schema error if tasks table is missing (floor plans are optional)
        if (tasksError) {
          setSchemaError(true);
        }

        // Load manual tasks from legacy tasks table
        let manualTasksData: GeneratedTask[] = [];
        try {
          // console.log(`🔍 Loading manual tasks for job: ${jobId}`);
          const { data: legacyTasks, error: legacyError } = await supabase
            .from("tasks")
            .select("*")
            .eq("job_id", jobId)
            .order("sort_order", { ascending: true, nullsFirst: true });
          
          if (!legacyError && legacyTasks) {
            manualTasksData = legacyTasks.map((task: unknown) => {
              const taskObj = task as Record<string, unknown>;
              return {
                ...taskObj,
                is_done: taskObj.is_done || false,
                sort_order: taskObj.sort_order || 0
              } as GeneratedTask;
            });
            // console.log(`✅ Loaded ${manualTasksData.length} manual tasks:`, manualTasksData);
          } else if (legacyError) {
            // console.log(`🔍 Manual tasks query error:`, legacyError);
          }
        } catch {
          // console.log("Manual tasks table not available:");
        }

        setFloorPlans(floorPlansData);
        setGeneratedTasks(tasksData);
        setManualTasks(manualTasksData);
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    if (jobId) {
      loadData();
    }
  }, [jobId]);

  // Group tasks by floor and calculate completion
  useEffect(() => {
    if (generatedTasks.length === 0) {
      setGroupedTasks([]);
      return;
    }

    // Group tasks by room_zone (floor)
    const groups: Record<string, GeneratedTask[]> = {};
    generatedTasks.forEach(task => {
      // If we don't have floor plans, group by room_zone, otherwise use a default
      const floor = task.room_zone || "Unassigned";
      if (!groups[floor]) {
        groups[floor] = [];
      }
      groups[floor].push(task);
    });

    // Convert to array and calculate completion percentages
    const grouped: TaskGroup[] = Object.keys(groups).map(floor => {
      const tasks = groups[floor];
      const totalTasks = tasks.length;
      const completedTasks = tasks.filter(task => 
        task.status === 'Built' || task.status === 'Missing'
      ).length;
      
      const completionPercentage = totalTasks > 0 
        ? Math.round((completedTasks / totalTasks) * 100) 
        : 0;

      return {
        floor,
        tasks,
        completionPercentage
      };
    });

    // Sort by floor name
    grouped.sort((a, b) => a.floor.localeCompare(b.floor));

    setGroupedTasks(grouped);
  }, [generatedTasks]);

  // Generate tasks from selected documents
  const generateTasks = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get latest document selections directly from localStorage
      const currentSelections = documentSelectionService.getSelectionsForModule(jobId, 'taskGeneration');
      setSelectedDocuments(currentSelections); // Update state for UI
      
      // Check if we already have tasks to avoid duplication
      const clearExisting = generatedTasks.length > 0;
      if (clearExisting) {
        if (!window.confirm("This will regenerate all tasks and remove existing ones. Continue?")) {
          setLoading(false);
          return;
        }
      }

      // Prepare document IDs from current selections
      const documentIds = currentSelections.map(sel => sel.documentId);
      
      // console.log(`Calling task generation API with ${documentIds.length} documents...`);
      
      // Call the API endpoint to generate tasks (bypasses RLS issues)
      const response = await fetch('/api/generate-tasks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jobId,
          documentIds,
          clearExisting
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const _result = await response.json();
      // console.log(`Successfully generated ${result.tasksGenerated} tasks`);

      // Reload tasks from database using API endpoint to handle RLS
      const reloadResponse = await fetch(`/api/jobs/${jobId}/generated-tasks`);
      if (!reloadResponse.ok) {
        throw new Error('Failed to reload tasks');
      }
      
      const reloadResult = await reloadResponse.json();
      setGeneratedTasks(reloadResult.data || []);
    } catch (err: unknown) {
      console.error('Task generation error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Clear selected documents
  const clearSelectedDocuments = () => {
    documentSelectionService.clearModuleSelections(jobId, 'taskGeneration');
    setSelectedDocuments([]);
  };

  // Add manual task
  const addManualTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    setError(null);

    // Compute next sort_order
    const nextOrder = Math.max(
      ...manualTasks.map(t => t.sort_order || 0),
      ...generatedTasks.map(t => t.install_order || 0),
      0
    ) + 1;

    try {
      const { error } = await supabase
        .from("tasks")
        .insert({ 
          job_id: jobId, 
          title: newTaskTitle.trim(), 
          description: newTaskDescription.trim() || null,
          sort_order: nextOrder, 
          is_done: false,
          total_qty: newTaskQty
        });

      if (error) {
        setError(error.message);
        return;
      }
      
      // Reset form and close modal
      setNewTaskTitle("");
      setNewTaskDescription("");
      setNewTaskQty(1);
      setShowAddTaskModal(false);
      
      // Reload manual tasks
      const { data: legacyTasks } = await supabase
        .from("tasks")
        .select("*")
        .eq("job_id", jobId)
        .order("sort_order", { ascending: true, nullsFirst: true });
      
      if (legacyTasks) {
        setManualTasks(legacyTasks.map((task: unknown) => {
          const taskObj = task as Record<string, unknown>;
          return {
            ...taskObj,
            is_done: taskObj.is_done || false,
            sort_order: taskObj.sort_order || 0
          } as GeneratedTask;
        }));
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
    }
  };

  // Toggle manual task completion
  const toggleManualTask = async (taskId: string, currentDone: boolean) => {
    try {
      const { error } = await supabase
        .from("tasks")
        .update({ is_done: !currentDone })
        .eq("id", taskId);
        
      if (error) {
        setError(error.message);
        return;
      }
      
      setManualTasks(prev => prev.map(t => 
        t.id === taskId ? { ...t, is_done: !currentDone } : t
      ));
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
    }
  };

  // Delete manual task
  const deleteManualTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;
    
    try {
      const { error } = await supabase
        .from("tasks")
        .delete()
        .eq("id", taskId);
        
      if (error) {
        setError(error.message);
        return;
      }
      
      setManualTasks(prev => prev.filter(t => t.id !== taskId));
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
    }
  };

  // Update task status
  const updateTaskStatus = async (taskId: string, status: GeneratedTask['status'], isUndo: boolean = false) => {
    try {
      const task = generatedTasks.find(t => t.id === taskId);
      if (!task) return;

      const previousStatus = task.status;

      const response = await fetch(`/api/generated-tasks/${taskId}/update`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update task status');
      }

      // Update local state
      setGeneratedTasks(prev => 
        prev.map(task => 
          task.id === taskId ? { ...task, status } : task
        )
      );

      // Create undo action if not already undoing
      if (!isUndo) {
        createUndoAction(taskId, 'status', previousStatus, status);
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
    }
  };

  // Update completed quantity
  const updateCompletedQty = async (taskId: string, qty: number, isUndo: boolean = false) => {
    try {
      const task = generatedTasks.find(t => t.id === taskId);
      if (!task) return;

      const previousQty = task.completed_qty;
      const newQty = Math.max(0, Math.min(qty, task.total_qty));

      const response = await fetch(`/api/generated-tasks/${taskId}/update`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ completed_qty: newQty })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update quantity');
      }

      // Update local state
      setGeneratedTasks(prev => 
        prev.map(t => 
          t.id === taskId ? { ...t, completed_qty: newQty } : t
        )
      );

      // Create undo action if not already undoing
      if (!isUndo) {
        createUndoAction(taskId, 'quantity', previousQty, newQty);
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
    }
  };

  // Update granular quantities (uplifted, placed, built)
  const updateGranularQty = async (taskId: string, field: 'uplifted_qty' | 'placed_qty' | 'built_qty', increment: number, isUndo: boolean = false) => {
    try {
      const task = generatedTasks.find(t => t.id === taskId);
      if (!task) return;

      const currentValue = task[field] || 0;
      const previousValue = currentValue;
      const newValue = Math.max(0, Math.min(currentValue + increment, task.total_qty));

      const response = await fetch(`/api/generated-tasks/${taskId}/update`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ [field]: newValue })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to update ${field}`);
      }

      // Update local state
      setGeneratedTasks(prev => 
        prev.map(t => 
          t.id === taskId ? { ...t, [field]: newValue } : t
        )
      );

      // Create undo action if not already undoing
      if (!isUndo) {
        createUndoAction(taskId, 'quantity', previousValue, newValue);
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
    }
  };

  // Complete full quantity for a specific action (Uplifted, Placed, Built)
  const completeAction = async (taskId: string, action: 'uplifted' | 'placed' | 'built') => {
    const task = generatedTasks.find(t => t.id === taskId);
    if (!task) return;

    const field = `${action}_qty` as 'uplifted_qty' | 'placed_qty' | 'built_qty';
    const currentValue = task[field] || 0;
    const totalQty = task.total_qty;

    await updateGranularQty(taskId, field, totalQty - currentValue);
  };

  // Uplift all tasks (set all uplifted_qty to total_qty)
  const _upliftAll = async () => {
    if (!confirm('Are you sure you want to uplift all tasks? This will mark all items as uplifted.')) {
      return;
    }

    try {
      const updates = generatedTasks
        .filter(task => {
          const currentUplifted = task.uplifted_qty || 0;
          const totalQty = task.total_qty;
          const deltaQty = totalQty - currentUplifted;
          return deltaQty > 0; // Only include tasks that need updating
        })
        .map(task => {
          const currentUplifted = task.uplifted_qty || 0;
          const totalQty = task.total_qty;
          const deltaQty = totalQty - currentUplifted;
          return updateGranularQty(task.id, 'uplifted_qty', deltaQty);
        });

      if (updates.length === 0) {
        alert('All tasks are already fully uplifted.');
        return;
      }

      await Promise.all(updates);
      alert(`Successfully uplifted ${updates.length} tasks.`);
    } catch (error: unknown) {
      console.error('Error uplifting all tasks:', error);
      alert('Failed to uplift all tasks. Please try again.');
    }
  };

  // Complete all tasks (set all completed_qty to total_qty)
  const completeAll = async () => {
    if (!confirm('Are you sure you want to mark all tasks as completed? This will set all quantities to maximum.')) {
      return;
    }

    try {
      const updates = generatedTasks
        .filter(task => {
          const currentCompleted = task.completed_qty || 0;
          const totalQty = task.total_qty;
          return currentCompleted < totalQty; // Only include tasks that need updating
        })
        .map(task => updateCompletedQty(task.id, task.total_qty));

      if (updates.length === 0) {
        alert('All tasks are already completed.');
        return;
      }

      await Promise.all(updates);
      alert(`Successfully completed ${updates.length} tasks.`);
    } catch (error: unknown) {
      console.error('Error completing all tasks:', error);
      alert('Failed to complete all tasks. Please try again.');
    }
  };

  // Open missing item modal
  const openMissingModal = (taskId: string) => {
    const task = generatedTasks.find(t => t.id === taskId);
    if (task) {
      setMissingNotes({ [taskId]: task.missing_notes || "" });
      setMissingQty({ [taskId]: task.missing_qty || 0 });
    }
    setShowMissingModal(taskId);
  };

  // Open damage modal
  const openDamageModal = (taskId: string) => {
    const task = generatedTasks.find(t => t.id === taskId);
    if (task) {
      setDamageNotes({ [taskId]: task.damage_notes || "" });
      setDamageQty({ [taskId]: task.damaged_qty || 0 });
    }
    setShowDamageModal(taskId);
  };

  // Save missing item details
  const saveMissingDetails = async () => {
    if (!showMissingModal) return;

    try {
      const notes = missingNotes[showMissingModal] || "";
      const qty = missingQty[showMissingModal] || 0;

      const response = await fetch(`/api/generated-tasks/${showMissingModal}/update`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          missing_notes: notes,
          missing_qty: qty
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save missing details');
      }

      // Update local state
      setGeneratedTasks(prev => 
        prev.map(task => 
          task.id === showMissingModal 
            ? { ...task, missing_notes: notes, missing_qty: qty } 
            : task
        )
      );

      setShowMissingModal(null);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
    }
  };

  // Save damage details
  const saveDamageDetails = async () => {
    if (!showDamageModal) return;

    try {
      const notes = damageNotes[showDamageModal] || "";
      const qty = damageQty[showDamageModal] || 0;

      const response = await fetch(`/api/generated-tasks/${showDamageModal}/update`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          damage_notes: notes,
          damaged_qty: qty
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save damage details');
      }

      // Update local state
      setGeneratedTasks(prev => 
        prev.map(task => 
          task.id === showDamageModal 
            ? { ...task, damage_notes: notes, damaged_qty: qty } 
            : task
        )
      );

      setShowDamageModal(null);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
    }
  };

  // Calculate overall job completion
  const calculateOverallCompletion = () => {
    const totalTasks = generatedTasks.length + manualTasks.length;
    if (totalTasks === 0) return 0;
    
    const completedGeneratedTasks = generatedTasks.filter(task => 
      task.status === 'Built' || task.status === 'Missing'
    ).length;
    
    const completedManualTasks = manualTasks.filter(task => task.is_done).length;
    
    const totalCompleted = completedGeneratedTasks + completedManualTasks;
    
    return Math.round((totalCompleted / totalTasks) * 100);
  };

  if (loading) {
    return (
      <div style={{ padding: 20, textAlign: "center" }}>
        Loading task generation data...
      </div>
    );
  }

  if (schemaError || missingTables.length > 0) {
    return (
      <div style={{ 
        padding: 20, 
        color: theme.colors.danger,
        background: "rgba(255, 0, 0, 0.1)",
        borderRadius: 8,
        marginBottom: 16
      }}>
        <h3>Database Schema Error</h3>
        <p>The following required database tables are not available:</p>
        <ul>
          {missingTables.map(table => (
            <li key={table}>{table}</li>
          ))}
        </ul>
        <p>To fix this issue, please follow these steps:</p>
        <ol>
          <li>Go to your Supabase dashboard</li>
          <li>Navigate to the SQL Editor</li>
          <li>Try first with <code>apps/web/create-tables-simple.sql</code> (simpler version)</li>
          <li>If that works, try <code>apps/web/create-tables.sql</code> (full version with constraints)</li>
          <li>Run the SQL script</li>
        </ol>
        <p>Alternatively, you can run the following command in your terminal:</p>
        <pre style={{ 
          background: "rgba(0, 0, 0, 0.3)", 
          padding: 10, 
          borderRadius: 4,
          overflow: "auto",
          fontSize: 12
        }}>
          npx supabase db push
        </pre>
        {dbError && (
          <div>
            <p>Database Error Details:</p>
            <pre style={{ 
              background: "rgba(0, 0, 0, 0.3)", 
              padding: 10, 
              borderRadius: 4,
              overflow: "auto",
              fontSize: 12
            }}>
              {dbError}
            </pre>
          </div>
        )}
        <p>Error: {error}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ 
        padding: 20, 
        color: theme.colors.danger,
        background: "rgba(255, 0, 0, 0.1)",
        borderRadius: 8,
        marginBottom: 16
      }}>
        Error: {error}
      </div>
    );
  }

  return (
    <div style={{
      padding: '20px clamp(8px, 2vw, 24px)',
      minHeight: '100vh',
      background: '#0f1419',
      color: '#ffffff',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, sans-serif',
      maxWidth: '100%',
      width: '100%',
      margin: 0,
      boxSizing: 'border-box'
    }}>
      <div style={headerStyle()}>
        {/* Left side - Uplift All button */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <button
            onClick={completeAll}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: '1px solid rgba(34, 197, 94, 0.3)',
              background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.15) 0%, rgba(34, 197, 94, 0.05) 100%)',
              color: '#22c55e',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer',
              backdropFilter: 'blur(8px)',
              transition: 'all 0.2s ease',
              boxShadow: '0 2px 8px rgba(34, 197, 94, 0.1)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, rgba(34, 197, 94, 0.25) 0%, rgba(34, 197, 94, 0.15) 100%)';
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(34, 197, 94, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, rgba(34, 197, 94, 0.15) 0%, rgba(34, 197, 94, 0.05) 100%)';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(34, 197, 94, 0.1)';
            }}
            title="Mark all items as uplifted"
          >
            ✅ Complete All
          </button>
        </div>

        {/* Right side - Action buttons */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button
            onClick={refreshSelectedDocuments}
            style={{
              padding: '7px 12px',
              borderRadius: '6px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              background: 'rgba(255, 255, 255, 0.05)',
              color: theme.colors.text,
              fontSize: '12px',
              fontWeight: '500',
              cursor: 'pointer',
              backdropFilter: 'blur(8px)',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
            title="Refresh selected documents"
          >
            ↻ Refresh
          </button>
          <button
            onClick={generateTasks}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(59, 130, 246, 0.1) 100%)',
              color: '#3b82f6',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer',
              backdropFilter: 'blur(8px)',
              transition: 'all 0.2s ease',
              boxShadow: '0 2px 8px rgba(59, 130, 246, 0.1)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, rgba(59, 130, 246, 0.3) 0%, rgba(59, 130, 246, 0.2) 100%)';
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(59, 130, 246, 0.1) 100%)';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(59, 130, 246, 0.1)';
            }}
          >
            ⚡ Generate Tasks
          </button>
          <button
            onClick={() => setShowAddTaskModal(true)}
            style={{
              padding: '7px 12px',
              borderRadius: '6px',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              background: 'rgba(255, 255, 255, 0.05)',
              color: theme.colors.text,
              fontSize: '12px',
              fontWeight: '500',
              cursor: 'pointer',
              backdropFilter: 'blur(8px)',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            ➕ Add Task
          </button>
          {selectedDocuments.length > 0 && (
            <button
              onClick={clearSelectedDocuments}
              style={{
                padding: '7px 12px',
                borderRadius: '6px',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                background: 'rgba(239, 68, 68, 0.1)',
                color: '#ef4444',
                fontSize: '12px',
                fontWeight: '500',
                cursor: 'pointer',
                backdropFilter: 'blur(8px)',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              ✖ Clear Selection
            </button>
          )}
        </div>
      </div>

      {/* Selected Documents */}
      {selectedDocuments.length > 0 && (
        <div style={{
          marginBottom: 24,
          padding: 16,
          borderRadius: 12,
          border: `1px solid ${theme.colors.accent}`,
          background: "rgba(59, 130, 246, 0.05)"
        }}>
          <h3 style={{ margin: "0 0 12px 0", color: theme.colors.accent, fontSize: 16 }}>
            Selected Documents ({selectedDocuments.length})
          </h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {selectedDocuments.map((doc, index) => (
              <div key={`${doc.documentId}_${index}`} style={{
                padding: "4px 8px",
                borderRadius: 6,
                background: "rgba(59, 130, 246, 0.1)",
                color: theme.colors.accent,
                fontSize: 12,
                display: 'flex',
                alignItems: 'center',
                gap: 4
              }}>
                📄 {doc.documentTitle}
              </div>
            ))}
          </div>
          <p style={{ margin: "8px 0 0 0", fontSize: 14, color: theme.colors.textSubtle }}>
            Click &quot;Generate Tasks&quot; to create installation tasks from these documents.
          </p>
        </div>
      )}


      {/* Overall Progress */}
      <div style={progressContainerStyle()}>
        <h3 style={{ margin: "0 0 12px 0", color: theme.colors.text }}>Overall Progress</h3>
        <div style={progressBarContainerStyle()}>
          <div style={progressBarTrackStyle()}>
            <div style={{
              ...progressBarFillStyle(),
              width: `${calculateOverallCompletion()}%`
            }} />
          </div>
          <div style={progressPercentageStyle()}>
            {calculateOverallCompletion()}%
          </div>
        </div>
      </div>

      {/* Task Groups by Floor */}
      {groupedTasks.length === 0 ? (
        <div style={emptyStateStyle()}>
          <p>No tasks generated yet.</p>
          <p>To generate tasks from documents:</p>
          <ol style={{ textAlign: 'left', display: 'inline-block', fontSize: 14, color: theme.colors.textSubtle }}>
            <li>Go to Documents tab and upload PDF files</li>
            <li>Use &quot;Send to&quot; → &quot;Task Generation&quot; for specific documents</li>
            <li>Or click &quot;Generate Tasks&quot; here for sample tasks</li>
          </ol>
        </div>
      ) : (
        groupedTasks.map((group) => (
          <div 
            key={group.floor} 
            style={groupContainerStyle()}
          >
            <div style={groupHeaderStyle()}>
              <h3 style={{ margin: 0, color: theme.colors.text }}>{group.floor}</h3>
              <div style={groupHeaderInfoStyle()}>
                <span style={groupTaskCountStyle()}>
                  {group.tasks.length} tasks
                </span>
                <div style={groupCompletionStyle()}>
                  {group.completionPercentage}%
                </div>
              </div>
            </div>
            
            <div style={groupContentContentStyle()}>
              <div style={taskGridStyle()}>
                {group.tasks.map((task) => {
                  const getStatusColor = (status: string) => {
                    switch (status) {
                      case 'Built': return '#4CAF50';
                      case 'Placed': return '#FFA726';
                      case 'Uplift': return '#2196F3';
                      case 'Missing': return '#ff6b6b';
                      default: return '#8892a0';
                    }
                  };
                  
                  const _taskProgress = task.total_qty > 0 ? (task.completed_qty / task.total_qty) * 100 : 0;
                  
                  return (
                    <div
                      key={task.id}
                      style={{
                        background: 'linear-gradient(135deg, rgba(26, 31, 46, 0.6) 0%, rgba(36, 41, 56, 0.8) 100%)',
                        backdropFilter: 'blur(20px)',
                        borderRadius: '12px',
                        padding: '16px',
                        border: '1px solid rgba(255,255,255,0.08)',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        marginBottom: '8px',
                        position: 'relative',
                        overflow: 'hidden'
                      }}
                    >
                      {/* Animated background accent */}
                      <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: '2px',
                        background: `linear-gradient(90deg, ${getStatusColor(task.status)} 0%, transparent 100%)`,
                        opacity: 0.6
                      }} />

                      {/* Task header */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '16px'
                      }}>
                        <div style={{ flex: 1 }}>
                          <h4 style={{
                            margin: 0,
                            color: '#ffffff',
                            fontSize: '15px',
                            fontWeight: '500',
                            lineHeight: '1.3'
                          }}>
                            {cleanTaskTitle(task.title)}
                          </h4>
                        </div>
                        
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={() => openMissingModal(task.id)}
                            style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '6px',
                              background: '#ff6b6b',
                              border: 'none',
                              color: '#ffffff',
                              fontWeight: '700',
                              fontSize: '12px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                            title="Report Missing Items"
                          >
                            M
                          </button>
                          <button
                            onClick={() => openDamageModal(task.id)}
                            style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '6px',
                              background: '#ff9500',
                              border: 'none',
                              color: '#ffffff',
                              fontWeight: '700',
                              fontSize: '12px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                            title="Report Damage"
                          >
                            D
                          </button>
                        </div>
                      </div>

                      {/* 3-line progress metrics */}
                      <div style={{ marginBottom: '16px' }}>
                        {/* Uplifted */}
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          marginBottom: '8px'
                        }}>
                          <span style={{ 
                            fontSize: '12px', 
                            color: '#2196F3', 
                            fontWeight: '600',
                            minWidth: '60px'
                          }}>
                            Uplifted
                          </span>
                          <span style={{
                            fontSize: '11px',
                            color: '#8892a0',
                            minWidth: '40px'
                          }}>
                            {getTaskGranularQty(task.id, 'uplifted_qty')}/{task.total_qty}
                          </span>
                          <div style={{
                            flex: 1,
                            height: '6px',
                            background: 'rgba(33, 150, 243, 0.2)',
                            borderRadius: '3px',
                            overflow: 'hidden'
                          }}>
                            <div style={{
                              width: `${((task.completed_qty || 0) / task.total_qty) * 100}%`,
                              height: '100%',
                              background: '#2196F3',
                              transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                              borderRadius: '3px'
                            }} />
                          </div>
                        </div>
                        
                        {/* Placed */}
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          marginBottom: '8px'
                        }}>
                          <span style={{
                            fontSize: '12px',
                            color: '#FFA726',
                            fontWeight: '600',
                            minWidth: '60px'
                          }}>
                            Placed
                          </span>
                          <span style={{
                            fontSize: '11px',
                            color: '#8892a0',
                            minWidth: '40px'
                          }}>
                            {getTaskGranularQty(task.id, 'placed_qty')}/{task.total_qty}
                          </span>
                          <div style={{
                            flex: 1,
                            height: '6px',
                            background: 'rgba(255, 167, 38, 0.2)',
                            borderRadius: '3px',
                            overflow: 'hidden'
                          }}>
                            <div style={{
                              width: `${(getTaskGranularQty(task.id, 'placed_qty') / task.total_qty) * 100}%`,
                              height: '100%',
                              background: '#FFA726',
                              transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                              borderRadius: '3px'
                            }} />
                          </div>
                        </div>
                        
                        {/* Built */}
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}>
                          <span style={{
                            fontSize: '12px',
                            color: '#4CAF50',
                            fontWeight: '600',
                            minWidth: '60px'
                          }}>
                            Built
                          </span>
                          <span style={{
                            fontSize: '11px',
                            color: '#8892a0',
                            minWidth: '40px'
                          }}>
                            {getTaskGranularQty(task.id, 'built_qty')}/{task.total_qty}
                          </span>
                          <div style={{
                            flex: 1,
                            height: '6px',
                            background: 'rgba(76, 175, 80, 0.2)',
                            borderRadius: '3px',
                            overflow: 'hidden'
                          }}>
                            <div style={{
                              width: `${(getTaskGranularQty(task.id, 'built_qty') / task.total_qty) * 100}%`,
                              height: '100%',
                              background: '#4CAF50',
                              transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                              borderRadius: '3px'
                            }} />
                          </div>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: '8px'
                      }}>
                        <button
                          onClick={() => completeAction(task.id, 'uplifted')}
                          style={{
                            height: '32px',
                            borderRadius: '8px',
                            background: 'rgba(33, 150, 243, 0.15)',
                            border: '1px solid rgba(33, 150, 243, 0.3)',
                            color: '#2196F3',
                            fontWeight: '600',
                            fontSize: '11px',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          Complete Uplifted
                        </button>
                        <button
                          onClick={() => completeAction(task.id, 'placed')}
                          style={{
                            height: '32px',
                            borderRadius: '8px',
                            background: 'rgba(255, 167, 38, 0.15)',
                            border: '1px solid rgba(255, 167, 38, 0.3)',
                            color: '#FFA726',
                            fontWeight: '600',
                            fontSize: '11px',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          Complete Placed
                        </button>
                        <button
                          onClick={() => completeAction(task.id, 'built')}
                          style={{
                            height: '32px',
                            borderRadius: '8px',
                            background: 'rgba(76, 175, 80, 0.15)',
                            border: '1px solid rgba(76, 175, 80, 0.3)',
                            color: '#4CAF50',
                            fontWeight: '600',
                            fontSize: '11px',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          Complete Built
                        </button>
                      </div>

                      {/* Individual stage increment buttons */}
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(6, 1fr)',
                        gap: '4px',
                        marginTop: '8px'
                      }}>
                        {/* Uplifted +/- */}
                        <button
                          onClick={() => updateTaskGranularQty(task.id, 'uplifted_qty', getTaskGranularQty(task.id, 'uplifted_qty') + 1)}
                          style={{
                            height: '24px',
                            borderRadius: '4px',
                            background: 'rgba(33, 150, 243, 0.1)',
                            border: '1px solid rgba(33, 150, 243, 0.2)',
                            color: '#2196F3',
                            fontWeight: '600',
                            fontSize: '10px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          U+1
                        </button>
                        <button
                          onClick={() => updateTaskGranularQty(task.id, 'uplifted_qty', Math.max(0, getTaskGranularQty(task.id, 'uplifted_qty') - 1))}
                          style={{
                            height: '24px',
                            borderRadius: '4px',
                            background: 'rgba(33, 150, 243, 0.1)',
                            border: '1px solid rgba(33, 150, 243, 0.2)',
                            color: '#2196F3',
                            fontWeight: '600',
                            fontSize: '10px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          U-1
                        </button>
                        {/* Placed +/- */}
                        <button
                          onClick={() => updateTaskGranularQty(task.id, 'placed_qty', getTaskGranularQty(task.id, 'placed_qty') + 1)}
                          style={{
                            height: '24px',
                            borderRadius: '4px',
                            background: 'rgba(255, 167, 38, 0.1)',
                            border: '1px solid rgba(255, 167, 38, 0.2)',
                            color: '#FFA726',
                            fontWeight: '600',
                            fontSize: '10px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          P+1
                        </button>
                        <button
                          onClick={() => updateTaskGranularQty(task.id, 'placed_qty', Math.max(0, getTaskGranularQty(task.id, 'placed_qty') - 1))}
                          style={{
                            height: '24px',
                            borderRadius: '4px',
                            background: 'rgba(255, 167, 38, 0.1)',
                            border: '1px solid rgba(255, 167, 38, 0.2)',
                            color: '#FFA726',
                            fontWeight: '600',
                            fontSize: '10px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          P-1
                        </button>
                        {/* Built +/- */}
                        <button
                          onClick={() => updateTaskGranularQty(task.id, 'built_qty', getTaskGranularQty(task.id, 'built_qty') + 1)}
                          style={{
                            height: '24px',
                            borderRadius: '4px',
                            background: 'rgba(76, 175, 80, 0.1)',
                            border: '1px solid rgba(76, 175, 80, 0.2)',
                            color: '#4CAF50',
                            fontWeight: '600',
                            fontSize: '10px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          B+1
                        </button>
                        <button
                          onClick={() => updateTaskGranularQty(task.id, 'built_qty', Math.max(0, getTaskGranularQty(task.id, 'built_qty') - 1))}
                          style={{
                            height: '24px',
                            borderRadius: '4px',
                            background: 'rgba(76, 175, 80, 0.1)',
                            border: '1px solid rgba(76, 175, 80, 0.2)',
                            color: '#4CAF50',
                            fontWeight: '600',
                            fontSize: '10px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          B-1
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ))
      )}

      {/* Manual Tasks */}
      {manualTasks.length > 0 && (
        <div style={groupContainerStyle()}>
          <div style={groupHeaderStyle()}>
            <h3 style={{ margin: 0, color: theme.colors.text }}>Manual Tasks</h3>
            <div style={groupHeaderInfoStyle()}>
              <span style={groupTaskCountStyle()}>
                {manualTasks.length} tasks
              </span>
              <div style={groupCompletionStyle()}>
                {Math.round((manualTasks.filter(t => t.is_done).length / manualTasks.length) * 100)}%
              </div>
            </div>
          </div>
          
          <div style={groupContentContentStyle()}>
            <div style={{ display: "grid", gap: 8 }}>
              {manualTasks.map((task) => (
                <div
                  key={task.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "auto 1fr auto auto",
                    alignItems: "center",
                    gap: 12,
                    padding: "12px 16px",
                    borderRadius: 10,
                    border: `1px solid ${theme.colors.border}`,
                    background: "rgba(255,255,255,0.03)",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={!!task.is_done}
                    onChange={() => toggleManualTask(task.id, !!task.is_done)}
                    style={{ width: 18, height: 18 }}
                  />
                  <div style={{ 
                    opacity: task.is_done ? 0.6 : 1, 
                    textDecoration: task.is_done ? "line-through" : "none"
                  }}>
                    <div style={{ fontWeight: 600, marginBottom: 4 }}>
                      {task.title}
                      <span style={{
                        marginLeft: 8,
                        padding: "2px 6px",
                        fontSize: 11,
                        backgroundColor: '#6b7280',
                        color: 'white',
                        borderRadius: 4,
                        fontWeight: 500
                      }}>
                        Manual
                      </span>
                    </div>
                    {task.description && (
                      <div style={{ fontSize: 13, opacity: 0.7, marginBottom: 4 }}>
                        {task.description}
                      </div>
                    )}
                    {task.total_qty && task.total_qty > 1 && (
                      <div style={{ fontSize: 12, opacity: 0.6 }}>
                        Quantity: {task.total_qty}
                      </div>
                    )}
                  </div>
                  <span style={{
                    fontSize: 12,
                    padding: "4px 8px",
                    borderRadius: 4,
                    background: task.is_done ? "rgba(16, 185, 129, 0.2)" : "rgba(156, 163, 175, 0.2)",
                    color: task.is_done ? "#10b981" : "#9ca3af"
                  }}>
                    {task.is_done ? "Complete" : "Pending"}
                  </span>
                  <button
                    onClick={() => deleteManualTask(task.id)}
                    style={{
                      height: 32,
                      padding: "0 12px",
                      borderRadius: 6,
                      border: `1px solid ${theme.colors.border}`,
                      background: "transparent",
                      color: theme.colors.textSubtle,
                      fontSize: 12,
                      cursor: "pointer"
                    }}
                  >
                    Delete
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Missing Item Modal */}
      {showMissingModal && (
        <div style={modalOverlayStyle()}>
          <div style={modalContentStyle()}>
            <h3 style={{ margin: "0 0 16px 0", color: theme.colors.text }}>Missing Item Details</h3>
            
            <div style={modalInputContainerStyle()}>
              <label style={modalLabelStyle()}>
                Quantity Missing
              </label>
              <input
                type="number"
                min="0"
                value={missingQty[showMissingModal] || 0}
                onChange={(e) => setMissingQty({
                  ...missingQty,
                  [showMissingModal]: parseInt(e.target.value) || 0
                })}
                style={modalInputStyle()}
              />
            </div>
            
            <div style={modalTextareaContainerStyle()}>
              <label style={modalLabelStyle()}>
                Notes
              </label>
              <textarea
                value={missingNotes[showMissingModal] || ""}
                onChange={(e) => setMissingNotes({
                  ...missingNotes,
                  [showMissingModal]: e.target.value
                })}
                rows={4}
                style={modalTextareaStyle()}
              />
            </div>
            
            <div style={modalButtonContainerStyle()}>
              <button
                onClick={() => setShowMissingModal(null)}
                style={modalCancelButtonStyle()}
              >
                Cancel
              </button>
              <button
                onClick={saveMissingDetails}
                style={modalSaveButtonStyle()}
              >
                Save Missing Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Damage Modal */}
      {showDamageModal && (
        <div style={modalOverlayStyle()}>
          <div style={modalContentStyle()}>
            <h3 style={{ margin: "0 0 16px 0", color: theme.colors.text }}>Damage Report</h3>
            
            <div style={modalInputContainerStyle()}>
              <label style={modalLabelStyle()}>
                Quantity Damaged
              </label>
              <input
                type="number"
                min="0"
                value={damageQty[showDamageModal] || 0}
                onChange={(e) => setDamageQty({
                  ...damageQty,
                  [showDamageModal]: parseInt(e.target.value) || 0
                })}
                style={modalInputStyle()}
              />
            </div>
            
            <div style={modalTextareaContainerStyle()}>
              <label style={modalLabelStyle()}>
                Damage Details
              </label>
              <textarea
                value={damageNotes[showDamageModal] || ""}
                onChange={(e) => setDamageNotes({
                  ...damageNotes,
                  [showDamageModal]: e.target.value
                })}
                rows={4}
                placeholder="Describe the damage..."
                style={modalTextareaStyle()}
              />
            </div>
            
            <div style={modalButtonContainerStyle()}>
              <button
                onClick={() => setShowDamageModal(null)}
                style={modalCancelButtonStyle()}
              >
                Cancel
              </button>
              <button
                onClick={saveDamageDetails}
                style={{
                  ...modalSaveButtonStyle(),
                  background: '#ff9500',
                  color: "#ffffff"
                }}
              >
                Save Damage Report
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Task Modal */}
      {showAddTaskModal && (
        <div style={modalOverlayStyle()}>
          <div style={modalContentStyle()}>
            <h3 style={{ margin: "0 0 16px 0", color: theme.colors.text }}>Add Manual Task</h3>
            
            <form onSubmit={addManualTask}>
              <div style={modalInputContainerStyle()}>
                <label style={modalLabelStyle()}>
                  Task Title *
                </label>
                <input
                  type="text"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="Enter task title..."
                  required
                  style={modalInputStyle()}
                />
              </div>
              
              <div style={modalTextareaContainerStyle()}>
                <label style={modalLabelStyle()}>
                  Description (optional)
                </label>
                <textarea
                  value={newTaskDescription}
                  onChange={(e) => setNewTaskDescription(e.target.value)}
                  rows={3}
                  placeholder="Enter task description..."
                  style={modalTextareaStyle()}
                />
              </div>

              <div style={modalInputContainerStyle()}>
                <label style={modalLabelStyle()}>
                  Quantity
                </label>
                <input
                  type="number"
                  min="1"
                  value={newTaskQty}
                  onChange={(e) => setNewTaskQty(parseInt(e.target.value) || 1)}
                  style={modalInputStyle()}
                />
              </div>
              
              <div style={modalButtonContainerStyle()}>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddTaskModal(false);
                    setNewTaskTitle("");
                    setNewTaskDescription("");
                    setNewTaskQty(1);
                  }}
                  style={modalCancelButtonStyle()}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    ...modalSaveButtonStyle(),
                    background: theme.colors.accent,
                    color: "#000"
                  }}
                >
                  Add Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Undo Toast Notification */}
      {showUndoToast && undoAction && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          background: 'linear-gradient(135deg, rgba(26, 31, 46, 0.95) 0%, rgba(36, 41, 56, 0.95) 100%)',
          backdropFilter: 'blur(20px)',
          borderRadius: '12px',
          padding: '16px 20px',
          border: '1px solid rgba(255,255,255,0.1)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          color: '#ffffff',
          zIndex: 1000,
          maxWidth: '300px',
          animation: 'slideIn 0.3s ease-out'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>
                Action completed
              </div>
              <div style={{ fontSize: '12px', color: '#8892a0' }}>
                {undoAction.type === 'quantity' 
                  ? `${undoAction.taskTitle}: ${undoAction.previousValue} → ${undoAction.newValue}`
                  : `${undoAction.taskTitle}: ${undoAction.previousValue} → ${undoAction.newValue}`
                }
              </div>
            </div>
            <button
              onClick={executeUndo}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                background: '#3b82f6',
                border: 'none',
                color: '#ffffff',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#2563eb';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#3b82f6';
              }}
            >
              Undo
            </button>
            <button
              onClick={() => {
                setShowUndoToast(false);
                setUndoAction(null);
              }}
              style={{
                padding: '4px',
                borderRadius: '4px',
                background: 'transparent',
                border: 'none',
                color: '#8892a0',
                fontSize: '14px',
                cursor: 'pointer',
                lineHeight: 1
              }}
            >
              ×
            </button>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};

export default TasksTab;

/* ---------- Styles ---------- */
function getPanelBorder() {
  return theme.colors.border;
}

function headerStyle(): React.CSSProperties {
  return {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    background: 'linear-gradient(135deg, rgba(26, 31, 46, 0.85) 0%, rgba(36, 41, 56, 0.85) 100%)',
    borderRadius: '16px',
    padding: '16px 20px',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    backdropFilter: 'blur(20px)',
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
    position: 'relative' as 'relative',
    overflow: 'hidden' as 'hidden'
  };
}

function _primaryBtn(): React.CSSProperties {
  return {
    padding: "8px 16px",
    borderRadius: 8,
    border: "none",
    background: theme.colors.accent,
    color: "#000",
    fontWeight: "bold",
    cursor: "pointer"
  };
}

function progressContainerStyle(): React.CSSProperties {
  return {
    marginBottom: 24,
    padding: 16,
    borderRadius: 12,
    border: `1px solid ${getPanelBorder()}`,
    background: "rgba(255,255,255,0.03)"
  };
}

function progressBarContainerStyle(): React.CSSProperties {
  return {
    display: "flex", 
    alignItems: "center", 
    gap: 16
  };
}

function progressBarTrackStyle(): React.CSSProperties {
  return {
    height: 12, 
    borderRadius: 6, 
    background: "rgba(255,255,255,0.1)",
    overflow: "hidden",
    flex: 1
  };
}

function progressBarFillStyle(): React.CSSProperties {
  return {
    height: "100%", 
    background: theme.colors.accent,
    transition: "width 0.3s ease"
  };
}

function progressPercentageStyle(): React.CSSProperties {
  return {
    fontWeight: "bold", 
    fontSize: 18, 
    minWidth: 60
  };
}

function emptyStateStyle(): React.CSSProperties {
  return {
    textAlign: "center", 
    padding: 40, 
    color: theme.colors.textSubtle,
    border: `1px dashed ${getPanelBorder()}`,
    borderRadius: 12
  };
}

function groupContainerStyle(): React.CSSProperties {
  return {
    marginBottom: 24,
    border: `1px solid ${getPanelBorder()}`,
    borderRadius: 12,
    overflow: "hidden"
  };
}

function groupHeaderStyle(): React.CSSProperties {
  return {
    padding: "12px 16px",
    background: "rgba(255,255,255,0.05)",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center"
  };
}

function groupHeaderInfoStyle(): React.CSSProperties {
  return {
    display: "flex", 
    alignItems: "center", 
    gap: 8
  };
}

function groupTaskCountStyle(): React.CSSProperties {
  return {
    fontSize: 14, 
    color: theme.colors.textSubtle
  };
}

function groupCompletionStyle(): React.CSSProperties {
  return {
    fontWeight: "bold", 
    fontSize: 16,
    minWidth: 50
  };
}

function groupContentContentStyle(): React.CSSProperties {
  return {
    padding: 16
  };
}

function taskGridStyle(): React.CSSProperties {
  return {
    display: "grid",
    gap: "clamp(8px, 1vw, 16px)",
    gridTemplateColumns: "repeat(auto-fit, minmax(min(315px, 100%), 1fr))",
    width: "100%"
  };
}

function _taskCardStyle(): React.CSSProperties {
  return {
    padding: 16,
    borderRadius: 10,
    border: `1px solid ${getPanelBorder()}`,
    background: "rgba(255,255,255,0.03)"
  };
}

function _taskHeaderStyle(): React.CSSProperties {
  return {
    display: "flex", 
    justifyContent: "space-between", 
    marginBottom: 12 
  };
}

function _taskStatusStyle(): React.CSSProperties {
  return {
    fontSize: 12, 
    padding: "2px 8px",
    borderRadius: 10
  };
}

function _taskDescriptionStyle(): React.CSSProperties {
  return {
    margin: "0 0 16px 0", 
    fontSize: 14, 
    color: theme.colors.textSubtle 
  };
}

function _quantityTrackerStyle(): React.CSSProperties {
  return {
    marginBottom: 16
  };
}

function _quantityHeaderStyle(): React.CSSProperties {
  return {
    display: "flex", 
    justifyContent: "space-between", 
    marginBottom: 8 
  };
}

function _quantityLabelStyle(): React.CSSProperties {
  return {
    fontSize: 14, 
    color: theme.colors.text
  };
}

function _quantityValueStyle(): React.CSSProperties {
  return {
    fontSize: 14, 
    color: theme.colors.text
  };
}

function _quantityProgressBarTrackStyle(): React.CSSProperties {
  return {
    height: 8, 
    borderRadius: 4, 
    background: "rgba(255,255,255,0.1)",
    overflow: "hidden"
  };
}

function _quantityProgressBarFillStyle(): React.CSSProperties {
  return {
    height: "100%", 
    background: theme.colors.accent,
    transition: "width 0.3s ease"
  };
}

function _quantityInputContainerStyle(): React.CSSProperties {
  return {
    display: "flex", 
    alignItems: "center", 
    gap: 8, 
    marginBottom: 16 
  };
}

function _quantityInputStyle(): React.CSSProperties {
  return {
    width: 60,
    padding: "6px 8px",
    borderRadius: 6,
    border: `1px solid ${getPanelBorder()}`,
    background: "rgba(0,0,0,0.3)",
    color: theme.colors.text
  };
}

function _quantityInputLabelStyle(): React.CSSProperties {
  return {
    fontSize: 14, 
    color: theme.colors.text
  };
}

function _statusButtonGridStyle(): React.CSSProperties {
  return {
    display: "grid", 
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: 8
  };
}

function _statusButtonStyle(): React.CSSProperties {
  return {
    padding: "8px 4px",
    borderRadius: 6,
    border: `1px solid ${getPanelBorder()}`,
    background: "transparent",
    color: theme.colors.text,
    fontSize: 12,
    cursor: "pointer"
  };
}

function modalOverlayStyle(): React.CSSProperties {
  return {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(0,0,0,0.7)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000
  };
}

function modalContentStyle(): React.CSSProperties {
  return {
    background: theme.colors.panel,
    borderRadius: 12,
    padding: 24,
    width: "100%",
    maxWidth: 500,
    border: `1px solid ${getPanelBorder()}`
  };
}

function modalInputContainerStyle(): React.CSSProperties {
  return {
    marginBottom: 16
  };
}

function modalLabelStyle(): React.CSSProperties {
  return {
    display: "block", 
    marginBottom: 8, 
    color: theme.colors.text 
  };
}

function modalInputStyle(): React.CSSProperties {
  return {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 8,
    border: `1px solid ${getPanelBorder()}`,
    background: "rgba(0,0,0,0.3)",
    color: theme.colors.text
  };
}

function modalTextareaContainerStyle(): React.CSSProperties {
  return {
    marginBottom: 24
  };
}

function modalTextareaStyle(): React.CSSProperties {
  return {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 8,
    border: `1px solid ${getPanelBorder()}`,
    background: "rgba(0,0,0,0.3)",
    color: theme.colors.text,
    resize: "vertical"
  };
}

function modalButtonContainerStyle(): React.CSSProperties {
  return {
    display: "flex", 
    gap: 12, 
    justifyContent: "flex-end"
  };
}

function modalCancelButtonStyle(): React.CSSProperties {
  return {
    padding: "10px 16px",
    borderRadius: 8,
    border: `1px solid ${getPanelBorder()}`,
    background: "transparent",
    color: theme.colors.text,
    cursor: "pointer"
  };
}

function modalSaveButtonStyle(): React.CSSProperties {
  return {
    padding: "10px 16px",
    borderRadius: 8,
    border: "none",
    background: theme.colors.danger,
    color: "white",
    fontWeight: "bold",
    cursor: "pointer"
  };
}