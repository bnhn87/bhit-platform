// POD Review Queue
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useRequireAuth } from '../../hooks/useRequireAuth';
import Layout from '../../components/Layout';
import type { PODNeedingReview } from '../../lib/pod/types';

export default function ReviewQueue() {
  const router = useRouter();
  const { session } = useRequireAuth();
  const [pods, setPods] = useState<PODNeedingReview[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session) {
      fetchReviewQueue();
    }
  }, [session]);

  async function fetchReviewQueue() {
    try {
      const res = await fetch('/api/pods/review');
      const data = await res.json();
      if (data.success) {
        setPods(data.pods);
      }
    } catch (error) {
      console.error('Failed to fetch review queue:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-[#0a0a0a] p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-semibold text-white mb-2">Review Queue</h1>
              <p className="text-gray-400">{pods.length} PODs need your attention</p>
            </div>
            <button
              onClick={() => router.push('/pods')}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition"
            >
              ← Back to Dashboard
            </button>
          </div>

          {/* POD Grid */}
          {pods.length === 0 ? (
            <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-lg p-12 text-center">
              <span className="text-6xl mb-4 block">✅</span>
              <h3 className="text-xl font-semibold text-white mb-2">All Clear!</h3>
              <p className="text-gray-400">No PODs need review right now</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pods.map((pod) => (
                <PODCard key={pod.id} pod={pod} onClick={() => router.push(`/pods/${pod.id}`)} />
              ))}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

function PODCard({ pod, onClick }: { pod: PODNeedingReview; onClick: () => void }) {
  const confidence = pod.overall_confidence || 0;
  const confidenceColor =
    confidence >= 75 ? 'text-blue-400' : confidence >= 50 ? 'text-amber-400' : 'text-red-400';

  return (
    <div
      onClick={onClick}
      className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-lg p-6 cursor-pointer hover:scale-105 hover:border-white/30 transition-all"
    >
      {/* Confidence Badge */}
      <div className={`text-sm font-semibold ${confidenceColor} mb-3`}>
        {Math.round(confidence)}% Confidence
      </div>

      {/* Sales Order Ref */}
      <h3 className="text-lg font-semibold text-white mb-2">
        {pod.sales_order_ref || 'No Reference'}
      </h3>

      {/* Supplier */}
      {pod.supplier_name && (
        <p className="text-sm text-gray-400 mb-2">📦 {pod.supplier_name}</p>
      )}

      {/* Date */}
      {pod.delivery_date && (
        <p className="text-sm text-gray-400 mb-4">
          📅 {new Date(pod.delivery_date).toLocaleDateString()}
        </p>
      )}

      {/* Validation Flags */}
      {pod.validation_flags && pod.validation_flags.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {pod.validation_flags.slice(0, 2).map((flag, i) => (
            <span
              key={i}
              className="text-xs px-2 py-1 bg-red-500/20 text-red-400 rounded border border-red-500/30"
            >
              {flag.replace(/_/g, ' ')}
            </span>
          ))}
          {pod.validation_flags.length > 2 && (
            <span className="text-xs px-2 py-1 bg-gray-500/20 text-gray-400 rounded">
              +{pod.validation_flags.length - 2} more
            </span>
          )}
        </div>
      )}

      {/* Status */}
      <div className="mt-4 pt-4 border-t border-white/10">
        <span className="text-xs uppercase tracking-wide text-gray-500">
          {pod.status.replace(/_/g, ' ')}
        </span>
      </div>
    </div>
  );
}
