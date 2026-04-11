import { EventType } from '@/types';

interface CounterCardProps {
  type: EventType;
  count: number;
  onTap: () => void;
}

const META: Record<EventType, { label: string; icon: string; colorClass: string; hoverBorder: string }> = {
  tobacco: {
    label: 'Tabaco',
    icon: 'smoke_free',
    colorClass: 'text-secondary',
    hoverBorder: 'hover:border-secondary/30',
  },
  cannabis: {
    label: 'Cannabis',
    icon: 'potted_plant',
    colorClass: 'text-primary',
    hoverBorder: 'hover:border-primary/30',
  },
};

export const CounterCard = ({ type, count, onTap }: CounterCardProps) => {
  const { label, icon, colorClass, hoverBorder } = META[type];

  return (
    <button
      onClick={onTap}
      className={`flex flex-col items-center justify-center gap-3 bg-surface-container-high p-6 rounded-2xl border border-transparent ${hoverBorder} transition-all active:scale-95 group`}
    >
      <span className={`material-symbols-outlined text-4xl group-hover:scale-110 transition-transform ${colorClass}`}>
        {icon}
      </span>
      <div className="flex flex-col items-center gap-0.5">
        <span className="text-2xl font-bold text-on-surface">{count}</span>
        <span className="text-[10px] font-bold tracking-widest text-on-surface-variant uppercase">{label}</span>
      </div>
    </button>
  );
};
