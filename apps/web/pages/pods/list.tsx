// POD List/Search Page
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useRequireAuth } from '../../hooks/useRequireAuth';
import Layout from '../../components/Layout';
import type { DeliveryPOD } from '../../lib/pod/types';

export default function PODList() {
  const router = useRouter();
  const { session } = useRequireAuth();
  const [pods, setPods] = useState<DeliveryPOD[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    if (session) {
      fetchPODs();
    }
  }, [session, search, statusFilter]);

  async function fetchPODs() {
    try {
      const params = new URLSearchParams();
      if (search) params.append('query', search);
      if (statusFilter) params.append('status', statusFilter);

      const res = await fetch(`/api/pods?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setPods(data.pods);
      }
    } catch (error) {
      console.error('Failed to fetch PODs:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Layout>
      <div className="min-h-screen bg-[#0a0a0a] p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8 flex items-center justify-between">
            <h1 className="text-3xl font-semibold text-white">All PODs</h1>
            <button
              onClick={() => router.push('/pods')}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition"
            >
              ← Back
            </button>
          </div>

          {/* Filters */}
          <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="Search by reference, name, address..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:border-blue-500 focus:outline-none"
            >
              <option value="">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="needs_review">Needs Review</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          {/* Table */}
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
          ) : (
            <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-white/5 border-b border-white/10">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">
                      Reference
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">
                      Date
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">
                      Supplier
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-300">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pods.map((pod) => (
                    <tr
                      key={pod.id}
                      className="border-b border-white/5 hover:bg-white/5 transition cursor-pointer"
                      onClick={() => router.push(`/pods/${pod.id}`)}
                    >
                      <td className="px-6 py-4 text-white font-mono">
                        {pod.sales_order_ref || 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-gray-300">
                        {pod.delivery_date
                          ? new Date(pod.delivery_date).toLocaleDateString()
                          : 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-gray-300">
                        {(pod as any).supplier?.name || 'Unknown'}
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={pod.status} />
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/pods/${pod.id}`);
                          }}
                          className="text-blue-400 hover:text-blue-300 text-sm"
                        >
                          View →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    needs_review: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    approved: 'bg-green-500/20 text-green-400 border-green-500/30',
    rejected: 'bg-red-500/20 text-red-400 border-red-500/30'
  };

  return (
    <span
      className={`px-3 py-1 text-xs font-semibold rounded-full border ${
        colors[status] || 'bg-gray-500/20 text-gray-400 border-gray-500/30'
      }`}
    >
      {status.replace(/_/g, ' ')}
    </span>
  );
}
