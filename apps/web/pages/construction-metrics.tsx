import ConstructionMetricsDashboard from '@/components/ConstructionMetricsDashboard';
import { useRequireAuth } from '@/hooks/useRequireAuth';

export default function ConstructionMetricsPage() {
  useRequireAuth();

  return <ConstructionMetricsDashboard />;
}