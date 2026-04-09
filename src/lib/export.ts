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

export type ImportError =
  | 'invalid-json'
  | 'invalid-shape'
  | 'unsupported-version'
  | 'invalid-events';

export type ParseResult =
  | { ok: true; events: TrackerEvent[]; exportedAt: string; eventCount: number }
  | { ok: false; error: ImportError };

const REQUIRED_ROOT_KEYS = ['version', 'exportedAt', 'eventCount', 'dateRange', 'events'] as const;
const VALID_TYPES: ReadonlySet<string> = new Set(['tobacco', 'cannabis']);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isValidEvent(value: unknown): value is TrackerEvent {
  if (!isPlainObject(value)) return false;
  if (typeof value.id !== 'string') return false;
  if (typeof value.timestamp !== 'string') return false;
  if (typeof value.type !== 'string' || !VALID_TYPES.has(value.type)) return false;
  if (value.location !== undefined && typeof value.location !== 'string') return false;
  if (value.reason !== undefined && typeof value.reason !== 'string') return false;
  return true;
}

export function parseImport(raw: string): ParseResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, error: 'invalid-json' };
  }

  if (!isPlainObject(parsed)) {
    return { ok: false, error: 'invalid-shape' };
  }
  for (const key of REQUIRED_ROOT_KEYS) {
    if (!(key in parsed)) {
      return { ok: false, error: 'invalid-shape' };
    }
  }

  if (parsed.version !== EXPORT_VERSION) {
    return { ok: false, error: 'unsupported-version' };
  }

  if (!Array.isArray(parsed.events)) {
    return { ok: false, error: 'invalid-events' };
  }
  for (const e of parsed.events) {
    if (!isValidEvent(e)) {
      return { ok: false, error: 'invalid-events' };
    }
  }

  return {
    ok: true,
    events: parsed.events as TrackerEvent[],
    exportedAt: typeof parsed.exportedAt === 'string' ? parsed.exportedAt : '',
    eventCount: typeof parsed.eventCount === 'number' ? parsed.eventCount : parsed.events.length,
  };
}

export interface MergeResult {
  merged: TrackerEvent[];
  added: number;
  skipped: number;
}

export function mergeEvents(
  current: TrackerEvent[],
  incoming: TrackerEvent[]
): MergeResult {
  const existingIds = new Set(current.map((e) => e.id));
  const additions: TrackerEvent[] = [];
  let skipped = 0;
  for (const e of incoming) {
    if (existingIds.has(e.id)) {
      skipped++;
    } else {
      additions.push(e);
      existingIds.add(e.id);
    }
  }
  const merged = [...current, ...additions].sort((a, b) =>
    a.timestamp < b.timestamp ? -1 : a.timestamp > b.timestamp ? 1 : 0
  );
  return { merged, added: additions.length, skipped };
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
