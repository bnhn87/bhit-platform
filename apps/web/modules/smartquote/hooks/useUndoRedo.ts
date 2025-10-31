import { useState, useCallback, useRef } from 'react';

interface UndoRedoState<T> {
    past: T[];
    present: T;
    future: T[];
}

interface UseUndoRedoReturn<T> {
    state: T;
    setState: (newState: T | ((prev: T) => T)) => void;
    undo: () => void;
    redo: () => void;
    canUndo: boolean;
    canRedo: boolean;
    clear: () => void;
    jumpTo: (index: number) => void;
    history: T[];
}

export const useUndoRedo = <T>(initialState: T, maxHistorySize: number = 50): UseUndoRedoReturn<T> => {
    const [undoRedoState, setUndoRedoState] = useState<UndoRedoState<T>>({
        past: [],
        present: initialState,
        future: []
    });

    const isUndoingOrRedoing = useRef(false);

    const setState = useCallback((newState: T | ((prev: T) => T)) => {
        // Skip if we're in the middle of undo/redo
        if (isUndoingOrRedoing.current) {
            isUndoingOrRedoing.current = false;
            return;
        }

        setUndoRedoState(current => {
            const actualNewState = typeof newState === 'function'
                ? (newState as (prev: T) => T)(current.present)
                : newState;

            // Don't add to history if state hasn't changed
            if (JSON.stringify(actualNewState) === JSON.stringify(current.present)) {
                return current;
            }

            const newPast = [...current.past, current.present];

            // Limit history size
            if (newPast.length > maxHistorySize) {
                newPast.shift();
            }

            return {
                past: newPast,
                present: actualNewState,
                future: [] // Clear future when making a new change
            };
        });
    }, [maxHistorySize]);

    const undo = useCallback(() => {
        setUndoRedoState(current => {
            if (current.past.length === 0) {
                return current;
            }

            const previous = current.past[current.past.length - 1];
            const newPast = current.past.slice(0, -1);

            isUndoingOrRedoing.current = true;

            return {
                past: newPast,
                present: previous,
                future: [current.present, ...current.future]
            };
        });

        // Reset flag after state update is processed by React
        queueMicrotask(() => {
            isUndoingOrRedoing.current = false;
        });
    }, []);

    const redo = useCallback(() => {
        setUndoRedoState(current => {
            if (current.future.length === 0) {
                return current;
            }

            const next = current.future[0];
            const newFuture = current.future.slice(1);

            isUndoingOrRedoing.current = true;

            return {
                past: [...current.past, current.present],
                present: next,
                future: newFuture
            };
        });

        // Reset flag after state update is processed by React
        queueMicrotask(() => {
            isUndoingOrRedoing.current = false;
        });
    }, []);

    const clear = useCallback(() => {
        setUndoRedoState(current => ({
            past: [],
            present: current.present,
            future: []
        }));
    }, []);

    const jumpTo = useCallback((index: number) => {
        setUndoRedoState(current => {
            const allStates = [...current.past, current.present, ...current.future];

            if (index < 0 || index >= allStates.length) {
                return current;
            }

            isUndoingOrRedoing.current = true;

            return {
                past: allStates.slice(0, index),
                present: allStates[index],
                future: allStates.slice(index + 1)
            };
        });

        // Reset flag after state update is processed by React
        queueMicrotask(() => {
            isUndoingOrRedoing.current = false;
        });
    }, []);

    return {
        state: undoRedoState.present,
        setState,
        undo,
        redo,
        canUndo: undoRedoState.past.length > 0,
        canRedo: undoRedoState.future.length > 0,
        clear,
        jumpTo,
        history: [...undoRedoState.past, undoRedoState.present, ...undoRedoState.future]
    };
};
