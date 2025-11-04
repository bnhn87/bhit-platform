import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function DebugProfile() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function test() {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
          setResult({ error: 'Not logged in' });
          setLoading(false);
          return;
        }

        const response = await fetch('/api/debug/profile-check', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        });

        const data = await response.json();
        setResult(data);
      } catch (error: unknown) {
        setResult({ error: error instanceof Error ? error.message : 'Unknown error' });
      } finally {
        setLoading(false);
      }
    }

    test();
  }, []);

  if (loading) return <div style={{ padding: '20px' }}>Loading...</div>;

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>Profile Debug</h1>
      <pre style={{ background: '#f4f4f4', padding: '20px', overflow: 'auto' }}>
        {JSON.stringify(result, null, 2)}
      </pre>
    </div>
  );
}
