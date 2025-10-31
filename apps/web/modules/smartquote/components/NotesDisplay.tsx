import React, { useState, useEffect } from 'react';
import { theme } from '../../../lib/theme';
import { getDashboardCardStyle, getDashboardTypographyStyle, getDashboardInputStyle } from '../utils/dashboardStyles';
import { FileTextIcon, PencilIcon, CheckCircleIcon, XCircleIcon } from './icons';
import { getIconProps } from '../utils/iconSizing';

interface NotesDisplayProps {
    notes: {
        parking?: string;
        mileage?: string;
        ulez?: string;
        delivery?: string;
    };
    onNotesChange?: (notes: any) => void;
    editable?: boolean;
}

export const NotesDisplay: React.FC<NotesDisplayProps> = ({ notes, onNotesChange, editable = true }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editedNotes, setEditedNotes] = useState(notes);

    useEffect(() => {
        setEditedNotes(notes);
    }, [notes]);

    const handleSave = () => {
        if (onNotesChange) {
            onNotesChange(editedNotes);
        }
        setIsEditing(false);
    };

    const handleCancel = () => {
        setEditedNotes(notes);
        setIsEditing(false);
    };

    const hasNotes = notes.parking || notes.mileage || notes.ulez || notes.delivery;

    if (!hasNotes && !isEditing) {
        return (
            <div style={{
                ...getDashboardCardStyle('standard'),
                textAlign: 'center',
                padding: '32px'
            }}>
                <FileTextIcon {...getIconProps('feature', { color: theme.colors.textSubtle })} />
                <p style={{
                    ...getDashboardTypographyStyle('bodyText'),
                    color: theme.colors.textSubtle,
                    marginTop: '16px'
                }}>No notes added yet</p>
                {editable && (
                    <button
                        onClick={() => setIsEditing(true)}
                        style={{
                            marginTop: '16px',
                            padding: '8px 16px',
                            background: theme.colors.accent,
                            color: 'white',
                            border: 'none',
                            borderRadius: theme.radii.sm,
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: 500
                        }}
                    >
                        Add Notes
                    </button>
                )}
            </div>
        );
    }

    return (
        <div style={{
            ...getDashboardCardStyle('standard'),
            maxWidth: 'none'
        }}>
            <div style={{
                padding: '16px',
                borderBottom: `1px solid ${theme.colors.border}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                }}>
                    <FileTextIcon {...getIconProps('feature', { color: theme.colors.accent })} />
                    <div>
                        <h3 style={{
                            ...getDashboardTypographyStyle('sectionHeader'),
                            color: theme.colors.text,
                            margin: 0
                        }}>Additional Notes</h3>
                        <p style={{
                            ...getDashboardTypographyStyle('bodyText'),
                            color: theme.colors.textSubtle,
                            margin: '4px 0 0 0'
                        }}>Important information and conditions</p>
                    </div>
                </div>

                {editable && !isEditing && (
                    <button
                        onClick={() => setIsEditing(true)}
                        style={{
                            padding: '6px 12px',
                            background: 'transparent',
                            color: theme.colors.accent,
                            border: `1px solid ${theme.colors.accent}`,
                            borderRadius: theme.radii.sm,
                            cursor: 'pointer',
                            fontSize: '14px',
                            fontWeight: 500,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px'
                        }}
                    >
                        <PencilIcon style={{ width: '16px', height: '16px' }} />
                        Edit Notes
                    </button>
                )}

                {isEditing && (
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                            onClick={handleSave}
                            style={{
                                padding: '6px 12px',
                                background: theme.colors.success,
                                color: 'white',
                                border: 'none',
                                borderRadius: theme.radii.sm,
                                cursor: 'pointer',
                                fontSize: '14px',
                                fontWeight: 500,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                            }}
                        >
                            <CheckCircleIcon style={{ width: '16px', height: '16px' }} />
                            Save
                        </button>
                        <button
                            onClick={handleCancel}
                            style={{
                                padding: '6px 12px',
                                background: theme.colors.muted,
                                color: theme.colors.text,
                                border: 'none',
                                borderRadius: theme.radii.sm,
                                cursor: 'pointer',
                                fontSize: '14px',
                                fontWeight: 500,
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                            }}
                        >
                            <XCircleIcon style={{ width: '16px', height: '16px' }} />
                            Cancel
                        </button>
                    </div>
                )}
            </div>

            <div style={{ padding: '24px' }}>
                {isEditing ? (
                    <div style={{ display: 'grid', gap: '20px' }}>
                        <div>
                            <label style={{
                                ...getDashboardTypographyStyle('labelText'),
                                display: 'block',
                                marginBottom: '8px',
                                color: theme.colors.text,
                                fontWeight: 500
                            }}>
                                🅿️ Parking Information
                            </label>
                            <textarea
                                value={editedNotes.parking || ''}
                                onChange={(e) => setEditedNotes({ ...editedNotes, parking: e.target.value })}
                                placeholder="e.g., Paid parking required, £20/day at nearby NCP"
                                rows={2}
                                style={{
                                    ...getDashboardInputStyle(),
                                    width: '100%',
                                    resize: 'vertical',
                                    fontFamily: 'inherit'
                                }}
                            />
                        </div>

                        <div>
                            <label style={{
                                ...getDashboardTypographyStyle('labelText'),
                                display: 'block',
                                marginBottom: '8px',
                                color: theme.colors.text,
                                fontWeight: 500
                            }}>
                                🚗 Mileage & Travel
                            </label>
                            <textarea
                                value={editedNotes.mileage || ''}
                                onChange={(e) => setEditedNotes({ ...editedNotes, mileage: e.target.value })}
                                placeholder="e.g., 45 miles from depot, approximately 1.5 hours travel time"
                                rows={2}
                                style={{
                                    ...getDashboardInputStyle(),
                                    width: '100%',
                                    resize: 'vertical',
                                    fontFamily: 'inherit'
                                }}
                            />
                        </div>

                        <div>
                            <label style={{
                                ...getDashboardTypographyStyle('labelText'),
                                display: 'block',
                                marginBottom: '8px',
                                color: theme.colors.text,
                                fontWeight: 500
                            }}>
                                🌍 ULEZ/Congestion Charges
                            </label>
                            <textarea
                                value={editedNotes.ulez || ''}
                                onChange={(e) => setEditedNotes({ ...editedNotes, ulez: e.target.value })}
                                placeholder="e.g., Site is within ULEZ zone, £12.50 daily charge applies"
                                rows={2}
                                style={{
                                    ...getDashboardInputStyle(),
                                    width: '100%',
                                    resize: 'vertical',
                                    fontFamily: 'inherit'
                                }}
                            />
                        </div>

                        <div>
                            <label style={{
                                ...getDashboardTypographyStyle('labelText'),
                                display: 'block',
                                marginBottom: '8px',
                                color: theme.colors.text,
                                fontWeight: 500
                            }}>
                                📦 Delivery & Access Notes
                            </label>
                            <textarea
                                value={editedNotes.delivery || ''}
                                onChange={(e) => setEditedNotes({ ...editedNotes, delivery: e.target.value })}
                                placeholder="e.g., Narrow access road, small van only. Reception closes at 5pm."
                                rows={3}
                                style={{
                                    ...getDashboardInputStyle(),
                                    width: '100%',
                                    resize: 'vertical',
                                    fontFamily: 'inherit'
                                }}
                            />
                        </div>
                    </div>
                ) : (
                    <div style={{
                        display: 'grid',
                        gap: '20px'
                    }}>
                        {notes.parking && (
                            <div style={{
                                padding: '16px',
                                background: theme.colors.panelAlt,
                                borderRadius: theme.radii.md,
                                borderLeft: `4px solid ${theme.colors.info}`
                            }}>
                                <h4 style={{
                                    ...getDashboardTypographyStyle('cardTitle'),
                                    color: theme.colors.text,
                                    margin: '0 0 8px 0',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}>
                                    🅿️ Parking
                                </h4>
                                <p style={{
                                    ...getDashboardTypographyStyle('bodyText'),
                                    color: theme.colors.text,
                                    margin: 0,
                                    whiteSpace: 'pre-wrap',
                                    lineHeight: 1.6
                                }}>{notes.parking}</p>
                            </div>
                        )}

                        {notes.mileage && (
                            <div style={{
                                padding: '16px',
                                background: theme.colors.panelAlt,
                                borderRadius: theme.radii.md,
                                borderLeft: `4px solid ${theme.colors.success}`
                            }}>
                                <h4 style={{
                                    ...getDashboardTypographyStyle('cardTitle'),
                                    color: theme.colors.text,
                                    margin: '0 0 8px 0',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}>
                                    🚗 Mileage
                                </h4>
                                <p style={{
                                    ...getDashboardTypographyStyle('bodyText'),
                                    color: theme.colors.text,
                                    margin: 0,
                                    whiteSpace: 'pre-wrap',
                                    lineHeight: 1.6
                                }}>{notes.mileage}</p>
                            </div>
                        )}

                        {notes.ulez && (
                            <div style={{
                                padding: '16px',
                                background: theme.colors.panelAlt,
                                borderRadius: theme.radii.md,
                                borderLeft: `4px solid ${theme.colors.accent}`
                            }}>
                                <h4 style={{
                                    ...getDashboardTypographyStyle('cardTitle'),
                                    color: theme.colors.text,
                                    margin: '0 0 8px 0',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}>
                                    🌍 ULEZ/Congestion
                                </h4>
                                <p style={{
                                    ...getDashboardTypographyStyle('bodyText'),
                                    color: theme.colors.text,
                                    margin: 0,
                                    whiteSpace: 'pre-wrap',
                                    lineHeight: 1.6
                                }}>{notes.ulez}</p>
                            </div>
                        )}

                        {notes.delivery && (
                            <div style={{
                                padding: '16px',
                                background: theme.colors.panelAlt,
                                borderRadius: theme.radii.md,
                                borderLeft: `4px solid ${theme.colors.accent}`
                            }}>
                                <h4 style={{
                                    ...getDashboardTypographyStyle('cardTitle'),
                                    color: theme.colors.text,
                                    margin: '0 0 8px 0',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px'
                                }}>
                                    📦 Delivery & Access
                                </h4>
                                <p style={{
                                    ...getDashboardTypographyStyle('bodyText'),
                                    color: theme.colors.text,
                                    margin: 0,
                                    whiteSpace: 'pre-wrap',
                                    lineHeight: 1.6
                                }}>{notes.delivery}</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};