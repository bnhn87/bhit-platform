import React from 'react';

import FeatureFlagAdmin from '../../components/FeatureFlagAdmin';

export default function FeatureFlagsPage() {
  return (
    <div style={{ minHeight: '100vh', padding: '20px', fontFamily: "'Inter', sans-serif" }}>

      {/* Header - Matching Mockup */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div className="logo">
          <svg width="100" height="40" viewBox="0 0 100 40" xmlns="http://www.w3.org/2000/svg">
            <path d="M15.7 22.7H8v-5.3h7.7c1.5 0 2.7.3 3.7 1 .9.6 1.4 1.6 1.4 2.8 0 1.2-.5 2.1-1.4 2.8-.9.7-2.2 1-3.7 1zm0-13H8v-5h7.7c1.4 0 2.5.3 3.4.9.9.6 1.3 1.5 1.3 2.6 0 1.1-.4 2-1.3 2.6-.9.6-2 .9-3.4.9zm1.3 18c2.5-.9 4.4-2.6 5.6-5 .8-1.5 1.1-3.1 1.1-4.8 0-2.3-.7-4.3-2-5.8-1.3-1.6-3.2-2.5-5.7-2.7v-.2c2.1-.4 3.7-1.3 4.9-2.6 1.2-1.4 1.8-3.1 1.8-5.3 0-2.2-.7-4-2-5.4C19.4 1.9 17.6 1.2 15.2 1.2H0v30h17z" fill="#f38b00" />
            <path d="M34.5 31.2h7.6V17.9h15.5v13.3h7.6V0h-7.6v11.4H42.1V0h-7.6v31.2z" fill="#ffffff" />
            <path d="M76.8 31.2h7.6V10.1h-7.6v21.1zm3.8-24.6c2.3 0 4.2-1.9 4.2-4.2S82.9 0 80.6 0s-4.2 1.9-4.2 4.2 1.9 4.2 4.2 4.2z" fill="#ffffff" />
          </svg>
        </div>
        {/* Note: Global HeaderTrigger is fixed top-left, but we render this for visual fidelity to mockup */}
        <div className="menu-icon">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 12H21" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M3 6H21" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M3 18H21" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </header>

      {/* Navigation Cloud - Matching Mockup */}
      <nav className="nav-buttons">
        <button className="nav-btn">1. Dashboard</button>
        <button className="nav-btn">301. Progress</button>
        <button className="nav-btn">302. Smart Quote</button>
        <button className="nav-btn">302a. SmartQuote v3</button>
        <button className="nav-btn">303. Smartinvoice</button>
        <button className="nav-btn">304. Invoice Schedule</button>
        <button className="nav-btn">305. Feature Planner</button>
        <button className="nav-btn">307. Labour Scheduler</button>
        <button className="nav-btn">308. Planning</button>
        <button className="nav-btn active">412. Feature Flags</button>
        <button className="nav-btn">413. Deleted Jobs</button>
        <button className="nav-btn">414. Settings</button>
        <button className="nav-btn">DIRECTOR</button>
        <button className="nav-btn">Sign out</button>
      </nav>

      <main>
        <h1 style={{
          fontSize: '36px',
          fontWeight: 900,
          textTransform: 'uppercase',
          margin: 0,
          letterSpacing: '1px',
          color: 'var(--text)'
        }}>
          FEATURE FLAGS ADMINISTRATION
        </h1>
        <p style={{
          fontSize: '16px',
          marginTop: '5px',
          marginBottom: '40px',
          opacity: 0.9,
          color: 'var(--text)'
        }}>
          Control the rollout of experimental features and system capabilities
        </p>

        {/* Feature toggles component that iterates the flags */}
        <FeatureFlagAdmin />
      </main>
    </div>
  );
}