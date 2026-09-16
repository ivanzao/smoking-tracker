import { describe, it, expect } from 'vitest';
import ExcelJS from 'exceljs';
import {
  EVENTS_SHEET_NAME,
  buildEventRows,
  buildWeekRows,
  buildWeekTotal,
  buildWorkbook,
  shortcutRange,
  splitIntoWeeks,
  validateXlsxRange,
  weekSheetName,
  xlsxFileName,
} from './xlsx';
import { TrackerEvent, GoalEntry, DayRecord } from '@/types';

const utc = (dayKey: string) => new Date(dayKey + 'T00:00:00Z');

describe('validateXlsxRange', () => {
  const today = '2026-04-08';

  it('requires both ends', () => {
    expect(validateXlsxRange('', '2026-04-08', today)).toBe('empty');
    expect(validateXlsxRange('2026-04-01', '', today)).toBe('empty');
  });

  it('rejects start after end and end after today', () => {
    expect(validateXlsxRange('2026-04-05', '2026-04-01', today)).toBe('inverted');
    expect(validateXlsxRange('2026-04-01', '2026-04-09', today)).toBe('future');
  });

  it('accepts a single day and a start before any record', () => {
    expect(validateXlsxRange('2026-04-08', '2026-04-08', today)).toBeNull();
    expect(validateXlsxRange('2020-01-01', '2026-04-08', today)).toBeNull();
  });
});

describe('shortcutRange', () => {
  it('is today and the N-1 days before it', () => {
    expect(shortcutRange(7, '2026-04-08')).toEqual({ from: '2026-04-02', to: '2026-04-08' });
    expect(shortcutRange(30, '2026-04-08')).toEqual({ from: '2026-03-10', to: '2026-04-08' });
    expect(shortcutRange(365, '2026-04-08')).toEqual({ from: '2025-04-09', to: '2026-04-08' });
  });
});

describe('splitIntoWeeks', () => {
  it('splits Monday→Sunday, clipping the first and last weeks to the range', () => {
    // 2026-04-01 is a Wednesday, 2026-04-14 a Tuesday
    expect(splitIntoWeeks({ from: '2026-04-01', to: '2026-04-14' })).toEqual([
      { from: '2026-04-01', to: '2026-04-05' },
      { from: '2026-04-06', to: '2026-04-12' },
      { from: '2026-04-13', to: '2026-04-14' },
    ]);
  });

  it('keeps a full Monday→Sunday week intact and a single day as one sheet', () => {
    expect(splitIntoWeeks({ from: '2026-04-06', to: '2026-04-12' })).toEqual([
      { from: '2026-04-06', to: '2026-04-12' },
    ]);
    expect(splitIntoWeeks({ from: '2026-04-12', to: '2026-04-12' })).toEqual([
      { from: '2026-04-12', to: '2026-04-12' },
    ]);
  });
});

describe('weekSheetName / xlsxFileName', () => {
  it('names sheets by short dates without "/" (forbidden in Excel sheet names)', () => {
    expect(weekSheetName({ from: '2026-04-01', to: '2026-04-05' })).toBe('01 abr – 05 abr');
    expect(weekSheetName({ from: '2026-09-28', to: '2026-10-04' })).toBe('28 set – 04 out');
  });

  it('names the file by its interval', () => {
    expect(xlsxFileName({ from: '2026-04-02', to: '2026-04-08' })).toBe(
      'smoking-tracker-2026-04-02_2026-04-08.xlsx',
    );
  });
});

const events: TrackerEvent[] = [
  { id: '1', timestamp: '2026-04-06T08:00:00-03:00', type: 'tobacco', reason: 'café', location: 'casa' },
  { id: '2', timestamp: '2026-04-06T12:00:00-03:00', type: 'cannabis' },
  { id: '3', timestamp: '2026-04-06T20:00:00-03:00', type: 'tobacco', location: 'bar' },
  { id: '4', timestamp: '2026-04-07T09:00:00-03:00', type: 'tobacco', reason: 'estresse' },
];
const goals: GoalEntry[] = [
  { id: 'g1', limit: 2, effectiveFrom: '2026-04-06' },
  { id: 'g2', limit: 5, effectiveFrom: '2026-04-08' },
];
const days: DayRecord[] = [
  {
    dayKey: '2026-04-07',
    notes: [
      { id: 'n2', text: 'segunda nota', createdAt: '2026-04-07T22:00:00-03:00' },
      { id: 'n1', text: 'primeira nota', createdAt: '2026-04-07T10:00:00-03:00' },
    ],
  },
];

describe('buildWeekRows / buildWeekTotal', () => {
  it('yields one row per calendar day with totals, the goal in effect and notes in order', () => {
    const rows = buildWeekRows(events, goals, days, { from: '2026-04-05', to: '2026-04-08' });
    expect(rows).toEqual([
      { weekday: 'dom', date: utc('2026-04-05'), goal: null, tobacco: 0, cannabis: 0, total: 0, status: 'no-goal', notes: '' },
      { weekday: 'seg', date: utc('2026-04-06'), goal: 2, tobacco: 2, cannabis: 1, total: 3, status: 'over', notes: '' },
      { weekday: 'ter', date: utc('2026-04-07'), goal: 2, tobacco: 1, cannabis: 0, total: 1, status: 'within', notes: 'primeira nota\nsegunda nota' },
      { weekday: 'qua', date: utc('2026-04-08'), goal: 5, tobacco: 0, cannabis: 0, total: 0, status: 'within', notes: '' },
    ]);
  });

  it('sums the week and counts within days over the days present in the sheet', () => {
    const rows = buildWeekRows(events, goals, days, { from: '2026-04-05', to: '2026-04-08' });
    expect(buildWeekTotal(rows)).toEqual({ tobacco: 3, cannabis: 1, total: 4, withinLabel: '2/4 dentro' });
  });
});

describe('buildEventRows', () => {
  it('lists one row per event in the range, chronologically, with the day goal and status', () => {
    const rows = buildEventRows(events, goals, { from: '2026-04-06', to: '2026-04-06' });
    expect(rows).toEqual([
      { weekday: 'seg', date: utc('2026-04-06'), time: '08:00', type: 'Tabaco', reason: 'café', location: 'casa', goal: 2, status: 'over' },
      { weekday: 'seg', date: utc('2026-04-06'), time: '12:00', type: 'Cannabis', reason: '', location: '', goal: 2, status: 'over' },
      { weekday: 'seg', date: utc('2026-04-06'), time: '20:00', type: 'Tabaco', reason: '', location: 'bar', goal: 2, status: 'over' },
    ]);
  });

  it('is empty when the range has no events', () => {
    expect(buildEventRows(events, goals, { from: '2026-04-01', to: '2026-04-05' })).toEqual([]);
  });
});

describe('buildWorkbook', () => {
  const roundTrip = async (range: { from: string; to: string }) => {
    const buffer = await (await buildWorkbook(events, goals, days, range)).xlsx.writeBuffer();
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buffer as ArrayBuffer);
    return wb;
  };

  it('has one sheet per week followed by "Eventos"', async () => {
    const wb = await roundTrip({ from: '2026-04-01', to: '2026-04-14' });
    expect(wb.worksheets.map((s) => s.name)).toEqual([
      '01 abr – 05 abr',
      '06 abr – 12 abr',
      '13 abr – 14 abr',
      EVENTS_SHEET_NAME,
    ]);
  });

  it('writes a header, typed day rows and a bold Total row per week', async () => {
    const wb = await roundTrip({ from: '2026-04-06', to: '2026-04-08' });
    const sheet = wb.getWorksheet('06 abr – 08 abr')!;
    expect(sheet.getRow(1).values).toEqual([undefined, 'Dia', 'Data', 'Meta', 'Tabaco', 'Cannabis', 'Total', 'Status', 'Notas']);
    expect(sheet.views[0]).toMatchObject({ state: 'frozen', ySplit: 1 });

    const monday = sheet.getRow(2);
    expect(monday.getCell(1).value).toBe('seg');
    expect(monday.getCell(2).value).toEqual(utc('2026-04-06'));
    expect(monday.getCell(2).numFmt).toBe('dd/mm/yyyy');
    expect(monday.getCell(3).value).toBe(2);
    expect(monday.getCell(4).value).toBe(2);
    expect(monday.getCell(5).value).toBe(1);
    expect(monday.getCell(6).value).toBe(3);
    expect(monday.getCell(7).value).toBe('acima');

    expect(sheet.getRow(3).getCell(8).value).toBe('primeira nota\nsegunda nota');

    const total = sheet.getRow(5);
    expect(total.getCell(1).value).toBe('Total');
    expect(total.getCell(4).value).toBe(3);
    expect(total.getCell(5).value).toBe(1);
    expect(total.getCell(6).value).toBe(4);
    expect(total.getCell(7).value).toBe('2/3 dentro');
    expect(total.font?.bold).toBe(true);
    expect(sheet.rowCount).toBe(5);
  });

  it('writes the Eventos sheet with one row per event', async () => {
    const wb = await roundTrip({ from: '2026-04-06', to: '2026-04-08' });
    const sheet = wb.getWorksheet(EVENTS_SHEET_NAME)!;
    expect(sheet.getRow(1).values).toEqual([undefined, 'Dia', 'Data', 'Hora', 'Tipo', 'Motivo', 'Local', 'Meta do Dia', 'Status do Dia']);
    expect(sheet.rowCount).toBe(5);
    expect(sheet.getRow(5).values).toEqual([undefined, 'ter', utc('2026-04-07'), '09:00', 'Tabaco', 'estresse', '', 2, 'dentro']);
  });

  it('exports a range with no events as zeroed days and an empty Eventos sheet', async () => {
    const wb = await roundTrip({ from: '2026-04-01', to: '2026-04-02' });
    expect(wb.getWorksheet('01 abr – 02 abr')!.getRow(4).getCell(7).value).toBe('0/2 dentro');
    expect(wb.getWorksheet(EVENTS_SHEET_NAME)!.rowCount).toBe(1);
  });
});
