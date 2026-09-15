import { describe, it, expect } from 'vitest';
import { DayNote, DayRecord } from '@/types';
import {
  addDayNote,
  updateDayNote,
  removeDayNote,
  getDayNotes,
  isValidDayRecord,
  mergeDays,
} from './days';

const note = (id: string, text = 'nota', createdAt = '2026-04-08T10:00:00-03:00'): DayNote => ({
  id,
  text,
  createdAt,
});

describe('addDayNote', () => {
  it('creates the day record when it does not exist', () => {
    const days = addDayNote([], '2026-04-08', note('n1'));
    expect(days).toEqual([{ dayKey: '2026-04-08', notes: [note('n1')] }]);
  });

  it('appends to an existing day, keeping notes sorted by createdAt', () => {
    const days = addDayNote(
      [{ dayKey: '2026-04-08', notes: [note('n2', 'b', '2026-04-08T12:00:00-03:00')] }],
      '2026-04-08',
      note('n1', 'a', '2026-04-08T10:00:00-03:00'),
    );
    expect(days[0].notes.map((n) => n.id)).toEqual(['n1', 'n2']);
  });

  it('keeps days sorted by dayKey', () => {
    let days = addDayNote([], '2026-04-08', note('n1'));
    days = addDayNote(days, '2026-04-06', note('n2'));
    expect(days.map((d) => d.dayKey)).toEqual(['2026-04-06', '2026-04-08']);
  });

  it('ignores a note whose id already exists on that day', () => {
    const seed: DayRecord[] = [{ dayKey: '2026-04-08', notes: [note('n1')] }];
    expect(addDayNote(seed, '2026-04-08', note('n1', 'dup'))).toBe(seed);
  });
});

describe('updateDayNote', () => {
  it('replaces the text of the matching note', () => {
    const seed: DayRecord[] = [{ dayKey: '2026-04-08', notes: [note('n1', 'old')] }];
    const days = updateDayNote(seed, '2026-04-08', 'n1', 'new');
    expect(days[0].notes[0].text).toBe('new');
  });

  it('returns the same array when nothing matches', () => {
    const seed: DayRecord[] = [{ dayKey: '2026-04-08', notes: [note('n1')] }];
    expect(updateDayNote(seed, '2026-04-08', 'zz', 'x')).toBe(seed);
    expect(updateDayNote(seed, '2026-04-09', 'n1', 'x')).toBe(seed);
  });
});

describe('removeDayNote', () => {
  it('removes the note and drops the day when it becomes empty', () => {
    const seed: DayRecord[] = [
      { dayKey: '2026-04-08', notes: [note('n1')] },
      { dayKey: '2026-04-09', notes: [note('n2'), note('n3')] },
    ];
    expect(removeDayNote(seed, '2026-04-08', 'n1')).toEqual([seed[1]]);
    expect(removeDayNote(seed, '2026-04-09', 'n2')[1].notes).toEqual([note('n3')]);
  });
});

describe('getDayNotes', () => {
  it('returns notes for the day or an empty array', () => {
    const seed: DayRecord[] = [{ dayKey: '2026-04-08', notes: [note('n1')] }];
    expect(getDayNotes(seed, '2026-04-08')).toEqual([note('n1')]);
    expect(getDayNotes(seed, '2026-04-09')).toEqual([]);
  });
});

describe('isValidDayRecord', () => {
  it('accepts a well-formed record', () => {
    expect(isValidDayRecord({ dayKey: '2026-04-08', notes: [note('n1')] })).toBe(true);
  });

  it('rejects malformed records', () => {
    expect(isValidDayRecord(null)).toBe(false);
    expect(isValidDayRecord({ dayKey: 'hoje', notes: [] })).toBe(false);
    expect(isValidDayRecord({ dayKey: '2026-04-08', notes: 'x' })).toBe(false);
    expect(isValidDayRecord({ dayKey: '2026-04-08', notes: [{ id: 'n1', text: 'a' }] })).toBe(false);
    expect(isValidDayRecord({ dayKey: '2026-04-08', notes: [{ id: 1, text: 'a', createdAt: 'x' }] })).toBe(false);
    expect(isValidDayRecord({ dayKey: '2026-04-08', notes: [note('n1', 'a', 'ontem')] })).toBe(false);
    expect(isValidDayRecord({ dayKey: '2026-04-08', notes: [note('n1', 'a', '2026-13-40T10:00:00-03:00')] })).toBe(false);
  });
});

describe('mergeDays', () => {
  it('adds unknown days and unions notes by id within a day', () => {
    const current: DayRecord[] = [{ dayKey: '2026-04-08', notes: [note('n1', 'mine')] }];
    const incoming: DayRecord[] = [
      { dayKey: '2026-04-08', notes: [note('n1', 'theirs'), note('n2')] },
      { dayKey: '2026-04-06', notes: [note('n3')] },
    ];
    const result = mergeDays(current, incoming);
    expect(result.added).toBe(2);
    expect(result.skipped).toBe(1);
    expect(result.merged.map((d) => d.dayKey)).toEqual(['2026-04-06', '2026-04-08']);
    expect(result.merged[1].notes.map((n) => [n.id, n.text])).toEqual([['n1', 'mine'], ['n2', 'nota']]);
  });
});
