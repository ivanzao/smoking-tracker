import { Cigarette, Leaf } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { EventType } from '@/types';

interface CounterCardProps {
  type: EventType;
  count: number;
  onTap: () => void;
}

const META: Record<EventType, { label: string; icon: typeof Cigarette; hoverBorder: string; hoverBg: string }> = {
  tobacco: {
    label: 'Tabaco',
    icon: Cigarette,
    hoverBorder: 'hover:border-secondary',
    hoverBg: 'hover:bg-secondary/5',
  },
  cannabis: {
    label: 'Cannabis',
    icon: Leaf,
    hoverBorder: 'hover:border-primary',
    hoverBg: 'hover:bg-primary/5',
  },
};

export const CounterCard = ({ type, count, onTap }: CounterCardProps) => {
  const { label, icon: Icon, hoverBorder, hoverBg } = META[type];

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={onTap}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onTap();
        }
      }}
      className={`relative cursor-pointer border-2 rounded-xl transition-transform duration-150 active:scale-[0.96] ${hoverBorder} ${hoverBg}`}
      style={{ boxShadow: 'var(--shadow-soft)' }}
    >
      <div className="p-4 sm:p-6">
        <div className="flex items-center justify-center gap-3">
          <Icon className="w-7 h-7 text-foreground" strokeWidth={1.5} />
          <div>
            <div className="text-3xl sm:text-4xl font-bold text-foreground leading-none">{count}</div>
            <div className="text-[0.65rem] uppercase tracking-wider text-muted-foreground">{label}</div>
          </div>
        </div>
      </div>
    </Card>
  );
};
