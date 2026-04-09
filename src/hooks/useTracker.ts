import { useCallback, useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { EventType, TrackerEvent, DayTotals } from '@/types';
import {
  getDayKey,
  getDayTotals as calcDayTotals,
  getEventsForDay as calcEventsForDay,
  nowLocalIso,
  todayKey,
} from '@/lib/events';
import {
  ImportError,
  mergeEvents,
  parseImport,
  serializeExport,
} from '@/lib/export';

const STORAGE_KEY = 'smoking-tracker';

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
}

export type ImportOutcome =
  | { ok: true; added: number; skipped: number }
  | { ok: false; error: ImportError };

function loadFromStorage(): TrackerEvent[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.events)) {
      return parsed.events as TrackerEvent[];
    }
    return [];
  } catch {
    return [];
  }
}

export function useTracker(): UseTrackerAPI {
  const [events, setEvents] = useState<TrackerEvent[]>(() => loadFromStorage());

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ events }));
  }, [events]);

  const addEvent = useCallback<UseTrackerAPI['addEvent']>((input) => {
    const event: TrackerEvent = {
      id: uuidv4(),
      timestamp: nowLocalIso(),
      type: input.type,
      location: input.location?.trim() ? input.location.trim() : undefined,
      reason: input.reason?.trim() ? input.reason.trim() : undefined,
    };
    setEvents((prev) => [...prev, event]);
  }, []);

  const removeEvent = useCallback<UseTrackerAPI['removeEvent']>((id) => {
    setEvents((prev) => prev.filter((e) => e.id !== id));
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

  const exportEvents = useCallback<UseTrackerAPI['exportEvents']>(
    () => serializeExport(events),
    [events]
  );

  const importEvents = useCallback<UseTrackerAPI['importEvents']>(
    (raw) => {
      const parsed = parseImport(raw);
      if (!parsed.ok) {
        return { ok: false, error: parsed.error };
      }
      const { merged, added, skipped } = mergeEvents(events, parsed.events);
      setEvents(merged);
      return { ok: true, added, skipped };
    },
    [events]
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
  };
}
