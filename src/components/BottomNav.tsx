import { CalendarDays, Flag, History, LucideIcon } from 'lucide-react';

type Tab = 'tracker' | 'history' | 'goals';

interface BottomNavProps {
  tab: Tab;
  onChange: (tab: Tab) => void;
}

const TABS: { id: Tab; label: string; icon: LucideIcon }[] = [
  { id: 'tracker', label: 'Hoje',      icon: CalendarDays },
  { id: 'history', label: 'Histórico', icon: History },
  { id: 'goals',   label: 'Metas',     icon: Flag },
];

export const BottomNav = ({ tab, onChange }: BottomNavProps) => (
  <nav
    aria-label="Navegação principal"
    className="md:hidden fixed bottom-0 left-0 w-full grid grid-cols-3 items-center h-bottom-nav px-2 bg-background z-50"
  >
    {TABS.map(({ id, label, icon: Icon }) => {
      const active = tab === id;
      return (
        <button
          key={id}
          aria-current={active ? 'page' : undefined}
          onClick={() => onChange(id)}
          className={`h-14 flex flex-col items-center justify-center gap-1 rounded-md text-xs ${
            active ? 'bg-card text-foreground font-semibold' : 'text-muted-foreground font-medium'
          }`}
        >
          <Icon aria-hidden="true" className="w-5 h-5" />
          {label}
        </button>
      );
    })}
  </nav>
);
