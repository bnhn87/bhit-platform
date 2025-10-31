// ========================================
// SmartQuote v2.0 - Dashboard Integration Page
// ========================================
// This page runs SmartQuote v2 within the BHIT Work OS dashboard

import React from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/Layout';
import SmartQuoteV2App from '../modules/smartquote-v2/App';

export default function SmartQuoteV2Page() {
    const router = useRouter();

    return (
        <Layout>
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
                {/* Header with Navigation */}
                <div className="bg-slate-800/50 backdrop-blur-lg border-b border-slate-700">
                    <div className="max-w-7xl mx-auto px-6 py-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                                <button
                                    onClick={() => router.push('/dashboard')}
                                    className="text-slate-400 hover:text-white transition-colors"
                                >
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                    </svg>
                                </button>
                                <div>
                                    <h1 className="text-2xl font-bold text-white">SmartQuote v2.0</h1>
                                    <p className="text-slate-400 text-sm">Next-generation quote management</p>
                                </div>
                            </div>
                            <div className="flex items-center space-x-3">
                                <button
                                    onClick={() => router.push('/smart-quote')}
                                    className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-all"
                                >
                                    Switch to v1.0
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* SmartQuote v2 App */}
                <div className="p-6">
                    <SmartQuoteV2App />
                </div>
            </div>
        </Layout>
    );
}
