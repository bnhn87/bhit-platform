import { useEffect, useCallback } from 'react';

export interface KeyboardShortcut {
    key: string;
    ctrlKey?: boolean;
    shiftKey?: boolean;
    altKey?: boolean;
    metaKey?: boolean;
    callback: () => void;
    description: string;
    enabled?: boolean;
}

export const useKeyboardShortcuts = (shortcuts: KeyboardShortcut[]) => {
    const handleKeyDown = useCallback((event: KeyboardEvent) => {
        // Don't trigger shortcuts when typing in input/textarea
        const target = event.target as HTMLElement;
        if (
            target.tagName === 'INPUT' ||
            target.tagName === 'TEXTAREA' ||
            target.isContentEditable
        ) {
            // Allow Escape to work in inputs
            if (event.key !== 'Escape') {
                return;
            }
        }

        for (const shortcut of shortcuts) {
            if (shortcut.enabled === false) continue;

            const keyMatches = event.key.toLowerCase() === shortcut.key.toLowerCase();
            const ctrlMatches = shortcut.ctrlKey ? event.ctrlKey || event.metaKey : !event.ctrlKey && !event.metaKey;
            const shiftMatches = shortcut.shiftKey ? event.shiftKey : !event.shiftKey;
            const altMatches = shortcut.altKey ? event.altKey : !event.altKey;

            if (keyMatches && ctrlMatches && shiftMatches && altMatches) {
                event.preventDefault();
                shortcut.callback();
                break;
            }
        }
    }, [shortcuts]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);
};

export const getShortcutLabel = (shortcut: Omit<KeyboardShortcut, 'callback' | 'description' | 'enabled'>) => {
    const parts: string[] = [];
    const isMac = typeof window !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;

    if (shortcut.ctrlKey) {
        parts.push(isMac ? '⌘' : 'Ctrl');
    }
    if (shortcut.shiftKey) {
        parts.push('Shift');
    }
    if (shortcut.altKey) {
        parts.push(isMac ? '⌥' : 'Alt');
    }

    parts.push(shortcut.key.toUpperCase());

    return parts.join(isMac ? '' : '+');
};
