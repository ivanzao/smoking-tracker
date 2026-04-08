import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTracker } from './useTracker';
import { TrackerEvent } from '@/types';

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
