export type EventType = 'tobacco' | 'cannabis';

export interface TrackerEvent {
  id: string;
  /** ISO 8601 with local offset, e.g. "2026-04-08T14:30:00-03:00" */
  timestamp: string;
  type: EventType;
  location?: string;
  reason?: string;
}

export interface DayTotals {
  tobacco: number;
  cannabis: number;
}

export interface GoalEntry {
  id: string;
  /** Positive integer — max total events (tobacco + cannabis) per day */
  limit: number;
  /** Day key "YYYY-MM-DD" from which this goal takes effect (inclusive) */
  effectiveFrom: string;
}

export interface StorageShape {
  events: TrackerEvent[];
  goals: GoalEntry[];
}
