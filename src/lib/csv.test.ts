import { describe, it, expect } from 'vitest';
import { csvFileName, resolveCsvRange, serializeCsv } from './csv';
import { TrackerEvent, GoalEntry, DayRecord } from '@/types';

const HEADER = 'Data;Dia;Meta;Total;Tabaco;Cannabis;Status;Motivos;Locais;Notas';

describe('serializeCsv', () => {
  it('starts with a UTF-8 BOM and the header, one zeroed row per calendar day', () => {
    const csv = serializeCsv([], [], [], { from: '2026-04-06', to: '2026-04-08' });
    expect(csv).toBe(
      '\uFEFF' +
        [
          HEADER,
          '06/04/2026;seg;;0;0;0;sem meta;;;',
          '07/04/2026;ter;;0;0;0;sem meta;;;',
          '08/04/2026;qua;;0;0;0;sem meta;;;',
        ].join('\r\n') +
        '\r\n',
    );
  });
});

describe('serializeCsv — totals and goal', () => {
  const rows = (csv: string) => csv.slice(1).trimEnd().split('\r\n').slice(1);

  it('counts tobacco and cannabis per day and compares the total against the goal in effect', () => {
    const events: TrackerEvent[] = [
      { id: '1', timestamp: '2026-04-06T08:00:00-03:00', type: 'tobacco' },
      { id: '2', timestamp: '2026-04-06T12:00:00-03:00', type: 'cannabis' },
      { id: '3', timestamp: '2026-04-06T20:00:00-03:00', type: 'tobacco' },
      { id: '4', timestamp: '2026-04-07T09:00:00-03:00', type: 'tobacco' },
    ];
    const goals: GoalEntry[] = [
      { id: 'g1', limit: 2, effectiveFrom: '2026-04-06' },
      { id: 'g2', limit: 5, effectiveFrom: '2026-04-08' },
    ];
    const csv = serializeCsv(events, goals, [], { from: '2026-04-05', to: '2026-04-08' });
    expect(rows(csv)).toEqual([
      '05/04/2026;dom;;0;0;0;sem meta;;;',
      '06/04/2026;seg;2;3;2;1;acima;"08:00 [T]\n12:00 [C]\n20:00 [T]";"08:00 [T]\n12:00 [C]\n20:00 [T]";',
      '07/04/2026;ter;2;1;1;0;dentro;09:00 [T];09:00 [T];',
      '08/04/2026;qua;5;0;0;0;dentro;;;',
    ]);
  });
});

describe('serializeCsv — per-event detail and notes', () => {
  const rows = (csv: string) => csv.slice(1).slice(HEADER.length + 2);

  it('lists one line per event in Motivos and Locais, time-anchored so both columns align', () => {
    const events: TrackerEvent[] = [
      { id: '2', timestamp: '2026-04-06T14:30:00-03:00', type: 'cannabis', reason: 'ansiedade', location: 'casa' },
      { id: '1', timestamp: '2026-04-06T09:10:00-03:00', type: 'tobacco', reason: 'café' },
      { id: '3', timestamp: '2026-04-06T21:05:00-03:00', type: 'tobacco', location: 'bar' },
    ];
    const csv = serializeCsv(events, [], [], { from: '2026-04-06', to: '2026-04-06' });
    expect(rows(csv)).toBe(
      '06/04/2026;seg;;3;2;1;sem meta;' +
        '"09:10 [T] café\n14:30 [C] ansiedade\n21:05 [T]";' +
        '"09:10 [T]\n14:30 [C] casa\n21:05 [T] bar";' +
        '\r\n',
    );
  });

  it('joins the day notes with line breaks and escapes quotes and separators', () => {
    const days: DayRecord[] = [
      {
        dayKey: '2026-04-06',
        notes: [
          { id: 'n1', text: 'dia difícil; briga', createdAt: '2026-04-06T10:00:00-03:00' },
          { id: 'n2', text: 'ele disse "calma"', createdAt: '2026-04-06T18:00:00-03:00' },
        ],
      },
    ];
    const csv = serializeCsv([], [], days, { from: '2026-04-06', to: '2026-04-06' });
    expect(rows(csv)).toBe(
      '06/04/2026;seg;;0;0;0;sem meta;;;"dia difícil; briga\nele disse ""calma"""\r\n',
    );
  });
});

describe('resolveCsvRange', () => {
  const today = '2026-04-08';
  const event = (ts: string): TrackerEvent => ({ id: ts, timestamp: ts, type: 'tobacco' });
  const day = (dayKey: string): DayRecord => ({
    dayKey,
    notes: [{ id: dayKey, text: 'x', createdAt: `${dayKey}T10:00:00-03:00` }],
  });

  it('7d is today plus the six previous days', () => {
    expect(resolveCsvRange('7d', [], [], today)).toEqual({ from: '2026-04-02', to: today });
  });

  it('30d is today plus the 29 previous days, crossing the month boundary', () => {
    expect(resolveCsvRange('30d', [], [], today)).toEqual({ from: '2026-03-10', to: today });
  });

  it('all starts at the oldest event or note, whichever is earlier', () => {
    const events = [event('2026-03-20T08:00:00-03:00')];
    expect(resolveCsvRange('all', events, [day('2026-03-25')], today)).toEqual({ from: '2026-03-20', to: today });
    expect(resolveCsvRange('all', events, [day('2026-03-15')], today)).toEqual({ from: '2026-03-15', to: today });
  });

  it('all with no history has no range', () => {
    expect(resolveCsvRange('all', [], [], today)).toBeNull();
  });
});

describe('csvFileName', () => {
  it('names the file by the exported interval', () => {
    expect(csvFileName({ from: '2026-04-02', to: '2026-04-08' })).toBe(
      'smoking-tracker-2026-04-02_2026-04-08.csv',
    );
  });
});
