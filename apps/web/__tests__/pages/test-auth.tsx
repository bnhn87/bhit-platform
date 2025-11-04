import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function TestAuth() {
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

        const response = await fetch('/api/debug/check-auth', {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        });

        const data = await response.json();
        setResult(data);
      } catch (error: unknown) {
        setResult({ error: error.message });
      } finally {
        setLoading(false);
      }
    }

    test();
  }, []);

  if (loading) return <div style={{ padding: '20px' }}>Loading...</div>;

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>Auth Debug Test</h1>
      <pre style={{ background: '#f4f4f4', padding: '20px', overflow: 'auto' }}>
        {JSON.stringify(result, null, 2)}
      </pre>
    </div>
  );
}
