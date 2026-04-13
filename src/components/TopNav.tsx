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
      <header className="hidden md:flex fixed top-0 w-full z-50 bg-background h-16 items-center justify-between px-6 border-b border-outline-variant/10">
        <span className="text-primary font-black tracking-tighter text-xl">Smoking Tracker</span>
        <nav className="flex gap-6 items-center">
          {NAV_TABS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => onChange(id)}
              aria-current={tab === id ? 'page' : undefined}
              className={`font-bold tracking-tight text-base px-3 py-1 rounded-lg transition-colors ${
                tab === id
                  ? 'text-primary'
                  : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
              }`}
            >
              {label}
            </button>
          ))}
        </nav>
        {/* spacer to balance the logo */}
        <div className="w-10" />
      </header>

      {/* Fixed sidebar — desktop only */}
      <aside className="hidden md:flex flex-col fixed top-16 left-0 w-80 h-[calc(100vh-64px)] bg-surface-container-lowest border-r border-outline-variant/10 p-6 space-y-8 overflow-y-auto z-40">
        {/* Quick Log */}
        <div className="space-y-4">
          <h3 className="text-[10px] font-bold text-on-surface-variant uppercase tracking-[0.1em]">
            Quick Log
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => onOpenNewEvent('tobacco')}
              className="flex flex-col items-center justify-center gap-2 p-4 bg-surface-container-low hover:bg-surface-container border border-outline-variant/10 rounded-xl transition-all group active:scale-95"
            >
              <span className="material-symbols-outlined text-secondary group-hover:scale-110 transition-transform">
                smoking_rooms
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                Tabaco
              </span>
            </button>
            <button
              onClick={() => onOpenNewEvent('cannabis')}
              className="flex flex-col items-center justify-center gap-2 p-4 bg-surface-container-low hover:bg-surface-container border border-outline-variant/10 rounded-xl transition-all group active:scale-95"
            >
              <span className="material-symbols-outlined text-primary group-hover:scale-110 transition-transform">
                potted_plant
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                Cannabis
              </span>
            </button>
          </div>
        </div>

        {/* Streak + Consumo */}
        <div className="bg-surface-container-low p-5 rounded-xl flex gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-medium text-on-surface-variant uppercase tracking-[0.1em] mb-2">
              Streak
            </p>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-black tracking-tight text-on-surface">
                {currentGoal ? streak : '—'}
              </span>
              <span className="text-on-surface-variant font-medium text-xs uppercase tracking-widest">
                dias
              </span>
            </div>
          </div>
          <div className="w-px bg-outline-variant/20 self-stretch" />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-on-surface-variant mb-2">
              Hoje
            </p>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-black text-primary">{todayTotal}</span>
              {currentGoal && (
                <span className="text-on-surface-variant text-sm font-medium">
                  / {currentGoal.limit}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Goals section */}
        <div className="border-t border-outline-variant/10 pt-8">
          <GoalsContent tracker={tracker} />
        </div>
      </aside>
    </>
  );
};
