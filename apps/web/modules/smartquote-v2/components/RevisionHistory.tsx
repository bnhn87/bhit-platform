// ========================================
// SmartQuote v2.0 - Revision History Component
// ========================================

import React, { useState, useEffect } from 'react';

import revisionTrackingService from '../services/revisionTrackingService';
import { QuoteRevision } from '../types';

interface RevisionHistoryProps {
    quoteId: string;
    onCreateRevision: (changesSummary: string) => void;
}

export default function RevisionHistory({ quoteId, onCreateRevision }: RevisionHistoryProps) {
    const [revisions, setRevisions] = useState<QuoteRevision[]>([]);
    const [showNewRevisionDialog, setShowNewRevisionDialog] = useState(false);
    const [changesSummary, setChangesSummary] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadRevisions();
    }, [quoteId]);

    const loadRevisions = async () => {
        setLoading(true);
        const data = await revisionTrackingService.getRevisionHistory(quoteId);
        setRevisions(data);
        setLoading(false);
    };

    const handleCreateRevision = () => {
        onCreateRevision(changesSummary);
        setShowNewRevisionDialog(false);
        setChangesSummary('');
        loadRevisions();
    };

    return (
        <div className="bg-slate-700 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-white">Revision History</h3>
                <button
                    onClick={() => setShowNewRevisionDialog(true)}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-all"
                >
                    Create New Revision
                </button>
            </div>

            {loading ? (
                <div className="text-center py-8 text-slate-400">Loading revisions...</div>
            ) : revisions.length === 0 ? (
                <div className="text-center py-8 text-slate-400">No revisions yet</div>
            ) : (
                <div className="space-y-3">
                    {revisions.map((revision) => (
                        <div key={revision.id} className="bg-slate-600 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center space-x-2">
                                    <span className="bg-purple-600 text-white px-3 py-1 rounded text-sm font-bold">
                                        Rev {revision.revisionNumber}
                                    </span>
                                    <span className="text-sm text-slate-300">
                                        {new Date(revision.createdAt).toLocaleString()}
                                    </span>
                                </div>
                                <button className="text-purple-400 hover:text-purple-300 text-sm">
                                    View Changes
                                </button>
                            </div>
                            {revision.changesSummary && (
                                <p className="text-slate-300 text-sm">{revision.changesSummary}</p>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* New Revision Dialog */}
            {showNewRevisionDialog && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-slate-800 rounded-xl p-6 max-w-md w-full">
                        <h4 className="text-xl font-bold text-white mb-4">Create New Revision</h4>
                        <textarea
                            value={changesSummary}
                            onChange={(e) => setChangesSummary(e.target.value)}
                            placeholder="Describe the changes..."
                            className="w-full h-32 bg-slate-700 text-white rounded-lg p-4 mb-4 outline-none focus:ring-2 focus:ring-purple-500"
                        />
                        <div className="flex space-x-3">
                            <button
                                onClick={handleCreateRevision}
                                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-2 rounded-lg font-medium"
                            >
                                Create Revision
                            </button>
                            <button
                                onClick={() => setShowNewRevisionDialog(false)}
                                className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
