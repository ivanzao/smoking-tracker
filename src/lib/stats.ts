import { TrackerEvent, GoalEntry } from '@/types';
import { getEventsForDay, todayKey } from './events';

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
