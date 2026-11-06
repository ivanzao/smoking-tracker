import { Cigarette, Leaf } from 'lucide-react';
import { EventType } from '@/types';
import { UseTrackerAPI } from '@/hooks/useTracker';
import { UseSyncAPI } from '@/hooks/useSync';
import { GoalsContent } from '@/components/GoalsContent';

type Tab = 'tracker' | 'history' | 'goals';

interface TopNavProps {
  tab: Tab;
  onChange: (tab: Tab) => void;
  tracker: UseTrackerAPI;
  sync: UseSyncAPI;
  onOpenNewEvent: (type: EventType) => void;
}

const NAV_TABS: { id: Tab; label: string }[] = [
  { id: 'tracker', label: 'Hoje' },
  { id: 'history', label: 'Histórico' },
];

export const TopNav = ({ tab, onChange, tracker, sync, onOpenNewEvent }: TopNavProps) => (
  <>
    {/* Fixed header — desktop only */}
    <header className="hidden md:flex fixed top-0 w-full z-50 bg-background h-16 items-center gap-8 px-6">
      <h1 className="w-[17.5rem] text-foreground font-semibold text-xl">Smoking Tracker</h1>
      <nav className="flex gap-1 items-center">
        {NAV_TABS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => onChange(id)}
            aria-current={tab === id ? 'page' : undefined}
            className={`h-10 px-4 rounded-md text-sm ${
              tab === id
                ? 'bg-card text-foreground font-semibold'
                : 'text-muted-foreground font-medium hover:bg-card/60'
            }`}
          >
            {label}
          </button>
        ))}
      </nav>
    </header>

    {/* Fixed sidebar — desktop only */}
    <aside className="hidden md:flex flex-col fixed top-16 left-0 w-80 h-[calc(100vh-64px)] pl-6 pr-2 pb-6 space-y-4 overflow-y-auto scrollbar-none z-40">
      {/* Log */}
      <div className="space-y-2">
        <h2 className="section-title">Registrar</h2>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => onOpenNewEvent('tobacco')}
            className="h-14 flex items-center justify-center gap-2 rounded-lg bg-tobacco text-tobacco-foreground font-semibold hover:bg-tobacco/90 active:scale-[0.98] transition-[background-color,transform]"
          >
            <Cigarette aria-hidden="true" className="w-5 h-5" />
            Tabaco
          </button>
          <button
            onClick={() => onOpenNewEvent('cannabis')}
            className="h-14 flex items-center justify-center gap-2 rounded-lg bg-cannabis text-cannabis-foreground font-semibold hover:bg-cannabis/90 active:scale-[0.98] transition-[background-color,transform]"
          >
            <Leaf aria-hidden="true" className="w-5 h-5" />
            Cannabis
          </button>
        </div>
      </div>

      <GoalsContent tracker={tracker} sync={sync} compact />
    </aside>
  </>
);
