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
    className="md:hidden fixed bottom-0 left-0 w-full flex justify-around items-center h-20 pb-safe px-4 bg-card border-t-2 border-border z-50"
  >
    {TABS.map(({ id, label, icon }) => {
      const active = tab === id;
      return (
        <button
          key={id}
          aria-label={label}
          aria-current={active ? 'page' : undefined}
          onClick={() => onChange(id)}
          className={`flex flex-col items-center justify-center gap-1 px-3 py-1 transition-none ${
            active
              ? 'bg-primary text-primary-foreground border-2 border-border shadow-brutal-sm'
              : 'text-foreground hover:bg-muted'
          }`}
        >
          <span className="material-symbols-outlined">{icon}</span>
          <span className="font-bold uppercase text-[10px] tracking-wider">{label}</span>
        </button>
      );
    })}
  </nav>
);
