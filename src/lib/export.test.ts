import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  buildExport,
  EXPORT_VERSION,
  mergeEvents,
  mergeGoals,
  parseImport,
  serializeExport,
} from './export';
import { TrackerEvent, GoalEntry } from '@/types';

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
    expect(parsed.version).toBe(2);
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
      version: 99,
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
      expect(result.goals).toEqual([]);
      expect(result.eventCount).toBe(2);
      expect(result.exportedAt).toBe('2026-04-08T20:00:00-03:00');
    }
  });
});

describe('parseImport — v1 backward compat', () => {
  it('accepts v1 file without goals, returns goals as empty array', () => {
    const file = {
      version: 1,
      exportedAt: '2026-04-08T20:00:00-03:00',
      eventCount: 1,
      dateRange: { from: '2026-04-08', to: '2026-04-08' },
      events: [
        { id: '1', timestamp: '2026-04-08T12:00:00-03:00', type: 'tobacco' },
      ],
    };
    const result = parseImport(JSON.stringify(file));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.goals).toEqual([]);
      expect(result.events).toHaveLength(1);
    }
  });
});

describe('parseImport — v2 goals validation', () => {
  const validV2Base = {
    version: 2,
    exportedAt: '2026-04-08T20:00:00-03:00',
    eventCount: 0,
    dateRange: { from: null, to: null },
    events: [],
  };

  it('accepts v2 file with valid goals', () => {
    const file = {
      ...validV2Base,
      goals: [{ id: 'g1', limit: 10, effectiveFrom: '2026-04-01' }],
    };
    const result = parseImport(JSON.stringify(file));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.goals).toEqual(file.goals);
    }
  });

  it('accepts v2 file with empty goals array', () => {
    const file = { ...validV2Base, goals: [] };
    const result = parseImport(JSON.stringify(file));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.goals).toEqual([]);
    }
  });

  it('rejects v2 file when goals is not an array', () => {
    const file = { ...validV2Base, goals: 'oops' };
    expect(parseImport(JSON.stringify(file))).toEqual({
      ok: false,
      error: 'invalid-goals',
    });
  });

  it('rejects v2 file when goals is missing', () => {
    expect(parseImport(JSON.stringify(validV2Base))).toEqual({
      ok: false,
      error: 'invalid-goals',
    });
  });

  it('rejects v2 file with goal missing id', () => {
    const file = {
      ...validV2Base,
      goals: [{ limit: 10, effectiveFrom: '2026-04-01' }],
    };
    expect(parseImport(JSON.stringify(file))).toEqual({
      ok: false,
      error: 'invalid-goals',
    });
  });

  it('rejects v2 file with goal limit <= 0', () => {
    const file = {
      ...validV2Base,
      goals: [{ id: 'g1', limit: 0, effectiveFrom: '2026-04-01' }],
    };
    expect(parseImport(JSON.stringify(file))).toEqual({
      ok: false,
      error: 'invalid-goals',
    });
  });

  it('rejects v2 file with goal effectiveFrom malformed', () => {
    const file = {
      ...validV2Base,
      goals: [{ id: 'g1', limit: 10, effectiveFrom: 'april-1' }],
    };
    expect(parseImport(JSON.stringify(file))).toEqual({
      ok: false,
      error: 'invalid-goals',
    });
  });
});

describe('mergeGoals', () => {
  it('adds all incoming when current is empty', () => {
    const incoming: GoalEntry[] = [
      { id: 'g1', limit: 10, effectiveFrom: '2026-04-01' },
    ];
    const result = mergeGoals([], incoming);
    expect(result.merged).toEqual(incoming);
    expect(result.added).toBe(1);
    expect(result.skipped).toBe(0);
  });

  it('skips goals with existing id', () => {
    const current: GoalEntry[] = [
      { id: 'g1', limit: 10, effectiveFrom: '2026-04-01' },
    ];
    const incoming: GoalEntry[] = [
      { id: 'g1', limit: 8, effectiveFrom: '2026-04-01' },
      { id: 'g2', limit: 6, effectiveFrom: '2026-04-10' },
    ];
    const result = mergeGoals(current, incoming);
    expect(result.added).toBe(1);
    expect(result.skipped).toBe(1);
    expect(result.merged).toHaveLength(2);
    expect(result.merged[0].limit).toBe(10);
  });

  it('sorts merged result by effectiveFrom ascending', () => {
    const current: GoalEntry[] = [
      { id: 'g2', limit: 8, effectiveFrom: '2026-04-10' },
    ];
    const incoming: GoalEntry[] = [
      { id: 'g1', limit: 12, effectiveFrom: '2026-04-01' },
    ];
    const result = mergeGoals(current, incoming);
    expect(result.merged.map((g) => g.id)).toEqual(['g1', 'g2']);
  });
});

describe('buildExport — with goals', () => {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date('2026-04-08T14:30:00Z')); });
  afterEach(() => { vi.useRealTimers(); });

  it('includes goals in export', () => {
    const goals: GoalEntry[] = [
      { id: 'g1', limit: 10, effectiveFrom: '2026-04-01' },
    ];
    const file = buildExport([], goals);
    expect(file.version).toBe(2);
    expect(file.goals).toEqual(goals);
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
