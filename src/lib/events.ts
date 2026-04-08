import { eachDayOfInterval, format } from 'date-fns';
import { TrackerEvent, DayTotals } from '@/types';

/** Extract local date (YYYY-MM-DD) from an ISO timestamp with offset. */
export function getDayKey(timestamp: string): string {
  return timestamp.slice(0, 10);
}

export function nowLocalIso(): string {
  const now = new Date();
  const offsetMin = -now.getTimezoneOffset();
  const sign = offsetMin >= 0 ? '+' : '-';
  const abs = Math.abs(offsetMin);
  const oh = String(Math.floor(abs / 60)).padStart(2, '0');
  const om = String(abs % 60).padStart(2, '0');
  const local = format(now, "yyyy-MM-dd'T'HH:mm:ss");
  return `${local}${sign}${oh}:${om}`;
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
