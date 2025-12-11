import { Menu } from "lucide-react";
import React from "react";

interface HeaderTriggerProps {
    onOpen: () => void;
}

export default function HeaderTrigger({ onOpen }: HeaderTriggerProps) {
    return (
        <div style={{
            position: 'sticky',
            top: 0,
            zIndex: 9000,
            padding: '16px',
            display: 'flex',
            alignItems: 'center',
            pointerEvents: 'none', // Let clicks pass through empty space
        }}>
            <button
                onClick={onOpen}
                aria-label="Open Menu"
                style={{
                    pointerEvents: 'auto', // Re-enable clicks for the button
                    background: 'rgba(15, 23, 42, 0.6)',
                    backdropFilter: 'blur(8px)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    borderRadius: '8px',
                    width: '40px',
                    height: '40px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#e2e8f0',
                    cursor: 'pointer',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(15, 23, 42, 0.8)';
                    e.currentTarget.style.transform = 'scale(1.05)';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(15, 23, 42, 0.6)';
                    e.currentTarget.style.transform = 'scale(1)';
                }}
            >
                <Menu size={24} />
            </button>
        </div>
    );
}
