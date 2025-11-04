import { useState, useEffect } from 'react';

import { supabase } from '@/lib/supabaseClient';

export default function TestSchema() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function test() {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        const headers: any = {};
        if (session?.access_token) {
          headers['Authorization'] = `Bearer ${session.access_token}`;
        }

        const response = await fetch('/api/debug/check-schema', { headers });
        const data = await response.json();
        setResult(data);
      } catch (err: any) {
        setResult({ error: err.message });
      } finally {
        setLoading(false);
      }
    }

    test();
  }, []);

  if (loading) {
    return <div style={{ padding: '2rem', color: '#e8eef6' }}>Loading...</div>;
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ color: '#e8eef6', marginBottom: '1rem' }}>Schema Debug</h1>
      <pre style={{
        background: '#0f151c',
        color: '#e8eef6',
        padding: '1rem',
        borderRadius: '8px',
        overflow: 'auto',
        fontSize: '12px',
        lineHeight: '1.5'
      }}>
        {JSON.stringify(result, null, 2)}
      </pre>
    </div>
  );
}
