import { EventType } from '@/types';
import { UseTrackerAPI } from '@/hooks/useTracker';

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
  { id: 'goals',   label: 'Goals'   },
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
        <button
          onClick={() => onChange('goals')}
          aria-label="Configurações"
          className="p-2 text-primary hover:bg-surface-container-high transition-colors rounded-full active:scale-95"
        >
          <span className="material-symbols-outlined">settings</span>
        </button>
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

        {/* Streak card */}
        <div className="bg-surface-container-low p-6 rounded-xl space-y-4">
          <div className="flex justify-between items-start">
            <p className="text-[10px] font-medium text-on-surface-variant uppercase tracking-[0.1em]">
              Streak Atual
            </p>
            <span
              className="material-symbols-outlined text-primary material-symbols-filled"
            >
              bolt
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-5xl font-black tracking-tight text-on-surface">
              {currentGoal ? streak : '—'}
            </span>
            <span className="text-on-surface-variant font-medium text-sm uppercase tracking-widest">
              dias
            </span>
          </div>
          {currentGoal && streak === 0 && (
            <p className="text-xs text-on-surface-variant">Sem dias consecutivos ainda</p>
          )}
        </div>

        {/* Quick stats */}
        <div className="space-y-3">
          <h3 className="text-[10px] font-bold text-on-surface-variant uppercase tracking-[0.1em]">
            Hoje
          </h3>
          <div className="bg-surface-container p-4 rounded-xl flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-on-surface-variant">Consumo</p>
              <p className="text-lg font-bold text-primary">{todayTotal}</p>
            </div>
            {currentGoal && (
              <p className="text-on-surface-variant text-sm font-medium">
                / {currentGoal.limit}
              </p>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};
