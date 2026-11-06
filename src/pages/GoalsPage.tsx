import { UseTrackerAPI } from '@/hooks/useTracker';
import { UseSyncAPI } from '@/hooks/useSync';
import { GoalsContent } from '@/components/GoalsContent';

interface GoalsPageProps {
  tracker: UseTrackerAPI;
  sync?: UseSyncAPI;
}

export const GoalsPage = ({ tracker, sync }: GoalsPageProps) => {
  return (
    <main className="flex-1 w-full px-2 pt-page pb-page max-w-lg mx-auto md:hidden">
      <GoalsContent tracker={tracker} sync={sync} />
    </main>
  );
};
