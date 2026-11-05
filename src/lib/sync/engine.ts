import { DayNote, DayRecord, GoalEntry, TrackerEvent } from '@/types';
import { addDayNote, isValidDayRecord, removeDayNote } from '@/lib/days';
import { isValidEvent, isValidGoal } from '@/lib/export';

export type RecordKind = 'event' | 'goal' | 'note' | 'streak-reset';

export interface SyncState {
  events: TrackerEvent[];
  goals: GoalEntry[];
  days: DayRecord[];
  streakResetDay: string | null;
}

export interface SyncRecord {
  kind: RecordKind;
  id: string;
  data: unknown;
}

export interface PushRow extends SyncRecord {
  updated_at: string;
  deleted_at: string | null;
}

export interface RemoteRow extends PushRow {
  synced_at: string;
}

/** The server side of sync; the Supabase adapter implements it. */
export interface RemoteStore {
  pull(since: string | null): Promise<RemoteRow[]>;
  push(rows: PushRow[]): Promise<void>;
}

export interface SyncChanges {
  upserts: SyncRecord[];
  deletes: { kind: RecordKind; id: string }[];
}

interface LedgerEntry {
  hash: string;
  /** When the record was edited, not when it was synced. */
  updatedAt: string;
  dirty: boolean;
  deleted: boolean;
}

interface Ledger {
  cursor: string | null;
  entries: Record<string, LedgerEntry>;
}

export interface LedgerStore {
  load(): Ledger;
  save(ledger: Ledger): void;
}

const emptyLedger = (): Ledger => ({ cursor: null, entries: {} });

export const LEDGER_KEY = 'smoking-tracker-sync';

export function createLedgerStorage(): LedgerStore {
  return {
    load: () => {
      try {
        const parsed = JSON.parse(localStorage.getItem(LEDGER_KEY) ?? 'null');
        return parsed?.entries ? parsed : emptyLedger();
      } catch {
        // Losing the ledger is safe: every record is re-sent and matched by id
        return emptyLedger();
      }
    },
    save: (ledger) => localStorage.setItem(LEDGER_KEY, JSON.stringify(ledger)),
  };
}

export function createLedgerMemory(): LedgerStore {
  let ledger = emptyLedger();
  return {
    load: () => ledger,
    save: (next) => {
      ledger = next;
    },
  };
}

const keyOf = (r: { kind: string; id: string }) => `${r.kind}:${r.id}`;

const STREAK_RESET_ID = 'current';
const PUSH_BATCH_SIZE = 500;
const DAY_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Rows come from outside the app; a bad one must not reach code that assumes valid data. */
function isValidRecord({ kind, id, data }: SyncRecord): boolean {
  if (kind === 'event') return isValidEvent(data) && data.id === id;
  if (kind === 'goal') return isValidGoal(data) && data.id === id;
  if (kind === 'note') {
    const { dayKey, note } = (data ?? {}) as { dayKey?: unknown; note?: { id?: unknown } };
    return isValidDayRecord({ dayKey, notes: [note] }) && note?.id === id;
  }
  if (kind === 'streak-reset') {
    const { day } = (data ?? {}) as { day?: unknown };
    return typeof day === 'string' && DAY_KEY_RE.test(day);
  }
  return false;
}

function toRecords(state: SyncState): SyncRecord[] {
  const records: SyncRecord[] = [
    ...state.events.map((e) => ({ kind: 'event' as const, id: e.id, data: e })),
    ...state.goals.map((g) => ({ kind: 'goal' as const, id: g.id, data: g })),
    ...state.days.flatMap((d) =>
      d.notes.map((note) => ({
        kind: 'note' as const,
        id: note.id,
        data: { dayKey: d.dayKey, note },
      })),
    ),
  ];
  if (state.streakResetDay) {
    records.push({
      kind: 'streak-reset',
      id: STREAK_RESET_ID,
      data: { day: state.streakResetDay },
    });
  }
  return records;
}

/** jsonb doesn't keep key order, so a record must hash the same after a round trip. */
function canonical(value: unknown): string {
  return JSON.stringify(value, (_key, v) => {
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      return Object.fromEntries(Object.entries(v).sort(([a], [b]) => (a < b ? -1 : 1)));
    }
    return v;
  });
}

function hashOf(data: unknown): string {
  const text = canonical(data);
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < text.length; i++) {
    const ch = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (h2 >>> 0).toString(36) + (h1 >>> 0).toString(36);
}

/** Compare state against the ledger; call on every state change so edit times stay accurate. */
export function trackChanges(store: LedgerStore, state: SyncState, now: string): void {
  const ledger = store.load();
  const entries = { ...ledger.entries };
  const live = new Set<string>();
  let changed = false;

  for (const record of toRecords(state)) {
    const key = keyOf(record);
    live.add(key);
    const hash = hashOf(record.data);
    const entry = entries[key];
    if (!entry || entry.deleted || entry.hash !== hash) {
      entries[key] = { hash, updatedAt: now, dirty: true, deleted: false };
      changed = true;
    }
  }

  for (const [key, entry] of Object.entries(entries)) {
    if (!live.has(key) && !entry.deleted) {
      entries[key] = { ...entry, updatedAt: now, dirty: true, deleted: true };
      changed = true;
    }
  }

  if (changed) store.save({ ...ledger, entries });
}

export function pendingCount(store: LedgerStore): number {
  return Object.values(store.load().entries).filter((e) => e.dirty).length;
}

export function applyChanges(state: SyncState, changes: SyncChanges): SyncState {
  let { events, goals, days, streakResetDay } = state;

  for (const { kind, id } of changes.deletes) {
    if (kind === 'event') events = events.filter((e) => e.id !== id);
    if (kind === 'goal') goals = goals.filter((g) => g.id !== id);
    if (kind === 'note') days = withoutNote(days, id);
    if (kind === 'streak-reset') streakResetDay = null;
  }

  for (const { kind, id, data } of changes.upserts) {
    if (kind === 'event') {
      events = [...events.filter((e) => e.id !== id), data as TrackerEvent].sort((a, b) =>
        a.timestamp < b.timestamp ? -1 : a.timestamp > b.timestamp ? 1 : 0,
      );
    }
    if (kind === 'goal') {
      goals = [...goals.filter((g) => g.id !== id), data as GoalEntry].sort((a, b) =>
        a.effectiveFrom < b.effectiveFrom ? -1 : a.effectiveFrom > b.effectiveFrom ? 1 : 0,
      );
    }
    if (kind === 'note') {
      const { dayKey, note } = data as { dayKey: string; note: DayNote };
      days = addDayNote(withoutNote(days, id), dayKey, note);
    }
    if (kind === 'streak-reset') streakResetDay = (data as { day: string }).day;
  }

  return { events, goals, days, streakResetDay };
}

function withoutNote(days: DayRecord[], noteId: string): DayRecord[] {
  const day = days.find((d) => d.notes.some((n) => n.id === noteId));
  return day ? removeDayNote(days, day.dayKey, noteId) : days;
}

interface RunSyncOptions {
  remote: RemoteStore;
  ledger: LedgerStore;
  getState(): SyncState;
  applyChanges(changes: SyncChanges): void;
  now(): string;
}

export async function runSync(options: RunSyncOptions): Promise<void> {
  const { remote, ledger: store, getState, now } = options;
  trackChanges(store, getState(), now());

  const pulled = await remote.pull(store.load().cursor);
  const ledger = store.load();
  const entries = { ...ledger.entries };
  let cursor = ledger.cursor;
  const changes: SyncChanges = { upserts: [], deletes: [] };

  for (const row of pulled) {
    if (!cursor || row.synced_at > cursor) cursor = row.synced_at;
    const key = keyOf(row);
    const hash = hashOf(row.data);
    const rowDeleted = row.deleted_at !== null;
    const entry = entries[key];

    if (entry) {
      const same = entry.deleted === rowDeleted && (rowDeleted || entry.hash === hash);
      if (same) {
        if (rowDeleted) delete entries[key];
        else entries[key] = { ...entry, dirty: false };
        continue;
      }
      // Local is newer: keep it and send it back, even if it wasn't pending, so the server converges
      if (Date.parse(entry.updatedAt) > Date.parse(row.updated_at)) {
        entries[key] = { ...entry, dirty: true };
        continue;
      }
    }

    if (rowDeleted) {
      if (entry) {
        delete entries[key];
        changes.deletes.push({ kind: row.kind, id: row.id });
      }
      continue;
    }

    if (!isValidRecord(row)) continue;

    entries[key] = { hash, updatedAt: row.updated_at, dirty: false, deleted: false };
    changes.upserts.push({ kind: row.kind, id: row.id, data: row.data });
  }

  // Before applying: otherwise the applied rows would look like local edits
  store.save({ cursor, entries });
  if (changes.upserts.length > 0 || changes.deletes.length > 0) options.applyChanges(changes);

  const current = store.load();
  const byKey = new Map(toRecords(getState()).map((r) => [keyOf(r), r]));
  const rows: PushRow[] = Object.entries(current.entries)
    .filter(([, entry]) => entry.dirty)
    .flatMap(([key, entry]) => {
      if (entry.deleted) {
        const separator = key.indexOf(':');
        return [
          {
            kind: key.slice(0, separator) as RecordKind,
            id: key.slice(separator + 1),
            data: {},
            updated_at: entry.updatedAt,
            deleted_at: entry.updatedAt,
          },
        ];
      }
      // Removed since it was tracked: the next trackChanges turns it into a delete
      const record = byKey.get(key);
      return record ? [{ ...record, updated_at: entry.updatedAt, deleted_at: null }] : [];
    });
  for (let i = 0; i < rows.length; i += PUSH_BATCH_SIZE) {
    const batch = rows.slice(i, i + PUSH_BATCH_SIZE);
    await remote.push(batch);
    markPushed(store, batch);
  }
}

/** Entries edited while the push was in flight stay pending. */
function markPushed(store: LedgerStore, rows: PushRow[]): void {
  const ledger = store.load();
  const entries = { ...ledger.entries };
  for (const row of rows) {
    const key = keyOf(row);
    const entry = entries[key];
    if (!entry || entry.updatedAt !== row.updated_at) continue;
    if (entry.deleted !== (row.deleted_at !== null)) continue;
    if (entry.deleted) delete entries[key];
    else entries[key] = { ...entry, dirty: false };
  }
  store.save({ ...ledger, entries });
}
