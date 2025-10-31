import ConstructionProgressDashboard from '@/components/ConstructionProgressDashboard';
import { useRequireAuth } from '@/hooks/useRequireAuth';

export default function ConstructionProgressPage() {
  useRequireAuth();

  return <ConstructionProgressDashboard />;
}