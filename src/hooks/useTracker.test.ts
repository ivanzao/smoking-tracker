import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTracker } from './useTracker';
import { TrackerEvent, GoalEntry, DayRecord } from '@/types';

const STORAGE_KEY = 'smoking-tracker';

describe('useTracker — boot', () => {
  it('starts with empty events when storage is empty', () => {
    const { result } = renderHook(() => useTracker());
    expect(result.current.events).toEqual([]);
  });

  it('loads events from storage', () => {
    const events: TrackerEvent[] = [
      { id: '1', timestamp: '2026-04-08T12:00:00-03:00', type: 'tobacco' },
    ];
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ events }));
    const { result } = renderHook(() => useTracker());
    expect(result.current.events).toEqual(events);
  });

  it('discards legacy aggregated shape silently', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ '2026-04-07': { date: '2026-04-07', cigarette: 3, leaf: 2 } })
    );
    const { result } = renderHook(() => useTracker());
    expect(result.current.events).toEqual([]);
  });

  it('discards garbage silently', () => {
    localStorage.setItem(STORAGE_KEY, 'not json');
    const { result } = renderHook(() => useTracker());
    expect(result.current.events).toEqual([]);
  });
});

describe('useTracker — addEvent', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-08T14:30:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('adds an event with generated id and timestamp', () => {
    const { result } = renderHook(() => useTracker());
    act(() => {
      result.current.addEvent({ type: 'tobacco' });
    });
    expect(result.current.events).toHaveLength(1);
    const e = result.current.events[0];
    expect(e.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(e.type).toBe('tobacco');
    expect(e.timestamp).toMatch(/^2026-04-08T/);
  });

  it('persists the event to localStorage', () => {
    const { result } = renderHook(() => useTracker());
    act(() => {
      result.current.addEvent({ type: 'cannabis', location: 'casa', reason: 'pós almoço' });
    });
    const raw = localStorage.getItem(STORAGE_KEY);
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw!);
    expect(parsed.events).toHaveLength(1);
    expect(parsed.events[0].location).toBe('casa');
    expect(parsed.events[0].reason).toBe('pós almoço');
  });

  it('uses the provided timestamp instead of now', () => {
    const { result } = renderHook(() => useTracker());
    act(() => {
      result.current.addEvent({ type: 'tobacco', timestamp: '2026-04-06T09:15:00-03:00' });
    });
    expect(result.current.events[0].timestamp).toBe('2026-04-06T09:15:00-03:00');
    expect(result.current.getDayTotals('2026-04-06')).toEqual({ tobacco: 1, cannabis: 0 });
  });

  it('keeps events sorted by timestamp when backdating', () => {
    const { result } = renderHook(() => useTracker());
    act(() => { result.current.addEvent({ type: 'tobacco' }); });
    act(() => { result.current.addEvent({ type: 'cannabis', timestamp: '2026-04-06T09:15:00-03:00' }); });
    expect(result.current.events.map((e) => e.type)).toEqual(['cannabis', 'tobacco']);
  });

  it('normalizes empty-string location/reason to undefined', () => {
    const { result } = renderHook(() => useTracker());
    act(() => {
      result.current.addEvent({ type: 'tobacco', location: '   ', reason: '' });
    });
    const e = result.current.events[0];
    expect(e.location).toBeUndefined();
    expect(e.reason).toBeUndefined();
  });
});

describe('useTracker — removeEvent', () => {
  it('removes the matching event', () => {
    const seed: TrackerEvent[] = [
      { id: 'a', timestamp: '2026-04-08T10:00:00-03:00', type: 'tobacco' },
      { id: 'b', timestamp: '2026-04-08T11:00:00-03:00', type: 'cannabis' },
    ];
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ events: seed }));
    const { result } = renderHook(() => useTracker());
    act(() => {
      result.current.removeEvent('a');
    });
    expect(result.current.events.map((e) => e.id)).toEqual(['b']);
  });
});

describe('useTracker — updateEvent', () => {
  it('applies a partial patch', () => {
    const seed: TrackerEvent[] = [
      { id: 'a', timestamp: '2026-04-08T10:00:00-03:00', type: 'tobacco' },
    ];
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ events: seed }));
    const { result } = renderHook(() => useTracker());
    act(() => {
      result.current.updateEvent('a', { reason: 'primeiro do dia' });
    });
    expect(result.current.events[0].reason).toBe('primeiro do dia');
    expect(result.current.events[0].type).toBe('tobacco');
  });

  it('updates event type', () => {
    const seed: TrackerEvent[] = [
      { id: 'a', timestamp: '2026-04-08T10:00:00-03:00', type: 'tobacco' },
    ];
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ events: seed }));
    const { result } = renderHook(() => useTracker());
    act(() => {
      result.current.updateEvent('a', { type: 'cannabis' });
    });
    expect(result.current.events[0].type).toBe('cannabis');
  });

  it('updates event timestamp', () => {
    const seed: TrackerEvent[] = [
      { id: 'a', timestamp: '2026-04-08T10:00:00-03:00', type: 'tobacco' },
    ];
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ events: seed }));
    const { result } = renderHook(() => useTracker());
    act(() => {
      result.current.updateEvent('a', { timestamp: '2026-04-08T15:30:00-03:00' });
    });
    expect(result.current.events[0].timestamp).toBe('2026-04-08T15:30:00-03:00');
  });

  it('re-sorts events when a timestamp moves', () => {
    const seed: TrackerEvent[] = [
      { id: 'a', timestamp: '2026-04-08T10:00:00-03:00', type: 'tobacco' },
      { id: 'b', timestamp: '2026-04-08T12:00:00-03:00', type: 'cannabis' },
    ];
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ events: seed }));
    const { result } = renderHook(() => useTracker());
    act(() => {
      result.current.updateEvent('a', { timestamp: '2026-04-09T08:00:00-03:00' });
    });
    expect(result.current.events.map((e) => e.id)).toEqual(['b', 'a']);
  });
});

describe('useTracker — clearDay', () => {
  it('removes only events belonging to the given day', () => {
    const seed: TrackerEvent[] = [
      { id: '1', timestamp: '2026-04-07T22:00:00-03:00', type: 'tobacco' },
      { id: '2', timestamp: '2026-04-08T08:00:00-03:00', type: 'tobacco' },
      { id: '3', timestamp: '2026-04-08T20:00:00-03:00', type: 'cannabis' },
      { id: '4', timestamp: '2026-04-09T09:00:00-03:00', type: 'cannabis' },
    ];
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ events: seed }));
    const { result } = renderHook(() => useTracker());
    act(() => {
      result.current.clearDay('2026-04-08');
    });
    expect(result.current.events.map((e) => e.id)).toEqual(['1', '4']);
  });
});

describe('useTracker — queries', () => {
  it('getDayTotals returns counts for the given day', () => {
    const seed: TrackerEvent[] = [
      { id: '1', timestamp: '2026-04-08T08:00:00-03:00', type: 'tobacco' },
      { id: '2', timestamp: '2026-04-08T10:00:00-03:00', type: 'tobacco' },
      { id: '3', timestamp: '2026-04-08T20:00:00-03:00', type: 'cannabis' },
    ];
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ events: seed }));
    const { result } = renderHook(() => useTracker());
    expect(result.current.getDayTotals('2026-04-08')).toEqual({ tobacco: 2, cannabis: 1 });
  });

  it('getEventsForDay returns only matching events', () => {
    const seed: TrackerEvent[] = [
      { id: '1', timestamp: '2026-04-08T08:00:00-03:00', type: 'tobacco' },
      { id: '2', timestamp: '2026-04-09T08:00:00-03:00', type: 'cannabis' },
    ];
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ events: seed }));
    const { result } = renderHook(() => useTracker());
    expect(result.current.getEventsForDay('2026-04-08').map((e) => e.id)).toEqual(['1']);
  });
});

describe('useTracker — export/import', () => {
  it('exportEvents returns JSON that round-trips into the same events', () => {
    const seed: TrackerEvent[] = [
      { id: 'a', timestamp: '2026-04-08T10:00:00-03:00', type: 'tobacco', location: 'casa' },
      { id: 'b', timestamp: '2026-04-08T18:00:00-03:00', type: 'cannabis' },
    ];
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ events: seed }));
    const { result } = renderHook(() => useTracker());

    const json = result.current.exportEvents();
    const parsed = JSON.parse(json);
    expect(parsed.version).toBe(2);
    expect(parsed.events).toEqual(seed);
  });

});

describe('useTracker — exportXlsx', () => {
  it('builds a workbook for the range, named by its interval', async () => {
    const seed: TrackerEvent[] = [
      { id: 'a', timestamp: '2026-04-07T10:00:00-03:00', type: 'tobacco', reason: 'café' },
    ];
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ events: seed }));
    const { result } = renderHook(() => useTracker());

    const report = await result.current.exportXlsx({ from: '2026-04-02', to: '2026-04-08' });
    expect(report.fileName).toBe('smoking-tracker-2026-04-02_2026-04-08.xlsx');
    expect(report.buffer.byteLength).toBeGreaterThan(0);
  });
});

describe('useTracker — import', () => {
  it('importEvents merges new events into the existing state', () => {
    const seed: TrackerEvent[] = [
      { id: 'a', timestamp: '2026-04-08T10:00:00-03:00', type: 'tobacco' },
    ];
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ events: seed }));
    const { result } = renderHook(() => useTracker());

    const incoming: TrackerEvent[] = [
      { id: 'b', timestamp: '2026-04-08T11:00:00-03:00', type: 'cannabis' },
    ];
    const file = {
      version: 1,
      exportedAt: '2026-04-08T20:00:00-03:00',
      eventCount: 1,
      dateRange: { from: '2026-04-08', to: '2026-04-08' },
      events: incoming,
    };

    let outcome: ReturnType<typeof result.current.importEvents>;
    act(() => {
      outcome = result.current.importEvents(JSON.stringify(file));
    });

    expect(outcome!.ok).toBe(true);
    if (outcome!.ok) { expect(outcome!.added).toBe(1); expect(outcome!.skipped).toBe(0); }
    expect(result.current.events.map((e) => e.id)).toEqual(['a', 'b']);
  });

  it('importEvents reports skipped duplicates without changing state', () => {
    const seed: TrackerEvent[] = [
      { id: 'a', timestamp: '2026-04-08T10:00:00-03:00', type: 'tobacco' },
    ];
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ events: seed }));
    const { result } = renderHook(() => useTracker());

    const file = {
      version: 1,
      exportedAt: '2026-04-08T20:00:00-03:00',
      eventCount: 1,
      dateRange: { from: '2026-04-08', to: '2026-04-08' },
      events: seed,
    };

    let outcome: ReturnType<typeof result.current.importEvents>;
    act(() => {
      outcome = result.current.importEvents(JSON.stringify(file));
    });

    expect(outcome!.ok).toBe(true);
    if (outcome!.ok) { expect(outcome!.added).toBe(0); expect(outcome!.skipped).toBe(1); }
    expect(result.current.events).toEqual(seed);
  });

  it('importEvents returns error and leaves state untouched on invalid JSON', () => {
    const seed: TrackerEvent[] = [
      { id: 'a', timestamp: '2026-04-08T10:00:00-03:00', type: 'tobacco' },
    ];
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ events: seed }));
    const { result } = renderHook(() => useTracker());

    let outcome: ReturnType<typeof result.current.importEvents>;
    act(() => {
      outcome = result.current.importEvents('not json');
    });

    expect(outcome!).toEqual({ ok: false, error: 'invalid-json' });
    expect(result.current.events).toEqual(seed);
  });
});

describe('useTracker — goals boot', () => {
  it('starts with empty goals when storage has no goals field', () => {
    const events = [
      { id: '1', timestamp: '2026-04-08T12:00:00-03:00', type: 'tobacco' as const },
    ];
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ events }));
    const { result } = renderHook(() => useTracker());
    expect(result.current.goals).toEqual([]);
    expect(result.current.events).toEqual(events);
  });

  it('loads valid goals from storage', () => {
    const goals: GoalEntry[] = [
      { id: 'g1', limit: 10, effectiveFrom: '2026-04-01' },
    ];
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ events: [], goals }));
    const { result } = renderHook(() => useTracker());
    expect(result.current.goals).toEqual(goals);
  });

  it('discards everything when goals array has invalid entry', () => {
    const goals = [{ id: 'g1', limit: -1, effectiveFrom: '2026-04-01' }];
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ events: [], goals }));
    const { result } = renderHook(() => useTracker());
    expect(result.current.events).toEqual([]);
    expect(result.current.goals).toEqual([]);
  });

  it('discards everything when goals is not an array', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ events: [], goals: 'bad' }));
    const { result } = renderHook(() => useTracker());
    expect(result.current.events).toEqual([]);
    expect(result.current.goals).toEqual([]);
  });
});

describe('useTracker — setGoal', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('creates first goal entry with effectiveFrom = today', () => {
    vi.setSystemTime(new Date('2026-04-08T14:00:00Z'));
    const { result } = renderHook(() => useTracker());
    act(() => { result.current.setGoal(10); });
    expect(result.current.goals).toHaveLength(1);
    expect(result.current.goals[0].limit).toBe(10);
    expect(result.current.goals[0].effectiveFrom).toMatch(/^2026-04-08$/);
  });

  it('is no-op when value equals current goal limit', () => {
    vi.setSystemTime(new Date('2026-04-08T14:00:00Z'));
    const goals: GoalEntry[] = [
      { id: 'g1', limit: 10, effectiveFrom: '2026-04-01' },
    ];
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ events: [], goals }));
    const { result } = renderHook(() => useTracker());
    act(() => { result.current.setGoal(10); });
    expect(result.current.goals).toHaveLength(1);
    expect(result.current.goals[0].id).toBe('g1');
  });

  it('overwrites same-day entry instead of creating duplicate', () => {
    vi.setSystemTime(new Date('2026-04-08T14:00:00Z'));
    const { result } = renderHook(() => useTracker());
    act(() => { result.current.setGoal(10); });
    act(() => { result.current.setGoal(8); });
    expect(result.current.goals).toHaveLength(1);
    expect(result.current.goals[0].limit).toBe(8);
  });

  it('appends new entry for a different day', () => {
    vi.setSystemTime(new Date('2026-04-10T14:00:00Z'));
    const goals: GoalEntry[] = [
      { id: 'g1', limit: 12, effectiveFrom: '2026-04-01' },
    ];
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ events: [], goals }));
    const { result } = renderHook(() => useTracker());
    act(() => { result.current.setGoal(8); });
    expect(result.current.goals).toHaveLength(2);
    expect(result.current.goals[1].limit).toBe(8);
    expect(result.current.goals[1].effectiveFrom).toBe('2026-04-10');
  });

  it('removes vigent goal when passed null', () => {
    vi.setSystemTime(new Date('2026-04-08T14:00:00Z'));
    const goals: GoalEntry[] = [
      { id: 'g1', limit: 10, effectiveFrom: '2026-04-01' },
    ];
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ events: [], goals }));
    const { result } = renderHook(() => useTracker());
    act(() => { result.current.setGoal(null); });
    expect(result.current.goals).toEqual([]);
  });

  it('ignores invalid values (0, negative, NaN)', () => {
    vi.setSystemTime(new Date('2026-04-08T14:00:00Z'));
    const { result } = renderHook(() => useTracker());
    act(() => { result.current.setGoal(0); });
    act(() => { result.current.setGoal(-5); });
    act(() => { result.current.setGoal(NaN); });
    expect(result.current.goals).toEqual([]);
  });

  it('persists goals to localStorage', () => {
    vi.setSystemTime(new Date('2026-04-08T14:00:00Z'));
    const { result } = renderHook(() => useTracker());
    act(() => { result.current.setGoal(10); });
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(raw.goals).toHaveLength(1);
    expect(raw.goals[0].limit).toBe(10);
  });
});

describe('useTracker — reactive streak', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('streak goes to 0 when adding event over limit', () => {
    vi.setSystemTime(new Date('2026-04-08T14:00:00Z'));
    const goals: GoalEntry[] = [
      { id: 'g1', limit: 1, effectiveFrom: '2026-04-01' },
    ];
    localStorage.setItem('smoking-tracker', JSON.stringify({ events: [], goals }));
    const { result } = renderHook(() => useTracker());

    act(() => { result.current.addEvent({ type: 'tobacco' }); });
    expect(result.current.getCurrentStreak()).toBeGreaterThan(0);

    act(() => { result.current.addEvent({ type: 'tobacco' }); });
    expect(result.current.getCurrentStreak()).toBe(0);
  });

  it('streak restores when removing event back under limit', () => {
    vi.setSystemTime(new Date('2026-04-08T14:00:00Z'));
    const goals: GoalEntry[] = [
      { id: 'g1', limit: 1, effectiveFrom: '2026-04-01' },
    ];
    localStorage.setItem('smoking-tracker', JSON.stringify({ events: [], goals }));
    const { result } = renderHook(() => useTracker());

    act(() => { result.current.addEvent({ type: 'tobacco' }); });
    act(() => { result.current.addEvent({ type: 'tobacco' }); });
    expect(result.current.getCurrentStreak()).toBe(0);

    const secondId = result.current.events[1].id;
    act(() => { result.current.removeEvent(secondId); });
    expect(result.current.getCurrentStreak()).toBeGreaterThan(0);
  });
});

describe('useTracker — streak reset', () => {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date('2026-04-10T14:00:00Z')); });
  afterEach(() => { vi.useRealTimers(); });

  const goals: GoalEntry[] = [{ id: 'g1', limit: 5, effectiveFrom: '2026-04-01' }];

  it('starts with null when storage has no marker', () => {
    const { result } = renderHook(() => useTracker());
    expect(result.current.streakResetDay).toBeNull();
  });

  it('loads a valid marker from storage', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ events: [], goals, streakResetDay: '2026-04-09' }));
    const { result } = renderHook(() => useTracker());
    expect(result.current.streakResetDay).toBe('2026-04-09');
    expect(result.current.getCurrentStreak()).toBe(1);
  });

  it('ignores a malformed marker in storage', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ events: [], goals, streakResetDay: 'x' }));
    const { result } = renderHook(() => useTracker());
    expect(result.current.streakResetDay).toBeNull();
  });

  it('resetStreak zeroes the streak today and persists the marker', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ events: [], goals }));
    const { result } = renderHook(() => useTracker());
    expect(result.current.getCurrentStreak()).toBe(10);

    act(() => { result.current.resetStreak(); });
    expect(result.current.streakResetDay).toBe('2026-04-10');
    expect(result.current.getCurrentStreak()).toBe(0);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).streakResetDay).toBe('2026-04-10');
  });

  it('streak resumes the day after a reset', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ events: [], goals, streakResetDay: '2026-04-10' }));
    const { result } = renderHook(() => useTracker());
    expect(result.current.getCurrentStreak()).toBe(0);

    vi.setSystemTime(new Date('2026-04-11T14:00:00Z'));
    const { result: next } = renderHook(() => useTracker());
    expect(next.current.getCurrentStreak()).toBe(1);
  });

  it('round-trips the marker through export/import, keeping the latest', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ events: [], goals, streakResetDay: '2026-04-05' }));
    const { result } = renderHook(() => useTracker());
    expect(JSON.parse(result.current.exportEvents()).streakResetDay).toBe('2026-04-05');

    const file = {
      version: 2,
      exportedAt: '2026-04-08T20:00:00-03:00',
      eventCount: 0,
      dateRange: { from: null, to: null },
      events: [],
      goals: [],
      streakResetDay: '2026-04-09',
    };
    act(() => { result.current.importEvents(JSON.stringify(file)); });
    expect(result.current.streakResetDay).toBe('2026-04-09');

    act(() => { result.current.importEvents(JSON.stringify({ ...file, streakResetDay: '2026-04-02' })); });
    expect(result.current.streakResetDay).toBe('2026-04-09');
  });
});

describe('useTracker — day notes', () => {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date('2026-04-08T14:00:00Z')); });
  afterEach(() => { vi.useRealTimers(); });

  it('starts with no days when storage has none', () => {
    const { result } = renderHook(() => useTracker());
    expect(result.current.days).toEqual([]);
    expect(result.current.getDayNotes('2026-04-08')).toEqual([]);
  });

  it('loads valid days from storage and drops malformed records', () => {
    const days: DayRecord[] = [
      { dayKey: '2026-04-08', notes: [{ id: 'n1', text: 'a', createdAt: '2026-04-08T10:00:00-03:00' }] },
    ];
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ events: [], days: [...days, { dayKey: 'x' }] }));
    const { result } = renderHook(() => useTracker());
    expect(result.current.days).toEqual(days);
  });

  it('addDayNote creates a note with id and createdAt, trims text, and persists', () => {
    const { result } = renderHook(() => useTracker());
    let created: ReturnType<typeof result.current.addDayNote>;
    act(() => { created = result.current.addDayNote('2026-04-08', '  dia estressante  '); });
    expect(created!.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(created!.text).toBe('dia estressante');
    expect(created!.createdAt).toMatch(/^2026-04-08T/);
    expect(result.current.getDayNotes('2026-04-08')).toEqual([created!]);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!).days).toEqual([
      { dayKey: '2026-04-08', notes: [created!] },
    ]);
  });

  it('addDayNote ignores empty text', () => {
    const { result } = renderHook(() => useTracker());
    let created: ReturnType<typeof result.current.addDayNote>;
    act(() => { created = result.current.addDayNote('2026-04-08', '   '); });
    expect(created!).toBeNull();
    expect(result.current.days).toEqual([]);
  });

  it('updateDayNote replaces text, keeps previous text when empty', () => {
    const { result } = renderHook(() => useTracker());
    let created: ReturnType<typeof result.current.addDayNote>;
    act(() => { created = result.current.addDayNote('2026-04-08', 'old'); });
    act(() => { result.current.updateDayNote('2026-04-08', created!.id, ' new '); });
    expect(result.current.getDayNotes('2026-04-08')[0].text).toBe('new');
    act(() => { result.current.updateDayNote('2026-04-08', created!.id, '  '); });
    expect(result.current.getDayNotes('2026-04-08')[0].text).toBe('new');
  });

  it('removeDayNote drops the note and restoreDayNote puts it back with the same id', () => {
    const { result } = renderHook(() => useTracker());
    let created: ReturnType<typeof result.current.addDayNote>;
    act(() => { created = result.current.addDayNote('2026-04-08', 'a'); });
    act(() => { result.current.removeDayNote('2026-04-08', created!.id); });
    expect(result.current.days).toEqual([]);
    act(() => { result.current.restoreDayNote('2026-04-08', created!); });
    expect(result.current.getDayNotes('2026-04-08')).toEqual([created!]);
  });

  it('round-trips days through export/import, merging by note id', () => {
    const { result } = renderHook(() => useTracker());
    act(() => { result.current.addDayNote('2026-04-08', 'mine'); });
    const exported = JSON.parse(result.current.exportEvents());
    expect(exported.days).toHaveLength(1);

    const file = {
      version: 2,
      exportedAt: '2026-04-08T20:00:00-03:00',
      eventCount: 0,
      dateRange: { from: null, to: null },
      events: [],
      goals: [],
      days: [
        { dayKey: '2026-04-08', notes: [...exported.days[0].notes, { id: 'n2', text: 'theirs', createdAt: '2026-04-08T09:00:00-03:00' }] },
      ],
    };
    let outcome: ReturnType<typeof result.current.importEvents>;
    act(() => { outcome = result.current.importEvents(JSON.stringify(file)); });
    expect(outcome!.ok).toBe(true);
    if (outcome!.ok) { expect(outcome!.notesAdded).toBe(1); expect(outcome!.notesSkipped).toBe(1); }
    expect(result.current.getDayNotes('2026-04-08').map((n) => n.text)).toEqual(['theirs', 'mine']);
  });
});

describe('useTracker — undo', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-08T14:30:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts with pendingUndo as null', () => {
    const { result } = renderHook(() => useTracker());
    expect(result.current.pendingUndo).toBeNull();
  });

  it('addEvent sets pendingUndo with type remove-event', () => {
    const { result } = renderHook(() => useTracker());
    act(() => { result.current.addEvent({ type: 'tobacco' }); });
    expect(result.current.pendingUndo).toEqual({
      type: 'remove-event',
      eventId: result.current.events[0].id,
    });
  });

  it('executeUndo after addEvent removes the added event', () => {
    const { result } = renderHook(() => useTracker());
    act(() => { result.current.addEvent({ type: 'tobacco' }); });
    expect(result.current.events).toHaveLength(1);
    act(() => { result.current.executeUndo(); });
    expect(result.current.events).toHaveLength(0);
    expect(result.current.pendingUndo).toBeNull();
  });

  it('removeEvent sets pendingUndo with type restore-event', () => {
    const seed: TrackerEvent[] = [
      { id: 'a', timestamp: '2026-04-08T10:00:00-03:00', type: 'tobacco', location: 'casa' },
    ];
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ events: seed }));
    const { result } = renderHook(() => useTracker());
    act(() => { result.current.removeEvent('a'); });
    expect(result.current.pendingUndo).toEqual({
      type: 'restore-event',
      event: seed[0],
    });
  });

  it('executeUndo after removeEvent restores the event', () => {
    const seed: TrackerEvent[] = [
      { id: 'a', timestamp: '2026-04-08T10:00:00-03:00', type: 'tobacco' },
    ];
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ events: seed }));
    const { result } = renderHook(() => useTracker());
    act(() => { result.current.removeEvent('a'); });
    expect(result.current.events).toHaveLength(0);
    act(() => { result.current.executeUndo(); });
    expect(result.current.events).toHaveLength(1);
    expect(result.current.events[0].id).toBe('a');
    expect(result.current.pendingUndo).toBeNull();
  });

  it('new action overwrites previous pendingUndo', () => {
    const { result } = renderHook(() => useTracker());
    act(() => { result.current.addEvent({ type: 'tobacco' }); });
    const firstId = result.current.events[0].id;
    act(() => { result.current.addEvent({ type: 'cannabis' }); });
    expect(result.current.pendingUndo).toEqual({
      type: 'remove-event',
      eventId: result.current.events[1].id,
    });
    // Undo only removes the second event
    act(() => { result.current.executeUndo(); });
    expect(result.current.events).toHaveLength(1);
    expect(result.current.events[0].id).toBe(firstId);
  });

  it('executeUndo is no-op when pendingUndo is null', () => {
    const { result } = renderHook(() => useTracker());
    act(() => { result.current.addEvent({ type: 'tobacco' }); });
    act(() => { result.current.executeUndo(); });
    // Already undone, second call is no-op
    act(() => { result.current.executeUndo(); });
    expect(result.current.events).toHaveLength(0);
  });
});

describe('useTracker — import with goals', () => {
  it('imports v2 file and merges goals', () => {
    const goals: GoalEntry[] = [
      { id: 'g1', limit: 10, effectiveFrom: '2026-04-01' },
    ];
    localStorage.setItem('smoking-tracker', JSON.stringify({ events: [], goals }));
    const { result } = renderHook(() => useTracker());

    const file = {
      version: 2,
      exportedAt: '2026-04-08T20:00:00-03:00',
      eventCount: 1,
      dateRange: { from: '2026-04-08', to: '2026-04-08' },
      events: [{ id: 'e1', timestamp: '2026-04-08T12:00:00-03:00', type: 'tobacco' }],
      goals: [
        { id: 'g1', limit: 10, effectiveFrom: '2026-04-01' },
        { id: 'g2', limit: 8, effectiveFrom: '2026-04-10' },
      ],
    };

    let outcome: ReturnType<typeof result.current.importEvents>;
    act(() => { outcome = result.current.importEvents(JSON.stringify(file)); });

    expect(outcome!.ok).toBe(true);
    if (outcome!.ok) {
      expect(outcome!.added).toBe(1);
      expect(outcome!.goalsAdded).toBe(1);
      expect(outcome!.goalsSkipped).toBe(1);
    }
    expect(result.current.goals).toHaveLength(2);
  });

  it('imports v1 file — events merge, goals unchanged', () => {
    const goals: GoalEntry[] = [
      { id: 'g1', limit: 10, effectiveFrom: '2026-04-01' },
    ];
    localStorage.setItem('smoking-tracker', JSON.stringify({ events: [], goals }));
    const { result } = renderHook(() => useTracker());

    const file = {
      version: 1,
      exportedAt: '2026-04-08T20:00:00-03:00',
      eventCount: 1,
      dateRange: { from: '2026-04-08', to: '2026-04-08' },
      events: [{ id: 'e1', timestamp: '2026-04-08T12:00:00-03:00', type: 'tobacco' }],
    };

    act(() => { result.current.importEvents(JSON.stringify(file)); });
    expect(result.current.events).toHaveLength(1);
    expect(result.current.goals).toEqual(goals);
  });
});
