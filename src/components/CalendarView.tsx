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
    goalStatus === 'within' ? 'bg-primary text-primary-foreground'
    : goalStatus === 'over' ? 'bg-card bg-hatch text-foreground'
    : isFuture ? 'bg-transparent text-muted-foreground border-dashed border-muted-foreground'
    : 'bg-card text-foreground';

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
        'relative min-h-12 flex flex-col items-center justify-center p-1 border-2 border-border active:translate-x-[1px] active:translate-y-[1px] transition-transform disabled:active:translate-x-0 disabled:active:translate-y-0',
        bgClass,
        isToday && 'shadow-brutal',
      )}
    >
      {hasNotes && (
        <span
          aria-hidden="true"
          className="material-symbols-outlined absolute top-0.5 right-0.5 text-[0.7rem] leading-none"
        >
          sticky_note_2
        </span>
      )}
      <span className="text-sm font-bold leading-tight">{format(date, 'd')}</span>
      {!isFuture && (
        <span className="text-xs font-semibold leading-tight tabular-nums">{total > 0 ? total : '–'}</span>
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
      className="w-11 h-11 flex items-center justify-center bg-card border-2 border-border shadow-brutal-sm active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-transform disabled:opacity-30"
    >
      <span aria-hidden="true" className="material-symbols-outlined text-sm">chevron_left</span>
    </button>
    <span className="text-sm font-bold uppercase tracking-wider capitalize">{label}</span>
    <button
      onClick={onForward}
      disabled={!canGoForward}
      aria-label="Próximo mês"
      className="w-11 h-11 flex items-center justify-center bg-card border-2 border-border shadow-brutal-sm active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-transform disabled:opacity-30"
    >
      <span aria-hidden="true" className="material-symbols-outlined text-sm">chevron_right</span>
    </button>
  </div>
);
