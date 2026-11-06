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
    <main className="flex-1 px-2 pt-page pb-page md:ml-80 md:pl-4 md:pr-6 md:pt-16 md:pb-6 md:max-w-6xl">
      {/* Supporting line: the month below is what this screen is for */}
      <section className="px-2 pb-3 md:px-4">
        <p className="font-semibold">
          {currentGoal ? `${daysWithinGoal} dias na meta` : 'sem meta'}
        </p>
        <p className="text-sm text-muted-foreground">
          {!currentGoal
            ? 'Defina uma meta em Metas para acompanhar seu progresso.'
            : streak === 0
            ? 'Dias com registro dentro da meta entram aqui.'
            : `${streak} ${streak === 1 ? 'dia registrado' : 'dias registrados'} em sequência dentro da meta.`}
          {` ${weekTotal} ${weekTotal === 1 ? 'registro' : 'registros'} nos últimos 7 dias, média de ${formatAverage(avg7d)} por dia.`}
          {delta7d !== null && ` ${describeTrend(delta7d)}.`}
        </p>
      </section>

      <div className="space-y-2 md:space-y-0 md:grid md:grid-cols-2 md:gap-4">
      {/* Monthly chart */}
      <section className="panel p-4 flex flex-col">
        <div className="mb-4">
          <MonthNavigation
            label={monthLabel}
            canGoBack={canGoBack}
            canGoForward={canGoForward}
            onBack={() => setViewMonth((m) => subMonths(m, 1))}
            onForward={() => setViewMonth((m) => addMonths(m, 1))}
          />
        </div>
        <Suspense fallback={<div className="flex-1 min-h-[250px]" />}>
          <MonthlyChart
            dayKeys={monthDays}
            monthLabel={monthLabel}
            getDayTotals={tracker.getDayTotals}
            onDayClick={onOpenEditDay}
            goalLimit={currentGoal?.limit ?? null}
            className="flex-1 min-h-[250px]"
          />
        </Suspense>
      </section>

      {/* Calendar grid */}
      <section className="panel p-4">
        <h2 className="section-title mb-3">Calendário</h2>
        <div>
          <div aria-hidden="true" className="grid grid-cols-7 gap-1 mb-2">
            {WEEK_HEADER.map((d) => (
              <span key={d} className="text-xs text-center text-muted-foreground">
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
            <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-1.5">
                <span aria-hidden="true" className="w-4 h-4 rounded-[5px] bg-muted" />
                Dentro da meta
              </li>
              <li className="flex items-center gap-1.5">
                <span aria-hidden="true" className="w-4 h-4 rounded-[5px] bg-hatch border border-border" />
                Acima da meta
              </li>
              <li className="flex items-center gap-1.5">
                <span aria-hidden="true" className="w-4 h-4 rounded-[5px] border border-border" />
                Sem registro
              </li>
            </ul>
          )}
        </div>
      </section>
      </div>
    </main>
  );
};
