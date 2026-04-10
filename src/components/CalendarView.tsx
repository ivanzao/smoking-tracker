import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  format,
  parseISO,
  startOfMonth,
  endOfMonth,
  subDays,
  addMonths,
  subMonths,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MonthlyChart } from './MonthlyChart';
import {
  getDaysInRange,
  getEarliestEventMonth,
  getMonthKey,
  todayKey,
} from '@/lib/events';
import { DayTotals, TrackerEvent } from '@/types';
import { DayGoalStatus } from '@/lib/stats';

interface CalendarViewProps {
  getDayTotals: (dayKey: string) => DayTotals;
  getDayGoalStatus: (dayKey: string) => DayGoalStatus;
  onDayClick: (dayKey: string) => void;
  events: TrackerEvent[];
  goalLimit: number | null;
  className?: string;
}

export const CalendarView = ({ getDayTotals, getDayGoalStatus, onDayClick, events, goalLimit, className }: CalendarViewProps) => {
  const today = new Date();
  const [viewMonth, setViewMonth] = useState<Date>(() => startOfMonth(new Date()));

  const earliest = useMemo(() => getEarliestEventMonth(events), [events]);
  const currentMonthKey = getMonthKey(today);
  const viewMonthKey = getMonthKey(viewMonth);

  const canGoBack = earliest !== null && viewMonth > earliest;
  const canGoForward = viewMonthKey !== currentMonthKey;

  const goBack = () => {
    if (canGoBack) setViewMonth((m) => subMonths(m, 1));
  };
  const goForward = () => {
    if (canGoForward) setViewMonth((m) => addMonths(m, 1));
  };

  const weekDays = getDaysInRange(subDays(today, 6), today);
  const monthDays = getDaysInRange(startOfMonth(viewMonth), endOfMonth(viewMonth));
  const todayStr = todayKey();

  const monthLabel = format(viewMonth, 'MMMM yyyy', { locale: ptBR });

  const DayCell = ({ dayKey }: { dayKey: string }) => {
    const totals = getDayTotals(dayKey);
    const total = totals.tobacco + totals.cannabis;
    const isToday = dayKey === todayStr;
    const date = parseISO(dayKey + 'T00:00:00');
    const goalStatus = getDayGoalStatus(dayKey);
    const weekday = format(date, 'EEE', { locale: ptBR }).slice(0, 3);

    return (
      <div
        onClick={() => onDayClick(dayKey)}
        className={`
          relative flex flex-col items-center gap-1 p-2 rounded-lg transition-transform duration-100 cursor-pointer hover:scale-105 active:scale-[0.93]
          ${isToday ? 'bg-accent ring-2 ring-primary' : 'bg-card'}
          ${total > 0 ? 'opacity-100' : 'opacity-40'}
        `}
      >
        {goalStatus !== 'no-goal' && (
          <span
            aria-hidden
            className={`absolute top-1 right-1 w-1.5 h-1.5 rounded-full ${
              goalStatus === 'within' ? 'bg-emerald-500' : 'bg-rose-500'
            }`}
          />
        )}
        <div className="text-[0.55rem] font-medium text-muted-foreground capitalize">
          {weekday}
        </div>
        <div className={`text-[0.7rem] ${isToday ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
          {format(date, 'dd')}
        </div>
        {total > 0 ? (
          <div className="flex flex-col items-center gap-0.5">
            {totals.tobacco > 0 && (
              <div className="flex items-center gap-1">
                <div className="w-[5px] h-[5px] rounded-full bg-secondary" />
                <span className="text-[0.65rem] font-semibold">{totals.tobacco}</span>
              </div>
            )}
            {totals.cannabis > 0 && (
              <div className="flex items-center gap-1">
                <div className="w-[5px] h-[5px] rounded-full bg-primary" />
                <span className="text-[0.65rem] font-semibold">{totals.cannabis}</span>
              </div>
            )}
          </div>
        ) : (
          <span className="text-[0.6rem] text-muted-foreground">—</span>
        )}
      </div>
    );
  };

  const MonthNavigation = () => (
    <div className="flex items-center justify-between">
      <Button
        variant="ghost"
        size="icon"
        onClick={goBack}
        disabled={!canGoBack}
        aria-label="Mês anterior"
      >
        <ChevronLeft className="w-5 h-5" />
      </Button>
      <span className="text-sm font-medium capitalize">{monthLabel}</span>
      <Button
        variant="ghost"
        size="icon"
        onClick={goForward}
        disabled={!canGoForward}
        aria-label="Próximo mês"
      >
        <ChevronRight className="w-5 h-5" />
      </Button>
    </div>
  );

  return (
    <Card
      className={cn("p-4 sm:p-6 sm:flex sm:flex-col", className)}
      style={{ boxShadow: 'var(--shadow-soft)' }}
    >
      {/* Mobile: tabs (semana / mês) */}
      <div className="sm:hidden">
        <Tabs defaultValue="week" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="week" className="rounded-xl">Semana</TabsTrigger>
            <TabsTrigger value="month" className="rounded-xl">Mês</TabsTrigger>
          </TabsList>

          <TabsContent value="week" className="mt-0">
            <div className="grid grid-cols-7 gap-1.5">
              {weekDays.map((d) => (
                <DayCell key={d} dayKey={d} />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="month" className="mt-0">
            <MonthNavigation />
            <MonthlyChart dayKeys={monthDays} getDayTotals={getDayTotals} onDayClick={onDayClick} events={events} goalLimit={goalLimit} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Desktop: semana + mês empilhados, preenchendo a altura */}
      <div className="hidden sm:flex flex-col flex-1 min-h-0 gap-0">
        {/* Últimos 7 dias */}
        <div className="shrink-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Últimos 7 dias
          </p>
          <div className="grid grid-cols-7 gap-2">
            {weekDays.map((d) => (
              <DayCell key={d} dayKey={d} />
            ))}
          </div>
        </div>

        <div className="my-5 border-t border-border shrink-0" />

        {/* Gráfico mensal — preenche o restante */}
        <div className="flex-1 min-h-0 flex flex-col">
          <div className="shrink-0 mb-3">
            <MonthNavigation />
          </div>
          <div className="flex-1 min-h-0">
            <MonthlyChart
              dayKeys={monthDays}
              getDayTotals={getDayTotals}
              onDayClick={onDayClick}
              events={events}
              goalLimit={goalLimit}
              className="h-full"
            />
          </div>
        </div>
      </div>
    </Card>
  );
};
