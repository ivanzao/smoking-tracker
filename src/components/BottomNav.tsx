type Tab = 'tracker' | 'history' | 'goals';

interface BottomNavProps {
  tab: Tab;
  onChange: (tab: Tab) => void;
}

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'tracker', label: 'Tracker', icon: 'add_circle' },
  { id: 'history', label: 'History', icon: 'history' },
  { id: 'goals',   label: 'Goals',   icon: 'bolt' },
];

export const BottomNav = ({ tab, onChange }: BottomNavProps) => (
  <nav
    aria-label="Main navigation"
    className="md:hidden fixed bottom-0 left-0 w-full flex justify-around items-center h-20 pb-safe px-4 bg-surface-container-low/80 backdrop-blur-xl z-50 rounded-t-2xl shadow-[0_-4px_24px_rgba(0,0,0,0.4)]"
  >
    {TABS.map(({ id, label, icon }) => {
      const active = tab === id;
      return (
        <button
          key={id}
          aria-label={label}
          aria-current={active ? 'page' : undefined}
          onClick={() => onChange(id)}
          className={`flex flex-col items-center justify-center gap-1 px-3 py-1 rounded-xl transition-all duration-200 active:scale-90 ${
            active
              ? 'text-primary bg-primary/10'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <span className="material-symbols-outlined">{icon}</span>
          <span className="font-medium uppercase text-[10px] tracking-[0.1em]">{label}</span>
        </button>
      );
    })}
  </nav>
);
