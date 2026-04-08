# Export/Import + Navegação de Meses Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar o sub-projeto #2 do `smoking-tracker`: export/import de eventos como JSON e navegação de meses anteriores na aba Mês do calendário.

**Architecture:** Lógica pura nova em `src/lib/export.ts` (build/serialize/parse/merge) + 2 helpers novos em `src/lib/events.ts` (`getEarliestEventMonth`, `getMonthKey`). `useTracker` ganha 2 métodos finos (`exportEvents`, `importEvents`). UI nova: `SettingsDrawer` (engrenagem no header). `CalendarView` ganha `viewMonth` interno com setas. Sem dependências novas.

**Tech Stack:** TypeScript, React 18, Vitest, React Testing Library, vaul (Drawer), shadcn/ui, lucide-react, date-fns + date-fns/locale.

**Spec:** `docs/superpowers/specs/2026-04-08-export-import-navegacao-meses-design.md`

---

## Convenções

- **Comandos de teste:** `npm run test:run -- <path>` para rodar um arquivo isolado, `npm run test:run` para tudo.
- **Build check final:** `npm run build`
- **Commits:** Conventional commits (`feat:`, `test:`, `refactor:`). Sempre TDD: teste falha → impl mínima → teste passa → commit.
- **Imports:** alias `@/` resolve `src/`. Use sempre o alias para imports cross-folder.
- **Fonte da verdade:** sempre que houver dúvida de comportamento, releia a spec.

---

## File Structure

**Novos:**
- `src/lib/export.ts` — tipos `ExportFile`, `ImportError`, `ParseResult`, `MergeResult`, `ImportOutcome`; helpers `buildExport`, `serializeExport`, `parseImport`, `mergeEvents`.
- `src/lib/export.test.ts` — testes unitários dos helpers acima.
- `src/components/SettingsDrawer.tsx` — drawer com seções de export/import.

**Modificados:**
- `src/lib/events.ts` — adiciona `getEarliestEventMonth(events)` e `getMonthKey(date)`.
- `src/lib/events.test.ts` — testes dos novos helpers.
- `src/hooks/useTracker.ts` — adiciona métodos `exportEvents()` e `importEvents(raw)` e estende `UseTrackerAPI`.
- `src/hooks/useTracker.test.ts` — testes de export/import.
- `src/components/CalendarView.tsx` — recebe `events`, mantém `viewMonth` interno, renderiza header com setas na aba Mês.
- `src/App.tsx` — estado `settingsOpen`, ícone `Settings` no header, monta `SettingsDrawer`, passa `events` para `CalendarView`.

---

## Task 1: Tipos + `buildExport`

**Files:**
- Create: `src/lib/export.ts`
- Test: `src/lib/export.test.ts`

- [ ] **Step 1: Criar `src/lib/export.ts` com tipos e stub de `buildExport`**

```ts
// src/lib/export.ts
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

export function buildExport(_events: TrackerEvent[]): ExportFile {
  throw new Error('not implemented');
}
```

- [ ] **Step 2: Escrever testes de `buildExport`**

Criar `src/lib/export.test.ts`:

```ts
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
```

- [ ] **Step 3: Rodar testes para confirmar falha**

```bash
npm run test:run -- src/lib/export.test.ts
```

Esperado: FAIL com `not implemented`.

- [ ] **Step 4: Implementar `buildExport`**

Substituir o stub em `src/lib/export.ts`:

```ts
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
```

> Nota: o hook mantém `events` ordenado por timestamp ascendente (sub-projeto #1), então primeiro/último são os extremos sem precisar reordenar.

- [ ] **Step 5: Rodar testes para confirmar passagem**

```bash
npm run test:run -- src/lib/export.test.ts
```

Esperado: PASS (3 testes).

- [ ] **Step 6: Commit**

```bash
git add src/lib/export.ts src/lib/export.test.ts
git commit -m "feat: add buildExport helper for sub-project #2"
```

---

## Task 2: `serializeExport`

**Files:**
- Modify: `src/lib/export.ts`
- Modify: `src/lib/export.test.ts`

- [ ] **Step 1: Escrever teste de `serializeExport`**

Adicionar ao final de `src/lib/export.test.ts`:

```ts
import { serializeExport } from './export';

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
    expect(json).toContain('  '); // pretty-printed indent
    const parsed = JSON.parse(json);
    expect(parsed.version).toBe(1);
    expect(parsed.eventCount).toBe(1);
    expect(parsed.events).toEqual(events);
  });
});
```

> Nota: o `import` adicional pode ser combinado com o de cima — ajuste conforme estilo.

- [ ] **Step 2: Rodar teste para confirmar falha**

```bash
npm run test:run -- src/lib/export.test.ts
```

Esperado: FAIL (`serializeExport` undefined).

- [ ] **Step 3: Implementar `serializeExport`**

Adicionar a `src/lib/export.ts`:

```ts
export function serializeExport(events: TrackerEvent[]): string {
  return JSON.stringify(buildExport(events), null, 2);
}
```

- [ ] **Step 4: Rodar testes para confirmar passagem**

```bash
npm run test:run -- src/lib/export.test.ts
```

Esperado: PASS (4 testes).

- [ ] **Step 5: Commit**

```bash
git add src/lib/export.ts src/lib/export.test.ts
git commit -m "feat: add serializeExport JSON helper"
```

---

## Task 3: `parseImport` com validação estrita

**Files:**
- Modify: `src/lib/export.ts`
- Modify: `src/lib/export.test.ts`

- [ ] **Step 1: Escrever testes de `parseImport`**

Adicionar a `src/lib/export.test.ts`:

```ts
import { parseImport } from './export';

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
      events: [{ id: '1', type: 'tobacco' }], // no timestamp
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
```

- [ ] **Step 2: Rodar testes para confirmar falha**

```bash
npm run test:run -- src/lib/export.test.ts
```

Esperado: FAIL (`parseImport` undefined).

- [ ] **Step 3: Implementar `parseImport`**

Adicionar a `src/lib/export.ts`:

```ts
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
```

- [ ] **Step 4: Rodar testes para confirmar passagem**

```bash
npm run test:run -- src/lib/export.test.ts
```

Esperado: PASS (todos os 13 testes do arquivo).

- [ ] **Step 5: Commit**

```bash
git add src/lib/export.ts src/lib/export.test.ts
git commit -m "feat: add strict parseImport for backup files"
```

---

## Task 4: `mergeEvents` com dedupe por id

**Files:**
- Modify: `src/lib/export.ts`
- Modify: `src/lib/export.test.ts`

- [ ] **Step 1: Escrever testes de `mergeEvents`**

Adicionar a `src/lib/export.test.ts`:

```ts
import { mergeEvents } from './export';

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
    expect(a.location).toBe('casa'); // existing kept
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
```

- [ ] **Step 2: Rodar testes para confirmar falha**

```bash
npm run test:run -- src/lib/export.test.ts
```

Esperado: FAIL (`mergeEvents` undefined).

- [ ] **Step 3: Implementar `mergeEvents`**

Adicionar a `src/lib/export.ts`:

```ts
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
```

- [ ] **Step 4: Rodar testes para confirmar passagem**

```bash
npm run test:run -- src/lib/export.test.ts
```

Esperado: PASS (todos os testes).

- [ ] **Step 5: Commit**

```bash
git add src/lib/export.ts src/lib/export.test.ts
git commit -m "feat: add mergeEvents with id-based dedupe"
```

---

## Task 5: Helpers de mês em `events.ts`

**Files:**
- Modify: `src/lib/events.ts`
- Modify: `src/lib/events.test.ts`

- [ ] **Step 1: Escrever testes de `getEarliestEventMonth` e `getMonthKey`**

Adicionar ao final de `src/lib/events.test.ts`:

```ts
import { getEarliestEventMonth, getMonthKey } from './events';

describe('getMonthKey', () => {
  it('returns YYYY-MM for a date', () => {
    expect(getMonthKey(new Date(2026, 3, 8))).toBe('2026-04');
    expect(getMonthKey(new Date(2026, 0, 1))).toBe('2026-01');
    expect(getMonthKey(new Date(2026, 11, 31))).toBe('2026-12');
  });
});

describe('getEarliestEventMonth', () => {
  it('returns null when events is empty', () => {
    expect(getEarliestEventMonth([])).toBeNull();
  });

  it('returns startOfMonth of the only event', () => {
    const events: TrackerEvent[] = [
      { id: '1', timestamp: '2026-04-08T12:00:00-03:00', type: 'tobacco' },
    ];
    const result = getEarliestEventMonth(events);
    expect(result).not.toBeNull();
    expect(getMonthKey(result!)).toBe('2026-04');
    expect(result!.getDate()).toBe(1);
  });

  it('returns startOfMonth of the earliest event when multiple months', () => {
    const events: TrackerEvent[] = [
      { id: '1', timestamp: '2026-04-08T12:00:00-03:00', type: 'tobacco' },
      { id: '2', timestamp: '2026-02-15T10:00:00-03:00', type: 'cannabis' },
      { id: '3', timestamp: '2026-03-20T08:00:00-03:00', type: 'tobacco' },
    ];
    const result = getEarliestEventMonth(events);
    expect(getMonthKey(result!)).toBe('2026-02');
    expect(result!.getDate()).toBe(1);
  });
});
```

- [ ] **Step 2: Rodar testes para confirmar falha**

```bash
npm run test:run -- src/lib/events.test.ts
```

Esperado: FAIL (helpers undefined).

- [ ] **Step 3: Implementar os helpers em `src/lib/events.ts`**

Adicionar ao topo o import necessário:

```ts
import { eachDayOfInterval, format, parseISO, startOfMonth } from 'date-fns';
```

(`parseISO` e `startOfMonth` são novos; `eachDayOfInterval` e `format` já estão.)

Adicionar ao final do arquivo:

```ts
export function getMonthKey(date: Date): string {
  return format(date, 'yyyy-MM');
}

export function getEarliestEventMonth(events: TrackerEvent[]): Date | null {
  if (events.length === 0) return null;
  // Eventos são mantidos ordenados ascendente pelo hook, mas para robustez
  // calculamos o mínimo explicitamente.
  let earliestTs = events[0].timestamp;
  for (const e of events) {
    if (e.timestamp < earliestTs) earliestTs = e.timestamp;
  }
  // Parse via dayKey + meio-dia local — evita ambiguidade de fuso na conversão.
  const dayKey = getDayKey(earliestTs);
  return startOfMonth(parseISO(dayKey + 'T12:00:00'));
}
```

- [ ] **Step 4: Rodar testes para confirmar passagem**

```bash
npm run test:run -- src/lib/events.test.ts
```

Esperado: PASS (todos os testes do arquivo, incluindo os novos).

- [ ] **Step 5: Commit**

```bash
git add src/lib/events.ts src/lib/events.test.ts
git commit -m "feat: add getEarliestEventMonth and getMonthKey helpers"
```

---

## Task 6: `exportEvents` e `importEvents` no `useTracker`

**Files:**
- Modify: `src/hooks/useTracker.ts`
- Modify: `src/hooks/useTracker.test.ts`

- [ ] **Step 1: Escrever testes de export/import**

Adicionar ao final de `src/hooks/useTracker.test.ts`:

```ts
describe('useTracker — export/import', () => {
  it('exportEvents returns JSON that round-trips into the same events', () => {
    const seed: TrackerEvent[] = [
      { id: 'a', timestamp: '2026-04-08T10:00:00-03:00', type: 'tobacco', location: 'casa' },
      { id: 'b', timestamp: '2026-04-08T18:00:00-03:00', type: 'cannabis' },
    ];
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ events: seed }));
    const { result } = renderHook(() => useTracker());

    const json = result.current.exportEvents();
    const parsed = JSON.parse(json);
    expect(parsed.version).toBe(1);
    expect(parsed.events).toEqual(seed);
  });

  it('importEvents merges new events into the existing state', () => {
    const seed: TrackerEvent[] = [
      { id: 'a', timestamp: '2026-04-08T10:00:00-03:00', type: 'tobacco' },
    ];
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ events: seed }));
    const { result } = renderHook(() => useTracker());

    const incoming: TrackerEvent[] = [
      { id: 'b', timestamp: '2026-04-08T11:00:00-03:00', type: 'cannabis' },
    ];
    const file = {
      version: 1,
      exportedAt: '2026-04-08T20:00:00-03:00',
      eventCount: 1,
      dateRange: { from: '2026-04-08', to: '2026-04-08' },
      events: incoming,
    };

    let outcome: ReturnType<typeof result.current.importEvents>;
    act(() => {
      outcome = result.current.importEvents(JSON.stringify(file));
    });

    expect(outcome!).toEqual({ ok: true, added: 1, skipped: 0 });
    expect(result.current.events.map((e) => e.id)).toEqual(['a', 'b']);
  });

  it('importEvents reports skipped duplicates without changing state', () => {
    const seed: TrackerEvent[] = [
      { id: 'a', timestamp: '2026-04-08T10:00:00-03:00', type: 'tobacco' },
    ];
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ events: seed }));
    const { result } = renderHook(() => useTracker());

    const file = {
      version: 1,
      exportedAt: '2026-04-08T20:00:00-03:00',
      eventCount: 1,
      dateRange: { from: '2026-04-08', to: '2026-04-08' },
      events: seed,
    };

    let outcome: ReturnType<typeof result.current.importEvents>;
    act(() => {
      outcome = result.current.importEvents(JSON.stringify(file));
    });

    expect(outcome!).toEqual({ ok: true, added: 0, skipped: 1 });
    expect(result.current.events).toEqual(seed);
  });

  it('importEvents returns error and leaves state untouched on invalid JSON', () => {
    const seed: TrackerEvent[] = [
      { id: 'a', timestamp: '2026-04-08T10:00:00-03:00', type: 'tobacco' },
    ];
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ events: seed }));
    const { result } = renderHook(() => useTracker());

    let outcome: ReturnType<typeof result.current.importEvents>;
    act(() => {
      outcome = result.current.importEvents('not json');
    });

    expect(outcome!).toEqual({ ok: false, error: 'invalid-json' });
    expect(result.current.events).toEqual(seed);
  });
});
```

- [ ] **Step 2: Rodar testes para confirmar falha**

```bash
npm run test:run -- src/hooks/useTracker.test.ts
```

Esperado: FAIL (`exportEvents`/`importEvents` undefined).

- [ ] **Step 3: Estender `useTracker` com os dois métodos**

Editar `src/hooks/useTracker.ts`. Imports — adicionar:

```ts
import {
  ImportError,
  mergeEvents,
  parseImport,
  serializeExport,
} from '@/lib/export';
```

Adicionar ao bloco de tipos exportados (logo abaixo do `export interface UseTrackerAPI`):

```ts
export type ImportOutcome =
  | { ok: true; added: number; skipped: number }
  | { ok: false; error: ImportError };
```

Estender `UseTrackerAPI` com:

```ts
exportEvents(): string;
importEvents(raw: string): ImportOutcome;
```

Dentro de `useTracker()`, antes do `return`, adicionar:

```ts
const exportEvents = useCallback<UseTrackerAPI['exportEvents']>(
  () => serializeExport(events),
  [events]
);

const importEvents = useCallback<UseTrackerAPI['importEvents']>((raw) => {
  const parsed = parseImport(raw);
  if (!parsed.ok) {
    return { ok: false, error: parsed.error };
  }
  const { merged, added, skipped } = mergeEvents(events, parsed.events);
  setEvents(merged);
  return { ok: true, added, skipped };
}, [events]);
```

E adicionar ao objeto retornado:

```ts
return {
  events,
  addEvent,
  removeEvent,
  updateEvent,
  clearDay,
  getDayTotals,
  getEventsForDay,
  getTodayTotals,
  exportEvents,
  importEvents,
};
```

- [ ] **Step 4: Rodar testes para confirmar passagem**

```bash
npm run test:run -- src/hooks/useTracker.test.ts
```

Esperado: PASS (todos os testes).

- [ ] **Step 5: Rodar a suíte inteira pra confirmar que nada quebrou**

```bash
npm run test:run
```

Esperado: PASS para todos os arquivos.

- [ ] **Step 6: Commit**

```bash
git add src/hooks/useTracker.ts src/hooks/useTracker.test.ts
git commit -m "feat: add exportEvents and importEvents to useTracker"
```

---

## Task 7: Navegação de mês no `CalendarView`

**Files:**
- Modify: `src/components/CalendarView.tsx`

> Sem testes automatizados — componente é validado manualmente. A lógica de limites já foi testada via `getEarliestEventMonth`/`getMonthKey`.

- [ ] **Step 1: Adicionar prop `events`, estado `viewMonth`, e helpers de navegação**

Substituir o conteúdo de `src/components/CalendarView.tsx` por:

```tsx
import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Cigarette, Leaf, ChevronLeft, ChevronRight } from 'lucide-react';
import {
  format,
  parseISO,
  startOfMonth,
  endOfMonth,
  subDays,
  addMonths,
  subMonths,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MonthlyChart } from './MonthlyChart';
import {
  getDaysInRange,
  getEarliestEventMonth,
  getMonthKey,
  todayKey,
} from '@/lib/events';
import { DayTotals, TrackerEvent } from '@/types';

interface CalendarViewProps {
  getDayTotals: (dayKey: string) => DayTotals;
  onDayClick: (dayKey: string) => void;
  events: TrackerEvent[];
}

export const CalendarView = ({ getDayTotals, onDayClick, events }: CalendarViewProps) => {
  const today = new Date();
  const [viewMonth, setViewMonth] = useState<Date>(() => startOfMonth(new Date()));

  const earliest = useMemo(() => getEarliestEventMonth(events), [events]);
  const currentMonthKey = getMonthKey(today);
  const viewMonthKey = getMonthKey(viewMonth);

  const canGoBack = earliest !== null && viewMonth > earliest;
  const canGoForward = viewMonthKey !== currentMonthKey;

  const goBack = () => {
    if (canGoBack) setViewMonth((m) => subMonths(m, 1));
  };
  const goForward = () => {
    if (canGoForward) setViewMonth((m) => addMonths(m, 1));
  };

  const weekDays = getDaysInRange(subDays(today, 6), today);
  const monthDays = getDaysInRange(startOfMonth(viewMonth), endOfMonth(viewMonth));
  const todayStr = todayKey();

  const monthLabel = format(viewMonth, 'MMMM yyyy', { locale: ptBR });

  const DayCell = ({ dayKey }: { dayKey: string }) => {
    const totals = getDayTotals(dayKey);
    const total = totals.tobacco + totals.cannabis;
    const isToday = dayKey === todayStr;
    const date = parseISO(dayKey + 'T00:00:00');

    return (
      <div
        onClick={() => onDayClick(dayKey)}
        className={`
          flex flex-col items-center gap-2 p-3 rounded-2xl transition-all cursor-pointer hover:scale-105 active:scale-95
          ${isToday ? 'bg-accent ring-2 ring-primary' : 'bg-card'}
          ${total > 0 ? 'opacity-100' : 'opacity-40'}
        `}
      >
        <div className="text-xs font-medium text-muted-foreground">
          {format(date, 'dd MMM')}
        </div>
        <div className="flex gap-2 items-center">
          {totals.tobacco > 0 && (
            <div className="flex items-center gap-1">
              <Cigarette className="w-4 h-4 text-foreground" />
              <span className="text-sm font-semibold text-foreground">{totals.tobacco}</span>
            </div>
          )}
          {totals.cannabis > 0 && (
            <div className="flex items-center gap-1">
              <Leaf className="w-4 h-4 text-foreground" />
              <span className="text-sm font-semibold text-foreground">{totals.cannabis}</span>
            </div>
          )}
        </div>
        {total === 0 && <span className="text-xs text-muted-foreground">—</span>}
      </div>
    );
  };

  return (
    <Card className="p-6 sm:p-8" style={{ boxShadow: 'var(--shadow-soft)' }}>
      <Tabs defaultValue="week" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6">
          <TabsTrigger value="week" className="rounded-xl">Semana</TabsTrigger>
          <TabsTrigger value="month" className="rounded-xl">Mês</TabsTrigger>
        </TabsList>

        <TabsContent value="week" className="mt-0">
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
            {weekDays.map((d) => (
              <DayCell key={d} dayKey={d} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="month" className="mt-0">
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={goBack}
              disabled={!canGoBack}
              aria-label="Mês anterior"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <span className="text-sm font-medium capitalize">{monthLabel}</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={goForward}
              disabled={!canGoForward}
              aria-label="Próximo mês"
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
          <MonthlyChart dayKeys={monthDays} getDayTotals={getDayTotals} onDayClick={onDayClick} />
        </TabsContent>
      </Tabs>
    </Card>
  );
};
```

- [ ] **Step 2: Pular build até a Task 9**

A nova prop `events` em `CalendarView` quebra o tipo do uso atual em `App.tsx` — esperado. Não rode `npm run build` agora; o erro será resolvido na Task 9 quando o `App.tsx` passar `events={tracker.events}`. Apenas confirme visualmente que o arquivo compila isolado (sem erros de sintaxe TypeScript no editor).

- [ ] **Step 3: Commit (parcial — funcionalidade só completa após Task 9)**

```bash
git add src/components/CalendarView.tsx
git commit -m "feat: add month navigation to CalendarView"
```

---

## Task 8: `SettingsDrawer` componente

**Files:**
- Create: `src/components/SettingsDrawer.tsx`

> Sem testes automatizados — componente é integração visual. A lógica de export/import já foi testada nos helpers e no hook.

- [ ] **Step 1: Criar `SettingsDrawer.tsx`**

Criar `src/components/SettingsDrawer.tsx`:

```tsx
import { useRef } from 'react';
import { toast } from 'sonner';
import { Download, Upload } from 'lucide-react';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { ImportOutcome } from '@/hooks/useTracker';
import { ImportError } from '@/lib/export';
import { todayKey } from '@/lib/events';

interface SettingsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExport: () => string;
  onImport: (raw: string) => ImportOutcome;
}

const IMPORT_ERROR_MESSAGES: Record<ImportError, string> = {
  'invalid-json': 'Arquivo não é um JSON válido',
  'invalid-shape': 'Arquivo não parece ser um backup do Smoking Tracker',
  'unsupported-version': 'Versão do arquivo não suportada',
  'invalid-events': 'Arquivo contém eventos inválidos',
};

export const SettingsDrawer = ({
  open,
  onOpenChange,
  onExport,
  onImport,
}: SettingsDrawerProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    const json = onExport();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `smoking-tracker-${todayKey()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Backup exportado');
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const raw = await file.text();
      const result = onImport(raw);
      if (result.ok) {
        toast.success(
          `Importados ${result.added} eventos (${result.skipped} duplicados ignorados)`
        );
      } else {
        toast.error(IMPORT_ERROR_MESSAGES[result.error]);
      }
    } finally {
      e.target.value = '';
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Configurações</DrawerTitle>
          <DrawerDescription>Backup e restauração dos seus eventos.</DrawerDescription>
        </DrawerHeader>
        <div className="px-4 pb-6 space-y-6">
          <section className="space-y-2">
            <h3 className="text-sm font-semibold">Exportar dados</h3>
            <p className="text-xs text-muted-foreground">
              Baixa um arquivo JSON com todos os seus eventos.
            </p>
            <Button onClick={handleExport} className="w-full">
              <Download className="w-4 h-4 mr-2" />
              Exportar JSON
            </Button>
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-semibold">Importar dados</h3>
            <p className="text-xs text-muted-foreground">
              Adiciona eventos de um backup. Duplicados (mesmo id) são ignorados.
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              onChange={handleFileChange}
              className="hidden"
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              variant="outline"
              className="w-full"
            >
              <Upload className="w-4 h-4 mr-2" />
              Escolher arquivo
            </Button>
          </section>
        </div>
      </DrawerContent>
    </Drawer>
  );
};
```

- [ ] **Step 2: Commit (sem build — `App.tsx` ainda precisa montar o componente)**

```bash
git add src/components/SettingsDrawer.tsx
git commit -m "feat: add SettingsDrawer with export/import actions"
```

---

## Task 9: Integração no `App.tsx`

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Adicionar import, estado, ícone no header, drawer e prop `events`**

Substituir o conteúdo de `src/App.tsx` por:

```tsx
import { useState } from 'react';
import { toast } from 'sonner';
import { Settings } from 'lucide-react';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { CounterCard } from '@/components/CounterCard';
import { CalendarView } from '@/components/CalendarView';
import { NewEventDrawer } from '@/components/NewEventDrawer';
import { EditDayDialog } from '@/components/EditDayDialog';
import { SettingsDrawer } from '@/components/SettingsDrawer';
import { useTracker } from '@/hooks/useTracker';
import { EventType } from '@/types';

const App = () => {
  const tracker = useTracker();
  const [drawerType, setDrawerType] = useState<EventType | null>(null);
  const [editingDay, setEditingDay] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const totals = tracker.getTodayTotals();

  const handleSubmitEvent = (input: { type: EventType; location?: string; reason?: string }) => {
    tracker.addEvent(input);
    toast.success(
      `+1 ${input.type === 'tobacco' ? 'tabaco' : 'cannabis'}`,
      { duration: 2000 }
    );
  };

  const dayEvents = editingDay ? tracker.getEventsForDay(editingDay) : [];

  return (
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <div className="min-h-screen bg-background">
        <div className="max-w-6xl mx-auto px-4 py-6 sm:px-6 sm:py-8">
          <header className="relative text-center mb-8">
            <h1 className="text-4xl sm:text-5xl font-bold text-foreground mb-2">
              Smoking Tracker
            </h1>
            <p className="text-muted-foreground">do but don't forget</p>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSettingsOpen(true)}
              aria-label="Configurações"
              className="absolute top-0 right-0"
            >
              <Settings className="w-5 h-5" />
            </Button>
          </header>

          <div className="grid grid-cols-2 gap-4 sm:gap-6 mb-8">
            <CounterCard
              type="tobacco"
              count={totals.tobacco}
              onTap={() => setDrawerType('tobacco')}
            />
            <CounterCard
              type="cannabis"
              count={totals.cannabis}
              onTap={() => setDrawerType('cannabis')}
            />
          </div>

          <CalendarView
            getDayTotals={tracker.getDayTotals}
            onDayClick={(dayKey) => setEditingDay(dayKey)}
            events={tracker.events}
          />
        </div>

        <NewEventDrawer
          open={drawerType !== null}
          onOpenChange={(open) => !open && setDrawerType(null)}
          type={drawerType}
          onSubmit={handleSubmitEvent}
        />

        <EditDayDialog
          open={editingDay !== null}
          onOpenChange={(open) => !open && setEditingDay(null)}
          dayKey={editingDay}
          events={dayEvents}
          onRemoveEvent={tracker.removeEvent}
          onClearDay={tracker.clearDay}
        />

        <SettingsDrawer
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          onExport={tracker.exportEvents}
          onImport={tracker.importEvents}
        />
      </div>
    </TooltipProvider>
  );
};

export default App;
```

- [ ] **Step 2: Rodar build pra confirmar tipos**

```bash
npm run build
```

Esperado: PASS sem warnings novos.

- [ ] **Step 3: Rodar suíte completa**

```bash
npm run test:run
```

Esperado: PASS em todos os arquivos.

- [ ] **Step 4: Smoke test manual no navegador**

```bash
npm run dev
```

Validar:
- Engrenagem aparece no canto superior direito do header.
- Clicar abre o `SettingsDrawer`.
- "Exportar JSON" baixa `smoking-tracker-YYYY-MM-DD.json` legível.
- Importar o próprio arquivo recém-baixado mostra toast `(N duplicados ignorados)`.
- Importar um JSON inválido (`echo 'oi' > /tmp/x.json`) mostra toast `Arquivo não é um JSON válido`.
- Aba Mês mostra `‹ Abril 2026 ›`.
- Adicionar pelo menos um evento de tabaco/cannabis fora do mês atual via console (`localStorage`) ou simular: navegar para um mês passado funciona; a seta direita reabilita; clicar num dia passado abre o `EditDayDialog`.
- Seta esquerda fica desabilitada quando você atinge o mês do evento mais antigo.
- Aba Semana continua sem setas.

> Se algum passo do smoke test falhar, pare e investigue antes de commitar. Não force o commit.

- [ ] **Step 5: Commit final**

```bash
git add src/App.tsx
git commit -m "feat: wire SettingsDrawer and month navigation in App"
```

---

## Verificação final

- [ ] **Step 1: Rodar tudo uma última vez**

```bash
npm run test:run && npm run build
```

Esperado: ambos PASS.

- [ ] **Step 2: Conferir o git log**

```bash
git log --oneline | head -15
```

Devem aparecer ~9 commits novos da feature, na ordem das tasks.

---

## Critérios de aceitação (eco da spec)

1. ✅ Engrenagem no header abre `SettingsDrawer` (Task 9)
2. ✅ "Exportar JSON" baixa `smoking-tracker-YYYY-MM-DD.json` com schema correto (Task 1, 2, 8)
3. ✅ Importar arquivo válido com eventos novos os adiciona, persiste, mostra toast (Task 4, 6, 8)
4. ✅ Importar arquivo só com duplicados não muda estado, mostra `skipped` (Task 4, 6, 8)
5. ✅ Importar arquivo inválido rejeita com toast específico por tipo de erro (Task 3, 8)
6. ✅ Re-selecionar o mesmo arquivo funciona sem reload (Task 8 — `e.target.value = ''`)
7. ✅ Aba Mês mostra `‹ Abril 2026 ›` em pt-BR (Task 7)
8. ✅ Setas navegam mês anterior/próximo (Task 7)
9. ✅ Seta direita desabilita no mês atual (Task 7)
10. ✅ Seta esquerda desabilita no mês do evento mais antigo / sem eventos (Task 5, 7)
11. ✅ Clicar em dia de mês passado abre `EditDayDialog` (Task 7 — sem mudanças no Dialog)
12. ✅ Aba Semana continua sem navegação (Task 7)
13. ✅ `npm run test:run` passa (Tasks 1–6)
14. ✅ `npm run build` passa (Task 9)
