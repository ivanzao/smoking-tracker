import { Suspense, lazy, useMemo, useState } from 'react';
import { format, getDay, startOfMonth, endOfMonth, subDays, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { UseTrackerAPI } from '@/hooks/useTracker';
import { getDaysInRange, getEarliestEventMonth, getMonthKey, todayKey } from '@/lib/events';
import { describeTrend, formatAverage } from '@/lib/stats';
import { DayCell, MonthNavigation } from '@/components/CalendarView';

// Recharts is a big part of the bundle and only this screen needs it
const MonthlyChart = lazy(() =>
  import('@/components/MonthlyChart').then((m) => ({ default: m.MonthlyChart })),
);

interface HistoryPageProps {
  tracker: UseTrackerAPI;
  onOpenEditDay: (dayKey: string) => void;
}

const WEEK_HEADER = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

export const HistoryPage = ({ tracker, onOpenEditDay }: HistoryPageProps) => {
  const today = new Date();
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(today));

  const earliest = useMemo(() => getEarliestEventMonth(tracker.events), [tracker.events]);
  const currentMonthKey = getMonthKey(today);
  const viewMonthKey = getMonthKey(viewMonth);

  const canGoBack = earliest !== null && viewMonth > earliest;
  const canGoForward = viewMonthKey !== currentMonthKey;

  const monthLabel = format(viewMonth, 'MMMM yyyy', { locale: ptBR });
  const monthDays = getDaysInRange(startOfMonth(viewMonth), endOfMonth(viewMonth));
  // The grid starts on Monday, and getDay counts from Sunday
  const leadingBlanks = (getDay(startOfMonth(viewMonth)) + 6) % 7;

  const streak = tracker.getCurrentStreak();
  const daysWithinGoal = tracker.getDaysWithinGoal();
  const currentGoal = tracker.getCurrentGoal();
  const avg7d = tracker.getRollingAverage(7);
  const delta7d = tracker.getAverageDelta(7);

  const weekDays = getDaysInRange(subDays(today, 6), today);
  const weekTotal = weekDays.reduce((sum, d) => {
    const t = tracker.getDayTotals(d);
    return sum + t.tobacco + t.cannabis;
  }, 0);

  const todayStr = todayKey();

  return (
    <main className="flex-1 px-6 pt-page pb-page overflow-y-auto md:pt-24 md:pl-8 md:pr-8 md:ml-80">
      {/* Hero stat */}
      <section className="mb-8">
        <div className="flex items-end gap-2 mb-1">
          <span className="text-[3.5rem] font-bold tracking-tight leading-none">
            {currentGoal ? daysWithinGoal : '—'}
          </span>
          <span className="text-xs font-bold uppercase tracking-wider mb-2">
            {currentGoal ? 'dias na meta' : 'sem meta'}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          {!currentGoal
            ? 'Defina uma meta em Metas para acompanhar seu progresso.'
            : streak === 0
            ? 'Dias com registro dentro da meta entram aqui.'
            : `${streak} ${streak === 1 ? 'dia registrado' : 'dias registrados'} em sequência dentro da meta.`}
        </p>
      </section>

      {/* Weekly bento */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-card border-2 border-border shadow-brutal p-5">
          <span className="text-xs font-bold uppercase tracking-wider block mb-4">
            Últimos 7 dias
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold">{weekTotal}</span>
            <span className="text-xs text-muted-foreground">
              {weekTotal === 1 ? 'registro' : 'registros'}
            </span>
          </div>
          {delta7d !== null && (
            <p className="mt-2 text-xs font-semibold">{describeTrend(delta7d)}</p>
          )}
        </div>
        <div className="bg-card border-2 border-border shadow-brutal p-5">
          <span className="text-xs font-bold uppercase tracking-wider block mb-4">
            Média diária
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold">{formatAverage(avg7d)}</span>
            <span className="text-xs text-muted-foreground">por dia</span>
          </div>
        </div>
      </div>

      {/* Monthly chart */}
      <section className="mb-8 bg-card border-2 border-border shadow-brutal p-6">
        <div className="mb-4">
          <MonthNavigation
            label={monthLabel}
            canGoBack={canGoBack}
            canGoForward={canGoForward}
            onBack={() => setViewMonth((m) => subMonths(m, 1))}
            onForward={() => setViewMonth((m) => addMonths(m, 1))}
          />
        </div>
        <Suspense fallback={<div className="h-[220px]" />}>
          <MonthlyChart
            dayKeys={monthDays}
            monthLabel={monthLabel}
            getDayTotals={tracker.getDayTotals}
            onDayClick={onOpenEditDay}
            goalLimit={currentGoal?.limit ?? null}
            className="h-[220px]"
          />
        </Suspense>
      </section>

      {/* Calendar grid */}
      <section className="mb-8">
        <h2 className="text-xs font-bold uppercase tracking-wider mb-4">
          Calendário
        </h2>
        <div className="bg-card border-2 border-border shadow-brutal p-4">
          <div aria-hidden="true" className="grid grid-cols-7 gap-1 mb-2">
            {WEEK_HEADER.map((d) => (
              <span key={d} className="text-[11px] text-center font-bold uppercase">
                {d}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: leadingBlanks }, (_, i) => (
              <span key={i} aria-hidden="true" />
            ))}
            {monthDays.map((dayKey) => (
              <DayCell
                key={dayKey}
                dayKey={dayKey}
                getDayTotals={tracker.getDayTotals}
                getDayGoalStatus={tracker.getDayGoalStatus}
                onDayClick={onOpenEditDay}
                todayStr={todayStr}
                hasNotes={tracker.getDayNotes(dayKey).length > 0}
              />
            ))}
          </div>
          {currentGoal && (
            <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs font-semibold">
              <li className="flex items-center gap-1.5">
                <span aria-hidden="true" className="w-4 h-4 border-2 border-border bg-primary" />
                Dentro da meta
              </li>
              <li className="flex items-center gap-1.5">
                <span aria-hidden="true" className="w-4 h-4 border-2 border-border bg-card bg-hatch" />
                Acima da meta
              </li>
              <li className="flex items-center gap-1.5">
                <span aria-hidden="true" className="w-4 h-4 border-2 border-border bg-card" />
                Sem registro
              </li>
            </ul>
          )}
        </div>
      </section>

    </main>
  );
};
