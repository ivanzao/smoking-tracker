import { TrackerEvent } from '@/types';
import { getDayKey, nowLocalIso } from './events';

export const EXPORT_VERSION = 1;

export interface ExportFile {
  version: 1;
  exportedAt: string;
  eventCount: number;
  dateRange: {
    from: string | null;
    to: string | null;
  };
  events: TrackerEvent[];
}

export function serializeExport(events: TrackerEvent[]): string {
  return JSON.stringify(buildExport(events), null, 2);
}

export function buildExport(events: TrackerEvent[]): ExportFile {
  const from = events.length > 0 ? getDayKey(events[0].timestamp) : null;
  const to = events.length > 0 ? getDayKey(events[events.length - 1].timestamp) : null;
  return {
    version: EXPORT_VERSION,
    exportedAt: nowLocalIso(),
    eventCount: events.length,
    dateRange: { from, to },
    events,
  };
}
