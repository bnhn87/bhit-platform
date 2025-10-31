import React, { useEffect, useRef } from 'react';

import { theme } from '../../../lib/theme';
import { useFocusTrap } from '../hooks/useAccessibility';
import { getDialogA11yProps, getFocusStyles } from '../utils/accessibilityHelpers';
import { KeyboardShortcut, getShortcutLabel } from '../hooks/useKeyboardShortcuts';

interface KeyboardShortcutsHelpProps {
    shortcuts: KeyboardShortcut[];
    onClose: () => void;
}

export const KeyboardShortcutsHelp: React.FC<KeyboardShortcutsHelpProps> = ({ shortcuts, onClose }) => {
    const enabledShortcuts = shortcuts.filter(s => s.enabled !== false);
    const dialogRef = useFocusTrap(true);
    const closeButtonRef = useRef<HTMLButtonElement>(null);

    // Focus close button when modal opens
    useEffect(() => {
        if (closeButtonRef.current) {
            closeButtonRef.current.focus();
        }
    }, []);

    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: 'rgba(0, 0, 0, 0.75)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10000,
                padding: 20
            }}
            onClick={onClose}
            aria-hidden="false"
        >
            <div
                ref={dialogRef as React.RefObject<HTMLDivElement>}
                {...getDialogA11yProps({
                    label: 'Keyboard Shortcuts Help',
                    describedBy: 'shortcuts-description',
                    modal: true
                })}
                style={{
                    background: theme.colors.panel,
                    borderRadius: theme.radii.xl,
                    padding: 32,
                    maxWidth: 600,
                    width: '100%',
                    maxHeight: '80vh',
                    overflowY: 'auto',
                    border: `1px solid ${theme.colors.border}`,
                    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)'
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 24
                }}>
                    <h2
                        id="shortcuts-title"
                        style={{
                            fontSize: 24,
                            fontWeight: 700,
                            color: theme.colors.text,
                            margin: 0
                        }}
                    >
                        Keyboard Shortcuts
                    </h2>
                    <button
                        ref={closeButtonRef}
                        onClick={onClose}
                        aria-label="Close keyboard shortcuts help"
                        style={{
                            background: 'transparent',
                            border: 'none',
                            fontSize: 24,
                            color: theme.colors.textSubtle,
                            cursor: 'pointer',
                            padding: 8,
                            lineHeight: 1,
                            borderRadius: theme.radii.sm
                        }}
                        onFocus={(e) => {
                            Object.assign(e.currentTarget.style, getFocusStyles());
                        }}
                        onBlur={(e) => {
                            e.currentTarget.style.outline = 'none';
                        }}
                    >
                        ×
                    </button>
                </div>

                <div
                    id="shortcuts-description"
                    role="list"
                    aria-label="Available keyboard shortcuts"
                    style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
                >
                    {enabledShortcuts.map((shortcut, index) => (
                        <div
                            key={index}
                            role="listitem"
                            aria-setsize={enabledShortcuts.length}
                            aria-posinset={index + 1}
                            style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: 12,
                                background: theme.colors.panelAlt,
                                borderRadius: theme.radii.md,
                                border: `1px solid ${theme.colors.border}`
                            }}
                        >
                            <span style={{
                                fontSize: 14,
                                color: theme.colors.text
                            }}>
                                {shortcut.description}
                            </span>
                            <kbd
                                aria-label={`Keyboard shortcut: ${getShortcutLabel({
                                    key: shortcut.key,
                                    ctrlKey: shortcut.ctrlKey,
                                    shiftKey: shortcut.shiftKey,
                                    altKey: shortcut.altKey
                                })}`}
                                style={{
                                    padding: '4px 8px',
                                    background: theme.colors.muted,
                                    border: `1px solid ${theme.colors.border}`,
                                    borderRadius: theme.radii.sm,
                                    fontSize: 13,
                                    fontWeight: 600,
                                    color: theme.colors.text,
                                    fontFamily: 'monospace',
                                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
                                }}
                            >
                                {getShortcutLabel({
                                    key: shortcut.key,
                                    ctrlKey: shortcut.ctrlKey,
                                    shiftKey: shortcut.shiftKey,
                                    altKey: shortcut.altKey
                                })}
                            </kbd>
                        </div>
                    ))}
                </div>

                <div style={{
                    marginTop: 24,
                    padding: 12,
                    background: `${theme.colors.accent}15`,
                    border: `1px solid ${theme.colors.accent}30`,
                    borderRadius: theme.radii.md,
                    fontSize: 13,
                    color: theme.colors.textSubtle
                }}>
                    💡 <strong>Tip:</strong> Press <kbd style={{
                        padding: '2px 6px',
                        background: theme.colors.muted,
                        border: `1px solid ${theme.colors.border}`,
                        borderRadius: theme.radii.sm,
                        fontSize: 12,
                        fontFamily: 'monospace'
                    }}>?</kbd> or <kbd style={{
                        padding: '2px 6px',
                        background: theme.colors.muted,
                        border: `1px solid ${theme.colors.border}`,
                        borderRadius: theme.radii.sm,
                        fontSize: 12,
                        fontFamily: 'monospace'
                    }}>Shift+/</kbd> anytime to view this help panel.
                </div>
            </div>
        </div>
    );
};
