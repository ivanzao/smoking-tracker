import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TrackerEvent, GoalEntry } from '@/types';
import {
  getGoalForDay,
  getCurrentGoal,
  getDayGoalStatus,
  getCurrentStreak,
  getRollingAverage,
  getAverageDelta,
  getMovingAverageSeries,
} from './stats';

const mkEvent = (overrides: Partial<TrackerEvent>): TrackerEvent => ({
  id: overrides.id ?? 'id-' + Math.random(),
  timestamp: overrides.timestamp ?? '2026-04-08T12:00:00-03:00',
  type: overrides.type ?? 'tobacco',
  location: overrides.location,
  reason: overrides.reason,
});

const mkGoal = (overrides: Partial<GoalEntry>): GoalEntry => ({
  id: overrides.id ?? 'goal-' + Math.random(),
  limit: overrides.limit ?? 10,
  effectiveFrom: overrides.effectiveFrom ?? '2026-04-01',
});

describe('getGoalForDay', () => {
  it('returns null when goals is empty', () => {
    expect(getGoalForDay([], '2026-04-08')).toBeNull();
  });

  it('returns null when dayKey is before the first goal effectiveFrom', () => {
    const goals = [mkGoal({ effectiveFrom: '2026-04-05' })];
    expect(getGoalForDay(goals, '2026-04-04')).toBeNull();
  });

  it('returns the single goal when dayKey is on or after effectiveFrom', () => {
    const goal = mkGoal({ effectiveFrom: '2026-04-01', limit: 10 });
    expect(getGoalForDay([goal], '2026-04-01')).toEqual(goal);
    expect(getGoalForDay([goal], '2026-04-15')).toEqual(goal);
  });

  it('returns the correct goal when multiple entries exist', () => {
    const g1 = mkGoal({ id: 'g1', effectiveFrom: '2026-04-01', limit: 12 });
    const g2 = mkGoal({ id: 'g2', effectiveFrom: '2026-04-10', limit: 8 });
    const goals = [g1, g2];

    expect(getGoalForDay(goals, '2026-04-05')).toEqual(g1);
    expect(getGoalForDay(goals, '2026-04-10')).toEqual(g2);
    expect(getGoalForDay(goals, '2026-04-20')).toEqual(g2);
  });
});

describe('getCurrentGoal', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('returns null when goals is empty', () => {
    expect(getCurrentGoal([])).toBeNull();
  });

  it('returns the goal vigent today', () => {
    vi.setSystemTime(new Date('2026-04-08T14:00:00Z'));
    const goal = mkGoal({ effectiveFrom: '2026-04-01', limit: 10 });
    expect(getCurrentGoal([goal])).toEqual(goal);
  });
});

describe('getDayGoalStatus', () => {
  it('returns no-goal when no goal covers the day', () => {
    const events = [mkEvent({ timestamp: '2026-04-08T12:00:00-03:00' })];
    expect(getDayGoalStatus(events, [], '2026-04-08')).toBe('no-goal');
  });

  it('returns within when day total <= limit', () => {
    const goals = [mkGoal({ effectiveFrom: '2026-04-01', limit: 5 })];
    const events = [
      mkEvent({ id: '1', timestamp: '2026-04-08T08:00:00-03:00', type: 'tobacco' }),
      mkEvent({ id: '2', timestamp: '2026-04-08T10:00:00-03:00', type: 'cannabis' }),
    ];
    expect(getDayGoalStatus(events, goals, '2026-04-08')).toBe('within');
  });

  it('returns within when day total equals limit exactly', () => {
    const goals = [mkGoal({ effectiveFrom: '2026-04-01', limit: 2 })];
    const events = [
      mkEvent({ id: '1', timestamp: '2026-04-08T08:00:00-03:00' }),
      mkEvent({ id: '2', timestamp: '2026-04-08T10:00:00-03:00' }),
    ];
    expect(getDayGoalStatus(events, goals, '2026-04-08')).toBe('within');
  });

  it('returns over when day total > limit', () => {
    const goals = [mkGoal({ effectiveFrom: '2026-04-01', limit: 1 })];
    const events = [
      mkEvent({ id: '1', timestamp: '2026-04-08T08:00:00-03:00' }),
      mkEvent({ id: '2', timestamp: '2026-04-08T10:00:00-03:00' }),
    ];
    expect(getDayGoalStatus(events, goals, '2026-04-08')).toBe('over');
  });

  it('returns within for a day with zero events', () => {
    const goals = [mkGoal({ effectiveFrom: '2026-04-01', limit: 5 })];
    expect(getDayGoalStatus([], goals, '2026-04-08')).toBe('within');
  });
});

describe('getCurrentStreak', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('returns 0 when no goal is set', () => {
    vi.setSystemTime(new Date('2026-04-08T14:00:00Z'));
    expect(getCurrentStreak([], [])).toBe(0);
  });

  it('returns 0 when today is over the limit', () => {
    vi.setSystemTime(new Date('2026-04-08T14:00:00Z'));
    const goals = [mkGoal({ effectiveFrom: '2026-04-01', limit: 1 })];
    const events = [
      mkEvent({ id: '1', timestamp: '2026-04-08T08:00:00-03:00' }),
      mkEvent({ id: '2', timestamp: '2026-04-08T10:00:00-03:00' }),
    ];
    expect(getCurrentStreak(events, goals)).toBe(0);
  });

  it('returns 1 when only today is within (yesterday has no goal)', () => {
    vi.setSystemTime(new Date('2026-04-08T14:00:00Z'));
    const goals = [mkGoal({ effectiveFrom: '2026-04-08', limit: 5 })];
    const events = [
      mkEvent({ id: '1', timestamp: '2026-04-08T08:00:00-03:00' }),
    ];
    expect(getCurrentStreak(events, goals)).toBe(1);
  });

  it('counts consecutive within days including today', () => {
    vi.setSystemTime(new Date('2026-04-10T14:00:00Z'));
    const goals = [mkGoal({ effectiveFrom: '2026-04-01', limit: 5 })];
    const events = [
      mkEvent({ id: '1', timestamp: '2026-04-08T08:00:00-03:00' }),
      mkEvent({ id: '2', timestamp: '2026-04-09T08:00:00-03:00' }),
      mkEvent({ id: '3', timestamp: '2026-04-09T10:00:00-03:00' }),
      mkEvent({ id: '4', timestamp: '2026-04-10T08:00:00-03:00' }),
    ];
    expect(getCurrentStreak(events, goals)).toBe(10);
  });

  it('stops at the first over day going backward', () => {
    vi.setSystemTime(new Date('2026-04-10T14:00:00Z'));
    const goals = [mkGoal({ effectiveFrom: '2026-04-01', limit: 2 })];
    const events = [
      mkEvent({ id: '1', timestamp: '2026-04-08T08:00:00-03:00' }),
      mkEvent({ id: '2', timestamp: '2026-04-08T10:00:00-03:00' }),
      mkEvent({ id: '3', timestamp: '2026-04-08T12:00:00-03:00' }),
      mkEvent({ id: '4', timestamp: '2026-04-09T08:00:00-03:00' }),
      mkEvent({ id: '5', timestamp: '2026-04-10T08:00:00-03:00' }),
    ];
    expect(getCurrentStreak(events, goals)).toBe(2);
  });

  it('stops at a no-goal day going backward', () => {
    vi.setSystemTime(new Date('2026-04-10T14:00:00Z'));
    const goals = [mkGoal({ effectiveFrom: '2026-04-09', limit: 10 })];
    const events = [
      mkEvent({ id: '1', timestamp: '2026-04-08T08:00:00-03:00' }),
      mkEvent({ id: '2', timestamp: '2026-04-09T08:00:00-03:00' }),
      mkEvent({ id: '3', timestamp: '2026-04-10T08:00:00-03:00' }),
    ];
    expect(getCurrentStreak(events, goals)).toBe(2);
  });

  it('counts days with zero events as within', () => {
    vi.setSystemTime(new Date('2026-04-10T14:00:00Z'));
    const goals = [mkGoal({ effectiveFrom: '2026-04-01', limit: 5 })];
    const events = [
      mkEvent({ id: '1', timestamp: '2026-04-10T08:00:00-03:00' }),
    ];
    expect(getCurrentStreak(events, goals)).toBe(10);
  });

  it('handles 5+ consecutive day scenario', () => {
    vi.setSystemTime(new Date('2026-04-08T14:00:00Z'));
    const goals = [mkGoal({ effectiveFrom: '2026-04-01', limit: 3 })];
    const events = [
      mkEvent({ id: '1', timestamp: '2026-04-03T10:00:00-03:00' }),
      mkEvent({ id: '2', timestamp: '2026-04-04T10:00:00-03:00' }),
      mkEvent({ id: '3', timestamp: '2026-04-04T12:00:00-03:00' }),
      mkEvent({ id: '4', timestamp: '2026-04-06T10:00:00-03:00' }),
      mkEvent({ id: '5', timestamp: '2026-04-07T08:00:00-03:00' }),
      mkEvent({ id: '6', timestamp: '2026-04-07T10:00:00-03:00' }),
      mkEvent({ id: '7', timestamp: '2026-04-07T12:00:00-03:00' }),
      mkEvent({ id: '8', timestamp: '2026-04-08T08:00:00-03:00' }),
    ];
    expect(getCurrentStreak(events, goals)).toBe(8);
  });
});

describe('getRollingAverage', () => {
  it('divides total events by number of days, not by days with events', () => {
    const events = [
      mkEvent({ id: '1', timestamp: '2026-04-05T10:00:00-03:00' }),
      mkEvent({ id: '2', timestamp: '2026-04-05T12:00:00-03:00' }),
      mkEvent({ id: '3', timestamp: '2026-04-08T10:00:00-03:00' }),
    ];
    const avg = getRollingAverage(events, 7, '2026-04-08');
    expect(avg).toBeCloseTo(3 / 7, 4);
  });

  it('returns 0 when no events in range', () => {
    expect(getRollingAverage([], 7, '2026-04-08')).toBe(0);
  });

  it('counts only events within the N-day window', () => {
    const events = [
      mkEvent({ id: '1', timestamp: '2026-04-01T10:00:00-03:00' }),
      mkEvent({ id: '2', timestamp: '2026-04-05T10:00:00-03:00' }),
    ];
    const avg = getRollingAverage(events, 7, '2026-04-08');
    expect(avg).toBeCloseTo(1 / 7, 4);
  });

  it('uses todayKey when anchor is omitted', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-08T14:00:00Z'));
    const events = [
      mkEvent({ id: '1', timestamp: '2026-04-08T10:00:00-03:00' }),
    ];
    expect(getRollingAverage(events, 7)).toBeCloseTo(1 / 7, 4);
    vi.useRealTimers();
  });
});

describe('getAverageDelta', () => {
  it('returns negative fraction when current period < previous', () => {
    const events: TrackerEvent[] = [];
    for (let i = 0; i < 10; i++) {
      events.push(mkEvent({ id: `prev-${i}`, timestamp: '2026-04-03T10:00:00-03:00' }));
    }
    for (let i = 0; i < 7; i++) {
      events.push(mkEvent({ id: `cur-${i}`, timestamp: '2026-04-10T10:00:00-03:00' }));
    }
    const delta = getAverageDelta(events, 7, '2026-04-14');
    expect(delta).toBeCloseTo(-0.3, 1);
  });

  it('returns positive fraction when current period > previous', () => {
    const events: TrackerEvent[] = [];
    for (let i = 0; i < 3; i++) {
      events.push(mkEvent({ id: `prev-${i}`, timestamp: '2026-04-03T10:00:00-03:00' }));
    }
    for (let i = 0; i < 7; i++) {
      events.push(mkEvent({ id: `cur-${i}`, timestamp: '2026-04-10T10:00:00-03:00' }));
    }
    const delta = getAverageDelta(events, 7, '2026-04-14');
    expect(delta).toBeCloseTo(1.333, 1);
  });

  it('returns null when previous period has zero events', () => {
    const events = [
      mkEvent({ id: '1', timestamp: '2026-04-10T10:00:00-03:00' }),
    ];
    expect(getAverageDelta(events, 7, '2026-04-14')).toBeNull();
  });
});

describe('getMovingAverageSeries', () => {
  it('computes correct moving window averages for each dayKey', () => {
    const events = [
      mkEvent({ id: '1', timestamp: '2026-04-01T10:00:00-03:00' }),
      mkEvent({ id: '2', timestamp: '2026-04-01T12:00:00-03:00' }),
      mkEvent({ id: '3', timestamp: '2026-04-03T10:00:00-03:00' }),
    ];
    const dayKeys = ['2026-04-01', '2026-04-02', '2026-04-03'];
    const result = getMovingAverageSeries(events, dayKeys, 3);

    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({ dayKey: '2026-04-01', average: expect.closeTo(2 / 3, 4) });
    expect(result[1]).toEqual({ dayKey: '2026-04-02', average: expect.closeTo(2 / 3, 4) });
    expect(result[2]).toEqual({ dayKey: '2026-04-03', average: expect.closeTo(1, 4) });
  });
});
