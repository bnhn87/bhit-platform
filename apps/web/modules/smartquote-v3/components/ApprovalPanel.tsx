// ============================================================================
// SmartQuote v3 - Approval Panel Component
// ============================================================================

import React, { useState } from 'react';

import { approvalWorkflowService } from '../services/approvalWorkflowService';
import { Quote, ApprovalHistory, ChangeRequest } from '../types';

interface ApprovalPanelProps {
    quote: Quote;
    onApproved?: () => void;
    onRejected?: () => void;
    onChangesRequested?: () => void;
}

export const ApprovalPanel: React.FC<ApprovalPanelProps> = ({
    quote,
    onApproved,
    onRejected,
    onChangesRequested,
}) => {
    const [mode, setMode] = useState<'view' | 'approve' | 'reject' | 'changes'>('view');
    const [notes, setNotes] = useState('');
    const [conditions, setConditions] = useState('');
    const [changeRequests, setChangeRequests] = useState<ChangeRequest[]>([]);
    const [loading, setLoading] = useState(false);
    const [history, setHistory] = useState<ApprovalHistory[]>([]);
    const [showHistory, setShowHistory] = useState(false);

    React.useEffect(() => {
        loadHistory();
    }, [quote.id]);

    const loadHistory = async () => {
        const data = await approvalWorkflowService.getApprovalHistory(quote.id);
        setHistory(data);
    };

    const handleApprove = async () => {
        setLoading(true);
        const result = await approvalWorkflowService.approve(
            quote.id,
            notes || undefined,
            conditions || undefined
        );

        if (result.success) {
            onApproved?.();
        } else {
            alert(`Failed to approve: ${result.error}`);
        }
        setLoading(false);
    };

    const handleReject = async () => {
        if (!notes.trim()) {
            alert('Please provide a reason for rejection');
            return;
        }

        setLoading(true);
        const result = await approvalWorkflowService.reject(quote.id, notes);

        if (result.success) {
            onRejected?.();
        } else {
            alert(`Failed to reject: ${result.error}`);
        }
        setLoading(false);
    };

    const handleRequestChanges = async () => {
        if (changeRequests.length === 0) {
            alert('Please add at least one change request');
            return;
        }

        setLoading(true);
        const result = await approvalWorkflowService.requestChanges(
            quote.id,
            changeRequests,
            notes || undefined
        );

        if (result.success) {
            onChangesRequested?.();
        } else {
            alert(`Failed to request changes: ${result.error}`);
        }
        setLoading(false);
    };

    const addChangeRequest = () => {
        setChangeRequests([
            ...changeRequests,
            {
                field: '',
                currentValue: '',
                requestedValue: '',
                reason: '',
                priority: 'medium',
            },
        ]);
    };

    const updateChangeRequest = (index: number, field: keyof ChangeRequest, value: any) => {
        const updated = [...changeRequests];
        updated[index] = { ...updated[index], [field]: value };
        setChangeRequests(updated);
    };

    const removeChangeRequest = (index: number) => {
        setChangeRequests(changeRequests.filter((_, i) => i !== index));
    };

    if (mode === 'view') {
        return (
            <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-bold text-gray-900">Approval Required</h2>
                    <button
                        onClick={() => setShowHistory(!showHistory)}
                        className="text-sm text-blue-600 hover:text-blue-800"
                    >
                        {showHistory ? 'Hide' : 'Show'} History ({history.length})
                    </button>
                </div>

                {showHistory && history.length > 0 && (
                    <div className="mb-6 bg-gray-50 rounded-lg p-4 max-h-60 overflow-y-auto">
                        <h3 className="font-semibold text-gray-700 mb-2">Approval History</h3>
                        {history.map((item, index) => (
                            <div key={index} className="mb-3 pb-3 border-b border-gray-200 last:border-0">
                                <div className="flex items-center justify-between">
                                    <span className="font-medium text-gray-900">
                                        {item.action.replace('_', ' ').toUpperCase()}
                                    </span>
                                    <span className="text-sm text-gray-500">
                                        {new Date(item.performedAt).toLocaleString()}
                                    </span>
                                </div>
                                {item.notes && (
                                    <p className="text-sm text-gray-600 mt-1">{item.notes}</p>
                                )}
                                {item.conditions && (
                                    <p className="text-sm text-amber-600 mt-1">
                                        <strong>Conditions:</strong> {item.conditions}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                <div className="mb-6 bg-blue-50 rounded-lg p-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <p className="text-sm text-gray-600">Client</p>
                            <p className="font-semibold text-gray-900">{quote.clientName}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Total Amount</p>
                            <p className="font-semibold text-gray-900">
                                £{quote.totalAmount.toLocaleString()}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Status</p>
                            <p className="font-semibold text-gray-900">{quote.status}</p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600">Confidence</p>
                            <p className="font-semibold text-gray-900">
                                {quote.parseConfidenceScore
                                    ? `${quote.parseConfidenceScore.toFixed(1)}%`
                                    : 'N/A'}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={() => setMode('approve')}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                    >
                        ✓ Approve
                    </button>
                    <button
                        onClick={() => setMode('changes')}
                        className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                    >
                        ✏ Request Changes
                    </button>
                    <button
                        onClick={() => setMode('reject')}
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                    >
                        ✕ Reject
                    </button>
                </div>
            </div>
        );
    }

    if (mode === 'approve') {
        return (
            <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Approve Quote</h2>

                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Approval Notes (Optional)
                    </label>
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        rows={3}
                        placeholder="Add any notes or comments..."
                    />
                </div>

                <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Conditions (Optional)
                    </label>
                    <input
                        type="text"
                        value={conditions}
                        onChange={(e) => setConditions(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="e.g., Approved if client accepts within 7 days"
                    />
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={handleApprove}
                        disabled={loading}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:opacity-50"
                    >
                        {loading ? 'Approving...' : 'Confirm Approval'}
                    </button>
                    <button
                        onClick={() => setMode('view')}
                        disabled={loading}
                        className="px-6 py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        );
    }

    if (mode === 'reject') {
        return (
            <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Reject Quote</h2>

                <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Reason for Rejection <span className="text-red-500">*</span>
                    </label>
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        rows={4}
                        placeholder="Please provide a clear reason for rejection..."
                        required
                    />
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={handleReject}
                        disabled={loading || !notes.trim()}
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:opacity-50"
                    >
                        {loading ? 'Rejecting...' : 'Confirm Rejection'}
                    </button>
                    <button
                        onClick={() => setMode('view')}
                        disabled={loading}
                        className="px-6 py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        );
    }

    if (mode === 'changes') {
        return (
            <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Request Changes</h2>

                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        General Notes
                    </label>
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                        rows={2}
                        placeholder="Overall feedback..."
                    />
                </div>

                <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-medium text-gray-700">
                            Specific Change Requests
                        </label>
                        <button
                            onClick={addChangeRequest}
                            className="text-sm text-blue-600 hover:text-blue-800"
                        >
                            + Add Request
                        </button>
                    </div>

                    {changeRequests.map((request, index) => (
                        <div key={index} className="mb-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                            <div className="grid grid-cols-2 gap-2 mb-2">
                                <input
                                    type="text"
                                    value={request.field}
                                    onChange={(e) => updateChangeRequest(index, 'field', e.target.value)}
                                    className="px-2 py-1 text-sm border border-gray-300 rounded"
                                    placeholder="Field (e.g., Price)"
                                />
                                <select
                                    value={request.priority}
                                    onChange={(e) =>
                                        updateChangeRequest(index, 'priority', e.target.value)
                                    }
                                    className="px-2 py-1 text-sm border border-gray-300 rounded"
                                >
                                    <option value="low">Low Priority</option>
                                    <option value="medium">Medium Priority</option>
                                    <option value="high">High Priority</option>
                                </select>
                            </div>
                            <input
                                type="text"
                                value={request.reason}
                                onChange={(e) => updateChangeRequest(index, 'reason', e.target.value)}
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded mb-2"
                                placeholder="Reason for change..."
                            />
                            <button
                                onClick={() => removeChangeRequest(index)}
                                className="text-xs text-red-600 hover:text-red-800"
                            >
                                Remove
                            </button>
                        </div>
                    ))}
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={handleRequestChanges}
                        disabled={loading || changeRequests.length === 0}
                        className="flex-1 bg-amber-600 hover:bg-amber-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:opacity-50"
                    >
                        {loading ? 'Submitting...' : 'Submit Change Requests'}
                    </button>
                    <button
                        onClick={() => setMode('view')}
                        disabled={loading}
                        className="px-6 py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        );
    }

    return null;
};
