import { UseTrackerAPI } from '@/hooks/useTracker';
import { GoalsContent } from '@/components/GoalsContent';

interface GoalsPageProps {
  tracker: UseTrackerAPI;
}

export const GoalsPage = ({ tracker }: GoalsPageProps) => {
  return (
    <main className="flex-1 px-6 pt-24 pb-32 overflow-y-auto max-w-lg mx-auto md:hidden">
      <GoalsContent tracker={tracker} />
    </main>
  );
};
