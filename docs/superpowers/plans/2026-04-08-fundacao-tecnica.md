# Fundação Técnica — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor `smoking-tracker` from aggregated day totals to an event-based schema, extracting all logic into a tested `useTracker` hook, replacing the tap-to-increment interaction with a bottom-drawer form, standardizing the project name across all files, and removing unused shadcn/radix dependencies.

**Architecture:** Single React SPA. Domain lives in `src/types.ts` + `src/lib/events.ts` (pure helpers) + `src/hooks/useTracker.ts` (stateful React hook). Components consume the hook via `App.tsx`, which is a thin shell hosting the bottom drawer and day-edit dialog. Timestamps are ISO strings with local offset — no UTC conversion, no timezone library.

**Tech Stack:** React 18 · Vite · TypeScript · TailwindCSS · shadcn/ui (trimmed) · vaul (drawer) · date-fns · uuid · Vitest · React Testing Library

**Spec:** [docs/superpowers/specs/2026-04-08-fundacao-tecnica-design.md](../specs/2026-04-08-fundacao-tecnica-design.md)

---

## File Map

**New files:**
- `src/types.ts` — shared domain types
- `src/lib/events.ts` — pure helpers (day key, totals, ranges, local ISO)
- `src/lib/events.test.ts`
- `src/hooks/useTracker.ts` — single source of truth
- `src/hooks/useTracker.test.ts`
- `src/components/NewEventDrawer.tsx` — bottom drawer for creating events
- `src/components/EditDayDialog.tsx` — extracted from App.tsx, now lists events
- `src/test-setup.ts` — RTL / jest-dom bootstrap
- `vitest.config.ts`

**Modified:**
- `package.json` — name, scripts, deps cleanup, add vitest/uuid
- `index.html` — title + og:title
- `README.md` — project name
- `src/App.tsx` — shell using useTracker
- `src/components/CounterCard.tsx` — simpler, delegates tap to parent
- `src/components/CalendarView.tsx` — consumes hook queries
- `src/components/MonthlyChart.tsx` — consumes hook queries, YAxis auto-scale, field rename

**Deleted:**
- `src/lib/date-utils.ts`
- `src/components/ui/{accordion,alert,alert-dialog,aspect-ratio,avatar,badge,breadcrumb,calendar,carousel,chart,checkbox,collapsible,command,context-menu,dropdown-menu,form,hover-card,input-otp,menubar,navigation-menu,pagination,popover,progress,radio-group,resizable,scroll-area,select,separator,sheet,sidebar,skeleton,slider,switch,table,textarea,toggle,toggle-group}.tsx`

---

## Task 1: Standardize project name

**Files:**
- Modify: `package.json:2`
- Modify: `README.md:1-20`
- Modify: `index.html:7-8`
- Modify: `src/App.tsx:116-118`

- [ ] **Step 1: Update `package.json` name**

Change line 2 from `"name": "vite_react_shadcn_ts"` to `"name": "smoking-tracker"`.

- [ ] **Step 2: Update `README.md`**

Replace the entire file with the content below. It uses real markdown code fences (three backticks) — the escaped form here is only because this plan document is itself a markdown file.

Content:

1. `# Smoking Tracker` (h1)
2. Blank line
3. `Um contador simples para monitorar consumo diário de tabaco e cannabis, com contexto de local e motivo.`
4. Blank line
5. `## Como usar`
6. Blank line
7. `O projeto é compilado em um único arquivo HTML (\`dist/index.html\`) que contém tudo o que é necessário para rodar a aplicação.`
8. Blank line
9. `Você pode abrir o arquivo \`dist/index.html\` diretamente no seu navegador.`
10. Blank line
11. `## Build com Docker`
12. Blank line
13. `Para gerar o arquivo \`dist/index.html\` usando Docker (sem precisar instalar Node.js na sua máquina), execute:`
14. Blank line
15. A bash code fence containing: `docker build --output type=local,dest=dist .`
16. Blank line
17. `Este comando irá criar (ou sobrescrever) a pasta \`dist\` no diretório atual com a versão mais recente do app.`
18. Blank line
19. `## Desenvolvimento`
20. Blank line
21. A bash code fence containing the lines:
    - `npm install`
    - `npm run dev        # servidor de desenvolvimento`
    - `npm test           # testes em modo watch`
    - `npm run test:run   # testes uma única vez`
    - `npm run build      # build de produção`

- [ ] **Step 3: Update `index.html`**

Replace the `<title>` and `og:title` meta lines:

```html
<title>Smoking Tracker</title>
<meta property="og:title" content="Smoking Tracker" />
```

- [ ] **Step 4: Update `src/App.tsx` header h1**

Find the block at lines 114-119 and change the title text:

```tsx
<header className="text-center mb-8">
  <h1 className="text-4xl sm:text-5xl font-bold text-foreground mb-2">
    Smoking Tracker
  </h1>
  <p className="text-muted-foreground">do but don't forget</p>
</header>
```

- [ ] **Step 5: Verify no stray old names remain**

Run:

```bash
grep -rniE "smoke[- _]?leaf|Puff Tracker|puff-tracker|vite_react_shadcn" \
  --include="*.ts" --include="*.tsx" --include="*.json" \
  --include="*.html" --include="*.md" --include="Dockerfile" \
  --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=dist \
  --exclude-dir=docs .
```

Expected: zero output. (The `docs/` dir is excluded because the spec naturally references old names in its history.)

- [ ] **Step 6: Commit**

```bash
git add package.json README.md index.html src/App.tsx
git commit -m "Standardize project name to smoking-tracker"
```

---

## Task 2: Test infrastructure

**Files:**
- Create: `vitest.config.ts`
- Create: `src/test-setup.ts`
- Modify: `package.json` (scripts + dev deps)

- [ ] **Step 1: Install test dependencies**

```bash
npm install --save-dev vitest @testing-library/react @testing-library/jest-dom jsdom @types/uuid
npm install uuid
```

- [ ] **Step 2: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
  },
});
```

- [ ] **Step 3: Create `src/test-setup.ts`**

```ts
import '@testing-library/jest-dom';
import { afterEach, beforeEach } from 'vitest';
import { cleanup } from '@testing-library/react';

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  cleanup();
});
```

- [ ] **Step 4: Add test scripts to `package.json`**

Add these keys under `"scripts"`:

```json
"test": "vitest",
"test:run": "vitest run"
```

- [ ] **Step 5: Create placeholder test to verify wiring**

Create `src/test-setup.test.ts`:

```ts
import { describe, it, expect } from 'vitest';

describe('test infrastructure', () => {
  it('runs vitest', () => {
    expect(true).toBe(true);
  });

  it('has access to localStorage in jsdom', () => {
    localStorage.setItem('foo', 'bar');
    expect(localStorage.getItem('foo')).toBe('bar');
  });
});
```

- [ ] **Step 6: Run tests to verify infra works**

```bash
npm run test:run
```

Expected: both tests PASS.

- [ ] **Step 7: Delete placeholder**

```bash
rm src/test-setup.test.ts
```

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json vitest.config.ts src/test-setup.ts
git commit -m "Set up vitest + React Testing Library"
```

---

## Task 3: Shared domain types

**Files:**
- Create: `src/types.ts`

- [ ] **Step 1: Create `src/types.ts`**

```ts
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
```

- [ ] **Step 2: Commit**

```bash
git add src/types.ts
git commit -m "Add shared domain types"
```

---

## Task 4: Pure event helpers with TDD

**Files:**
- Create: `src/lib/events.ts`
- Create: `src/lib/events.test.ts`

- [ ] **Step 1: Write failing test for `getDayKey`**

Create `src/lib/events.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getDayKey,
  nowLocalIso,
  todayKey,
  getEventsForDay,
  getDayTotals,
  getDaysInRange,
} from './events';
import { TrackerEvent } from '@/types';

describe('getDayKey', () => {
  it('extracts local date from ISO with negative offset', () => {
    expect(getDayKey('2026-04-08T14:30:00-03:00')).toBe('2026-04-08');
  });

  it('preserves local date close to midnight', () => {
    expect(getDayKey('2026-04-08T23:59:59-03:00')).toBe('2026-04-08');
    expect(getDayKey('2026-04-08T00:00:01-03:00')).toBe('2026-04-08');
  });

  it('handles positive offsets', () => {
    expect(getDayKey('2026-04-08T10:00:00+02:00')).toBe('2026-04-08');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test:run -- src/lib/events.test.ts
```

Expected: FAIL with `Cannot find module './events'` or similar.

- [ ] **Step 3: Create minimal `src/lib/events.ts` with `getDayKey`**

```ts
import { eachDayOfInterval, format } from 'date-fns';
import { TrackerEvent, DayTotals } from '@/types';

/** Extract local date (YYYY-MM-DD) from an ISO timestamp with offset. */
export function getDayKey(timestamp: string): string {
  return timestamp.slice(0, 10);
}

export function nowLocalIso(): string {
  throw new Error('not implemented');
}

export function todayKey(): string {
  throw new Error('not implemented');
}

export function getEventsForDay(_events: TrackerEvent[], _dayKey: string): TrackerEvent[] {
  throw new Error('not implemented');
}

export function getDayTotals(_events: TrackerEvent[], _dayKey: string): DayTotals {
  throw new Error('not implemented');
}

export function getDaysInRange(_from: Date, _to: Date): string[] {
  throw new Error('not implemented');
}
```

- [ ] **Step 4: Run `getDayKey` tests to verify they pass**

```bash
npm run test:run -- src/lib/events.test.ts -t "getDayKey"
```

Expected: 3 PASS.

- [ ] **Step 5: Write failing tests for `nowLocalIso`**

Append to `src/lib/events.test.ts`:

```ts
describe('nowLocalIso', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns a parseable ISO string ending in a timezone offset', () => {
    vi.setSystemTime(new Date('2026-04-08T14:30:00Z'));
    const iso = nowLocalIso();
    // Must match "YYYY-MM-DDTHH:mm:ss±HH:MM"
    expect(iso).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{2}:\d{2}$/);
    // Must be round-trippable via Date parsing
    expect(new Date(iso).toISOString()).toBe('2026-04-08T14:30:00.000Z');
  });
});
```

- [ ] **Step 6: Run tests to verify `nowLocalIso` fails**

```bash
npm run test:run -- src/lib/events.test.ts -t "nowLocalIso"
```

Expected: FAIL with "not implemented".

- [ ] **Step 7: Implement `nowLocalIso`**

Replace the stub in `src/lib/events.ts`:

```ts
export function nowLocalIso(): string {
  const now = new Date();
  const offsetMin = -now.getTimezoneOffset(); // positive = ahead of UTC
  const sign = offsetMin >= 0 ? '+' : '-';
  const abs = Math.abs(offsetMin);
  const oh = String(Math.floor(abs / 60)).padStart(2, '0');
  const om = String(abs % 60).padStart(2, '0');
  const local = format(now, "yyyy-MM-dd'T'HH:mm:ss");
  return `${local}${sign}${oh}:${om}`;
}
```

- [ ] **Step 8: Run tests to verify `nowLocalIso` passes**

```bash
npm run test:run -- src/lib/events.test.ts -t "nowLocalIso"
```

Expected: PASS.

- [ ] **Step 9: Write failing test for `todayKey`**

Append to `src/lib/events.test.ts`:

```ts
describe('todayKey', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns YYYY-MM-DD of the current local date', () => {
    vi.setSystemTime(new Date('2026-04-08T14:30:00Z'));
    expect(todayKey()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
```

- [ ] **Step 10: Implement `todayKey`**

```ts
export function todayKey(): string {
  return getDayKey(nowLocalIso());
}
```

- [ ] **Step 11: Run test**

```bash
npm run test:run -- src/lib/events.test.ts -t "todayKey"
```

Expected: PASS.

- [ ] **Step 12: Write failing tests for `getEventsForDay`**

Append to `src/lib/events.test.ts`:

```ts
const mkEvent = (overrides: Partial<TrackerEvent>): TrackerEvent => ({
  id: overrides.id ?? 'id-' + Math.random(),
  timestamp: overrides.timestamp ?? '2026-04-08T12:00:00-03:00',
  type: overrides.type ?? 'tobacco',
  location: overrides.location,
  reason: overrides.reason,
});

describe('getEventsForDay', () => {
  it('returns only events matching the dayKey', () => {
    const events: TrackerEvent[] = [
      mkEvent({ id: '1', timestamp: '2026-04-07T23:00:00-03:00' }),
      mkEvent({ id: '2', timestamp: '2026-04-08T08:00:00-03:00' }),
      mkEvent({ id: '3', timestamp: '2026-04-08T20:00:00-03:00' }),
      mkEvent({ id: '4', timestamp: '2026-04-09T01:00:00-03:00' }),
    ];
    const result = getEventsForDay(events, '2026-04-08');
    expect(result.map((e) => e.id)).toEqual(['2', '3']);
  });

  it('returns empty array when no events match', () => {
    expect(getEventsForDay([], '2026-04-08')).toEqual([]);
  });
});
```

- [ ] **Step 13: Implement `getEventsForDay`**

```ts
export function getEventsForDay(events: TrackerEvent[], dayKey: string): TrackerEvent[] {
  return events.filter((e) => getDayKey(e.timestamp) === dayKey);
}
```

- [ ] **Step 14: Run test**

```bash
npm run test:run -- src/lib/events.test.ts -t "getEventsForDay"
```

Expected: PASS.

- [ ] **Step 15: Write failing tests for `getDayTotals`**

Append to `src/lib/events.test.ts`:

```ts
describe('getDayTotals', () => {
  it('counts events by type for the given day', () => {
    const events: TrackerEvent[] = [
      mkEvent({ id: '1', timestamp: '2026-04-08T08:00:00-03:00', type: 'tobacco' }),
      mkEvent({ id: '2', timestamp: '2026-04-08T10:00:00-03:00', type: 'tobacco' }),
      mkEvent({ id: '3', timestamp: '2026-04-08T20:00:00-03:00', type: 'cannabis' }),
      mkEvent({ id: '4', timestamp: '2026-04-07T20:00:00-03:00', type: 'cannabis' }),
    ];
    expect(getDayTotals(events, '2026-04-08')).toEqual({ tobacco: 2, cannabis: 1 });
  });

  it('returns zeroes for a day with no events', () => {
    expect(getDayTotals([], '2026-04-08')).toEqual({ tobacco: 0, cannabis: 0 });
  });
});
```

- [ ] **Step 16: Implement `getDayTotals`**

```ts
export function getDayTotals(events: TrackerEvent[], dayKey: string): DayTotals {
  const day = getEventsForDay(events, dayKey);
  return {
    tobacco: day.filter((e) => e.type === 'tobacco').length,
    cannabis: day.filter((e) => e.type === 'cannabis').length,
  };
}
```

- [ ] **Step 17: Run test**

```bash
npm run test:run -- src/lib/events.test.ts -t "getDayTotals"
```

Expected: PASS.

- [ ] **Step 18: Write failing tests for `getDaysInRange`**

Append to `src/lib/events.test.ts`:

```ts
describe('getDaysInRange', () => {
  it('returns inclusive YYYY-MM-DD range ascending', () => {
    const result = getDaysInRange(
      new Date(2026, 3, 5), // April 5 (month is 0-indexed)
      new Date(2026, 3, 8)
    );
    expect(result).toEqual(['2026-04-05', '2026-04-06', '2026-04-07', '2026-04-08']);
  });

  it('returns a single entry when from === to', () => {
    const d = new Date(2026, 3, 8);
    expect(getDaysInRange(d, d)).toEqual(['2026-04-08']);
  });
});
```

- [ ] **Step 19: Implement `getDaysInRange`**

```ts
export function getDaysInRange(from: Date, to: Date): string[] {
  return eachDayOfInterval({ start: from, end: to }).map((d) =>
    format(d, 'yyyy-MM-dd')
  );
}
```

- [ ] **Step 20: Run all events tests**

```bash
npm run test:run -- src/lib/events.test.ts
```

Expected: all tests PASS.

- [ ] **Step 21: Commit**

```bash
git add src/lib/events.ts src/lib/events.test.ts
git commit -m "Add event helpers with local wall-clock semantics"
```

---

## Task 5: `useTracker` hook with TDD

**Files:**
- Create: `src/hooks/useTracker.ts`
- Create: `src/hooks/useTracker.test.ts`

- [ ] **Step 1: Write failing boot tests**

Create `src/hooks/useTracker.test.ts`:

```ts
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTracker } from './useTracker';
import { TrackerEvent } from '@/types';

const STORAGE_KEY = 'smoking-tracker';

describe('useTracker — boot', () => {
  it('starts with empty events when storage is empty', () => {
    const { result } = renderHook(() => useTracker());
    expect(result.current.events).toEqual([]);
  });

  it('loads events from storage', () => {
    const events: TrackerEvent[] = [
      { id: '1', timestamp: '2026-04-08T12:00:00-03:00', type: 'tobacco' },
    ];
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ events }));
    const { result } = renderHook(() => useTracker());
    expect(result.current.events).toEqual(events);
  });

  it('discards legacy aggregated shape silently', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ '2026-04-07': { date: '2026-04-07', cigarette: 3, leaf: 2 } })
    );
    const { result } = renderHook(() => useTracker());
    expect(result.current.events).toEqual([]);
  });

  it('discards garbage silently', () => {
    localStorage.setItem(STORAGE_KEY, 'not json');
    const { result } = renderHook(() => useTracker());
    expect(result.current.events).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test, verify it fails**

```bash
npm run test:run -- src/hooks/useTracker.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create minimal `src/hooks/useTracker.ts`**

```ts
import { useCallback, useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { EventType, TrackerEvent, DayTotals } from '@/types';
import {
  getDayKey,
  getDayTotals as calcDayTotals,
  getEventsForDay as calcEventsForDay,
  nowLocalIso,
  todayKey,
} from '@/lib/events';

const STORAGE_KEY = 'smoking-tracker';

export interface UseTrackerAPI {
  events: TrackerEvent[];
  addEvent(input: { type: EventType; location?: string; reason?: string }): void;
  removeEvent(id: string): void;
  updateEvent(id: string, patch: Partial<Omit<TrackerEvent, 'id'>>): void;
  clearDay(dayKey: string): void;
  getDayTotals(dayKey: string): DayTotals;
  getEventsForDay(dayKey: string): TrackerEvent[];
  getTodayTotals(): DayTotals;
}

function loadFromStorage(): TrackerEvent[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.events)) {
      return parsed.events as TrackerEvent[];
    }
    return [];
  } catch {
    return [];
  }
}

export function useTracker(): UseTrackerAPI {
  const [events, setEvents] = useState<TrackerEvent[]>(() => loadFromStorage());

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ events }));
  }, [events]);

  const addEvent = useCallback<UseTrackerAPI['addEvent']>((input) => {
    const event: TrackerEvent = {
      id: uuidv4(),
      timestamp: nowLocalIso(),
      type: input.type,
      location: input.location?.trim() ? input.location.trim() : undefined,
      reason: input.reason?.trim() ? input.reason.trim() : undefined,
    };
    setEvents((prev) => [...prev, event]);
  }, []);

  const removeEvent = useCallback<UseTrackerAPI['removeEvent']>((id) => {
    setEvents((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const updateEvent = useCallback<UseTrackerAPI['updateEvent']>((id, patch) => {
    setEvents((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  }, []);

  const clearDay = useCallback<UseTrackerAPI['clearDay']>((dayKey) => {
    setEvents((prev) => prev.filter((e) => getDayKey(e.timestamp) !== dayKey));
  }, []);

  const getDayTotals = useCallback<UseTrackerAPI['getDayTotals']>(
    (dayKey) => calcDayTotals(events, dayKey),
    [events]
  );

  const getEventsForDay = useCallback<UseTrackerAPI['getEventsForDay']>(
    (dayKey) => calcEventsForDay(events, dayKey),
    [events]
  );

  const getTodayTotals = useCallback<UseTrackerAPI['getTodayTotals']>(
    () => calcDayTotals(events, todayKey()),
    [events]
  );

  return {
    events,
    addEvent,
    removeEvent,
    updateEvent,
    clearDay,
    getDayTotals,
    getEventsForDay,
    getTodayTotals,
  };
}
```

- [ ] **Step 4: Run boot tests**

```bash
npm run test:run -- src/hooks/useTracker.test.ts -t "boot"
```

Expected: 4 PASS.

- [ ] **Step 5: Write failing tests for mutations**

Append to `src/hooks/useTracker.test.ts`:

```ts
describe('useTracker — addEvent', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-08T14:30:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('adds an event with generated id and timestamp', () => {
    const { result } = renderHook(() => useTracker());
    act(() => {
      result.current.addEvent({ type: 'tobacco' });
    });
    expect(result.current.events).toHaveLength(1);
    const e = result.current.events[0];
    expect(e.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(e.type).toBe('tobacco');
    expect(e.timestamp).toMatch(/^2026-04-08T/);
  });

  it('persists the event to localStorage', () => {
    const { result } = renderHook(() => useTracker());
    act(() => {
      result.current.addEvent({ type: 'cannabis', location: 'casa', reason: 'pós almoço' });
    });
    const raw = localStorage.getItem(STORAGE_KEY);
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw!);
    expect(parsed.events).toHaveLength(1);
    expect(parsed.events[0].location).toBe('casa');
    expect(parsed.events[0].reason).toBe('pós almoço');
  });

  it('normalizes empty-string location/reason to undefined', () => {
    const { result } = renderHook(() => useTracker());
    act(() => {
      result.current.addEvent({ type: 'tobacco', location: '   ', reason: '' });
    });
    const e = result.current.events[0];
    expect(e.location).toBeUndefined();
    expect(e.reason).toBeUndefined();
  });
});

describe('useTracker — removeEvent', () => {
  it('removes the matching event', () => {
    const seed: TrackerEvent[] = [
      { id: 'a', timestamp: '2026-04-08T10:00:00-03:00', type: 'tobacco' },
      { id: 'b', timestamp: '2026-04-08T11:00:00-03:00', type: 'cannabis' },
    ];
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ events: seed }));
    const { result } = renderHook(() => useTracker());
    act(() => {
      result.current.removeEvent('a');
    });
    expect(result.current.events.map((e) => e.id)).toEqual(['b']);
  });
});

describe('useTracker — updateEvent', () => {
  it('applies a partial patch', () => {
    const seed: TrackerEvent[] = [
      { id: 'a', timestamp: '2026-04-08T10:00:00-03:00', type: 'tobacco' },
    ];
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ events: seed }));
    const { result } = renderHook(() => useTracker());
    act(() => {
      result.current.updateEvent('a', { reason: 'primeiro do dia' });
    });
    expect(result.current.events[0].reason).toBe('primeiro do dia');
    expect(result.current.events[0].type).toBe('tobacco');
  });
});

describe('useTracker — clearDay', () => {
  it('removes only events belonging to the given day', () => {
    const seed: TrackerEvent[] = [
      { id: '1', timestamp: '2026-04-07T22:00:00-03:00', type: 'tobacco' },
      { id: '2', timestamp: '2026-04-08T08:00:00-03:00', type: 'tobacco' },
      { id: '3', timestamp: '2026-04-08T20:00:00-03:00', type: 'cannabis' },
      { id: '4', timestamp: '2026-04-09T09:00:00-03:00', type: 'cannabis' },
    ];
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ events: seed }));
    const { result } = renderHook(() => useTracker());
    act(() => {
      result.current.clearDay('2026-04-08');
    });
    expect(result.current.events.map((e) => e.id)).toEqual(['1', '4']);
  });
});

describe('useTracker — queries', () => {
  it('getDayTotals returns counts for the given day', () => {
    const seed: TrackerEvent[] = [
      { id: '1', timestamp: '2026-04-08T08:00:00-03:00', type: 'tobacco' },
      { id: '2', timestamp: '2026-04-08T10:00:00-03:00', type: 'tobacco' },
      { id: '3', timestamp: '2026-04-08T20:00:00-03:00', type: 'cannabis' },
    ];
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ events: seed }));
    const { result } = renderHook(() => useTracker());
    expect(result.current.getDayTotals('2026-04-08')).toEqual({ tobacco: 2, cannabis: 1 });
  });

  it('getEventsForDay returns only matching events', () => {
    const seed: TrackerEvent[] = [
      { id: '1', timestamp: '2026-04-08T08:00:00-03:00', type: 'tobacco' },
      { id: '2', timestamp: '2026-04-09T08:00:00-03:00', type: 'cannabis' },
    ];
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ events: seed }));
    const { result } = renderHook(() => useTracker());
    expect(result.current.getEventsForDay('2026-04-08').map((e) => e.id)).toEqual(['1']);
  });
});
```

- [ ] **Step 6: Run all useTracker tests**

```bash
npm run test:run -- src/hooks/useTracker.test.ts
```

Expected: all PASS.

- [ ] **Step 7: Commit**

```bash
git add src/hooks/useTracker.ts src/hooks/useTracker.test.ts
git commit -m "Add useTracker hook with event CRUD and persistence"
```

---

## Task 6: `NewEventDrawer` component

**Files:**
- Create: `src/components/NewEventDrawer.tsx`

- [ ] **Step 1: Create `src/components/NewEventDrawer.tsx`**

```tsx
import { useEffect, useState } from 'react';
import { Cigarette, Leaf } from 'lucide-react';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { EventType } from '@/types';

interface NewEventDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: EventType | null;
  onSubmit: (input: { type: EventType; location?: string; reason?: string }) => void;
}

const LABELS: Record<EventType, { title: string; icon: typeof Cigarette }> = {
  tobacco: { title: 'Tabaco', icon: Cigarette },
  cannabis: { title: 'Cannabis', icon: Leaf },
};

export const NewEventDrawer = ({ open, onOpenChange, type, onSubmit }: NewEventDrawerProps) => {
  const [location, setLocation] = useState('');
  const [reason, setReason] = useState('');

  // reset fields whenever the drawer opens
  useEffect(() => {
    if (open) {
      setLocation('');
      setReason('');
    }
  }, [open]);

  const handleSubmit = () => {
    if (!type) return;
    onSubmit({
      type,
      location: location.trim() || undefined,
      reason: reason.trim() || undefined,
    });
    onOpenChange(false);
  };

  const meta = type ? LABELS[type] : null;
  const Icon = meta?.icon;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle className="flex items-center gap-2">
            {Icon && <Icon className="w-5 h-5" />}
            Registrar {meta?.title.toLowerCase()}
          </DrawerTitle>
          <DrawerDescription>Opcional: adicione contexto ao registro.</DrawerDescription>
        </DrawerHeader>
        <div className="px-4 pb-2 space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="new-event-location">Onde?</Label>
            <Input
              id="new-event-location"
              placeholder="casa, trabalho, bar…"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              autoFocus
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-event-reason">Por quê?</Label>
            <Input
              id="new-event-reason"
              placeholder="primeiro do dia, pós almoço…"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSubmit();
              }}
            />
          </div>
        </div>
        <DrawerFooter>
          <Button onClick={handleSubmit}>Registrar</Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors related to `NewEventDrawer.tsx`. (Other errors from pending App.tsx refactor are acceptable at this stage — this task only validates the new file compiles in isolation.)

- [ ] **Step 3: Commit**

```bash
git add src/components/NewEventDrawer.tsx
git commit -m "Add NewEventDrawer component"
```

---

## Task 7: `EditDayDialog` component

**Files:**
- Create: `src/components/EditDayDialog.tsx`

- [ ] **Step 1: Create `src/components/EditDayDialog.tsx`**

```tsx
import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { Cigarette, Leaf, Trash2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { TrackerEvent } from '@/types';

interface EditDayDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dayKey: string | null;
  events: TrackerEvent[];
  onRemoveEvent: (id: string) => void;
  onClearDay: (dayKey: string) => void;
}

export const EditDayDialog = ({
  open,
  onOpenChange,
  dayKey,
  events,
  onRemoveEvent,
  onClearDay,
}: EditDayDialogProps) => {
  const [confirmClear, setConfirmClear] = useState(false);

  const prettyDate = dayKey
    ? format(parseISO(dayKey + 'T00:00:00'), 'dd/MM/yyyy')
    : '';

  const sorted = [...events].sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  const handleClearDay = () => {
    if (!dayKey) return;
    if (!confirmClear) {
      setConfirmClear(true);
      return;
    }
    onClearDay(dayKey);
    setConfirmClear(false);
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setConfirmClear(false);
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Dia {prettyDate}</DialogTitle>
          <DialogDescription>
            {sorted.length === 0
              ? 'Nenhum evento registrado neste dia.'
              : `${sorted.length} evento(s) registrado(s)`}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[50vh] overflow-y-auto space-y-2 py-2">
          {sorted.map((e) => {
            const Icon = e.type === 'tobacco' ? Cigarette : Leaf;
            const time = format(parseISO(e.timestamp), 'HH:mm');
            return (
              <div
                key={e.id}
                className="flex items-start gap-3 p-3 rounded-lg border bg-card"
              >
                <Icon className="w-5 h-5 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{time}</div>
                  {e.location && (
                    <div className="text-xs text-muted-foreground truncate">
                      Onde: {e.location}
                    </div>
                  )}
                  {e.reason && (
                    <div className="text-xs text-muted-foreground truncate">
                      Por quê: {e.reason}
                    </div>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onRemoveEvent(e.id)}
                  aria-label="Remover evento"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            );
          })}
        </div>

        <DialogFooter className="flex-col sm:flex-row sm:justify-between gap-2">
          {sorted.length > 0 && (
            <Button
              variant="destructive"
              onClick={handleClearDay}
            >
              {confirmClear ? 'Confirmar: limpar dia' : 'Limpar dia'}
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add src/components/EditDayDialog.tsx
git commit -m "Add EditDayDialog component"
```

---

## Task 8: Refactor `CounterCard`

**Files:**
- Modify: `src/components/CounterCard.tsx` (replace entirely)

- [ ] **Step 1: Replace `src/components/CounterCard.tsx`**

```tsx
import { Cigarette, Leaf } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { EventType } from '@/types';

interface CounterCardProps {
  type: EventType;
  count: number;
  onTap: () => void;
}

const META: Record<EventType, { label: string; icon: typeof Cigarette; hoverBorder: string; hoverBg: string }> = {
  tobacco: {
    label: 'Tabaco',
    icon: Cigarette,
    hoverBorder: 'hover:border-[#ba5f27]',
    hoverBg: 'hover:bg-[#ba5f27]/5',
  },
  cannabis: {
    label: 'Cannabis',
    icon: Leaf,
    hoverBorder: 'hover:border-[#27ba42]',
    hoverBg: 'hover:bg-[#27ba42]/5',
  },
};

export const CounterCard = ({ type, count, onTap }: CounterCardProps) => {
  const { label, icon: Icon, hoverBorder, hoverBg } = META[type];

  return (
    <Card
      role="button"
      tabIndex={0}
      onClick={onTap}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onTap();
        }
      }}
      className={`relative cursor-pointer border-2 transition-all duration-300 hover:scale-[1.02] ${hoverBorder} ${hoverBg}`}
      style={{ boxShadow: 'var(--shadow-soft)' }}
    >
      <div className="p-6 sm:p-12">
        <div className="flex flex-col items-center gap-6">
          <div className="p-6">
            <Icon className="w-16 h-16 text-foreground" strokeWidth={1.5} />
          </div>
          <div className="text-center space-y-1">
            <div className="text-5xl font-bold text-foreground">{count}</div>
            <div className="text-sm text-muted-foreground">{label}</div>
          </div>
        </div>
      </div>
    </Card>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add src/components/CounterCard.tsx
git commit -m "Refactor CounterCard to delegate taps to parent"
```

---

## Task 9: Refactor `MonthlyChart`

**Files:**
- Modify: `src/components/MonthlyChart.tsx` (replace entirely)

- [ ] **Step 1: Replace `src/components/MonthlyChart.tsx`**

```tsx
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from 'recharts';
import { Card } from '@/components/ui/card';
import { format, parseISO } from 'date-fns';
import { DayTotals } from '@/types';

interface MonthlyChartProps {
  dayKeys: string[];
  getDayTotals: (dayKey: string) => DayTotals;
  onDayClick: (dayKey: string) => void;
}

export const MonthlyChart = ({ dayKeys, getDayTotals, onDayClick }: MonthlyChartProps) => {
  const chartData = dayKeys.map((dayKey) => {
    const totals = getDayTotals(dayKey);
    return {
      dayKey,
      day: format(parseISO(dayKey + 'T00:00:00'), 'dd'),
      fullDate: format(parseISO(dayKey + 'T00:00:00'), 'dd/MM'),
      tobacco: totals.tobacco,
      cannabis: totals.cannabis,
    };
  });

  const handleChartClick = (e: any) => {
    const payload = e?.activePayload?.[0]?.payload;
    if (payload?.dayKey) onDayClick(payload.dayKey);
  };

  return (
    <div className="h-[200px] w-full mt-4 mb-6" style={{ fontFamily: 'inherit' }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} onClick={handleChartClick}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted-foreground))" opacity={0.1} />
          <XAxis
            dataKey="day"
            tickLine={false}
            axisLine={true}
            tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))', fontFamily: 'sans-serif' }}
            interval={0}
          />
          <YAxis
            allowDecimals={false}
            domain={[0, (dataMax: number) => Math.max(1, dataMax)]}
            tickLine={false}
            axisLine={true}
            tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))', fontFamily: 'sans-serif' }}
            width={20}
          />
          <Tooltip
            cursor={{ fill: 'var(--accent)', opacity: 0.2 }}
            content={({ active, payload }) => {
              if (active && payload && payload.length) {
                const p = payload[0].payload as { fullDate: string; tobacco: number; cannabis: number };
                return (
                  <Card className="p-2 border-none shadow-lg bg-popover/95 backdrop-blur-sm">
                    <div className="text-xs font-medium text-muted-foreground mb-1">{p.fullDate}</div>
                    <div className="flex gap-3">
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-[#ba5f27]" />
                        <span className="text-sm font-bold">{p.tobacco}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-[#27ba42]" />
                        <span className="text-sm font-bold">{p.cannabis}</span>
                      </div>
                    </div>
                  </Card>
                );
              }
              return null;
            }}
          />
          <Bar dataKey="tobacco" fill="#ba5f27" fillOpacity={0.8} radius={[4, 4, 0, 0]} />
          <Bar dataKey="cannabis" fill="#27ba42" fillOpacity={0.8} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add src/components/MonthlyChart.tsx
git commit -m "Refactor MonthlyChart to use hook queries and auto-scale Y axis"
```

---

## Task 10: Refactor `CalendarView`

**Files:**
- Modify: `src/components/CalendarView.tsx` (replace entirely)

- [ ] **Step 1: Replace `src/components/CalendarView.tsx`**

```tsx
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Cigarette, Leaf } from 'lucide-react';
import { format, parseISO, startOfMonth, endOfMonth, subDays } from 'date-fns';
import { MonthlyChart } from './MonthlyChart';
import { getDaysInRange, todayKey } from '@/lib/events';
import { DayTotals } from '@/types';

interface CalendarViewProps {
  getDayTotals: (dayKey: string) => DayTotals;
  onDayClick: (dayKey: string) => void;
}

export const CalendarView = ({ getDayTotals, onDayClick }: CalendarViewProps) => {
  const today = new Date();
  const weekDays = getDaysInRange(subDays(today, 6), today);
  const monthDays = getDaysInRange(startOfMonth(today), endOfMonth(today));
  const todayStr = todayKey();

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
          <MonthlyChart dayKeys={monthDays} getDayTotals={getDayTotals} onDayClick={onDayClick} />
        </TabsContent>
      </Tabs>
    </Card>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add src/components/CalendarView.tsx
git commit -m "Refactor CalendarView to consume hook queries"
```

---

## Task 11: Refactor `App.tsx` as shell

**Files:**
- Modify: `src/App.tsx` (replace entirely)

- [ ] **Step 1: Replace `src/App.tsx`**

```tsx
import { useState } from 'react';
import { toast } from 'sonner';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { CounterCard } from '@/components/CounterCard';
import { CalendarView } from '@/components/CalendarView';
import { NewEventDrawer } from '@/components/NewEventDrawer';
import { EditDayDialog } from '@/components/EditDayDialog';
import { useTracker } from '@/hooks/useTracker';
import { EventType } from '@/types';

const App = () => {
  const tracker = useTracker();
  const [drawerType, setDrawerType] = useState<EventType | null>(null);
  const [editingDay, setEditingDay] = useState<string | null>(null);

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
          <header className="text-center mb-8">
            <h1 className="text-4xl sm:text-5xl font-bold text-foreground mb-2">
              Smoking Tracker
            </h1>
            <p className="text-muted-foreground">do but don't forget</p>
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
      </div>
    </TooltipProvider>
  );
};

export default App;
```

- [ ] **Step 2: Run type check**

```bash
npx tsc --noEmit
```

Expected: zero errors. (If there are errors about `@/lib/date-utils` still being imported anywhere, Task 12 will handle them — but there should be none since we replaced all consumers.)

- [ ] **Step 3: Run all tests**

```bash
npm run test:run
```

Expected: all PASS.

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx
git commit -m "Refactor App.tsx as shell using useTracker"
```

---

## Task 12: Delete `date-utils.ts` and verify

**Files:**
- Delete: `src/lib/date-utils.ts`

- [ ] **Step 1: Verify nothing imports `date-utils`**

```bash
grep -rn "date-utils" src/
```

Expected: zero matches. If any appear, fix them first.

- [ ] **Step 2: Delete the file**

```bash
rm src/lib/date-utils.ts
```

- [ ] **Step 3: Run type check + build**

```bash
npx tsc --noEmit && npm run build
```

Expected: no errors, build produces `dist/index.html`.

- [ ] **Step 4: Commit**

```bash
git add -A src/lib/
git commit -m "Delete date-utils.ts (replaced by events.ts)"
```

---

## Task 13: Shadcn + dependency cleanup

**Files:**
- Delete: 37 files under `src/components/ui/`
- Modify: `package.json` (remove unused deps)

- [ ] **Step 1: Delete unused shadcn component files**

```bash
rm src/components/ui/accordion.tsx
rm src/components/ui/alert-dialog.tsx
rm src/components/ui/alert.tsx
rm src/components/ui/aspect-ratio.tsx
rm src/components/ui/avatar.tsx
rm src/components/ui/badge.tsx
rm src/components/ui/breadcrumb.tsx
rm src/components/ui/calendar.tsx
rm src/components/ui/carousel.tsx
rm src/components/ui/chart.tsx
rm src/components/ui/checkbox.tsx
rm src/components/ui/collapsible.tsx
rm src/components/ui/command.tsx
rm src/components/ui/context-menu.tsx
rm src/components/ui/dropdown-menu.tsx
rm src/components/ui/form.tsx
rm src/components/ui/hover-card.tsx
rm src/components/ui/input-otp.tsx
rm src/components/ui/menubar.tsx
rm src/components/ui/navigation-menu.tsx
rm src/components/ui/pagination.tsx
rm src/components/ui/popover.tsx
rm src/components/ui/progress.tsx
rm src/components/ui/radio-group.tsx
rm src/components/ui/resizable.tsx
rm src/components/ui/scroll-area.tsx
rm src/components/ui/select.tsx
rm src/components/ui/separator.tsx
rm src/components/ui/sheet.tsx
rm src/components/ui/sidebar.tsx
rm src/components/ui/skeleton.tsx
rm src/components/ui/slider.tsx
rm src/components/ui/switch.tsx
rm src/components/ui/table.tsx
rm src/components/ui/textarea.tsx
rm src/components/ui/toggle-group.tsx
rm src/components/ui/toggle.tsx
```

- [ ] **Step 2: Verify nothing imports the deleted components**

```bash
grep -rnE "@/components/ui/(accordion|alert-dialog|alert|aspect-ratio|avatar|badge|breadcrumb|calendar|carousel|chart|checkbox|collapsible|command|context-menu|dropdown-menu|form|hover-card|input-otp|menubar|navigation-menu|pagination|popover|progress|radio-group|resizable|scroll-area|select|separator|sheet|sidebar|skeleton|slider|switch|table|textarea|toggle-group|toggle)" src/
```

Expected: zero matches.

- [ ] **Step 3: Remove unused npm packages**

```bash
npm uninstall \
  @radix-ui/react-accordion \
  @radix-ui/react-alert-dialog \
  @radix-ui/react-aspect-ratio \
  @radix-ui/react-avatar \
  @radix-ui/react-checkbox \
  @radix-ui/react-collapsible \
  @radix-ui/react-context-menu \
  @radix-ui/react-dropdown-menu \
  @radix-ui/react-hover-card \
  @radix-ui/react-menubar \
  @radix-ui/react-navigation-menu \
  @radix-ui/react-popover \
  @radix-ui/react-progress \
  @radix-ui/react-radio-group \
  @radix-ui/react-scroll-area \
  @radix-ui/react-select \
  @radix-ui/react-separator \
  @radix-ui/react-slider \
  @radix-ui/react-switch \
  @radix-ui/react-toggle \
  @radix-ui/react-toggle-group \
  @hookform/resolvers \
  react-hook-form \
  zod \
  cmdk \
  embla-carousel-react \
  input-otp \
  react-day-picker \
  react-resizable-panels \
  date-fns-tz
```

- [ ] **Step 4: Run build to verify nothing broke**

```bash
npx tsc --noEmit && npm run build && npm run test:run
```

Expected: all three succeed.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Remove unused shadcn components and radix dependencies"
```

---

## Task 14: Final verification

- [ ] **Step 1: Grep for old names across the whole source tree**

```bash
grep -rniE "smoke[- _]?leaf|Puff Tracker|puff-tracker|vite_react_shadcn|cigarette|leaf(-|_)count|smoking-tracker" \
  --include="*.ts" --include="*.tsx" --include="*.json" \
  --include="*.html" --include="*.md" \
  --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=.git \
  --exclude-dir=docs src/ index.html package.json README.md
```

Expected: only these acceptable matches:
- `src/hooks/useTracker.ts` and `src/hooks/useTracker.test.ts` — reference `'smoking-tracker'` storage key
- `src/components/CounterCard.tsx` — imports the `Leaf` icon from `lucide-react`
- `src/components/CalendarView.tsx` and `EditDayDialog.tsx` — imports `Leaf` icon
- `src/components/NewEventDrawer.tsx` — imports `Leaf` icon

Any other match is a bug — fix before continuing.

- [ ] **Step 2: Full test run**

```bash
npm run test:run
```

Expected: all tests PASS (events + useTracker).

- [ ] **Step 3: Production build**

```bash
npm run build
```

Expected: `dist/index.html` generated with no new warnings.

- [ ] **Step 4: Manual smoke test**

```bash
npm run dev
```

Open the printed URL in a browser and verify:
- Header reads "Smoking Tracker"
- Browser tab title reads "Smoking Tracker"
- Tapping the Tabaco card opens a bottom drawer with two text inputs and a Registrar button
- Submitting with empty fields creates an event and increments the count
- Submitting with location + reason filled persists them
- Reloading the page preserves events
- Clicking a day cell opens the EditDayDialog showing the events of that day
- Removing an event from the dialog updates the counters
- "Limpar dia" requires a second confirmation click

- [ ] **Step 5: Final commit and push**

```bash
git push origin main
```

---

## Notes for the implementer

- **DRY:** all date/time logic lives in `src/lib/events.ts`. Do not reintroduce `date-fns-tz` or ad-hoc timezone handling anywhere. Components and hooks consume only `events.ts` helpers.
- **YAGNI:** the drawer uses simple controlled state, not `react-hook-form`. Do not add form abstractions for two optional inputs.
- **TDD discipline:** for `events.ts` and `useTracker.ts`, write the failing test first, confirm it fails, then implement. Do not batch multiple implementations before running tests.
- **Commits:** commit at every task boundary. Do not squash. The plan assumes 14 commits on top of the current `main`.
- **When unsure:** the spec in `docs/superpowers/specs/2026-04-08-fundacao-tecnica-design.md` is authoritative. If this plan contradicts the spec, the spec wins.
