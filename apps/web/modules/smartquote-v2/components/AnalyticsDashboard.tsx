// ========================================
// SmartQuote v2.0 - Analytics Dashboard
// ========================================

import React, { useState, useEffect } from 'react';

import analyticsService from '../services/analyticsService';

export default function AnalyticsDashboard() {
    const [stats, setStats] = useState({
        totalQuotes: 0,
        avgConfidence: 0,
        avgParseTime: 0,
        conversionRate: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadAnalytics();
    }, []);

    const loadAnalytics = async () => {
        setLoading(true);
        // Load analytics from service
        // For now, showing placeholder
        setStats({
            totalQuotes: 0,
            avgConfidence: 0,
            avgParseTime: 0,
            conversionRate: 0
        });
        setLoading(false);
    };

    return (
        <div className="space-y-6">
            <div className="bg-slate-700 rounded-xl p-6">
                <h2 className="text-2xl font-bold text-white mb-6">Analytics & Insights</h2>
                
                {loading ? (
                    <div className="text-center py-12 text-slate-400">Loading analytics...</div>
                ) : (
                    <div className="grid grid-cols-4 gap-6">
                        <div className="bg-gradient-to-br from-purple-600 to-purple-800 rounded-xl p-6">
                            <div className="text-purple-200 text-sm mb-2">Total Quotes</div>
                            <div className="text-4xl font-bold text-white">{stats.totalQuotes}</div>
                        </div>
                        <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl p-6">
                            <div className="text-blue-200 text-sm mb-2">Avg Confidence</div>
                            <div className="text-4xl font-bold text-white">{stats.avgConfidence}%</div>
                        </div>
                        <div className="bg-gradient-to-br from-green-600 to-green-800 rounded-xl p-6">
                            <div className="text-green-200 text-sm mb-2">Avg Parse Time</div>
                            <div className="text-4xl font-bold text-white">{stats.avgParseTime}ms</div>
                        </div>
                        <div className="bg-gradient-to-br from-orange-600 to-orange-800 rounded-xl p-6">
                            <div className="text-orange-200 text-sm mb-2">Conversion Rate</div>
                            <div className="text-4xl font-bold text-white">{stats.conversionRate}%</div>
                        </div>
                    </div>
                )}

                <div className="mt-8 bg-slate-800 rounded-lg p-6">
                    <h3 className="text-xl font-bold text-white mb-4">Coming Soon</h3>
                    <ul className="text-slate-300 space-y-2">
                        <li>• Parse accuracy trends</li>
                        <li>• Product usage patterns</li>
                        <li>• Quote conversion funnels</li>
                        <li>• Time efficiency metrics</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}
