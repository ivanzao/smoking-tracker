import { subDays, format } from 'date-fns';
import { TrackerEvent, GoalEntry } from '@/types';
import { getEventsForDay, getDayKey, todayKey } from './events';

export type DayGoalStatus = 'within' | 'over' | 'no-goal';

/**
 * Find the goal in effect for a specific day.
 * Goals must be sorted by effectiveFrom asc.
 */
export function getGoalForDay(goals: GoalEntry[], dayKey: string): GoalEntry | null {
  let result: GoalEntry | null = null;
  for (const g of goals) {
    if (g.effectiveFrom <= dayKey) {
      result = g;
    } else {
      break;
    }
  }
  return result;
}

/** Goal in effect today. */
export function getCurrentGoal(goals: GoalEntry[]): GoalEntry | null {
  return getGoalForDay(goals, todayKey());
}

/** Evaluate whether a day's total is within the vigent goal's limit. */
export function getDayGoalStatus(
  events: TrackerEvent[],
  goals: GoalEntry[],
  dayKey: string,
): DayGoalStatus {
  const goal = getGoalForDay(goals, dayKey);
  if (!goal) return 'no-goal';
  const dayEvents = getEventsForDay(events, dayKey);
  return dayEvents.length <= goal.limit ? 'within' : 'over';
}

export function getRollingAverage(
  events: TrackerEvent[],
  days: number,
  anchor?: string,
): number {
  const to = anchor ?? todayKey();
  const from = format(subDays(new Date(to + 'T12:00:00'), days - 1), 'yyyy-MM-dd');
  let count = 0;
  for (const e of events) {
    const dk = getDayKey(e.timestamp);
    if (dk >= from && dk <= to) count++;
  }
  return count / days;
}

export function getAverageDelta(
  events: TrackerEvent[],
  days: number,
  anchor?: string,
): number | null {
  const to = anchor ?? todayKey();
  const currentAvg = getRollingAverage(events, days, to);
  const prevTo = format(subDays(new Date(to + 'T12:00:00'), days), 'yyyy-MM-dd');
  const prevAvg = getRollingAverage(events, days, prevTo);
  if (prevAvg === 0) return null;
  return (currentAvg - prevAvg) / prevAvg;
}

export function getMovingAverageSeries(
  events: TrackerEvent[],
  dayKeys: string[],
  windowDays: number,
): Array<{ dayKey: string; average: number }> {
  return dayKeys.map((dk) => ({
    dayKey: dk,
    average: getRollingAverage(events, windowDays, dk),
  }));
}

export function getCurrentStreak(
  events: TrackerEvent[],
  goals: GoalEntry[],
): number {
  const today = todayKey();
  const todayStatus = getDayGoalStatus(events, goals, today);
  if (todayStatus !== 'within') return 0;

  let streak = 1;
  let cursor = new Date(today + 'T12:00:00');
  while (true) {
    cursor = subDays(cursor, 1);
    const dayKey = format(cursor, 'yyyy-MM-dd');
    const status = getDayGoalStatus(events, goals, dayKey);
    if (status !== 'within') break;
    streak++;
  }
  return streak;
}
