import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { buildExport, EXPORT_VERSION } from './export';
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
