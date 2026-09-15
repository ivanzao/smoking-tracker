import { DayNote, DayRecord } from '@/types';

const DAY_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;
const LOCAL_ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/;

const byDayKey = (a: DayRecord, b: DayRecord) =>
  a.dayKey < b.dayKey ? -1 : a.dayKey > b.dayKey ? 1 : 0;

const byCreatedAt = (a: DayNote, b: DayNote) =>
  a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0;

export function getDayNotes(days: DayRecord[], dayKey: string): DayNote[] {
  return days.find((d) => d.dayKey === dayKey)?.notes ?? [];
}

/** Insert a note, creating the day record if needed. No-op when the id already exists on that day. */
export function addDayNote(days: DayRecord[], dayKey: string, note: DayNote): DayRecord[] {
  const existing = days.find((d) => d.dayKey === dayKey);
  if (existing) {
    if (existing.notes.some((n) => n.id === note.id)) return days;
    return days.map((d) =>
      d.dayKey === dayKey ? { ...d, notes: [...d.notes, note].sort(byCreatedAt) } : d
    );
  }
  return [...days, { dayKey, notes: [note] }].sort(byDayKey);
}

export function updateDayNote(
  days: DayRecord[],
  dayKey: string,
  noteId: string,
  text: string,
): DayRecord[] {
  const day = days.find((d) => d.dayKey === dayKey);
  if (!day || !day.notes.some((n) => n.id === noteId)) return days;
  return days.map((d) =>
    d.dayKey === dayKey
      ? { ...d, notes: d.notes.map((n) => (n.id === noteId ? { ...n, text } : n)) }
      : d
  );
}

/** Remove a note; a day left without notes is dropped entirely. */
export function removeDayNote(days: DayRecord[], dayKey: string, noteId: string): DayRecord[] {
  return days
    .map((d) =>
      d.dayKey === dayKey ? { ...d, notes: d.notes.filter((n) => n.id !== noteId) } : d
    )
    .filter((d) => d.notes.length > 0);
}

function isValidDayNote(value: unknown): value is DayNote {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const obj = value as Record<string, unknown>;
  // createdAt is rendered through parseISO/format, which throw on garbage — reject it here
  return (
    typeof obj.id === 'string' &&
    typeof obj.text === 'string' &&
    typeof obj.createdAt === 'string' &&
    LOCAL_ISO_RE.test(obj.createdAt) &&
    !Number.isNaN(Date.parse(obj.createdAt))
  );
}

export function isValidDayRecord(value: unknown): value is DayRecord {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const obj = value as Record<string, unknown>;
  if (typeof obj.dayKey !== 'string' || !DAY_KEY_RE.test(obj.dayKey)) return false;
  if (!Array.isArray(obj.notes)) return false;
  return obj.notes.every(isValidDayNote);
}

export interface DaysMergeResult {
  merged: DayRecord[];
  /** Notes added */
  added: number;
  /** Notes skipped because the id already existed on that day */
  skipped: number;
}

/** Union by note id within each day; the current copy of a note wins. */
export function mergeDays(current: DayRecord[], incoming: DayRecord[]): DaysMergeResult {
  let merged = current;
  let added = 0;
  let skipped = 0;
  for (const day of incoming) {
    for (const note of day.notes) {
      const next = addDayNote(merged, day.dayKey, note);
      if (next === merged) {
        skipped++;
      } else {
        merged = next;
        added++;
      }
    }
  }
  return { merged, added, skipped };
}
