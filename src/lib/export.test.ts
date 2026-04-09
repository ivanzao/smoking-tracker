import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  buildExport,
  EXPORT_VERSION,
  mergeEvents,
  parseImport,
  serializeExport,
} from './export';
import { TrackerEvent } from '@/types';

describe('buildExport', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-08T14:30:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('produces empty file with null dateRange when events is empty', () => {
    const file = buildExport([]);
    expect(file.version).toBe(EXPORT_VERSION);
    expect(file.eventCount).toBe(0);
    expect(file.dateRange).toEqual({ from: null, to: null });
    expect(file.events).toEqual([]);
    expect(file.exportedAt).toMatch(/^2026-04-08T/);
  });

  it('uses dayKey of first/last event for dateRange', () => {
    const events: TrackerEvent[] = [
      { id: '1', timestamp: '2026-03-15T08:00:00-03:00', type: 'tobacco' },
      { id: '2', timestamp: '2026-03-20T10:00:00-03:00', type: 'cannabis' },
      { id: '3', timestamp: '2026-04-02T20:00:00-03:00', type: 'tobacco' },
    ];
    const file = buildExport(events);
    expect(file.eventCount).toBe(3);
    expect(file.dateRange).toEqual({ from: '2026-03-15', to: '2026-04-02' });
    expect(file.events).toEqual(events);
  });

  it('handles single event', () => {
    const events: TrackerEvent[] = [
      { id: '1', timestamp: '2026-04-08T12:00:00-03:00', type: 'tobacco' },
    ];
    const file = buildExport(events);
    expect(file.eventCount).toBe(1);
    expect(file.dateRange).toEqual({ from: '2026-04-08', to: '2026-04-08' });
  });
});

describe('serializeExport', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-08T14:30:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns pretty-printed JSON parseable into the same shape', () => {
    const events: TrackerEvent[] = [
      { id: '1', timestamp: '2026-04-08T12:00:00-03:00', type: 'tobacco' },
    ];
    const json = serializeExport(events);
    expect(json).toContain('\n');
    expect(json).toContain('  ');
    const parsed = JSON.parse(json);
    expect(parsed.version).toBe(1);
    expect(parsed.eventCount).toBe(1);
    expect(parsed.events).toEqual(events);
  });
});

describe('parseImport', () => {
  it('rejects malformed JSON', () => {
    const result = parseImport('not json');
    expect(result).toEqual({ ok: false, error: 'invalid-json' });
  });

  it('rejects non-object root', () => {
    expect(parseImport('null')).toEqual({ ok: false, error: 'invalid-shape' });
    expect(parseImport('[]')).toEqual({ ok: false, error: 'invalid-shape' });
    expect(parseImport('"hello"')).toEqual({ ok: false, error: 'invalid-shape' });
  });

  it('rejects object missing required fields', () => {
    expect(parseImport(JSON.stringify({ version: 1, events: [] }))).toEqual({
      ok: false,
      error: 'invalid-shape',
    });
  });

  it('rejects unsupported version', () => {
    const file = {
      version: 2,
      exportedAt: '2026-04-08T14:30:00-03:00',
      eventCount: 0,
      dateRange: { from: null, to: null },
      events: [],
    };
    expect(parseImport(JSON.stringify(file))).toEqual({
      ok: false,
      error: 'unsupported-version',
    });
  });

  it('rejects when events is not an array', () => {
    const file = {
      version: 1,
      exportedAt: '2026-04-08T14:30:00-03:00',
      eventCount: 0,
      dateRange: { from: null, to: null },
      events: 'oops',
    };
    expect(parseImport(JSON.stringify(file))).toEqual({
      ok: false,
      error: 'invalid-events',
    });
  });

  it('rejects events missing required fields', () => {
    const file = {
      version: 1,
      exportedAt: '2026-04-08T14:30:00-03:00',
      eventCount: 1,
      dateRange: { from: null, to: null },
      events: [{ id: '1', type: 'tobacco' }],
    };
    expect(parseImport(JSON.stringify(file))).toEqual({
      ok: false,
      error: 'invalid-events',
    });
  });

  it('rejects unknown event type', () => {
    const file = {
      version: 1,
      exportedAt: '2026-04-08T14:30:00-03:00',
      eventCount: 1,
      dateRange: { from: null, to: null },
      events: [{ id: '1', timestamp: '2026-04-08T12:00:00-03:00', type: 'opium' }],
    };
    expect(parseImport(JSON.stringify(file))).toEqual({
      ok: false,
      error: 'invalid-events',
    });
  });

  it('rejects when location is present but not a string', () => {
    const file = {
      version: 1,
      exportedAt: '2026-04-08T14:30:00-03:00',
      eventCount: 1,
      dateRange: { from: null, to: null },
      events: [
        { id: '1', timestamp: '2026-04-08T12:00:00-03:00', type: 'tobacco', location: 42 },
      ],
    };
    expect(parseImport(JSON.stringify(file))).toEqual({
      ok: false,
      error: 'invalid-events',
    });
  });

  it('accepts a valid file', () => {
    const events: TrackerEvent[] = [
      { id: '1', timestamp: '2026-04-08T12:00:00-03:00', type: 'tobacco', location: 'casa' },
      { id: '2', timestamp: '2026-04-08T18:00:00-03:00', type: 'cannabis' },
    ];
    const file = {
      version: 1,
      exportedAt: '2026-04-08T20:00:00-03:00',
      eventCount: 2,
      dateRange: { from: '2026-04-08', to: '2026-04-08' },
      events,
    };
    const result = parseImport(JSON.stringify(file));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.events).toEqual(events);
      expect(result.eventCount).toBe(2);
      expect(result.exportedAt).toBe('2026-04-08T20:00:00-03:00');
    }
  });
});

describe('mergeEvents', () => {
  it('adds all incoming when current is empty', () => {
    const incoming: TrackerEvent[] = [
      { id: 'a', timestamp: '2026-04-08T10:00:00-03:00', type: 'tobacco' },
      { id: 'b', timestamp: '2026-04-08T11:00:00-03:00', type: 'cannabis' },
    ];
    const result = mergeEvents([], incoming);
    expect(result.added).toBe(2);
    expect(result.skipped).toBe(0);
    expect(result.merged.map((e) => e.id)).toEqual(['a', 'b']);
  });

  it('keeps current when incoming is empty', () => {
    const current: TrackerEvent[] = [
      { id: 'a', timestamp: '2026-04-08T10:00:00-03:00', type: 'tobacco' },
    ];
    const result = mergeEvents(current, []);
    expect(result.added).toBe(0);
    expect(result.skipped).toBe(0);
    expect(result.merged).toEqual(current);
  });

  it('skips events whose id already exists, keeps current copy', () => {
    const current: TrackerEvent[] = [
      { id: 'a', timestamp: '2026-04-08T10:00:00-03:00', type: 'tobacco', location: 'casa' },
    ];
    const incoming: TrackerEvent[] = [
      { id: 'a', timestamp: '2026-04-08T10:00:00-03:00', type: 'tobacco', location: 'rua' },
      { id: 'b', timestamp: '2026-04-08T11:00:00-03:00', type: 'cannabis' },
    ];
    const result = mergeEvents(current, incoming);
    expect(result.added).toBe(1);
    expect(result.skipped).toBe(1);
    expect(result.merged).toHaveLength(2);
    const a = result.merged.find((e) => e.id === 'a')!;
    expect(a.location).toBe('casa');
  });

  it('sorts merged result by timestamp ascending', () => {
    const current: TrackerEvent[] = [
      { id: 'c', timestamp: '2026-04-08T15:00:00-03:00', type: 'tobacco' },
    ];
    const incoming: TrackerEvent[] = [
      { id: 'a', timestamp: '2026-04-08T08:00:00-03:00', type: 'tobacco' },
      { id: 'b', timestamp: '2026-04-08T20:00:00-03:00', type: 'cannabis' },
    ];
    const result = mergeEvents(current, incoming);
    expect(result.merged.map((e) => e.id)).toEqual(['a', 'c', 'b']);
  });
});
