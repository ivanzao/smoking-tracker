import { ChevronLeft, ChevronRight, StickyNote } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DayTotals } from '@/types';
import { DayGoalStatus } from '@/lib/stats';

export interface DayCellProps {
  dayKey: string;
  getDayTotals: (dayKey: string) => DayTotals;
  getDayGoalStatus: (dayKey: string) => DayGoalStatus;
  onDayClick: (dayKey: string) => void;
  todayStr: string;
  hasNotes?: boolean;
}

export const DayCell = ({
  dayKey,
  getDayTotals,
  getDayGoalStatus,
  onDayClick,
  todayStr,
  hasNotes = false,
}: DayCellProps) => {
  const totals = getDayTotals(dayKey);
  const total = totals.tobacco + totals.cannabis;
  const isToday = dayKey === todayStr;
  const date = parseISO(dayKey + 'T00:00:00');
  const goalStatus = getDayGoalStatus(dayKey);
  const isFuture = goalStatus === 'future';

  const bgClass =
    goalStatus === 'within' ? 'bg-muted text-foreground'
    : goalStatus === 'over' ? 'bg-hatch border border-border text-foreground'
    : isFuture ? 'text-muted-foreground/60'
    : 'border border-border text-foreground';

  const description = [
    format(date, "d 'de' MMMM", { locale: ptBR }),
    `${total} ${total === 1 ? 'registro' : 'registros'}`,
    STATUS_LABEL[goalStatus],
    hasNotes ? 'com anotações' : null,
  ].filter(Boolean).join(', ');

  return (
    <button
      type="button"
      disabled={isFuture}
      onClick={() => onDayClick(dayKey)}
      aria-label={description}
      aria-current={isToday ? 'date' : undefined}
      className={cn(
        'relative min-h-12 flex flex-col items-center justify-center p-1 rounded-sm',
        bgClass,
        isToday && 'ring-2 ring-foreground',
      )}
    >
      {hasNotes && (
        <StickyNote aria-hidden="true" className="absolute top-1 right-1 w-2.5 h-2.5" />
      )}
      <span className="text-xs leading-tight text-muted-foreground">{format(date, 'd')}</span>
      {!isFuture && (
        <span className="text-base font-semibold leading-tight">{total > 0 ? total : '–'}</span>
      )}
    </button>
  );
};

const STATUS_LABEL: Record<DayGoalStatus, string | null> = {
  within: 'dentro da meta',
  over: 'acima da meta',
  empty: null,
  future: null,
  'no-goal': null,
};

export interface MonthNavigationProps {
  label: string;
  canGoBack: boolean;
  canGoForward: boolean;
  onBack: () => void;
  onForward: () => void;
}

export const MonthNavigation = ({
  label,
  canGoBack,
  canGoForward,
  onBack,
  onForward,
}: MonthNavigationProps) => (
  <div className="flex items-center justify-between">
    <button
      onClick={onBack}
      disabled={!canGoBack}
      aria-label="Mês anterior"
      className="w-11 h-11 flex items-center justify-center rounded-md hover:bg-muted transition-colors disabled:opacity-30"
    >
      <ChevronLeft aria-hidden="true" className="w-5 h-5" />
    </button>
    <span className="font-semibold capitalize">{label}</span>
    <button
      onClick={onForward}
      disabled={!canGoForward}
      aria-label="Próximo mês"
      className="w-11 h-11 flex items-center justify-center rounded-md hover:bg-muted transition-colors disabled:opacity-30"
    >
      <ChevronRight aria-hidden="true" className="w-5 h-5" />
    </button>
  </div>
);
