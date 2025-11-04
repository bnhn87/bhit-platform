// POD Manager Dashboard
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useRequireAuth } from '../../hooks/useRequireAuth';
import Layout from '../../components/Layout';
import type { PODStatistics } from '../../lib/pod/types';

export default function PODDashboard() {
  const router = useRouter();
  const { session, loading: authLoading } = useRequireAuth();
  const [stats, setStats] = useState<PODStatistics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session) {
      fetchStats();
    }
  }, [session]);

  async function fetchStats() {
    try {
      const res = await fetch('/api/pods/stats');
      const data = await res.json();
      if (data.success) {
        setStats(data.statistics);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  }

  if (authLoading || loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-gray-400">Loading POD Manager...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-[#0a0a0a] p-6">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-white mb-2">POD Manager</h1>
          <p className="text-gray-400">Proof of Delivery Management System</p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Needs Review"
            value={stats?.needs_review_count || 0}
            color="amber"
            icon="⚠️"
            onClick={() => router.push('/pods/review')}
          />
          <StatCard
            title="Pending"
            value={stats?.pending_count || 0}
            color="blue"
            icon="⏳"
          />
          <StatCard
            title="Approved"
            value={stats?.approved_count || 0}
            color="green"
            icon="✅"
          />
          <StatCard
            title="Rejected"
            value={stats?.rejected_count || 0}
            color="red"
            icon="❌"
          />
        </div>

        {/* Additional Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <InfoCard
            title="Average Confidence"
            value={stats?.avg_confidence ? `${Math.round(stats.avg_confidence)}%` : 'N/A'}
          />
          <InfoCard
            title="WhatsApp Requests"
            value={stats?.whatsapp_requested_count || 0}
          />
          <InfoCard
            title="Backed Up"
            value={stats?.backed_up_count || 0}
          />
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <ActionButton
            title="Upload POD"
            description="Upload new proof of delivery"
            icon="📤"
            onClick={() => router.push('/pods/upload')}
          />
          <ActionButton
            title="Review Queue"
            description={`${stats?.needs_review_count || 0} PODs need attention`}
            icon="🔍"
            onClick={() => router.push('/pods/review')}
            highlight={Boolean(stats && stats.needs_review_count > 0)}
          />
          <ActionButton
            title="All PODs"
            description="View and search all PODs"
            icon="📋"
            onClick={() => router.push('/pods/list')}
          />
        </div>
      </div>
    </Layout>
  );
}

// Stat Card Component
function StatCard({
  title,
  value,
  color,
  icon,
  onClick
}: {
  title: string;
  value: number;
  color: 'blue' | 'amber' | 'green' | 'red';
  icon: string;
  onClick?: () => void;
}) {
  const colorClasses = {
    blue: 'from-blue-500/20 to-blue-600/10 border-blue-500/30',
    amber: 'from-amber-500/20 to-amber-600/10 border-amber-500/30',
    green: 'from-green-500/20 to-green-600/10 border-green-500/30',
    red: 'from-red-500/20 to-red-600/10 border-red-500/30'
  };

  return (
    <div
      className={`bg-gradient-to-br ${colorClasses[color]} backdrop-blur-lg border rounded-lg p-6 ${
        onClick ? 'cursor-pointer hover:scale-105 transition-transform' : ''
      }`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-gray-400 text-sm mb-1">{title}</p>
          <p className="text-4xl font-bold text-white">{value}</p>
        </div>
        <span className="text-3xl">{icon}</span>
      </div>
    </div>
  );
}

// Info Card Component
function InfoCard({ title, value }: { title: string; value: string | number }) {
  return (
    <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-lg p-4">
      <p className="text-gray-400 text-sm mb-1">{title}</p>
      <p className="text-2xl font-semibold text-white">{value}</p>
    </div>
  );
}

// Action Button Component
function ActionButton({
  title,
  description,
  icon,
  onClick,
  highlight
}: {
  title: string;
  description: string;
  icon: string;
  onClick: () => void;
  highlight?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`text-left p-6 rounded-lg border transition-all hover:scale-105 ${
        highlight
          ? 'bg-gradient-to-br from-amber-500/20 to-amber-600/10 border-amber-500/50'
          : 'bg-white/5 backdrop-blur-lg border-white/10 hover:border-white/30'
      }`}
    >
      <div className="flex items-start gap-4">
        <span className="text-4xl">{icon}</span>
        <div>
          <h3 className="text-xl font-semibold text-white mb-1">{title}</h3>
          <p className="text-gray-400 text-sm">{description}</p>
        </div>
      </div>
    </button>
  );
}
