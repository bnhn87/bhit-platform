import React from 'react';

import { theme } from '../../../lib/theme';

/**
 * Skip links component for keyboard navigation
 * Allows users to skip repetitive navigation and jump to main content
 */
export const SkipLinks: React.FC = () => {
    const skipLinkStyle: React.CSSProperties = {
        position: 'absolute',
        left: '-10000px',
        top: 'auto',
        width: '1px',
        height: '1px',
        overflow: 'hidden',
        background: theme.colors.accent,
        color: 'white',
        padding: '12px 20px',
        textDecoration: 'none',
        borderRadius: theme.radii.md,
        fontWeight: 600,
        fontSize: '14px',
        zIndex: 10000,
    };

    const handleSkipToMain = (e: React.MouseEvent<HTMLAnchorElement>) => {
        e.preventDefault();
        const mainContent = document.getElementById('main-content');
        if (mainContent) {
            mainContent.focus();
            mainContent.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    const handleSkipToNav = (e: React.MouseEvent<HTMLAnchorElement>) => {
        e.preventDefault();
        const navigation = document.getElementById('main-navigation');
        if (navigation) {
            navigation.focus();
            navigation.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    return (
        <nav aria-label="Skip links">
            <a
                href="#main-content"
                onClick={handleSkipToMain}
                style={skipLinkStyle}
                onFocus={(e) => {
                    e.currentTarget.style.position = 'fixed';
                    e.currentTarget.style.left = '50%';
                    e.currentTarget.style.top = '16px';
                    e.currentTarget.style.transform = 'translateX(-50%)';
                    e.currentTarget.style.width = 'auto';
                    e.currentTarget.style.height = 'auto';
                    e.currentTarget.style.overflow = 'visible';
                }}
                onBlur={(e) => {
                    e.currentTarget.style.position = 'absolute';
                    e.currentTarget.style.left = '-10000px';
                    e.currentTarget.style.top = 'auto';
                    e.currentTarget.style.transform = 'none';
                    e.currentTarget.style.width = '1px';
                    e.currentTarget.style.height = '1px';
                    e.currentTarget.style.overflow = 'hidden';
                }}
            >
                Skip to main content
            </a>
            <a
                href="#main-navigation"
                onClick={handleSkipToNav}
                style={skipLinkStyle}
                onFocus={(e) => {
                    e.currentTarget.style.position = 'fixed';
                    e.currentTarget.style.left = '50%';
                    e.currentTarget.style.top = '16px';
                    e.currentTarget.style.transform = 'translateX(-50%)';
                    e.currentTarget.style.width = 'auto';
                    e.currentTarget.style.height = 'auto';
                    e.currentTarget.style.overflow = 'visible';
                }}
                onBlur={(e) => {
                    e.currentTarget.style.position = 'absolute';
                    e.currentTarget.style.left = '-10000px';
                    e.currentTarget.style.top = 'auto';
                    e.currentTarget.style.transform = 'none';
                    e.currentTarget.style.width = '1px';
                    e.currentTarget.style.height = '1px';
                    e.currentTarget.style.overflow = 'hidden';
                }}
            >
                Skip to navigation
            </a>
        </nav>
    );
};
