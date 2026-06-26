import { useMemo, useState } from 'react';
import { format, startOfMonth, endOfMonth, subDays, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { UseTrackerAPI } from '@/hooks/useTracker';
import { getDaysInRange, getEarliestEventMonth, getMonthKey, todayKey } from '@/lib/events';
import { MonthlyChart } from '@/components/MonthlyChart';
import { DayCell, MonthNavigation } from '@/components/CalendarView';

interface HistoryPageProps {
  tracker: UseTrackerAPI;
  onOpenEditDay: (dayKey: string) => void;
}

const WEEK_HEADER = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'];

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

  const streak = tracker.getCurrentStreak();
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
    <main className="flex-1 px-6 pt-24 pb-32 overflow-y-auto md:pt-24 md:pl-8 md:pr-8 md:ml-80">
      {/* Hero stat */}
      <section className="mb-8">
        <div className="flex items-end gap-2 mb-1">
          <span className="text-[3.5rem] font-bold tracking-tight leading-none">
            {currentGoal ? streak : '—'}
          </span>
          <span className="text-xs font-bold uppercase tracking-wider mb-2">
            {currentGoal ? 'dias na meta' : 'sem meta'}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          {!currentGoal
            ? 'Defina uma meta em Goals para acompanhar seu progresso.'
            : streak === 0
            ? 'Nenhum dia consecutivo ainda.'
            : `${streak} dia${streak !== 1 ? 's' : ''} consecutivo${streak !== 1 ? 's' : ''} dentro da meta.`}
        </p>
      </section>

      {/* Weekly bento */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-card border-2 border-border shadow-brutal p-5">
          <span className="text-xs font-bold uppercase tracking-wider block mb-4">
            Esta semana
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold">{weekTotal}</span>
            <span className="text-xs text-muted-foreground">unidades</span>
          </div>
          {delta7d !== null && (
            <div className="mt-2 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider">
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                {delta7d <= 0 ? 'trending_down' : 'trending_up'}
              </span>
              <span>{Math.abs(delta7d * 100).toFixed(0)}% vs semana passada</span>
            </div>
          )}
        </div>
        <div className="bg-card border-2 border-border shadow-brutal p-5">
          <span className="text-xs font-bold uppercase tracking-wider block mb-4">
            Média 7d
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold">{avg7d.toFixed(1)}</span>
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
        <MonthlyChart
          dayKeys={monthDays}
          getDayTotals={tracker.getDayTotals}
          onDayClick={onOpenEditDay}
          events={tracker.events}
          goalLimit={currentGoal?.limit ?? null}
          className="h-[200px]"
        />
      </section>

      {/* Calendar grid */}
      <section className="mb-8">
        <h2 className="text-xs font-bold uppercase tracking-wider mb-4">
          Calendário
        </h2>
        <div className="bg-card border-2 border-border shadow-brutal p-4">
          <div className="grid grid-cols-7 gap-2 mb-2">
            {WEEK_HEADER.map((d, i) => (
              <span key={i} className="text-[10px] text-center font-bold uppercase tracking-wider">
                {d}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {monthDays.map((dayKey) => (
              <DayCell
                key={dayKey}
                dayKey={dayKey}
                getDayTotals={tracker.getDayTotals}
                getDayGoalStatus={tracker.getDayGoalStatus}
                onDayClick={onOpenEditDay}
                todayStr={todayStr}
              />
            ))}
          </div>
        </div>
      </section>

    </main>
  );
};
