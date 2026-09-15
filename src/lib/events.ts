import { eachDayOfInterval, format, parseISO, startOfMonth } from 'date-fns';
import { TrackerEvent, DayTotals } from '@/types';

/** Extract local date (YYYY-MM-DD) from an ISO timestamp with offset. */
export function getDayKey(timestamp: string): string {
  return timestamp.slice(0, 10);
}

/** Format a Date as ISO 8601 with the local offset, e.g. "2026-04-08T14:30:00-03:00". */
export function toLocalIso(date: Date): string {
  const offsetMin = -date.getTimezoneOffset();
  const sign = offsetMin >= 0 ? '+' : '-';
  const abs = Math.abs(offsetMin);
  const oh = String(Math.floor(abs / 60)).padStart(2, '0');
  const om = String(abs % 60).padStart(2, '0');
  const local = format(date, "yyyy-MM-dd'T'HH:mm:ss");
  return `${local}${sign}${oh}:${om}`;
}

export function nowLocalIso(): string {
  return toLocalIso(new Date());
}

const DAY_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;

/**
 * Build a local ISO timestamp from a day key ("YYYY-MM-DD") and a time ("HH:mm"),
 * as produced by <input type="date"> / <input type="time">. Returns null when invalid.
 */
export function buildLocalIso(dayKey: string, time: string): string | null {
  if (!DAY_KEY_RE.test(dayKey) || !TIME_RE.test(time)) return null;
  const date = parseISO(`${dayKey}T${time}:00`);
  if (Number.isNaN(date.getTime())) return null;
  return toLocalIso(date);
}

/** True when the timestamp is after "now" (events in the future are not allowed). */
export function isFutureIso(iso: string): boolean {
  return new Date(iso).getTime() > Date.now();
}

export function todayKey(): string {
  return getDayKey(nowLocalIso());
}

export function getEventsForDay(events: TrackerEvent[], dayKey: string): TrackerEvent[] {
  return events.filter((e) => getDayKey(e.timestamp) === dayKey);
}

export function getDayTotals(events: TrackerEvent[], dayKey: string): DayTotals {
  const day = getEventsForDay(events, dayKey);
  return {
    tobacco: day.filter((e) => e.type === 'tobacco').length,
    cannabis: day.filter((e) => e.type === 'cannabis').length,
  };
}

export function getDaysInRange(from: Date, to: Date): string[] {
  return eachDayOfInterval({ start: from, end: to }).map((d) =>
    format(d, 'yyyy-MM-dd')
  );
}

export function getMonthKey(date: Date): string {
  return format(date, 'yyyy-MM');
}

export function getEarliestEventMonth(events: TrackerEvent[]): Date | null {
  if (events.length === 0) return null;
  let earliestTs = events[0].timestamp;
  for (const e of events) {
    if (e.timestamp < earliestTs) earliestTs = e.timestamp;
  }
  const dayKey = getDayKey(earliestTs);
  return startOfMonth(parseISO(dayKey + 'T12:00:00'));
}
