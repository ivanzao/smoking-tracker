import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Cigarette, Leaf } from 'lucide-react';
import { format, parseISO, startOfMonth, endOfMonth, subDays } from 'date-fns';
import { MonthlyChart } from './MonthlyChart';
import { getDaysInRange, todayKey } from '@/lib/events';
import { DayTotals } from '@/types';

interface CalendarViewProps {
  getDayTotals: (dayKey: string) => DayTotals;
  onDayClick: (dayKey: string) => void;
}

export const CalendarView = ({ getDayTotals, onDayClick }: CalendarViewProps) => {
  const today = new Date();
  const weekDays = getDaysInRange(subDays(today, 6), today);
  const monthDays = getDaysInRange(startOfMonth(today), endOfMonth(today));
  const todayStr = todayKey();

  const DayCell = ({ dayKey }: { dayKey: string }) => {
    const totals = getDayTotals(dayKey);
    const total = totals.tobacco + totals.cannabis;
    const isToday = dayKey === todayStr;
    const date = parseISO(dayKey + 'T00:00:00');

    return (
      <div
        onClick={() => onDayClick(dayKey)}
        className={`
          flex flex-col items-center gap-2 p-3 rounded-2xl transition-all cursor-pointer hover:scale-105 active:scale-95
          ${isToday ? 'bg-accent ring-2 ring-primary' : 'bg-card'}
          ${total > 0 ? 'opacity-100' : 'opacity-40'}
        `}
      >
        <div className="text-xs font-medium text-muted-foreground">
          {format(date, 'dd MMM')}
        </div>
        <div className="flex gap-2 items-center">
          {totals.tobacco > 0 && (
            <div className="flex items-center gap-1">
              <Cigarette className="w-4 h-4 text-foreground" />
              <span className="text-sm font-semibold text-foreground">{totals.tobacco}</span>
            </div>
          )}
          {totals.cannabis > 0 && (
            <div className="flex items-center gap-1">
              <Leaf className="w-4 h-4 text-foreground" />
              <span className="text-sm font-semibold text-foreground">{totals.cannabis}</span>
            </div>
          )}
        </div>
        {total === 0 && <span className="text-xs text-muted-foreground">—</span>}
      </div>
    );
  };

  return (
    <Card className="p-6 sm:p-8" style={{ boxShadow: 'var(--shadow-soft)' }}>
      <Tabs defaultValue="week" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="week" className="rounded-xl">Semana</TabsTrigger>
          <TabsTrigger value="month" className="rounded-xl">Mês</TabsTrigger>
        </TabsList>

        <TabsContent value="week" className="mt-0">
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
            {weekDays.map((d) => (
              <DayCell key={d} dayKey={d} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="month" className="mt-0">
          <MonthlyChart dayKeys={monthDays} getDayTotals={getDayTotals} onDayClick={onDayClick} />
        </TabsContent>
      </Tabs>
    </Card>
  );
};
