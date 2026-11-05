import { format, parseISO, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { EventType, TrackerEvent } from '@/types';
import { UseTrackerAPI } from '@/hooks/useTracker';
import { getDayKey, getDaysInRange, todayKey } from '@/lib/events';
import { describeTrend, formatAverage } from '@/lib/stats';

interface TrackerPageProps {
  tracker: UseTrackerAPI;
  onQuickLog: (type: EventType) => void;
  onOpenEditEvent: (event: TrackerEvent) => void;
  onOpenEditDay: (dayKey: string) => void;
  onOpenGoals: () => void;
}

const TREND_ICON = (delta: number | null) =>
  delta === null || Math.round(Math.abs(delta) * 100) === 0
    ? 'trending_flat'
    : delta < 0
    ? 'trending_down'
    : 'trending_up';

export const TrackerPage = ({
  tracker,
  onQuickLog,
  onOpenEditEvent,
  onOpenEditDay,
  onOpenGoals,
}: TrackerPageProps) => {
  const totals = tracker.getTodayTotals();
  const todayTotal = totals.tobacco + totals.cannabis;
  const currentGoal = tracker.getCurrentGoal();
  const overBy = currentGoal ? todayTotal - currentGoal.limit : 0;
  const avg7d = tracker.getRollingAverage(7);
  const delta7d = tracker.getAverageDelta(7);

  const today = new Date();
  const weekDays = getDaysInRange(subDays(today, 6), today);
  const weekTotals = weekDays.map((d) => {
    const t = tracker.getDayTotals(d);
    return {
      dayKey: d,
      total: t.tobacco + t.cannabis,
      tobacco: t.tobacco,
      cannabis: t.cannabis,
      hasNotes: tracker.getDayNotes(d).length > 0,
    };
  });
  const maxTotal = Math.max(1, ...weekTotals.map((w) => w.total));

  const todayStr = todayKey();
  const todayNoon = parseISO(todayStr + 'T12:00:00');
  const recentDays = [todayStr, format(subDays(todayNoon, 1), 'yyyy-MM-dd'), format(subDays(todayNoon, 2), 'yyyy-MM-dd')];
  const handleRemoveEvent = (id: string) => {
    const event = tracker.events.find((e) => e.id === id);
    if (!event) return;
    tracker.removeEvent(id);
    toast('Evento removido', {
      duration: 5000,
      action: {
        label: 'Desfazer',
        onClick: () => tracker.restoreEvent(event),
      },
    });
  };

  const dayLabel = (dayKey: string) =>
    dayKey === todayStr
      ? 'Hoje'
      : dayKey === recentDays[1]
      ? 'Ontem'
      : format(parseISO(dayKey + 'T00:00:00'), 'dd/MM');
  const latestEvents = tracker.events.slice(-5).reverse();

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
      const notes = tracker.getDayNotes(dayKey);
      return { dayKey, events, heading, notes };
    })
    // A day with only notes still shows up, otherwise the note would be invisible here
    .filter((g) => g.events.length > 0 || g.notes.length > 0);

  return (
    <>
      {/* Mobile layout */}
      <main className="flex-1 px-6 pt-page pb-page overflow-y-auto md:hidden">
        {/* One tap logs */}
        <section className="mb-8 space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider">Registrar</h2>
          <div className="grid grid-cols-2 gap-4">
            {(['tobacco', 'cannabis'] as EventType[]).map((type) => {
              const isTobacco = type === 'tobacco';
              return (
                <button
                  key={type}
                  onClick={() => onQuickLog(type)}
                  className="flex flex-col items-center justify-center gap-3 bg-card border-2 border-border shadow-brutal p-6 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-transform"
                >
                  <span aria-hidden="true" className="material-symbols-outlined text-4xl">
                    {isTobacco ? 'smoking_rooms' : 'eco'}
                  </span>
                  <span className="text-xs font-bold tracking-wider uppercase">
                    {isTobacco ? 'Tabaco' : 'Cannabis'}
                  </span>
                </button>
              );
            })}
          </div>
          {tracker.events.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Um toque registra na hora. Onde e por quê são opcionais.
            </p>
          )}
        </section>

        <div className="space-y-4">
          {/* Today */}
          <section className="bg-card text-foreground border-2 border-border shadow-brutal p-6">
            <h2 className="text-xs font-bold uppercase tracking-wider mb-4">Hoje</h2>
            <div className="flex justify-between items-end">
              <dl className="flex gap-8">
                <div>
                  <dt className="text-xs font-bold uppercase tracking-wider mb-1">Tabaco</dt>
                  <dd className="text-3xl font-bold">{totals.tobacco}</dd>
                </div>
                <div>
                  <dt className="text-xs font-bold uppercase tracking-wider mb-1">Cannabis</dt>
                  <dd className="text-3xl font-bold">{totals.cannabis}</dd>
                </div>
              </dl>
              {currentGoal && (
                <div className="text-right">
                  <p className="text-xs uppercase tracking-wider font-bold mb-1">Meta</p>
                  <div className="flex items-baseline justify-end gap-1">
                    <span className="text-3xl font-bold">{todayTotal}</span>
                    <span className="text-xl font-semibold text-muted-foreground">
                      / {currentGoal.limit}
                    </span>
                  </div>
                </div>
              )}
            </div>
            {currentGoal ? (
              <>
                <div
                  role="progressbar"
                  aria-label="Consumo de hoje em relação à meta"
                  aria-valuemin={0}
                  aria-valuemax={currentGoal.limit}
                  aria-valuenow={Math.min(todayTotal, currentGoal.limit)}
                  className="mt-6 h-3 w-full bg-muted border-2 border-border overflow-hidden"
                >
                  <div
                    className={`h-full ${overBy > 0 ? 'bg-foreground' : 'bg-primary'}`}
                    style={{ width: `${Math.min(100, (todayTotal / currentGoal.limit) * 100)}%` }}
                  />
                </div>
                {overBy > 0 && (
                  <p className="mt-3 text-sm font-semibold">
                    {overBy} acima da meta hoje. Amanhã recomeça.
                  </p>
                )}
              </>
            ) : (
              <button
                type="button"
                onClick={onOpenGoals}
                className="mt-4 min-h-11 text-sm font-bold underline underline-offset-4"
              >
                Definir um limite diário
              </button>
            )}
          </section>

          {/* Trend */}
          <section className="bg-card border-2 border-border shadow-brutal p-5">
            <h2 className="text-xs font-bold uppercase tracking-wider mb-3">Tendência</h2>
            <p className="flex items-start gap-2 text-lg font-bold leading-snug text-balance">
              <span aria-hidden="true" className="material-symbols-outlined mt-0.5 shrink-0">
                {TREND_ICON(delta7d)}
              </span>
              {describeTrend(delta7d)}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Média de {formatAverage(avg7d)} por dia nos últimos 7 dias
            </p>
            <div className="mt-5 flex items-stretch gap-1">
              {weekTotals.map(({ dayKey, total, tobacco, cannabis, hasNotes }) => {
                const heightPct = total > 0 ? Math.max(5, (total / maxTotal) * 100) : 3;
                const date = parseISO(dayKey + 'T00:00:00');
                const count = `${total} ${total === 1 ? 'registro' : 'registros'}`;
                return (
                  <button
                    key={dayKey}
                    type="button"
                    onClick={() => onOpenEditDay(dayKey)}
                    aria-label={`Abrir dia ${format(date, 'dd/MM')}: ${count}${hasNotes ? ', com anotações' : ''}`}
                    className="min-w-0 flex-1 flex flex-col items-center gap-1"
                  >
                    <span className="h-24 w-full flex flex-col justify-end items-center gap-1">
                      {hasNotes && <span className="w-1.5 h-1.5 bg-foreground" />}
                      <span
                        className="w-full flex flex-col border-2 border-border overflow-hidden"
                        style={{ height: `${heightPct}%` }}
                      >
                        <span className="w-full bg-foreground" style={{ flexGrow: cannabis }} />
                        <span className="w-full bg-primary" style={{ flexGrow: tobacco }} />
                        {total === 0 && <span className="w-full flex-1 bg-muted" />}
                      </span>
                    </span>
                    <span className="text-[11px] font-bold text-muted-foreground">
                      {format(date, 'EEE', { locale: ptBR }).slice(0, 3).toUpperCase()}
                    </span>
                  </button>
                );
              })}
            </div>
            <ul className="mt-3 flex gap-4 text-xs font-semibold">
              <li className="flex items-center gap-1.5">
                <span aria-hidden="true" className="w-3 h-3 bg-primary border-2 border-border" />
                Tabaco
              </li>
              <li className="flex items-center gap-1.5">
                <span aria-hidden="true" className="w-3 h-3 bg-foreground border-2 border-border" />
                Cannabis
              </li>
            </ul>
          </section>

          {/* Latest logs: the fast way to fix a mis-tap */}
          {latestEvents.length > 0 && (
            <section className="bg-card border-2 border-border shadow-brutal">
              <h2 className="text-xs font-bold uppercase tracking-wider px-5 pt-5 pb-2">
                Últimos registros
              </h2>
              <ul>
                {latestEvents.map((event) => {
                  const isCannabis = event.type === 'cannabis';
                  const context = [event.location, event.reason].filter(Boolean).join(' · ');
                  return (
                    <li key={event.id} className="border-t-2 border-border first:border-t-0">
                      <button
                        type="button"
                        onClick={() => onOpenEditEvent(event)}
                        className="w-full min-h-11 px-5 py-2.5 flex items-center gap-3 text-left hover:bg-muted"
                      >
                        <span aria-hidden="true" className="material-symbols-outlined shrink-0">
                          {isCannabis ? 'eco' : 'smoking_rooms'}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-bold">
                            {isCannabis ? 'Cannabis' : 'Tabaco'}
                          </span>
                          {context && (
                            <span className="block text-xs text-muted-foreground truncate">{context}</span>
                          )}
                        </span>
                        <span className="text-xs font-bold text-muted-foreground shrink-0 tabular-nums">
                          {dayLabel(getDayKey(event.timestamp))} {format(parseISO(event.timestamp), 'HH:mm')}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </div>
      </main>

      {/* Desktop layout — recent logs */}
      <main className="hidden md:flex flex-col px-8 pt-24 pb-8 ml-80 min-h-screen">
        <h2 className="text-xs font-bold uppercase tracking-wider mb-6">
          Registros recentes
        </h2>
        {recentGroups.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum registro ou anotação nos últimos 3 dias.</p>
        ) : (
          <div className="space-y-8">
            {recentGroups.map(({ dayKey, events, heading, notes }) => (
              <section key={dayKey}>
                <button
                  type="button"
                  onClick={() => onOpenEditDay(dayKey)}
                  className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider mb-3 hover:underline"
                >
                  {heading}
                  {notes.length > 0 && (
                    <>
                      <span aria-hidden="true" className="material-symbols-outlined text-sm leading-none">
                        sticky_note_2
                      </span>
                      <span className="sr-only">com anotações</span>
                    </>
                  )}
                </button>
                {notes.length > 0 && (
                  <ul className="mb-3 space-y-1">
                    {notes.map((note) => (
                      <li key={note.id} className="text-xs text-muted-foreground italic">
                        {note.text}
                      </li>
                    ))}
                  </ul>
                )}
                <div className="space-y-2">
                  {events.map((event) => {
                    const isCannabis = event.type === 'cannabis';
                    return (
                      <div
                        key={event.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => onOpenEditEvent(event)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            onOpenEditEvent(event);
                          }
                        }}
                        className="bg-card border-2 border-border p-4 flex items-center gap-4 cursor-pointer hover:bg-muted active:translate-x-[1px] active:translate-y-[1px] transition-transform"
                      >
                        <div className="w-9 h-9 border-2 border-border bg-primary flex items-center justify-center flex-shrink-0">
                          <span aria-hidden="true" className="material-symbols-outlined text-base">
                            {isCannabis ? 'eco' : 'smoking_rooms'}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
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
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveEvent(event.id);
                          }}
                          // keep Enter/Space from reaching the row's edit handler
                          onKeyDown={(e) => e.stopPropagation()}
                          aria-label="Remover evento"
                          className="p-2 text-foreground hover:bg-destructive hover:text-destructive-foreground transition-colors"
                        >
                          <span aria-hidden="true" className="material-symbols-outlined text-base">delete</span>
                        </button>
                        <span aria-hidden="true" className="material-symbols-outlined text-base text-muted-foreground flex-shrink-0">
                          chevron_right
                        </span>
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
