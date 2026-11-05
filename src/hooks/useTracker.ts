import { useCallback, useEffect, useMemo, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { EventType, GoalEntry, TrackerEvent, DayTotals, DayNote, DayRecord } from '@/types';
import {
  getDayKey,
  getDayTotals as calcDayTotals,
  getEventsForDay as calcEventsForDay,
  nowLocalIso,
  todayKey,
} from '@/lib/events';
import {
  getCurrentGoal as calcCurrentGoal,
  getDayGoalStatus as calcDayGoalStatus,
  getCurrentStreak as calcCurrentStreak,
  getDaysWithinGoal as calcDaysWithinGoal,
  getRollingAverage as calcRollingAverage,
  getAverageDelta as calcAverageDelta,
  DayGoalStatus,
} from '@/lib/stats';
import {
  ImportError,
  mergeEvents,
  mergeGoals,
  mergeStreakReset,
  parseImport,
  serializeExport,
} from '@/lib/export';
import { XlsxRange, serializeXlsx, xlsxFileName } from '@/lib/xlsx';
import {
  addDayNote as calcAddDayNote,
  updateDayNote as calcUpdateDayNote,
  removeDayNote as calcRemoveDayNote,
  getDayNotes as calcGetDayNotes,
  isValidDayRecord,
  mergeDays,
} from '@/lib/days';
import { SyncChanges, SyncState, applyChanges } from '@/lib/sync/engine';

export const STORAGE_KEY = 'smoking-tracker';
const DAY_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

// Events are kept in chronological order (buildExport's dateRange relies on it);
// custom timestamps can land anywhere, so re-sort after every insert/update.
const byTimestamp = (a: TrackerEvent, b: TrackerEvent) =>
  a.timestamp < b.timestamp ? -1 : a.timestamp > b.timestamp ? 1 : 0;

/** A weekly XLSX report ready to download. */
export interface XlsxReport {
  buffer: ArrayBuffer;
  fileName: string;
}

export interface UseTrackerAPI {
  events: TrackerEvent[];
  /** Returns the new event, so its toast can target exactly that one. */
  addEvent(input: { type: EventType; location?: string; reason?: string; timestamp?: string }): TrackerEvent;
  removeEvent(id: string): void;
  /** Re-insert a removed event as-is; used by the undo toasts. No-op if it's already back. */
  restoreEvent(event: TrackerEvent): void;
  updateEvent(id: string, patch: Partial<Omit<TrackerEvent, 'id'>>): void;
  clearDay(dayKey: string): void;
  /** Erase events, goals, notes and the streak marker. */
  clearAll(): void;
  getDayTotals(dayKey: string): DayTotals;
  getEventsForDay(dayKey: string): TrackerEvent[];
  getTodayTotals(): DayTotals;
  exportEvents(): string;
  /** One sheet per Mon→Sun week in the range plus an "Eventos" sheet, one row per event. */
  exportXlsx(range: XlsxRange): Promise<XlsxReport>;
  importEvents(raw: string): ImportOutcome;

  goals: GoalEntry[];
  setGoal(limit: number | null): void;
  getCurrentGoal(): GoalEntry | null;
  getDayGoalStatus(dayKey: string): DayGoalStatus;
  getCurrentStreak(): number;
  /** Total days within the goal since the first goal was set (not necessarily consecutive). */
  getDaysWithinGoal(): number;
  /** Day key of the last manual streak reset, or null. */
  streakResetDay: string | null;
  /** Zero the streak from today — it resumes counting tomorrow. */
  resetStreak(): void;
  getRollingAverage(days: number): number;
  getAverageDelta(days: number): number | null;

  days: DayRecord[];
  getDayNotes(dayKey: string): DayNote[];
  /** Returns the created note, or null when the text is blank. */
  addDayNote(dayKey: string, text: string): DayNote | null;
  /** Blank text is ignored — deleting is the trash button's job. */
  updateDayNote(dayKey: string, noteId: string, text: string): void;
  removeDayNote(dayKey: string, noteId: string): void;
  /** Re-insert a removed note as-is (same id/createdAt); used by the undo toast. */
  restoreDayNote(dayKey: string, note: DayNote): void;

  /** Everything that gets synced, as one object. */
  syncState: SyncState;
  /** Apply records that came from the server. */
  applySyncChanges(changes: SyncChanges): void;
}

export type ImportOutcome =
  | {
      ok: true;
      added: number;
      skipped: number;
      goalsAdded: number;
      goalsSkipped: number;
      notesAdded: number;
      notesSkipped: number;
    }
  | { ok: false; error: ImportError };

function isValidGoalEntry(value: unknown): value is GoalEntry {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const obj = value as Record<string, unknown>;
  if (typeof obj.id !== 'string') return false;
  if (typeof obj.limit !== 'number' || !Number.isInteger(obj.limit) || obj.limit <= 0) return false;
  if (typeof obj.effectiveFrom !== 'string' || !DAY_KEY_RE.test(obj.effectiveFrom)) return false;
  return true;
}

interface LoadedState {
  events: TrackerEvent[];
  goals: GoalEntry[];
  streakResetDay: string | null;
  days: DayRecord[];
}

const EMPTY_STATE: LoadedState = { events: [], goals: [], streakResetDay: null, days: [] };

function loadFromStorage(): LoadedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_STATE;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return EMPTY_STATE;
    if (!Array.isArray(parsed.events)) return EMPTY_STATE;

    // Marker is optional and non-critical: a malformed one is dropped, not fatal
    const streakResetDay =
      typeof parsed.streakResetDay === 'string' && DAY_KEY_RE.test(parsed.streakResetDay)
        ? parsed.streakResetDay
        : null;

    // Same for day notes: malformed records are dropped one by one
    const days: DayRecord[] = Array.isArray(parsed.days)
      ? parsed.days.filter(isValidDayRecord)
      : [];

    // A bad goal must not cost the user their events: this state is saved right back
    const goals = (Array.isArray(parsed.goals) ? parsed.goals.filter(isValidGoalEntry) : [])
      .sort((a: GoalEntry, b: GoalEntry) =>
        a.effectiveFrom < b.effectiveFrom ? -1 : a.effectiveFrom > b.effectiveFrom ? 1 : 0
      );

    return { events: parsed.events as TrackerEvent[], goals, streakResetDay, days };
  } catch {
    return EMPTY_STATE;
  }
}

export function useTracker(): UseTrackerAPI {
  const [initial] = useState(loadFromStorage);
  const [events, setEvents] = useState<TrackerEvent[]>(initial.events);
  const [goals, setGoals] = useState<GoalEntry[]>(initial.goals);
  const [streakResetDay, setStreakResetDay] = useState<string | null>(initial.streakResetDay);
  const [days, setDays] = useState<DayRecord[]>(initial.days);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ events, goals, streakResetDay, days }));
  }, [events, goals, streakResetDay, days]);

  // The sync ledger is shared between tabs, so a tab holding old state would read
  // what another tab added as deletions
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY || e.newValue === null) return;
      const next = loadFromStorage();
      setEvents(next.events);
      setGoals(next.goals);
      setStreakResetDay(next.streakResetDay);
      setDays(next.days);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const addEvent = useCallback<UseTrackerAPI['addEvent']>((input) => {
    const id = uuidv4();
    const event: TrackerEvent = {
      id,
      timestamp: input.timestamp ?? nowLocalIso(),
      type: input.type,
      location: input.location?.trim() ? input.location.trim() : undefined,
      reason: input.reason?.trim() ? input.reason.trim() : undefined,
    };
    setEvents((prev) => [...prev, event].sort(byTimestamp));
    return event;
  }, []);

  const removeEvent = useCallback<UseTrackerAPI['removeEvent']>((id) => {
    setEvents((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const restoreEvent = useCallback<UseTrackerAPI['restoreEvent']>((event) => {
    setEvents((prev) =>
      prev.some((e) => e.id === event.id) ? prev : [...prev, event].sort(byTimestamp)
    );
  }, []);

  const updateEvent = useCallback<UseTrackerAPI['updateEvent']>((id, patch) => {
    setEvents((prev) =>
      prev.map((e) => (e.id === id ? { ...e, ...patch } : e)).sort(byTimestamp)
    );
  }, []);

  const clearDay = useCallback<UseTrackerAPI['clearDay']>((dayKey) => {
    setEvents((prev) => prev.filter((e) => getDayKey(e.timestamp) !== dayKey));
  }, []);

  const clearAll = useCallback<UseTrackerAPI['clearAll']>(() => {
    setEvents([]);
    setGoals([]);
    setDays([]);
    setStreakResetDay(null);
  }, []);

  const getDayTotals = useCallback<UseTrackerAPI['getDayTotals']>(
    (dayKey) => calcDayTotals(events, dayKey),
    [events]
  );

  const getEventsForDay = useCallback<UseTrackerAPI['getEventsForDay']>(
    (dayKey) => calcEventsForDay(events, dayKey),
    [events]
  );

  const getTodayTotals = useCallback<UseTrackerAPI['getTodayTotals']>(
    () => calcDayTotals(events, todayKey()),
    [events]
  );

  const setGoal = useCallback<UseTrackerAPI['setGoal']>((limit) => {
    if (limit === null) {
      setGoals((prev) => {
        const current = calcCurrentGoal(prev);
        if (!current) return prev;
        return prev.filter((g) => g.id !== current.id);
      });
      return;
    }
    if (typeof limit !== 'number' || !Number.isFinite(limit) || !Number.isInteger(limit) || limit <= 0) return;
    setGoals((prev) => {
      const current = calcCurrentGoal(prev);
      if (current && current.limit === limit) return prev;
      const today = todayKey();
      const existingToday = prev.findIndex((g) => g.effectiveFrom === today);
      if (existingToday >= 0) {
        const updated = [...prev];
        updated[existingToday] = { ...updated[existingToday], limit };
        return updated;
      }
      return [...prev, { id: uuidv4(), limit, effectiveFrom: today }].sort(
        (a, b) => (a.effectiveFrom < b.effectiveFrom ? -1 : a.effectiveFrom > b.effectiveFrom ? 1 : 0)
      );
    });
  }, []);

  const getCurrentGoal = useCallback<UseTrackerAPI['getCurrentGoal']>(
    () => calcCurrentGoal(goals),
    [goals]
  );

  const getDayGoalStatus = useCallback<UseTrackerAPI['getDayGoalStatus']>(
    (dayKey) => calcDayGoalStatus(events, goals, dayKey),
    [events, goals]
  );

  const getCurrentStreak = useCallback<UseTrackerAPI['getCurrentStreak']>(
    () => calcCurrentStreak(events, goals, streakResetDay),
    [events, goals, streakResetDay]
  );

  const getDaysWithinGoal = useCallback<UseTrackerAPI['getDaysWithinGoal']>(
    () => calcDaysWithinGoal(events, goals),
    [events, goals]
  );

  const resetStreak = useCallback<UseTrackerAPI['resetStreak']>(() => {
    setStreakResetDay(todayKey());
  }, []);

  const getRollingAverage = useCallback<UseTrackerAPI['getRollingAverage']>(
    (days) => calcRollingAverage(events, days),
    [events]
  );

  const getAverageDelta = useCallback<UseTrackerAPI['getAverageDelta']>(
    (days) => calcAverageDelta(events, days),
    [events]
  );

  const getDayNotes = useCallback<UseTrackerAPI['getDayNotes']>(
    (dayKey) => calcGetDayNotes(days, dayKey),
    [days]
  );

  const addDayNote = useCallback<UseTrackerAPI['addDayNote']>((dayKey, text) => {
    const trimmed = text.trim();
    if (!trimmed) return null;
    const note: DayNote = { id: uuidv4(), text: trimmed, createdAt: nowLocalIso() };
    setDays((prev) => calcAddDayNote(prev, dayKey, note));
    return note;
  }, []);

  const updateDayNote = useCallback<UseTrackerAPI['updateDayNote']>((dayKey, noteId, text) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setDays((prev) => calcUpdateDayNote(prev, dayKey, noteId, trimmed));
  }, []);

  const removeDayNote = useCallback<UseTrackerAPI['removeDayNote']>((dayKey, noteId) => {
    setDays((prev) => calcRemoveDayNote(prev, dayKey, noteId));
  }, []);

  const restoreDayNote = useCallback<UseTrackerAPI['restoreDayNote']>((dayKey, note) => {
    setDays((prev) => calcAddDayNote(prev, dayKey, note));
  }, []);

  const syncState = useMemo<SyncState>(
    () => ({ events, goals, days, streakResetDay }),
    [events, goals, days, streakResetDay]
  );

  const applySyncChanges = useCallback<UseTrackerAPI['applySyncChanges']>((changes) => {
    // One functional update per slice, so a local edit queued in the same tick survives
    const apply = (slice: Partial<SyncState>) =>
      applyChanges({ ...EMPTY_STATE, ...slice }, changes);
    setEvents((prev) => apply({ events: prev }).events);
    setGoals((prev) => apply({ goals: prev }).goals);
    setDays((prev) => apply({ days: prev }).days);
    setStreakResetDay((prev) => apply({ streakResetDay: prev }).streakResetDay);
  }, []);

  const exportEvents = useCallback<UseTrackerAPI['exportEvents']>(
    () => serializeExport(events, goals, streakResetDay, days),
    [events, goals, streakResetDay, days]
  );

  const exportXlsx = useCallback<UseTrackerAPI['exportXlsx']>(
    async (range) => ({
      buffer: await serializeXlsx(events, goals, days, range),
      fileName: xlsxFileName(range),
    }),
    [events, goals, days]
  );

  const importEvents = useCallback<UseTrackerAPI['importEvents']>(
    (raw) => {
      const parsed = parseImport(raw);
      if (!parsed.ok) {
        return { ok: false, error: parsed.error };
      }
      const evtResult = mergeEvents(events, parsed.events);
      const goalResult = mergeGoals(goals, parsed.goals);
      const daysResult = mergeDays(days, parsed.days);
      setEvents(evtResult.merged);
      setGoals(goalResult.merged);
      setStreakResetDay((current) => mergeStreakReset(current, parsed.streakResetDay));
      setDays(daysResult.merged);
      return {
        ok: true,
        added: evtResult.added,
        skipped: evtResult.skipped,
        goalsAdded: goalResult.added,
        goalsSkipped: goalResult.skipped,
        notesAdded: daysResult.added,
        notesSkipped: daysResult.skipped,
      };
    },
    [events, goals, days]
  );

  return {
    events,
    addEvent,
    removeEvent,
    restoreEvent,
    updateEvent,
    clearDay,
    clearAll,
    getDayTotals,
    getEventsForDay,
    getTodayTotals,
    exportEvents,
    exportXlsx,
    importEvents,
    goals,
    setGoal,
    getCurrentGoal,
    getDayGoalStatus,
    getCurrentStreak,
    getDaysWithinGoal,
    streakResetDay,
    resetStreak,
    getRollingAverage,
    getAverageDelta,
    days,
    getDayNotes,
    addDayNote,
    updateDayNote,
    removeDayNote,
    restoreDayNote,
    syncState,
    applySyncChanges,
  };
}
