import { useCallback, useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { EventType, GoalEntry, TrackerEvent, DayTotals } from '@/types';
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
  getRollingAverage as calcRollingAverage,
  getAverageDelta as calcAverageDelta,
  DayGoalStatus,
} from '@/lib/stats';
import {
  ImportError,
  mergeEvents,
  mergeGoals,
  parseImport,
  serializeExport,
} from '@/lib/export';

const STORAGE_KEY = 'smoking-tracker';
const DAY_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

export type UndoAction =
  | { type: 'restore-event'; event: TrackerEvent }
  | { type: 'remove-event'; eventId: string };

export interface UseTrackerAPI {
  events: TrackerEvent[];
  addEvent(input: { type: EventType; location?: string; reason?: string }): void;
  removeEvent(id: string): void;
  updateEvent(id: string, patch: Partial<Omit<TrackerEvent, 'id'>>): void;
  clearDay(dayKey: string): void;
  getDayTotals(dayKey: string): DayTotals;
  getEventsForDay(dayKey: string): TrackerEvent[];
  getTodayTotals(): DayTotals;
  exportEvents(): string;
  importEvents(raw: string): ImportOutcome;

  pendingUndo: UndoAction | null;
  executeUndo(): void;

  goals: GoalEntry[];
  setGoal(limit: number | null): void;
  getCurrentGoal(): GoalEntry | null;
  getDayGoalStatus(dayKey: string): DayGoalStatus;
  getCurrentStreak(): number;
  getRollingAverage(days: number): number;
  getAverageDelta(days: number): number | null;
}

export type ImportOutcome =
  | { ok: true; added: number; skipped: number; goalsAdded: number; goalsSkipped: number }
  | { ok: false; error: ImportError };

function isValidGoalEntry(value: unknown): value is GoalEntry {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const obj = value as Record<string, unknown>;
  if (typeof obj.id !== 'string') return false;
  if (typeof obj.limit !== 'number' || !Number.isInteger(obj.limit) || obj.limit <= 0) return false;
  if (typeof obj.effectiveFrom !== 'string' || !DAY_KEY_RE.test(obj.effectiveFrom)) return false;
  return true;
}

function loadFromStorage(): { events: TrackerEvent[]; goals: GoalEntry[] } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { events: [], goals: [] };
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return { events: [], goals: [] };
    if (!Array.isArray(parsed.events)) return { events: [], goals: [] };

    if ('goals' in parsed) {
      if (!Array.isArray(parsed.goals)) return { events: [], goals: [] };
      for (const g of parsed.goals) {
        if (!isValidGoalEntry(g)) return { events: [], goals: [] };
      }
      const goals = (parsed.goals as GoalEntry[]).sort((a, b) =>
        a.effectiveFrom < b.effectiveFrom ? -1 : a.effectiveFrom > b.effectiveFrom ? 1 : 0
      );
      return { events: parsed.events as TrackerEvent[], goals };
    }

    return { events: parsed.events as TrackerEvent[], goals: [] };
  } catch {
    return { events: [], goals: [] };
  }
}

export function useTracker(): UseTrackerAPI {
  const [initial] = useState(loadFromStorage);
  const [events, setEvents] = useState<TrackerEvent[]>(initial.events);
  const [goals, setGoals] = useState<GoalEntry[]>(initial.goals);
  const [pendingUndo, setPendingUndo] = useState<UndoAction | null>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ events, goals }));
  }, [events, goals]);

  const addEvent = useCallback<UseTrackerAPI['addEvent']>((input) => {
    const id = uuidv4();
    const event: TrackerEvent = {
      id,
      timestamp: nowLocalIso(),
      type: input.type,
      location: input.location?.trim() ? input.location.trim() : undefined,
      reason: input.reason?.trim() ? input.reason.trim() : undefined,
    };
    setEvents((prev) => [...prev, event]);
    setPendingUndo({ type: 'remove-event', eventId: id });
  }, []);

  const removeEvent = useCallback<UseTrackerAPI['removeEvent']>((id) => {
    setEvents((prev) => {
      const event = prev.find((e) => e.id === id);
      if (event) {
        setPendingUndo({ type: 'restore-event', event });
      }
      return prev.filter((e) => e.id !== id);
    });
  }, []);

  const executeUndo = useCallback<UseTrackerAPI['executeUndo']>(() => {
    setPendingUndo((current) => {
      if (!current) return null;
      if (current.type === 'remove-event') {
        setEvents((prev) => prev.filter((e) => e.id !== current.eventId));
      } else {
        setEvents((prev) => [...prev, current.event]);
      }
      return null;
    });
  }, []);

  const updateEvent = useCallback<UseTrackerAPI['updateEvent']>((id, patch) => {
    setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  }, []);

  const clearDay = useCallback<UseTrackerAPI['clearDay']>((dayKey) => {
    setEvents((prev) => prev.filter((e) => getDayKey(e.timestamp) !== dayKey));
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
    () => calcCurrentStreak(events, goals),
    [events, goals]
  );

  const getRollingAverage = useCallback<UseTrackerAPI['getRollingAverage']>(
    (days) => calcRollingAverage(events, days),
    [events]
  );

  const getAverageDelta = useCallback<UseTrackerAPI['getAverageDelta']>(
    (days) => calcAverageDelta(events, days),
    [events]
  );

  const exportEvents = useCallback<UseTrackerAPI['exportEvents']>(
    () => serializeExport(events, goals),
    [events, goals]
  );

  const importEvents = useCallback<UseTrackerAPI['importEvents']>(
    (raw) => {
      const parsed = parseImport(raw);
      if (!parsed.ok) {
        return { ok: false, error: parsed.error };
      }
      const evtResult = mergeEvents(events, parsed.events);
      const goalResult = mergeGoals(goals, parsed.goals);
      setEvents(evtResult.merged);
      setGoals(goalResult.merged);
      return {
        ok: true,
        added: evtResult.added,
        skipped: evtResult.skipped,
        goalsAdded: goalResult.added,
        goalsSkipped: goalResult.skipped,
      };
    },
    [events, goals]
  );

  return {
    events,
    addEvent,
    removeEvent,
    updateEvent,
    clearDay,
    getDayTotals,
    getEventsForDay,
    getTodayTotals,
    exportEvents,
    importEvents,
    pendingUndo,
    executeUndo,
    goals,
    setGoal,
    getCurrentGoal,
    getDayGoalStatus,
    getCurrentStreak,
    getRollingAverage,
    getAverageDelta,
  };
}
