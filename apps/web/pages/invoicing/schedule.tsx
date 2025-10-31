import { useRouter } from 'next/router';
import React from 'react';
import { useEffect } from 'react';

import InvoiceScheduleTab from '@/components/tabs/InvoiceScheduleTab';
import { useHasInvoiceAccess } from '@/hooks/useHasInvoiceAccess';
import { useUserRole } from '@/hooks/useUserRole';

export default function InvoiceSchedulePage() {
  const router = useRouter();
  const { hasAccess, loading: permissionLoading } = useHasInvoiceAccess();
  const { role: _role } = useUserRole();

  useEffect(() => {
    if (!permissionLoading && !hasAccess) {
      // Redirect to dashboard or show error
      router.push('/dashboard');
    }
  }, [hasAccess, permissionLoading, router]);

  if (permissionLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#0a0a0a',
        color: '#fafafa',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          textAlign: 'center',
          padding: '40px'
        }}>
          <div style={{
            width: '32px',
            height: '32px',
            border: '3px solid rgba(59, 130, 246, 0.2)',
            borderTop: '3px solid #3b82f6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }}></div>
          <div>Checking permissions...</div>
        </div>
        <style jsx>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (!hasAccess) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#0a0a0a',
        color: '#fafafa',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{
          textAlign: 'center',
          padding: '40px',
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          borderRadius: '12px',
          maxWidth: '400px'
        }}>
          <div style={{
            fontSize: '32px',
            marginBottom: '16px'
          }}>🚫</div>
          <h2 style={{
            margin: '0 0 8px 0',
            color: '#ef4444',
            fontSize: '18px',
            fontWeight: '600'
          }}>Access Restricted</h2>
          <p style={{
            margin: '0 0 20px 0',
            color: '#a1a1aa',
            fontSize: '14px'
          }}>
            You don&apos;t have permission to access invoice schedules. Please contact your administrator.
          </p>
          <button
            onClick={() => router.push('/dashboard')}
            style={{
              padding: '10px 20px',
              background: '#3b82f6',
              border: 'none',
              borderRadius: '8px',
              color: 'white',
              fontSize: '14px',
              cursor: 'pointer',
              fontWeight: '600'
            }}
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return <InvoiceScheduleTab />;
}