import { Menu } from "lucide-react";
import React from "react";

interface HeaderTriggerProps {
    onOpen: () => void;
}

export default function HeaderTrigger({ onOpen }: HeaderTriggerProps) {
    return (
        <div style={{
            position: 'fixed',
            top: 16,
            left: 16,
            zIndex: 9990,
            display: 'flex',
            alignItems: 'center',
            pointerEvents: 'none',
        }}>
            <button
                onClick={onOpen}
                aria-label="Open Menu"
                style={{
                    pointerEvents: 'auto',
                    background: 'rgba(10, 14, 23, 0.4)', // Glass dark
                    backdropFilter: 'blur(12px)',
                    border: '1px solid rgba(243, 139, 0, 0.3)', // Subtle orange border
                    borderRadius: '8px',
                    width: '40px',
                    height: '40px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#f38b00', // Safety Orange Icon
                    cursor: 'pointer',
                    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
                    transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(243, 139, 0, 0.15)'; // Orange tint on hover
                    e.currentTarget.style.borderColor = '#f38b00';
                    e.currentTarget.style.transform = 'scale(1.05)';
                    e.currentTarget.style.boxShadow = '0 0 15px rgba(243, 139, 0, 0.2)';
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(10, 14, 23, 0.4)';
                    e.currentTarget.style.borderColor = 'rgba(243, 139, 0, 0.3)';
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.4)';
                }}
            >
                <Menu size={24} />
            </button>
        </div>
    );
}
