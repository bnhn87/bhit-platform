import React from 'react';

import AppNav from '../../components/AppNav';
import FeatureFlagAdmin from '../../components/FeatureFlagAdmin';

export default function FeatureFlagsPage() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <AppNav />
      <main style={{
        flex: 1,
        padding: 24,
        backgroundColor: '#0b1118',
        color: '#e8eef6'
      }}>
        <div style={{
          maxWidth: 1200,
          margin: '0 auto'
        }}>
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-neutral-100 mb-2">Feature Flags Administration</h1>
            <p className="text-neutral-400">
              Control the rollout of experimental features and system capabilities
            </p>
          </div>

          <FeatureFlagAdmin />
        </div>
      </main>
    </div>
  );
}