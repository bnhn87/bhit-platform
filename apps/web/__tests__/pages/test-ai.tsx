import { useState } from 'react';

export default function TestAiPage() {
    const [response, setResponse] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const runTest = async () => {
        setIsLoading(true);
        setResponse('');
        try {
            const res = await fetch('/api/test-ai');
            const data = await res.json();
            setResponse(JSON.stringify(data, null, 2));
        } catch {
            setResponse('Failed to get a response.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div>
            <h1>AI Connection Test</h1>
            <p>Click the button to send a simple prompt to the Gemini API.</p>
            <button onClick={runTest} disabled={isLoading}>
                {isLoading ? 'Testing...' : 'Run AI Test'}
            </button>
            {response && (
                <div style={{ marginTop: '20px' }}>
                    <h2>Response:</h2>
                    <pre style={{ background: '#0e141b', padding: '16px', borderRadius: '8px' }}>
                        <code>{response}</code>
                    </pre>
                </div>
            )}
        </div>
    );
}