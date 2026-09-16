import type ExcelJS from 'exceljs';
import { addDays, endOfWeek, format, parseISO, startOfWeek, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { TrackerEvent, GoalEntry, DayRecord } from '@/types';
import { getDayKey, getDaysInRange, getDayTotals, todayKey } from './events';
import { DayGoalStatus, getDayGoalStatus, getGoalForDay } from './stats';
import { getDayNotes } from './days';

/** Inclusive range of day keys ("YYYY-MM-DD"). */
export interface XlsxRange {
  from: string;
  to: string;
}

export type XlsxRangeError = 'empty' | 'inverted' | 'future';

/** Shortcuts only fill the range — "today and the N-1 days before it", like the old presets. */
export const RANGE_SHORTCUTS: { label: string; days: number }[] = [
  { label: '7 dias', days: 7 },
  { label: '30 dias', days: 30 },
  { label: '1 ano', days: 365 },
];

const dayKeyToDate = (dayKey: string) => parseISO(dayKey + 'T12:00:00');
const toDayKey = (date: Date) => format(date, 'yyyy-MM-dd');

export function shortcutRange(days: number, today: string = todayKey()): XlsxRange {
  return { from: toDayKey(subDays(dayKeyToDate(today), days - 1)), to: today };
}

export function validateXlsxRange(
  from: string,
  to: string,
  today: string = todayKey(),
): XlsxRangeError | null {
  if (!from || !to) return 'empty';
  if (from > to) return 'inverted';
  if (to > today) return 'future';
  return null;
}

export function xlsxFileName(range: XlsxRange): string {
  return `smoking-tracker-${range.from}_${range.to}.xlsx`;
}

/** Monday→Sunday weeks clipped to the range, so the first and last may be partial. */
export function splitIntoWeeks(range: XlsxRange): XlsxRange[] {
  const weeks: XlsxRange[] = [];
  let cursor = startOfWeek(dayKeyToDate(range.from), { weekStartsOn: 1 });
  const end = dayKeyToDate(range.to);
  while (cursor <= end) {
    const weekEnd = endOfWeek(cursor, { weekStartsOn: 1 });
    const from = toDayKey(cursor) < range.from ? range.from : toDayKey(cursor);
    const to = toDayKey(weekEnd) > range.to ? range.to : toDayKey(weekEnd);
    weeks.push({ from, to });
    cursor = addDays(weekEnd, 1);
  }
  return weeks;
}

// ptBR 'MMM' yields "set", "out"; Excel forbids "/" in sheet names, so no dd/mm here
const formatShortDate = (dayKey: string) => format(dayKeyToDate(dayKey), 'dd MMM', { locale: ptBR });

/** "01 set – 07 set" */
export function weekSheetName(week: XlsxRange): string {
  return `${formatShortDate(week.from)} – ${formatShortDate(week.to)}`;
}

export const EVENTS_SHEET_NAME = 'Eventos';

// ptBR 'EEE' yields "segunda", "sábado"…; the slice gives "seg", "sáb" (same trick as CalendarView)
function formatWeekday(dayKey: string): string {
  return format(dayKeyToDate(dayKey), 'EEE', { locale: ptBR }).slice(0, 3);
}

/**
 * ExcelJS converts a Date to an Excel serial from its UTC time, so a midnight-UTC
 * date lands on the intended calendar day regardless of the viewer's timezone.
 */
function dayKeyToExcelDate(dayKey: string): Date {
  const [y, m, d] = dayKey.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

const STATUS_LABEL: Record<DayGoalStatus, string> = {
  within: 'dentro',
  over: 'acima',
  'no-goal': 'sem meta',
};

const TYPE_LABEL: Record<TrackerEvent['type'], string> = { tobacco: 'Tabaco', cannabis: 'Cannabis' };

export interface WeekRow {
  weekday: string;
  date: Date;
  goal: number | null;
  tobacco: number;
  cannabis: number;
  total: number;
  status: DayGoalStatus;
  notes: string;
}

export interface WeekTotalRow {
  tobacco: number;
  cannabis: number;
  total: number;
  /** "5/7 dentro" — days within the goal over the days present in the sheet. */
  withinLabel: string;
}

export interface EventRow {
  weekday: string;
  date: Date;
  time: string;
  type: string;
  reason: string;
  location: string;
  goal: number | null;
  status: DayGoalStatus;
}

export function buildWeekRows(
  events: TrackerEvent[],
  goals: GoalEntry[],
  days: DayRecord[],
  week: XlsxRange,
): WeekRow[] {
  return getDaysInRange(dayKeyToDate(week.from), dayKeyToDate(week.to)).map((dayKey) => {
    const goal = getGoalForDay(goals, dayKey);
    const { tobacco, cannabis } = getDayTotals(events, dayKey);
    const notes = [...getDayNotes(days, dayKey)].sort((a, b) =>
      a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0,
    );
    return {
      weekday: formatWeekday(dayKey),
      date: dayKeyToExcelDate(dayKey),
      goal: goal ? goal.limit : null,
      tobacco,
      cannabis,
      total: tobacco + cannabis,
      status: getDayGoalStatus(events, goals, dayKey),
      notes: notes.map((n) => n.text).join('\n'),
    };
  });
}

export function buildWeekTotal(rows: WeekRow[]): WeekTotalRow {
  const within = rows.filter((r) => r.status === 'within').length;
  return {
    tobacco: rows.reduce((sum, r) => sum + r.tobacco, 0),
    cannabis: rows.reduce((sum, r) => sum + r.cannabis, 0),
    total: rows.reduce((sum, r) => sum + r.total, 0),
    withinLabel: `${within}/${rows.length} dentro`,
  };
}

export function buildEventRows(
  events: TrackerEvent[],
  goals: GoalEntry[],
  range: XlsxRange,
): EventRow[] {
  return events
    .filter((e) => {
      const dk = getDayKey(e.timestamp);
      return dk >= range.from && dk <= range.to;
    })
    .sort((a, b) => (a.timestamp < b.timestamp ? -1 : a.timestamp > b.timestamp ? 1 : 0))
    .map((e) => {
      const dayKey = getDayKey(e.timestamp);
      const goal = getGoalForDay(goals, dayKey);
      return {
        weekday: formatWeekday(dayKey),
        date: dayKeyToExcelDate(dayKey),
        time: e.timestamp.slice(11, 16),
        type: TYPE_LABEL[e.type],
        reason: e.reason ?? '',
        location: e.location ?? '',
        goal: goal ? goal.limit : null,
        status: getDayGoalStatus(events, goals, dayKey),
      };
    });
}

const DATE_FORMAT = 'dd/mm/yyyy';
const HEADER_FONT = { bold: true };

const WEEK_COLUMNS: Partial<ExcelJS.Column>[] = [
  { header: 'Dia', key: 'weekday', width: 6 },
  { header: 'Data', key: 'date', width: 12, style: { numFmt: DATE_FORMAT } },
  { header: 'Meta', key: 'goal', width: 7 },
  { header: 'Tabaco', key: 'tobacco', width: 9 },
  { header: 'Cannabis', key: 'cannabis', width: 10 },
  { header: 'Total', key: 'total', width: 7 },
  { header: 'Status', key: 'status', width: 12 },
  { header: 'Notas', key: 'notes', width: 48, style: { alignment: { wrapText: true, vertical: 'top' } } },
];

const EVENT_COLUMNS: Partial<ExcelJS.Column>[] = [
  { header: 'Dia', key: 'weekday', width: 6 },
  { header: 'Data', key: 'date', width: 12, style: { numFmt: DATE_FORMAT } },
  { header: 'Hora', key: 'time', width: 7 },
  { header: 'Tipo', key: 'type', width: 10 },
  { header: 'Motivo', key: 'reason', width: 28 },
  { header: 'Local', key: 'location', width: 22 },
  { header: 'Meta do Dia', key: 'goal', width: 12 },
  { header: 'Status do Dia', key: 'status', width: 14 },
];

function addSheet(workbook: ExcelJS.Workbook, name: string, columns: Partial<ExcelJS.Column>[]) {
  const sheet = workbook.addWorksheet(name, { views: [{ state: 'frozen', ySplit: 1 }] });
  sheet.columns = columns;
  sheet.getRow(1).font = HEADER_FONT;
  return sheet;
}

/** ExcelJS is ~260 KB gzipped, so it's loaded on demand rather than with the app shell. */
export async function buildWorkbook(
  events: TrackerEvent[],
  goals: GoalEntry[],
  days: DayRecord[],
  range: XlsxRange,
): Promise<ExcelJS.Workbook> {
  const { Workbook } = await import('exceljs');
  const workbook = new Workbook();

  for (const week of splitIntoWeeks(range)) {
    const sheet = addSheet(workbook, weekSheetName(week), WEEK_COLUMNS);
    const rows = buildWeekRows(events, goals, days, week);
    for (const r of rows) {
      sheet.addRow({ ...r, goal: r.goal ?? '', status: STATUS_LABEL[r.status] });
    }
    const total = buildWeekTotal(rows);
    const totalRow = sheet.addRow({
      weekday: 'Total',
      tobacco: total.tobacco,
      cannabis: total.cannabis,
      total: total.total,
      status: total.withinLabel,
    });
    totalRow.font = HEADER_FONT;
  }

  const eventsSheet = addSheet(workbook, EVENTS_SHEET_NAME, EVENT_COLUMNS);
  for (const r of buildEventRows(events, goals, range)) {
    eventsSheet.addRow({ ...r, goal: r.goal ?? '', status: STATUS_LABEL[r.status] });
  }

  return workbook;
}

export async function serializeXlsx(
  events: TrackerEvent[],
  goals: GoalEntry[],
  days: DayRecord[],
  range: XlsxRange,
): Promise<ArrayBuffer> {
  const workbook = await buildWorkbook(events, goals, days, range);
  return (await workbook.xlsx.writeBuffer()) as ArrayBuffer;
}
