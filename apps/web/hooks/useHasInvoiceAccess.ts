import { useState, useEffect } from 'react';

import { getUserPermissions, canAccessInvoicing } from '@/lib/permissions';

export function useHasInvoiceAccess() {
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAccess();
  }, []);

  async function checkAccess() {
    try {
      const permissions = await getUserPermissions();
      setHasAccess(canAccessInvoicing(permissions));
    } catch (error: unknown) {
      console.error('Error checking invoice access:', error);
      setHasAccess(false);
    } finally {
      setLoading(false);
    }
  }

  return { hasAccess, loading };
}