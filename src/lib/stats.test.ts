import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TrackerEvent, GoalEntry } from '@/types';
import {
  getGoalForDay,
  getCurrentGoal,
  getDayGoalStatus,
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
