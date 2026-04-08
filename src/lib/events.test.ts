import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getDayKey,
  nowLocalIso,
  todayKey,
  getEventsForDay,
  getDayTotals,
  getDaysInRange,
} from './events';
import { TrackerEvent } from '@/types';

describe('getDayKey', () => {
  it('extracts local date from ISO with negative offset', () => {
    expect(getDayKey('2026-04-08T14:30:00-03:00')).toBe('2026-04-08');
  });

  it('preserves local date close to midnight', () => {
    expect(getDayKey('2026-04-08T23:59:59-03:00')).toBe('2026-04-08');
    expect(getDayKey('2026-04-08T00:00:01-03:00')).toBe('2026-04-08');
  });

  it('handles positive offsets', () => {
    expect(getDayKey('2026-04-08T10:00:00+02:00')).toBe('2026-04-08');
  });
});

describe('nowLocalIso', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns a parseable ISO string ending in a timezone offset', () => {
    vi.setSystemTime(new Date('2026-04-08T14:30:00Z'));
    const iso = nowLocalIso();
    expect(iso).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/);
    expect(new Date(iso).toISOString()).toBe('2026-04-08T14:30:00.000Z');
  });
});

describe('todayKey', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns YYYY-MM-DD of the current local date', () => {
    vi.setSystemTime(new Date('2026-04-08T14:30:00Z'));
    expect(todayKey()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

const mkEvent = (overrides: Partial<TrackerEvent>): TrackerEvent => ({
  id: overrides.id ?? 'id-' + Math.random(),
  timestamp: overrides.timestamp ?? '2026-04-08T12:00:00-03:00',
  type: overrides.type ?? 'tobacco',
  location: overrides.location,
  reason: overrides.reason,
});

describe('getEventsForDay', () => {
  it('returns only events matching the dayKey', () => {
    const events: TrackerEvent[] = [
      mkEvent({ id: '1', timestamp: '2026-04-07T23:00:00-03:00' }),
      mkEvent({ id: '2', timestamp: '2026-04-08T08:00:00-03:00' }),
      mkEvent({ id: '3', timestamp: '2026-04-08T20:00:00-03:00' }),
      mkEvent({ id: '4', timestamp: '2026-04-09T01:00:00-03:00' }),
    ];
    const result = getEventsForDay(events, '2026-04-08');
    expect(result.map((e) => e.id)).toEqual(['2', '3']);
  });

  it('returns empty array when no events match', () => {
    expect(getEventsForDay([], '2026-04-08')).toEqual([]);
  });
});

describe('getDayTotals', () => {
  it('counts events by type for the given day', () => {
    const events: TrackerEvent[] = [
      mkEvent({ id: '1', timestamp: '2026-04-08T08:00:00-03:00', type: 'tobacco' }),
      mkEvent({ id: '2', timestamp: '2026-04-08T10:00:00-03:00', type: 'tobacco' }),
      mkEvent({ id: '3', timestamp: '2026-04-08T20:00:00-03:00', type: 'cannabis' }),
      mkEvent({ id: '4', timestamp: '2026-04-07T20:00:00-03:00', type: 'cannabis' }),
    ];
    expect(getDayTotals(events, '2026-04-08')).toEqual({ tobacco: 2, cannabis: 1 });
  });

  it('returns zeroes for a day with no events', () => {
    expect(getDayTotals([], '2026-04-08')).toEqual({ tobacco: 0, cannabis: 0 });
  });
});

describe('getDaysInRange', () => {
  it('returns inclusive YYYY-MM-DD range ascending', () => {
    const result = getDaysInRange(
      new Date(2026, 3, 5),
      new Date(2026, 3, 8)
    );
    expect(result).toEqual(['2026-04-05', '2026-04-06', '2026-04-07', '2026-04-08']);
  });

  it('returns a single entry when from === to', () => {
    const d = new Date(2026, 3, 8);
    expect(getDaysInRange(d, d)).toEqual(['2026-04-08']);
  });
});
