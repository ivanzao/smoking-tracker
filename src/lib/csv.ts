import { format, parseISO, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { TrackerEvent, GoalEntry, DayRecord } from '@/types';
import { getDayKey, getDaysInRange, getDayTotals, getEventsForDay, todayKey } from './events';
import { DayGoalStatus, getDayGoalStatus, getGoalForDay } from './stats';
import { getDayNotes } from './days';

/** Inclusive range of day keys ("YYYY-MM-DD"). */
export interface CsvRange {
  from: string;
  to: string;
}

export type CsvPeriod = '7d' | '30d' | 'all';

const PERIOD_DAYS: Record<Exclude<CsvPeriod, 'all'>, number> = { '7d': 7, '30d': 30 };

/**
 * Resolve a period into an inclusive day-key range ending today.
 * Fixed periods always resolve; 'all' needs at least one event or note and returns null otherwise.
 */
export function resolveCsvRange(
  period: CsvPeriod,
  events: TrackerEvent[],
  days: DayRecord[],
  today: string = todayKey(),
): CsvRange | null {
  if (period !== 'all') {
    const from = format(subDays(dayKeyToDate(today), PERIOD_DAYS[period] - 1), 'yyyy-MM-dd');
    return { from, to: today };
  }
  const candidates = [
    ...events.map((e) => getDayKey(e.timestamp)),
    ...days.map((d) => d.dayKey),
  ];
  if (candidates.length === 0) return null;
  return { from: candidates.reduce((min, k) => (k < min ? k : min)), to: today };
}

export function csvFileName(range: CsvRange): string {
  return `smoking-tracker-${range.from}_${range.to}.csv`;
}

const HEADER = ['Data', 'Dia', 'Meta', 'Total', 'Tabaco', 'Cannabis', 'Status', 'Motivos', 'Locais', 'Notas'];
const SEPARATOR = ';';
const EOL = '\r\n';
const BOM = '\uFEFF';

const dayKeyToDate = (dayKey: string) => parseISO(dayKey + 'T12:00:00');

function formatDayKey(dayKey: string): string {
  const [y, m, d] = dayKey.split('-');
  return `${d}/${m}/${y}`;
}

// ptBR 'EEE' yields "segunda", "sábado"…; the slice gives "seg", "sáb" (same trick as CalendarView)
function formatWeekday(dayKey: string): string {
  return format(dayKeyToDate(dayKey), 'EEE', { locale: ptBR }).slice(0, 3);
}

const STATUS_LABEL: Record<DayGoalStatus, string> = {
  within: 'dentro',
  over: 'acima',
  'no-goal': 'sem meta',
};

const TYPE_TAG: Record<TrackerEvent['type'], string> = { tobacco: '[T]', cannabis: '[C]' };

/** "HH:mm [T] texto" — the time+tag prefix is always present so Motivos and Locais line up event by event. */
function eventLine(event: TrackerEvent, text: string | undefined): string {
  const prefix = `${event.timestamp.slice(11, 16)} ${TYPE_TAG[event.type]}`;
  return text ? `${prefix} ${text}` : prefix;
}

/** RFC 4180 quoting; line breaks stay inside the quoted cell. */
function escapeCell(value: string): string {
  if (!/[";\r\n]/.test(value)) return value;
  return `"${value.replace(/"/g, '""')}"`;
}

function buildRow(
  dayKey: string,
  events: TrackerEvent[],
  goals: GoalEntry[],
  days: DayRecord[],
): string[] {
  const goal = getGoalForDay(goals, dayKey);
  const { tobacco, cannabis } = getDayTotals(events, dayKey);
  const dayEvents = getEventsForDay(events, dayKey).sort((a, b) =>
    a.timestamp < b.timestamp ? -1 : a.timestamp > b.timestamp ? 1 : 0,
  );
  const notes = [...getDayNotes(days, dayKey)].sort((a, b) =>
    a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0,
  );
  return [
    formatDayKey(dayKey),
    formatWeekday(dayKey),
    goal ? String(goal.limit) : '',
    String(tobacco + cannabis),
    String(tobacco),
    String(cannabis),
    STATUS_LABEL[getDayGoalStatus(events, goals, dayKey)],
    dayEvents.map((e) => eventLine(e, e.reason)).join('\n'),
    dayEvents.map((e) => eventLine(e, e.location)).join('\n'),
    notes.map((n) => n.text).join('\n'),
  ];
}

export function serializeCsv(
  events: TrackerEvent[],
  goals: GoalEntry[],
  days: DayRecord[],
  range: CsvRange,
): string {
  const dayKeys = getDaysInRange(dayKeyToDate(range.from), dayKeyToDate(range.to));
  const lines = [HEADER, ...dayKeys.map((dayKey) => buildRow(dayKey, events, goals, days))];
  return BOM + lines.map((cells) => cells.map(escapeCell).join(SEPARATOR) + EOL).join('');
}
