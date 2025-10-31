// ========================================
// SmartQuote v2.0 - Email Drafts Panel
// ========================================

import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabaseClient';
import { QuoteDraft } from '../types';

export default function EmailDraftsPanel() {
    const [drafts, setDrafts] = useState<QuoteDraft[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadDrafts();
    }, []);

    const loadDrafts = async () => {
        setLoading(true);
        const { data } = await supabase
            .from('smartquote_v2_quote_drafts')
            .select('*')
            .eq('status', 'pending_review')
            .order('created_at', { ascending: false });
        setDrafts(data || []);
        setLoading(false);
    };

    return (
        <div className="space-y-6">
            <div className="bg-slate-700 rounded-xl p-6">
                <h2 className="text-2xl font-bold text-white mb-4">Email Quote Drafts</h2>
                <p className="text-slate-300">Review AI-prepared quotes from emails</p>

                {loading ? (
                    <div className="text-center py-12 text-slate-400">Loading drafts...</div>
                ) : drafts.length === 0 ? (
                    <div className="text-center py-12">
                        <div className="text-6xl mb-4">📧</div>
                        <p className="text-slate-400 mb-2">No pending drafts</p>
                        <p className="text-slate-500 text-sm">Quotes from emails will appear here for review</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {drafts.map((draft) => (
                            <div key={draft.id} className="bg-slate-600 rounded-lg p-6">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex-1">
                                        <h3 className="text-lg font-bold text-white mb-1">
                                            Draft from Email
                                        </h3>
                                        <div className="flex items-center space-x-2 text-sm text-slate-300">
                                            <span>Confidence: {(draft.confidenceScore || 0) * 100}%</span>
                                            <span>•</span>
                                            <span>{new Date(draft.createdAt).toLocaleString()}</span>
                                        </div>
                                    </div>
                                    <div className="flex space-x-2">
                                        <button className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded text-white font-medium">
                                            Review
                                        </button>
                                        <button className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded text-white font-medium">
                                            Reject
                                        </button>
                                    </div>
                                </div>
                                {draft.requiresAttention && draft.attentionFlags && (
                                    <div className="bg-yellow-500/20 border border-yellow-500/30 rounded p-3">
                                        <p className="text-yellow-300 text-sm font-semibold mb-1">Requires Attention:</p>
                                        <ul className="list-disc list-inside text-yellow-200 text-sm">
                                            {draft.attentionFlags.map((flag, i) => (
                                                <li key={i}>{flag}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
