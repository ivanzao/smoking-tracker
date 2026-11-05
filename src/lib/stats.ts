import { subDays, addDays, format } from 'date-fns';
import { TrackerEvent, GoalEntry } from '@/types';
import { getEventsForDay, getDayKey, todayKey } from './events';

/**
 * `empty` is a past or current day with a goal and nothing logged: neutral, because
 * the app can't tell an abstinent day from a forgotten one. `future` hasn't happened.
 */
export type DayGoalStatus = 'within' | 'over' | 'empty' | 'future' | 'no-goal';

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
  if (dayKey > todayKey()) return 'future';
  const goal = getGoalForDay(goals, dayKey);
  if (!goal) return 'no-goal';
  const dayEvents = getEventsForDay(events, dayKey);
  if (dayEvents.length === 0) return 'empty';
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

/** One sentence for the week-over-week change; `delta` comes from getAverageDelta. */
export function describeTrend(delta: number | null): string {
  if (delta === null) return 'Sua tendência aparece depois de duas semanas de registros';
  const percent = Math.round(Math.abs(delta) * 100);
  if (percent === 0) return 'Igual à semana anterior';
  return `${percent}% ${delta < 0 ? 'a menos' : 'a mais'} que na semana anterior`;
}

export function formatAverage(value: number): string {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
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

/**
 * Logged days within the goal, walking back from today until one goes over.
 * Empty days are skipped: they neither add to the streak nor break it.
 * `streakResetDay` is a manual reset marker: that day and everything before it
 * never count, so the streak only resumes from the following day.
 */
export function getCurrentStreak(
  events: TrackerEvent[],
  goals: GoalEntry[],
  streakResetDay: string | null = null,
): number {
  let streak = 0;
  let cursor = new Date(todayKey() + 'T12:00:00');
  while (true) {
    const dayKey = format(cursor, 'yyyy-MM-dd');
    if (streakResetDay && dayKey <= streakResetDay) break;
    const status = getDayGoalStatus(events, goals, dayKey);
    if (status === 'within') streak++;
    else if (status !== 'empty') break;
    cursor = subDays(cursor, 1);
  }
  return streak;
}

/**
 * Logged days within the goal from the first goal's start through today
 * (not necessarily consecutive). Empty days and days without a goal never count.
 */
export function getDaysWithinGoal(events: TrackerEvent[], goals: GoalEntry[]): number {
  if (goals.length === 0) return 0;
  const today = todayKey();
  let count = 0;
  let cursor = new Date(goals[0].effectiveFrom + 'T12:00:00');
  let dayKey = format(cursor, 'yyyy-MM-dd');
  while (dayKey <= today) {
    if (getDayGoalStatus(events, goals, dayKey) === 'within') count++;
    cursor = addDays(cursor, 1);
    dayKey = format(cursor, 'yyyy-MM-dd');
  }
  return count;
}
