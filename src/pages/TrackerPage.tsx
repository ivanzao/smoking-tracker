import { format, parseISO, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { EventType } from '@/types';
import { UseTrackerAPI } from '@/hooks/useTracker';
import { getDaysInRange, todayKey } from '@/lib/events';

interface TrackerPageProps {
  tracker: UseTrackerAPI;
  onOpenNewEvent: (type: EventType) => void;
}

export const TrackerPage = ({ tracker, onOpenNewEvent }: TrackerPageProps) => {
  const totals = tracker.getTodayTotals();
  const todayTotal = totals.tobacco + totals.cannabis;
  const currentGoal = tracker.getCurrentGoal();
  const streak = tracker.getCurrentStreak();

  const today = new Date();
  const weekDays = getDaysInRange(subDays(today, 6), today);
  const weekTotals = weekDays.map((d) => {
    const t = tracker.getDayTotals(d);
    return { dayKey: d, total: t.tobacco + t.cannabis, tobacco: t.tobacco, cannabis: t.cannabis };
  });
  const maxTotal = Math.max(1, ...weekTotals.map((w) => w.total));

  const todayStr = todayKey();
  const todayNoon = parseISO(todayStr + 'T12:00:00');
  const recentDays = [todayStr, format(subDays(todayNoon, 1), 'yyyy-MM-dd'), format(subDays(todayNoon, 2), 'yyyy-MM-dd')];
  const recentGroups = recentDays
    .map((dayKey, idx) => {
      const events = tracker
        .getEventsForDay(dayKey)
        .slice()
        .sort((a, b) => (a.timestamp > b.timestamp ? -1 : 1));
      const heading =
        idx === 0
          ? 'Hoje'
          : idx === 1
          ? 'Ontem'
          : format(parseISO(dayKey + 'T00:00:00'), 'dd/MM', { locale: ptBR });
      return { dayKey, events, heading };
    })
    .filter((g) => g.events.length > 0);

  return (
    <>
      {/* Mobile layout */}
      <main className="flex-1 px-6 pt-24 pb-32 overflow-y-auto md:hidden">
        {/* Quick Log */}
        <section className="mb-8 space-y-4">
          <p className="text-xs font-bold uppercase tracking-wider">
            Quick Log
          </p>
          <div className="grid grid-cols-2 gap-4">
            {(['tobacco', 'cannabis'] as EventType[]).map((type) => {
              const isTobacco = type === 'tobacco';
              return (
                <button
                  key={type}
                  onClick={() => onOpenNewEvent(type)}
                  className="flex flex-col items-center justify-center gap-3 bg-card border-2 border-border shadow-brutal p-6 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-transform"
                >
                  <span className="material-symbols-outlined text-4xl">
                    {isTobacco ? 'smoke_free' : 'potted_plant'}
                  </span>
                  <span className="text-[10px] font-bold tracking-wider uppercase">
                    {isTobacco ? 'Tabaco' : 'Cannabis'}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Hero Streak */}
        {currentGoal && streak > 0 && (
          <section className="mb-8">
            <div className="flex flex-col items-start">
              <span className="text-xs font-bold uppercase tracking-wider mb-1">
                Streak Atual
              </span>
              <div className="flex items-baseline gap-2">
                <h2 className="text-5xl font-bold tracking-tight">{streak}</h2>
                <span className="text-xl font-semibold text-muted-foreground">dias</span>
              </div>
            </div>
          </section>
        )}

        {/* Bento Grid */}
        <div className="grid grid-cols-2 gap-4">
          {/* Today's Consumption */}
          <div className="col-span-2 bg-card text-foreground border-2 border-border shadow-brutal p-6">
            <p className="text-xs font-bold uppercase tracking-wider mb-4">
              Consumo de Hoje
            </p>
            <div className="flex justify-between items-end">
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-bold uppercase tracking-wider mb-1">Tabaco</p>
                  <p className="text-3xl font-bold">{totals.tobacco}</p>
                </div>
                <div>
                  <p className="text-sm font-bold uppercase tracking-wider mb-1">Cannabis</p>
                  <p className="text-3xl font-bold">{totals.cannabis}</p>
                </div>
              </div>
              {currentGoal && (
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-wider font-bold mb-1">
                    Meta Diária
                  </p>
                  <div className="flex items-baseline justify-end gap-1">
                    <span className="text-4xl font-bold">{todayTotal}</span>
                    <span className="text-xl font-semibold text-muted-foreground">
                      / {currentGoal.limit}
                    </span>
                  </div>
                </div>
              )}
            </div>
            {currentGoal && (
              <div className="mt-6 h-3 w-full bg-muted border-2 border-border overflow-hidden">
                <div
                  className="h-full bg-primary"
                  style={{ width: `${Math.min(100, (todayTotal / currentGoal.limit) * 100)}%` }}
                />
              </div>
            )}
          </div>

          {/* Last 7 Days mini chart */}
          <div className="col-span-2 bg-card border-2 border-border shadow-brutal p-5">
            <p className="text-xs font-bold uppercase tracking-wider mb-6">
              Últimos 7 Dias
            </p>
            <div className="h-24 flex items-end justify-between gap-1">
              {weekTotals.map(({ dayKey, total, tobacco, cannabis }) => {
                const heightPct = total > 0 ? Math.max(5, (total / maxTotal) * 100) : 3;
                const bg =
                  cannabis > tobacco ? 'bg-foreground' : tobacco > 0 ? 'bg-primary' : 'bg-muted';
                return (
                  <div
                    key={dayKey}
                    className={`w-full border-2 border-border ${bg}`}
                    style={{ height: `${heightPct}%` }}
                  />
                );
              })}
            </div>
            <div className="flex justify-between mt-2">
              {weekTotals.map(({ dayKey }) => (
                <span key={dayKey} className="text-[8px] uppercase font-bold text-muted-foreground">
                  {format(parseISO(dayKey + 'T00:00:00'), 'EEE', { locale: ptBR })
                    .slice(0, 1)
                    .toUpperCase()}
                </span>
              ))}
            </div>
          </div>
        </div>
      </main>

      {/* Desktop layout — recent logs */}
      <main className="hidden md:flex flex-col px-8 pt-24 pb-8 ml-80 min-h-screen">
        <h2 className="text-xs font-bold uppercase tracking-wider mb-6">
          Logs Recentes
        </h2>
        {recentGroups.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum registro nos últimos 3 dias.</p>
        ) : (
          <div className="space-y-8">
            {recentGroups.map(({ dayKey, events, heading }) => (
              <section key={dayKey}>
                <p className="text-xs font-bold uppercase tracking-wider mb-3">
                  {heading}
                </p>
                <div className="space-y-2">
                  {events.map((event) => {
                    const isCannabis = event.type === 'cannabis';
                    return (
                      <div
                        key={event.id}
                        className="bg-card border-2 border-border p-4 flex items-center gap-4"
                      >
                        <div className="w-9 h-9 border-2 border-border bg-primary flex items-center justify-center flex-shrink-0">
                          <span className="material-symbols-outlined text-base">
                            {isCannabis ? 'eco' : 'smoking_rooms'}
                          </span>
                        </div>
                        <div>
                          <p className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground">
                            {format(parseISO(event.timestamp), 'HH:mm', { locale: ptBR })}
                          </p>
                          <p className="text-sm font-bold">
                            {isCannabis ? 'Cannabis' : 'Tabaco'}
                          </p>
                          {event.location && (
                            <p className="text-[11px] text-muted-foreground">{event.location}</p>
                          )}
                          {event.reason && (
                            <p className="text-[11px] text-muted-foreground">{event.reason}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>
    </>
  );
};
