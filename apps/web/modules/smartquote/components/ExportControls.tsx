
import React from 'react';

import { theme } from '../../../lib/theme';
import { getIconProps } from '../utils/iconSizing';

import { DownloadCloudIcon, FileIcon, SaveIcon, BuildingIcon } from './icons';

interface ExportControlsProps {
    onExportPdf: () => void;
    onExportXlsx: () => void;
    onSaveQuote: () => void;
    onCreateJob?: () => void;
}

export const ExportControls: React.FC<ExportControlsProps> = ({ onExportPdf, onExportXlsx, onSaveQuote, onCreateJob }) => {
    // console.log('🎛️ ExportControls rendered with onCreateJob:', !!onCreateJob);
    
    return (
        <div style={{
            background: theme.colors.panel,
            borderRadius: theme.radii.xl,
            boxShadow: theme.shadow,
            padding: 32,
            border: `1px solid ${theme.colors.border}`
        }}>
            <div style={{ textAlign: "center", marginBottom: 32 }}>
                <h3 style={{ fontSize: 24, fontWeight: 700, color: theme.colors.text, margin: 0, marginBottom: 8 }}>Quote Complete</h3>
                <p style={{ fontSize: 16, color: theme.colors.textSubtle, margin: 0 }}>Your quote is ready! Choose how you&apos;d like to proceed.</p>
            </div>
            <div style={{
                display: "flex",
                flexDirection: "column",
                gap: 16
            }}>
                 <button
                    onClick={onSaveQuote}
                    style={{
                        width: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "16px 24px",
                        border: "none",
                        fontSize: 16,
                        fontWeight: 600,
                        borderRadius: theme.radii.lg,
                        color: "white",
                        background: `linear-gradient(135deg, ${theme.colors.accent}, ${theme.colors.accentAlt})`,
                        cursor: "pointer",
                        transition: "all 0.2s ease",
                        boxShadow: `0 4px 16px rgba(59, 130, 246, 0.3)`
                    }}
                    onMouseOver={(e) => {
                        e.currentTarget.style.transform = "translateY(-2px)";
                        e.currentTarget.style.boxShadow = `0 8px 24px rgba(59, 130, 246, 0.4)`;
                    }}
                    onMouseOut={(e) => {
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.boxShadow = `0 4px 16px rgba(59, 130, 246, 0.3)`;
                    }}
                >
                    <SaveIcon {...getIconProps('button', { marginRight: 12 })} />
                    Save Quote to History
                </button>
                
                {onCreateJob && (
                    <button
                        onClick={() => {
                            // console.log('🚨 CREATE JOB BUTTON CLICKED!');
                            onCreateJob();
                        }}
                        style={{
                            width: "100%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            padding: "16px 24px",
                            border: "none",
                            fontSize: 16,
                            fontWeight: 600,
                            borderRadius: theme.radii.lg,
                            color: "white",
                            background: `linear-gradient(135deg, ${theme.colors.accentAlt}, #10b981)`,
                            cursor: "pointer",
                            transition: "all 0.2s ease",
                            boxShadow: `0 4px 16px rgba(16, 185, 129, 0.3)`
                        }}
                        onMouseOver={(e) => {
                            e.currentTarget.style.transform = "translateY(-2px)";
                            e.currentTarget.style.boxShadow = `0 8px 24px rgba(16, 185, 129, 0.4)`;
                        }}
                        onMouseOut={(e) => {
                            e.currentTarget.style.transform = "translateY(0)";
                            e.currentTarget.style.boxShadow = `0 4px 16px rgba(16, 185, 129, 0.3)`;
                        }}
                    >
                        <BuildingIcon {...getIconProps('button', { marginRight: 12 })} />
                        Create Job from Quote
                    </button>
                )}
                
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                    <button
                        onClick={onExportPdf}
                        style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            padding: "12px 20px",
                            border: `1px solid ${theme.colors.border}`,
                            fontSize: 14,
                            fontWeight: 500,
                            borderRadius: theme.radii.lg,
                            color: theme.colors.text,
                            background: theme.colors.panelAlt,
                            cursor: "pointer",
                            transition: "all 0.2s ease"
                        }}
                        onMouseOver={(e) => {
                            e.currentTarget.style.background = theme.colors.muted;
                            e.currentTarget.style.borderColor = theme.colors.danger;
                            e.currentTarget.style.transform = "translateY(-1px)";
                        }}
                        onMouseOut={(e) => {
                            e.currentTarget.style.background = theme.colors.panelAlt;
                            e.currentTarget.style.borderColor = theme.colors.border;
                            e.currentTarget.style.transform = "translateY(0)";
                        }}
                    >
                        <DownloadCloudIcon {...getIconProps('button', { marginRight: 8, color: theme.colors.danger })} />
                        Client PDF
                    </button>
                    <button
                        onClick={onExportXlsx}
                        style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            padding: "12px 20px",
                            border: `1px solid ${theme.colors.border}`,
                            fontSize: 14,
                            fontWeight: 500,
                            borderRadius: theme.radii.lg,
                            color: theme.colors.text,
                            background: theme.colors.panelAlt,
                            cursor: "pointer",
                            transition: "all 0.2s ease"
                        }}
                        onMouseOver={(e) => {
                            e.currentTarget.style.background = theme.colors.muted;
                            e.currentTarget.style.borderColor = theme.colors.accentAlt;
                            e.currentTarget.style.transform = "translateY(-1px)";
                        }}
                        onMouseOut={(e) => {
                            e.currentTarget.style.background = theme.colors.panelAlt;
                            e.currentTarget.style.borderColor = theme.colors.border;
                            e.currentTarget.style.transform = "translateY(0)";
                        }}
                    >
                        <FileIcon {...getIconProps('button', { marginRight: 8, color: theme.colors.accentAlt })} />
                        Internal Excel
                    </button>
                </div>
            </div>
        </div>
    );
};
