import { Menu } from "lucide-react";
import React from "react";

interface HeaderTriggerProps {
    onOpen: () => void;
}

export default function HeaderTrigger({ onOpen }: HeaderTriggerProps) {
    return (
        <div style={{
            position: 'sticky',
            top: 16, // Stick 16px from top when scrolling
            zIndex: 10001,
            display: 'flex',
            alignItems: 'flex-start',
            pointerEvents: 'none',
            width: '100%',
            // If height is auto, it pushes main down "too much"?
            // Hamburger is 40px. Padding 16. Total space ~72px.
            // If we want the classic sidebar trigger look, it usually floats OVER the main content top-left corner.
            // But BELOW the banner.
            // So: Sticky positioning. Top: 0. 
            // But we don't want it to occupy 72px of white space at the top of the Main content.
            // Solution: 
            // Keep it Sticky. 
            // Set height to 0. Use Overflow visible.
            // Then it conceptually starts at the top of Main (below banner) but doesn't push Main down.
            // USER SAID: "banner... pushes everything down."
            // Does hamburger push content down? Usually no, hamburger floats over content.
            // So Banner -> [Hamburger (Sticky, Height 0, float over)] -> Main Content.
            // Banner pushes [Hamburger + Main].
            // This satisfies "Hamburger below banner".
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
