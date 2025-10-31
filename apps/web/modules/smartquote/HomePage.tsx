
import React from 'react';

import { theme } from '../../lib/theme';

import { FileTextIcon, ListBulletIcon, ClockIcon, GearIcon } from './components/icons';
import { getDashboardCardStyle, getDashboardTypographyStyle, getDashboardGridStyle, spacing as _spacing } from './utils/dashboardStyles';
import { getIconProps } from './utils/iconSizing';


type AppView = 'home' | 'parsing' | 'manual' | 'history' | 'results' | 'admin';

interface HomePageProps {
    onSelectView: (view: AppView) => void;
}

const ActionCard: React.FC<{ title: string; description: string; onClick: () => void; children: React.ReactNode }> = ({ title, description, onClick, children }) => (
    <div 
        onClick={onClick}
        style={{
            ...getDashboardCardStyle('glassmorphic'),
            textAlign: "center",
            cursor: "pointer",
            minHeight: '240px', // Dashboard card minHeight: 120px * 2
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: '32px 20px', // Dashboard panel padding adjusted for cards
        }}
        onMouseOver={(e) => {
            e.currentTarget.style.transform = "translateY(-1px)"; // Dashboard hover transform
            e.currentTarget.style.boxShadow = "0 0 14px 3px rgba(0, 170, 255, 0.35)"; // Dashboard hover shadow
        }}
        onMouseOut={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 0 10px 1px rgba(0, 170, 255, 0.2), inset 0 1px 2px rgba(255, 255, 255, 0.1)";
        }}
    >
        <div style={{
            width: 64, // Reduced from 80 to match Dashboard proportions
            height: 64,
            background: `linear-gradient(135deg, ${theme.colors.accent}, ${theme.colors.accentAlt})`,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            marginBottom: '24px', // Dashboard section spacing
            boxShadow: `0 0 10px 1px rgba(0, 170, 255, 0.2)`
        }}>
            {children}
        </div>
        <h3 style={{
            ...getDashboardTypographyStyle('cardTitle'),
            marginBottom: '12px', // Dashboard element spacing
        }}>{title}</h3>
        <p style={{
            ...getDashboardTypographyStyle('bodyText'),
            color: theme.colors.textSubtle,
            margin: '0 0 24px 0', // Dashboard section spacing
            maxWidth: '280px',
            textAlign: 'center'
        }}>{description}</p>
        <div style={{
            ...getDashboardTypographyStyle('buttonText'),
            color: theme.colors.accent,
            display: "flex",
            alignItems: "center",
            gap: '8px' // Dashboard small spacing
        }}>
            Get Started
            <span style={{ fontSize: '16px' }}>→</span>
        </div>
    </div>
);

export const HomePage: React.FC<HomePageProps> = ({ onSelectView }) => {
    return (
        <div style={{ 
            padding: '24px', // Dashboard container padding
            maxWidth: '1200px', // Dashboard max width
            margin: '0 auto'
        }}>
            <div style={{ 
                textAlign: "center", 
                marginBottom: '32px' // Dashboard header margin
            }}>
                {/* Logo */}
                <div style={{ marginBottom: '24px' }}> {/* Dashboard section spacing */}
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                        src="/brand/logo.jpeg"
                        alt="BHIT Logo"
                        style={{
                            height: 'clamp(60px, 10vw, 80px)', // Responsive height
                            width: "auto",
                            maxWidth: "100%",
                            objectFit: "contain"
                        }}
                    />
                </div>
                <h1 style={{
                    ...getDashboardTypographyStyle('mainTitle'),
                    fontSize: 'clamp(32px, 6vw, 48px)', // Adjusted to be more reasonable
                    marginBottom: '16px', // Dashboard card spacing
                    background: `linear-gradient(135deg, ${theme.colors.text}, ${theme.colors.accent})`,
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text"
                }}>SmartQuote</h1>
                <p style={{
                    ...getDashboardTypographyStyle('bodyText'),
                    color: theme.colors.textSubtle,
                    maxWidth: '600px',
                    marginLeft: "auto",
                    marginRight: "auto",
                    marginBottom: 0
                }}>Your intelligent quoting assistant. Choose an option below to get started with AI-powered document processing.</p>
            </div>
            <div style={{
                ...getDashboardGridStyle('main'), // Dashboard main grid
                gap: '24px', // Dashboard section spacing
                maxWidth: '1200px',
                margin: '0 auto'
            }}>
                <ActionCard
                    title="Parse Documents"
                    description="AI-powered extraction from PDF, Word, images, or pasted text."
                    onClick={() => onSelectView('parsing')}
                >
                    <FileTextIcon {...getIconProps('feature')} />
                </ActionCard>
                <ActionCard
                    title="Manual Entry"
                    description="Build a quote by selecting products from a list."
                    onClick={() => onSelectView('manual')}
                >
                    <ListBulletIcon {...getIconProps('feature')} />
                </ActionCard>
                <ActionCard
                    title="Quote History"
                    description="View, load, or manage your previously saved quotes."
                    onClick={() => onSelectView('history')}
                >
                    <ClockIcon {...getIconProps('feature')} />
                </ActionCard>
                 <ActionCard
                    title="Admin Panel"
                    description="Customize application settings, pricing, and products."
                    onClick={() => onSelectView('admin')}
                >
                    <GearIcon {...getIconProps('feature')} />
                </ActionCard>
            </div>
        </div>
    );
};
