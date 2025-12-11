import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';

export default function ResetPasswordPage() {
    const router = useRouter();
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    // Ensure we are in a session (magic link should have handled this)
    useEffect(() => {
        supabase.auth.getSession().then(({ data }) => {
            if (!data.session) {
                setError('Invalid or expired reset link.');
            }
        });
    }, []);

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const { error: updateError } = await supabase.auth.updateUser({
            password: password
        });

        if (updateError) {
            setError(updateError.message);
            setLoading(false);
        } else {
            setSuccess(true);
            setLoading(false);
            // Optional: Redirect after delay
            setTimeout(() => {
                router.push('/dashboard');
            }, 2000);
        }
    };

    return (
        <div style={{ minHeight: '100vh', background: '#0e141b', color: '#e8eef6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: '100%', maxWidth: 360, padding: 24, background: '#121a23', borderRadius: 12, border: '1px solid #1d2733' }}>
                <h1 style={{ marginTop: 0 }}>Set New Password</h1>

                {success ? (
                    <div style={{ textAlign: 'center' }}>
                        <p style={{ color: '#4ade80' }}>Password updated successfully!</p>
                        <p>Redirecting to dashboard...</p>
                    </div>
                ) : (
                    <form onSubmit={handleReset} style={{ display: 'grid', gap: 16 }}>
                        <label style={{ display: 'grid', gap: 6 }}>
                            <span>New Password</span>
                            <input
                                type="password"
                                required
                                minLength={6}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                style={{ padding: '10px 12px', borderRadius: 8, background: '#0b1117', border: '1px solid #1d2733', color: '#fff' }}
                            />
                        </label>

                        {error && <div style={{ color: '#ef4444' }}>{error}</div>}

                        <button
                            type="submit"
                            disabled={loading}
                            style={{ padding: '10px', borderRadius: 8, background: '#3b82f6', color: 'white', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                        >
                            {loading ? 'Updating...' : 'Update Password'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}
