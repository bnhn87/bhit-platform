import { useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';

export default function Custom404() {
    const router = useRouter();

    useEffect(() => {
        // Legacy route catcher
        if (window.location.pathname.startsWith('/job/')) {
            const newPath = window.location.pathname.replace('/job/', '/jobs/');
            window.location.replace(newPath);
        }
    }, []);

    return (
        <div style={{
            height: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#0a0a0a',
            color: 'white',
            fontFamily: 'sans-serif'
        }}>
            <h1 style={{ fontSize: '4rem', fontWeight: 800, margin: 0, color: '#f38b00' }}>404</h1>
            <h2 style={{ marginBottom: '2rem' }}>Page Not Found</h2>

            <p style={{ color: '#888', marginBottom: '2rem' }}>
                The page {router.asPath} could not be found.
            </p>

            <div style={{ display: 'flex', gap: '1rem' }}>
                <button
                    onClick={() => router.back()}
                    style={{
                        padding: '10px 20px',
                        borderRadius: '8px',
                        border: '1px solid #333',
                        background: 'transparent',
                        color: 'white',
                        cursor: 'pointer'
                    }}
                >
                    Go Back
                </button>
                <Link href="/dashboard">
                    <button style={{
                        padding: '10px 20px',
                        borderRadius: '8px',
                        border: 'none',
                        background: '#f38b00',
                        color: 'white',
                        fontWeight: 'bold',
                        cursor: 'pointer'
                    }}>
                        Go to Dashboard
                    </button>
                </Link>
            </div>
        </div>
    );
}
