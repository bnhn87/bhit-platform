import LabourCalendar from '@/components/LabourCalendar';
import { useRequireAuth } from '@/hooks/useRequireAuth';

export default function LabourCalendarPage() {
  useRequireAuth();

  return <LabourCalendar />;
}