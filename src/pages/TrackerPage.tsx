import { format, parseISO, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronRight, Cigarette, Leaf, Plus, StickyNote, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { EventType, TrackerEvent } from '@/types';
import { UseTrackerAPI } from '@/hooks/useTracker';
import { getDayKey, getDaysInRange, todayKey } from '@/lib/events';
import { describeTrend, formatAverage } from '@/lib/stats';
import { SeriesLegend } from '@/components/SeriesLegend';

interface TrackerPageProps {
  tracker: UseTrackerAPI;
  onQuickLog: (type: EventType) => void;
  onOpenEditEvent: (event: TrackerEvent) => void;
  onOpenEditDay: (dayKey: string) => void;
  onOpenGoals: () => void;
}

/** Past this many uses the meter stops drawing one segment each */
const MAX_SEGMENTS = 24;

const TodayMeter = ({ tobacco, cannabis, limit }: { tobacco: number; cannabis: number; limit: number }) => {
  const total = tobacco + cannabis;
  const slots = Math.max(limit, total);
  const segmented = slots <= MAX_SEGMENTS;

  return (
    <div
      role="progressbar"
      aria-label="Consumo de hoje em relação à meta"
      aria-valuemin={0}
      aria-valuemax={limit}
      aria-valuenow={Math.min(total, limit)}
      className="mt-4"
    >
      {segmented ? (
        <div className="flex gap-0.5">
          {Array.from({ length: slots }, (_, i) => (
            <span
              key={i}
              className={`h-2.5 flex-1 rounded-[3px] transition-colors duration-500 ease-out ${
                i >= total ? 'bg-muted' : i < tobacco ? 'bg-tobacco' : 'bg-cannabis'
              } ${i === limit ? 'ml-2' : ''}`}
            />
          ))}
        </div>
      ) : (
        <div className="h-2.5 rounded-[3px] bg-muted overflow-hidden">
          <div className="h-full bg-tobacco" style={{ width: `${Math.min(100, (total / limit) * 100)}%` }} />
        </div>
      )}
    </div>
  );
};

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
  const remaining = currentGoal ? Math.max(0, currentGoal.limit - todayTotal) : 0;
  const avg7d = tracker.getRollingAverage(7);
  const delta7d = tracker.getAverageDelta(7);
  const streak = tracker.getCurrentStreak();
  const daysWithinGoal = tracker.getDaysWithinGoal();

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
  // Scaled to the goal, not to the week's own peak, so a falling week looks like one
  const scale = Math.max(1, currentGoal?.limit ?? 0, ...weekTotals.map((w) => w.total));

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
    <main className="flex-1 px-2 pt-page pb-page-dock md:ml-80 md:pl-4 md:pr-6 md:pt-16 md:pb-6 md:grid md:grid-cols-1 lg:grid-cols-2 md:gap-4 md:items-start">
      <div className="space-y-2">
        {/* Today */}
        <section className="panel p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-semibold">Hoje</h2>
            {currentGoal && (
              <p className="text-sm text-muted-foreground">
                Meta {todayTotal} de {currentGoal.limit}
                {overBy <= 0 && ` · ${remaining === 0 ? 'no limite' : `${remaining === 1 ? 'resta' : 'restam'} ${remaining}`}`}
              </p>
            )}
          </div>
          <dl className="mt-2 grid grid-cols-2">
            <div className="flex flex-col-reverse">
              <dt className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <span aria-hidden="true" className="w-2 h-2 rounded-[3px] bg-tobacco" />
                Tabaco
              </dt>
              <dd className="text-[3.25rem] leading-[3.5rem] font-semibold tracking-[-0.02em]">{totals.tobacco}</dd>
            </div>
            <div className="flex flex-col-reverse">
              <dt className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <span aria-hidden="true" className="w-2 h-2 rounded-[3px] bg-cannabis" />
                Cannabis
              </dt>
              <dd className="text-[3.25rem] leading-[3.5rem] font-semibold tracking-[-0.02em]">{totals.cannabis}</dd>
            </div>
          </dl>
          {currentGoal ? (
            <>
              <TodayMeter tobacco={totals.tobacco} cannabis={totals.cannabis} limit={currentGoal.limit} />
              {overBy > 0 && (
                <p className="mt-3 text-sm font-medium">
                  {overBy} acima da meta hoje. Amanhã recomeça.
                </p>
              )}
            </>
          ) : (
            <button
              type="button"
              onClick={onOpenGoals}
              className="mt-3 min-h-11 text-sm font-semibold underline underline-offset-4 md:hidden"
            >
              Definir um limite diário
            </button>
          )}
        </section>

        {/* Trend */}
        <section aria-label="Tendência" className="panel grid grid-cols-[1.4fr_1fr] divide-x divide-border">
          <p className="p-4 text-lg font-semibold leading-snug text-balance">{describeTrend(delta7d)}</p>
          <p className="p-4">
            <span className="block text-2xl font-semibold leading-7">{formatAverage(avg7d)}</span>
            <span className="text-sm text-muted-foreground">média em 7 dias</span>
          </p>
        </section>

        {/* The week */}
        <section className="panel p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="section-title">Últimos 7 dias</h2>
            <SeriesLegend goalLimit={currentGoal?.limit} />
          </div>
          <div className="relative mt-6">
            {currentGoal && (
              <div
                aria-hidden="true"
                className="absolute inset-x-0 h-px bg-foreground/40"
                style={{ bottom: `calc(1.75rem + ${(currentGoal.limit / scale) * 10}rem)` }}
              />
            )}
            <div className="flex items-end">
              {weekTotals.map(({ dayKey, total, tobacco, cannabis, hasNotes }) => {
                const date = parseISO(dayKey + 'T00:00:00');
                const count = `${total} ${total === 1 ? 'registro' : 'registros'}`;
                const isToday = dayKey === todayStr;
                return (
                  <button
                    key={dayKey}
                    type="button"
                    onClick={() => onOpenEditDay(dayKey)}
                    aria-label={`Abrir dia ${format(date, 'dd/MM')}: ${count}${hasNotes ? ', com anotações' : ''}`}
                    className="min-w-0 flex-1 flex flex-col items-center rounded-sm"
                  >
                    <span className="h-40 w-full flex flex-col justify-end items-center border-b border-border">
                      <span className="relative w-6 flex flex-col gap-0.5">
                        <span className="absolute bottom-full inset-x-[-0.5rem] mb-0.5 flex items-center justify-center gap-1 text-xs font-medium">
                          {total > 0 && total}
                          {hasNotes && <span className="w-1 h-1 rounded-full bg-foreground" />}
                        </span>
                        {cannabis > 0 && (
                          <span
                            className="shrink-0 rounded-[6px] bg-cannabis"
                            style={{ height: `calc(${(cannabis / scale) * 10}rem - 2px)` }}
                          />
                        )}
                        {tobacco > 0 && (
                          <span
                            className="shrink-0 rounded-[6px] bg-tobacco"
                            style={{ height: `${(tobacco / scale) * 10}rem` }}
                          />
                        )}
                      </span>
                    </span>
                    <span
                      className={`h-7 pt-2 text-xs ${isToday ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}
                    >
                      {format(date, 'EEE', { locale: ptBR }).slice(0, 3)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* Constancy */}
        {currentGoal && (
          <section aria-label="Constância" className="panel grid grid-cols-2 divide-x divide-border">
            <p className="p-4">
              <span className="block text-2xl font-semibold leading-7">
                {streak} {streak === 1 ? 'dia' : 'dias'}
              </span>
              <span className="text-sm text-muted-foreground">em sequência</span>
            </p>
            <p className="p-4">
              <span className="block text-2xl font-semibold leading-7">
                {daysWithinGoal} {daysWithinGoal === 1 ? 'dia' : 'dias'}
              </span>
              <span className="text-sm text-muted-foreground">na meta</span>
            </p>
          </section>
        )}

        {/* Latest logs: the fast way to fix a mis-tap */}
        {latestEvents.length > 0 && (
          <section className="panel md:hidden">
            <h2 className="section-title px-4 pt-4 pb-1">Últimos registros</h2>
            <ul className="divide-y divide-border">
              {latestEvents.map((event) => {
                const isCannabis = event.type === 'cannabis';
                const context = [event.location, event.reason].filter(Boolean).join(' · ');
                const Icon = isCannabis ? Leaf : Cigarette;
                return (
                  <li key={event.id}>
                    <button
                      type="button"
                      onClick={() => onOpenEditEvent(event)}
                      className="w-full min-h-11 px-4 py-2.5 flex items-center gap-3 text-left rounded-lg"
                    >
                      <Icon
                        aria-hidden="true"
                        className={`w-5 h-5 shrink-0 ${isCannabis ? 'text-cannabis' : 'text-tobacco'}`}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold">
                          {isCannabis ? 'Cannabis' : 'Tabaco'}
                        </span>
                        {context && (
                          <span className="block text-sm text-muted-foreground truncate">{context}</span>
                        )}
                      </span>
                      <span className="text-sm text-muted-foreground shrink-0">
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

      {/* One tap logs, within reach of the thumb */}
      <section className="md:hidden fixed inset-x-0 bottom-dock z-40 px-2 pt-2 bg-background">
        <h2 className="sr-only">Registrar</h2>
        {tracker.events.length === 0 && (
          <p className="px-2 pb-2 text-sm text-muted-foreground">
            Um toque registra na hora. Onde e por quê são opcionais.
          </p>
        )}
        <div className="grid grid-cols-2 gap-2">
          {(['tobacco', 'cannabis'] as EventType[]).map((type) => {
            const isTobacco = type === 'tobacco';
            return (
              <button
                key={type}
                onClick={() => onQuickLog(type)}
                className={`h-[3.75rem] px-4 flex items-center justify-between rounded-lg font-semibold active:scale-[0.98] transition-transform ${
                  isTobacco ? 'bg-tobacco text-tobacco-foreground' : 'bg-cannabis text-cannabis-foreground'
                }`}
              >
                {isTobacco ? 'Tabaco' : 'Cannabis'}
                <Plus aria-hidden="true" className="w-5 h-5" />
              </button>
            );
          })}
        </div>
      </section>

      {/* Desktop — recent logs */}
      <div className="hidden md:block panel p-4">
        <h2 className="font-semibold mb-3">Registros recentes</h2>
        {recentGroups.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum registro ou anotação nos últimos 3 dias.</p>
        ) : (
          <div className="space-y-5">
            {recentGroups.map(({ dayKey, events, heading, notes }) => (
              <section key={dayKey}>
                <button
                  type="button"
                  onClick={() => onOpenEditDay(dayKey)}
                  className="min-h-8 flex items-center gap-2 section-title rounded-sm hover:text-foreground"
                >
                  {heading}
                  {notes.length > 0 && (
                    <>
                      <StickyNote aria-hidden="true" className="w-3.5 h-3.5" />
                      <span className="sr-only">com anotações</span>
                    </>
                  )}
                </button>
                {notes.length > 0 && (
                  <ul className="mb-2 space-y-1">
                    {notes.map((note) => (
                      <li key={note.id} className="text-sm text-muted-foreground">
                        {note.text}
                      </li>
                    ))}
                  </ul>
                )}
                <ul className="divide-y divide-border">
                  {events.map((event) => {
                    const isCannabis = event.type === 'cannabis';
                    const context = [event.location, event.reason].filter(Boolean).join(' · ');
                    const Icon = isCannabis ? Leaf : Cigarette;
                    return (
                      <li key={event.id} className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => onOpenEditEvent(event)}
                          className="min-w-0 flex-1 min-h-12 py-2 flex items-center gap-3 text-left rounded-sm group"
                        >
                          <Icon
                            aria-hidden="true"
                            className={`w-5 h-5 shrink-0 ${isCannabis ? 'text-cannabis' : 'text-tobacco'}`}
                          />
                          <span className="w-12 shrink-0 text-sm text-muted-foreground">
                            {format(parseISO(event.timestamp), 'HH:mm', { locale: ptBR })}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-sm font-semibold">
                              {isCannabis ? 'Cannabis' : 'Tabaco'}
                            </span>
                            {context && (
                              <span className="block text-sm text-muted-foreground truncate">{context}</span>
                            )}
                          </span>
                          <ChevronRight aria-hidden="true" className="w-4 h-4 shrink-0 text-muted-foreground" />
                        </button>
                        <button
                          onClick={() => handleRemoveEvent(event.id)}
                          aria-label="Remover evento"
                          className="w-11 h-11 flex items-center justify-center shrink-0 rounded-md text-muted-foreground hover:bg-muted hover:text-destructive transition-colors"
                        >
                          <Trash2 aria-hidden="true" className="w-4 h-4" />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>
    </main>
  );
};
