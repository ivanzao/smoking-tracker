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
