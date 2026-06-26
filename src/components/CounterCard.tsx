import { EventType } from '@/types';

interface CounterCardProps {
  type: EventType;
  count: number;
  onTap: () => void;
}

const META: Record<EventType, { label: string; icon: string }> = {
  tobacco:  { label: 'Tabaco',   icon: 'smoke_free' },
  cannabis: { label: 'Cannabis', icon: 'potted_plant' },
};

export const CounterCard = ({ type, count, onTap }: CounterCardProps) => {
  const { label, icon } = META[type];

  return (
    <button
      onClick={onTap}
      className="flex flex-col items-start gap-3 bg-card text-foreground p-5 border-2 border-border shadow-brutal active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-transform"
    >
      <div className="flex w-full justify-between items-center">
        <span className="material-symbols-outlined text-2xl">{icon}</span>
        <span className="inline-block bg-primary text-primary-foreground border-2 border-border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
          {label}
        </span>
      </div>
      <span className="text-5xl font-bold tracking-tight">{count}</span>
    </button>
  );
};
