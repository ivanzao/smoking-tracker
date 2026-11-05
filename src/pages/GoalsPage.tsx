import { UseTrackerAPI } from '@/hooks/useTracker';
import { UseSyncAPI } from '@/hooks/useSync';
import { GoalsContent } from '@/components/GoalsContent';

interface GoalsPageProps {
  tracker: UseTrackerAPI;
  sync?: UseSyncAPI;
}

export const GoalsPage = ({ tracker, sync }: GoalsPageProps) => {
  return (
    <main className="flex-1 px-6 pt-page pb-page overflow-y-auto max-w-lg mx-auto md:hidden">
      <GoalsContent tracker={tracker} sync={sync} />
    </main>
  );
};
