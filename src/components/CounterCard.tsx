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
    hoverBorder: 'hover:border-[#ba5f27]',
    hoverBg: 'hover:bg-[#ba5f27]/5',
  },
  cannabis: {
    label: 'Cannabis',
    icon: Leaf,
    hoverBorder: 'hover:border-[#27ba42]',
    hoverBg: 'hover:bg-[#27ba42]/5',
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
      className={`relative cursor-pointer border-2 transition-all duration-300 hover:scale-[1.02] ${hoverBorder} ${hoverBg}`}
      style={{ boxShadow: 'var(--shadow-soft)' }}
    >
      <div className="p-6 sm:p-12">
        <div className="flex flex-col items-center gap-6">
          <div className="p-6">
            <Icon className="w-16 h-16 text-foreground" strokeWidth={1.5} />
          </div>
          <div className="text-center space-y-1">
            <div className="text-5xl font-bold text-foreground">{count}</div>
            <div className="text-sm text-muted-foreground">{label}</div>
          </div>
        </div>
      </div>
    </Card>
  );
};
