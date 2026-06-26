import { EventType } from '@/types';
import { UseTrackerAPI } from '@/hooks/useTracker';
import { GoalsContent } from '@/components/GoalsContent';

type Tab = 'tracker' | 'history' | 'goals';

interface TopNavProps {
  tab: Tab;
  onChange: (tab: Tab) => void;
  tracker: UseTrackerAPI;
  onOpenNewEvent: (type: EventType) => void;
}

const NAV_TABS: { id: Tab; label: string }[] = [
  { id: 'tracker', label: 'Tracker' },
  { id: 'history', label: 'History' },
];

export const TopNav = ({ tab, onChange, tracker, onOpenNewEvent }: TopNavProps) => {
  const streak = tracker.getCurrentStreak();
  const currentGoal = tracker.getCurrentGoal();
  const totals = tracker.getTodayTotals();
  const todayTotal = totals.tobacco + totals.cannabis;

  return (
    <>
      {/* Fixed header — desktop only */}
      <header className="hidden md:flex fixed top-0 w-full z-50 bg-background h-16 items-center justify-between px-6 border-b-2 border-border">
        <span className="text-foreground font-bold tracking-tight text-xl">Smoking Tracker</span>
        <nav className="flex gap-3 items-center">
          {NAV_TABS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => onChange(id)}
              aria-current={tab === id ? 'page' : undefined}
              className={`font-bold uppercase tracking-wide text-sm px-3 py-1 border-2 ${
                tab === id
                  ? 'bg-primary text-primary-foreground border-border shadow-brutal-sm'
                  : 'border-transparent text-foreground hover:bg-muted'
              }`}
            >
              {label}
            </button>
          ))}
        </nav>
        <div className="w-10" />
      </header>

      {/* Fixed sidebar — desktop only */}
      <aside className="hidden md:flex flex-col fixed top-16 left-0 w-80 h-[calc(100vh-64px)] bg-card border-r-2 border-border p-6 space-y-8 overflow-y-auto z-40">
        {/* Quick Log */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
            Quick Log
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => onOpenNewEvent('tobacco')}
              className="flex flex-col items-center justify-center gap-2 p-4 bg-card border-2 border-border shadow-brutal-sm active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-transform"
            >
              <span className="material-symbols-outlined">smoking_rooms</span>
              <span className="text-[10px] font-bold uppercase tracking-wider">
                Tabaco
              </span>
            </button>
            <button
              onClick={() => onOpenNewEvent('cannabis')}
              className="flex flex-col items-center justify-center gap-2 p-4 bg-card border-2 border-border shadow-brutal-sm active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-transform"
            >
              <span className="material-symbols-outlined">potted_plant</span>
              <span className="text-[10px] font-bold uppercase tracking-wider">
                Cannabis
              </span>
            </button>
          </div>
        </div>

        {/* Streak + Consumo */}
        <div className="bg-card border-2 border-border shadow-brutal p-5 flex gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider mb-2">
              Streak
            </p>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold tracking-tight">
                {currentGoal ? streak : '—'}
              </span>
              <span className="text-muted-foreground font-semibold text-xs uppercase tracking-wider">
                dias
              </span>
            </div>
          </div>
          <div className="w-[2px] bg-border self-stretch" />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-wider font-bold mb-2">
              Hoje
            </p>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold">{todayTotal}</span>
              {currentGoal && (
                <span className="text-muted-foreground text-sm font-semibold">
                  / {currentGoal.limit}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Goals section */}
        <div className="border-t-2 border-border pt-8">
          <GoalsContent tracker={tracker} />
        </div>
      </aside>
    </>
  );
};
