// ============================================================================
// SmartQuote v3 - Page Wrapper
// ============================================================================

import dynamic from 'next/dynamic';
import { useRouter } from 'next/router';
import React from 'react';

import Layout from '../components/Layout';

// Dynamic import to avoid SSR issues
const SmartQuoteV3App = dynamic(() => import('../modules/smartquote-v3/App'), {
    ssr: false,
});

export default function SmartQuoteV3Page() {
    const router = useRouter();

    return (
        <Layout>
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
                {/* Quick Navigation */}
                <div className="bg-slate-800/30 backdrop-blur-sm border-b border-slate-700/50">
                    <div className="max-w-7xl mx-auto px-6 py-3">
                        <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center space-x-4">
                                <button
                                    onClick={() => router.push('/dashboard')}
                                    className="text-slate-400 hover:text-white transition-colors"
                                >
                                    ← Dashboard
                                </button>
                                <span className="text-slate-500">|</span>
                                <button
                                    onClick={() => router.push('/smartquote')}
                                    className="text-slate-400 hover:text-white transition-colors"
                                >
                                    SmartQuote v1
                                </button>
                                <button
                                    onClick={() => router.push('/smartquote-v2')}
                                    className="text-slate-400 hover:text-white transition-colors"
                                >
                                    SmartQuote v2
                                </button>
                                <span className="px-3 py-1 bg-purple-600/30 text-purple-300 rounded-full text-xs font-semibold">
                                    v3.0 - Current
                                </span>
                            </div>
                            <div className="flex items-center space-x-4">
                                <a
                                    href="/modules/smartquote-v3/README.md"
                                    target="_blank"
                                    className="text-slate-400 hover:text-white transition-colors"
                                >
                                    📖 Documentation
                                </a>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main App */}
                <SmartQuoteV3App />

                {/* Footer */}
                <footer className="bg-slate-800/30 backdrop-blur-sm border-t border-slate-700/50 mt-12">
                    <div className="max-w-7xl mx-auto px-6 py-6">
                        <div className="text-center">
                            <p className="text-slate-400 text-sm">
                                SmartQuote v3.0 - Enterprise Quote Management
                            </p>
                            <p className="text-slate-500 text-xs mt-2">
                                ✅ Approval Workflows • ✅ Real-time Notifications • ✅ AI Parsing • ✅ Job Integration
                            </p>
                            <p className="text-slate-600 text-xs mt-3">
                                © 2025 BHIT Work OS - Built with world-class engineering 🌟
                            </p>
                        </div>
                    </div>
                </footer>
            </div>
        </Layout>
    );
}
