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

  // Desktop: today + 2 previous days, skip days with no events
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
          <p className="text-[10px] font-medium text-on-surface-variant uppercase tracking-[0.1em]">
            Quick Log
          </p>
          <div className="grid grid-cols-2 gap-4">
            {(['tobacco', 'cannabis'] as EventType[]).map((type) => {
              const isTobacco = type === 'tobacco';
              return (
                <button
                  key={type}
                  onClick={() => onOpenNewEvent(type)}
                  className={`flex flex-col items-center justify-center gap-3 bg-surface-container-high p-6 rounded-2xl border border-transparent transition-all active:scale-95 group ${
                    isTobacco ? 'hover:border-secondary/30' : 'hover:border-primary/30'
                  }`}
                >
                  <span
                    className={`material-symbols-outlined text-4xl group-hover:scale-110 transition-transform ${
                      isTobacco ? 'text-secondary' : 'text-primary'
                    }`}
                  >
                    {isTobacco ? 'smoke_free' : 'potted_plant'}
                  </span>
                  <span className="text-[10px] font-bold tracking-widest text-on-surface uppercase">
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
              <span className="text-[10px] font-medium text-on-surface-variant uppercase tracking-[0.2em] mb-1">
                Streak Atual
              </span>
              <div className="flex items-baseline gap-2">
                <h2 className="text-5xl font-bold tracking-tight text-primary">{streak}</h2>
                <span className="text-xl font-semibold text-primary/60">dias</span>
              </div>
            </div>
          </section>
        )}

        {/* Bento Grid */}
        <div className="grid grid-cols-2 gap-4">
          {/* Today's Consumption */}
          <div className="col-span-2 bg-surface-container-low rounded-xl p-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16" />
            <div className="relative z-10">
              <p className="text-[10px] font-medium text-on-surface-variant uppercase tracking-[0.1em] mb-4">
                Consumo de Hoje
              </p>
              <div className="flex justify-between items-end">
                <div className="space-y-4">
                  <div>
                    <p className="text-secondary text-sm font-medium mb-1">Tabaco</p>
                    <p className="text-3xl font-bold text-on-surface">{totals.tobacco}</p>
                  </div>
                  <div>
                    <p className="text-primary text-sm font-medium mb-1">Cannabis</p>
                    <p className="text-3xl font-bold text-on-surface">{totals.cannabis}</p>
                  </div>
                </div>
                {currentGoal && (
                  <div className="text-right">
                    <p className="text-[10px] text-on-surface-variant uppercase tracking-widest mb-1">
                      Meta Diária
                    </p>
                    <div className="flex items-baseline justify-end gap-1">
                      <span className="text-4xl font-black text-on-surface">{todayTotal}</span>
                      <span className="text-xl font-medium text-on-surface-variant">
                        / {currentGoal.limit}
                      </span>
                    </div>
                  </div>
                )}
              </div>
              {currentGoal && (
                <div className="mt-6 h-1.5 w-full bg-surface-container-high rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-primary-container rounded-full transition-all"
                    style={{ width: `${Math.min(100, (todayTotal / currentGoal.limit) * 100)}%` }}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Last 7 Days mini chart */}
          <div className="col-span-2 bg-surface-container rounded-xl p-5">
            <p className="text-[10px] font-medium text-on-surface-variant uppercase tracking-[0.1em] mb-6">
              Últimos 7 Dias
            </p>
            <div className="h-24 flex items-end justify-between gap-1">
              {weekTotals.map(({ dayKey, total, tobacco, cannabis }) => {
                const heightPct = total > 0 ? Math.max(5, (total / maxTotal) * 100) : 3;
                const colorClass =
                  cannabis > tobacco ? 'bg-primary' : tobacco > 0 ? 'bg-secondary' : 'bg-surface-container-highest';
                return (
                  <div
                    key={dayKey}
                    className={`w-full rounded-t-sm ${colorClass}`}
                    style={{ height: `${heightPct}%` }}
                  />
                );
              })}
            </div>
            <div className="flex justify-between mt-2">
              {weekTotals.map(({ dayKey }) => (
                <span key={dayKey} className="text-[8px] text-on-surface-variant/50">
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
        <h2 className="text-[10px] font-black text-on-surface-variant uppercase tracking-[0.1em] mb-6">
          Logs Recentes
        </h2>
        {recentGroups.length === 0 ? (
          <p className="text-sm text-on-surface-variant">Nenhum registro nos últimos 3 dias.</p>
        ) : (
          <div className="space-y-8">
            {recentGroups.map(({ dayKey, events, heading }) => (
              <section key={dayKey}>
                <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-[0.1em] mb-3">
                  {heading}
                </p>
                <div className="space-y-2">
                  {events.map((event) => {
                    const isCannabis = event.type === 'cannabis';
                    return (
                      <div
                        key={event.id}
                        className="bg-surface-container-low p-4 rounded-xl flex items-center gap-4"
                      >
                        <div
                          className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                            isCannabis ? 'bg-primary/10 text-primary' : 'bg-secondary/10 text-secondary'
                          }`}
                        >
                          <span className="material-symbols-outlined text-base">
                            {isCannabis ? 'eco' : 'smoking_rooms'}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-bold text-on-surface">
                            {isCannabis ? 'Cannabis' : 'Tabaco'}
                          </p>
                          <p className="text-[11px] text-on-surface-variant uppercase tracking-wider">
                            {format(parseISO(event.timestamp), 'HH:mm', { locale: ptBR })}
                          </p>
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
