# Redução Guiada — Metas & Métricas — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add daily goal tracking with live streak feedback, 7-day rolling average with delta, and a moving average trend line on the monthly chart.

**Architecture:** Pure stat helpers in `src/lib/stats.ts` do all math (tested in isolation). `useTracker` hook extends with `goals: GoalEntry[]` state, `setGoal()` mutation, and thin query methods that delegate to the helpers. New `MetricsCard` component renders conditionally. Export bumps to v2 with goals merge-by-id.

**Tech Stack:** React 18, TypeScript, Vitest, recharts (ComposedChart + Line), shadcn/ui, Tailwind CSS, date-fns.

**Spec:** `docs/superpowers/specs/2026-04-09-reducao-guiada-metas-metricas-design.md`

---

### Task 1: Add `GoalEntry` type

**Files:**
- Modify: `src/types.ts`

- [ ] **Step 1: Add `GoalEntry` and `StorageShape` types**

```ts
// Append to src/types.ts

export interface GoalEntry {
  id: string;
  /** Positive integer — max total events (tobacco + cannabis) per day */
  limit: number;
  /** Day key "YYYY-MM-DD" from which this goal takes effect (inclusive) */
  effectiveFrom: string;
}

export interface StorageShape {
  events: TrackerEvent[];
  goals: GoalEntry[];
}
```

- [ ] **Step 2: Verify build**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/types.ts
git commit -m "feat: add GoalEntry and StorageShape types"
```

---

### Task 2: `stats.ts` — goal lookups and day status (TDD)

**Files:**
- Create: `src/lib/stats.ts`
- Create: `src/lib/stats.test.ts`

- [ ] **Step 1: Write failing tests for `getGoalForDay`, `getCurrentGoal`, `getDayGoalStatus`**

```ts
// src/lib/stats.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TrackerEvent, GoalEntry } from '@/types';
import {
  getGoalForDay,
  getCurrentGoal,
  getDayGoalStatus,
} from './stats';

const mkEvent = (overrides: Partial<TrackerEvent>): TrackerEvent => ({
  id: overrides.id ?? 'id-' + Math.random(),
  timestamp: overrides.timestamp ?? '2026-04-08T12:00:00-03:00',
  type: overrides.type ?? 'tobacco',
  location: overrides.location,
  reason: overrides.reason,
});

const mkGoal = (overrides: Partial<GoalEntry>): GoalEntry => ({
  id: overrides.id ?? 'goal-' + Math.random(),
  limit: overrides.limit ?? 10,
  effectiveFrom: overrides.effectiveFrom ?? '2026-04-01',
});

describe('getGoalForDay', () => {
  it('returns null when goals is empty', () => {
    expect(getGoalForDay([], '2026-04-08')).toBeNull();
  });

  it('returns null when dayKey is before the first goal effectiveFrom', () => {
    const goals = [mkGoal({ effectiveFrom: '2026-04-05' })];
    expect(getGoalForDay(goals, '2026-04-04')).toBeNull();
  });

  it('returns the single goal when dayKey is on or after effectiveFrom', () => {
    const goal = mkGoal({ effectiveFrom: '2026-04-01', limit: 10 });
    expect(getGoalForDay([goal], '2026-04-01')).toEqual(goal);
    expect(getGoalForDay([goal], '2026-04-15')).toEqual(goal);
  });

  it('returns the correct goal when multiple entries exist', () => {
    const g1 = mkGoal({ id: 'g1', effectiveFrom: '2026-04-01', limit: 12 });
    const g2 = mkGoal({ id: 'g2', effectiveFrom: '2026-04-10', limit: 8 });
    const goals = [g1, g2];

    expect(getGoalForDay(goals, '2026-04-05')).toEqual(g1);
    expect(getGoalForDay(goals, '2026-04-10')).toEqual(g2);
    expect(getGoalForDay(goals, '2026-04-20')).toEqual(g2);
  });
});

describe('getCurrentGoal', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('returns null when goals is empty', () => {
    expect(getCurrentGoal([])).toBeNull();
  });

  it('returns the goal vigent today', () => {
    vi.setSystemTime(new Date('2026-04-08T14:00:00Z'));
    const goal = mkGoal({ effectiveFrom: '2026-04-01', limit: 10 });
    expect(getCurrentGoal([goal])).toEqual(goal);
  });
});

describe('getDayGoalStatus', () => {
  it('returns no-goal when no goal covers the day', () => {
    const events = [mkEvent({ timestamp: '2026-04-08T12:00:00-03:00' })];
    expect(getDayGoalStatus(events, [], '2026-04-08')).toBe('no-goal');
  });

  it('returns within when day total <= limit', () => {
    const goals = [mkGoal({ effectiveFrom: '2026-04-01', limit: 5 })];
    const events = [
      mkEvent({ id: '1', timestamp: '2026-04-08T08:00:00-03:00', type: 'tobacco' }),
      mkEvent({ id: '2', timestamp: '2026-04-08T10:00:00-03:00', type: 'cannabis' }),
    ];
    expect(getDayGoalStatus(events, goals, '2026-04-08')).toBe('within');
  });

  it('returns within when day total equals limit exactly', () => {
    const goals = [mkGoal({ effectiveFrom: '2026-04-01', limit: 2 })];
    const events = [
      mkEvent({ id: '1', timestamp: '2026-04-08T08:00:00-03:00' }),
      mkEvent({ id: '2', timestamp: '2026-04-08T10:00:00-03:00' }),
    ];
    expect(getDayGoalStatus(events, goals, '2026-04-08')).toBe('within');
  });

  it('returns over when day total > limit', () => {
    const goals = [mkGoal({ effectiveFrom: '2026-04-01', limit: 1 })];
    const events = [
      mkEvent({ id: '1', timestamp: '2026-04-08T08:00:00-03:00' }),
      mkEvent({ id: '2', timestamp: '2026-04-08T10:00:00-03:00' }),
    ];
    expect(getDayGoalStatus(events, goals, '2026-04-08')).toBe('over');
  });

  it('returns within for a day with zero events', () => {
    const goals = [mkGoal({ effectiveFrom: '2026-04-01', limit: 5 })];
    expect(getDayGoalStatus([], goals, '2026-04-08')).toBe('within');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/stats.test.ts`
Expected: FAIL — module `./stats` not found

- [ ] **Step 3: Implement the functions**

```ts
// src/lib/stats.ts
import { TrackerEvent, GoalEntry } from '@/types';
import { getEventsForDay, todayKey } from './events';

export type DayGoalStatus = 'within' | 'over' | 'no-goal';

/**
 * Find the goal in effect for a specific day.
 * Goals must be sorted by effectiveFrom asc.
 */
export function getGoalForDay(goals: GoalEntry[], dayKey: string): GoalEntry | null {
  let result: GoalEntry | null = null;
  for (const g of goals) {
    if (g.effectiveFrom <= dayKey) {
      result = g;
    } else {
      break;
    }
  }
  return result;
}

/** Goal in effect today. */
export function getCurrentGoal(goals: GoalEntry[]): GoalEntry | null {
  return getGoalForDay(goals, todayKey());
}

/** Evaluate whether a day's total is within the vigent goal's limit. */
export function getDayGoalStatus(
  events: TrackerEvent[],
  goals: GoalEntry[],
  dayKey: string,
): DayGoalStatus {
  const goal = getGoalForDay(goals, dayKey);
  if (!goal) return 'no-goal';
  const dayEvents = getEventsForDay(events, dayKey);
  return dayEvents.length <= goal.limit ? 'within' : 'over';
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/stats.test.ts`
Expected: all PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/stats.ts src/lib/stats.test.ts
git commit -m "feat: add goal lookup and day status helpers (TDD)"
```

---

### Task 3: `stats.ts` — `getCurrentStreak` (TDD)

**Files:**
- Modify: `src/lib/stats.ts`
- Modify: `src/lib/stats.test.ts`

- [ ] **Step 1: Write failing tests for `getCurrentStreak`**

Append to `src/lib/stats.test.ts`:

```ts
import {
  getGoalForDay,
  getCurrentGoal,
  getDayGoalStatus,
  getCurrentStreak,
} from './stats';

// ... (keep existing tests, add below)

describe('getCurrentStreak', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('returns 0 when no goal is set', () => {
    vi.setSystemTime(new Date('2026-04-08T14:00:00Z'));
    expect(getCurrentStreak([], [])).toBe(0);
  });

  it('returns 0 when today is over the limit', () => {
    vi.setSystemTime(new Date('2026-04-08T14:00:00Z'));
    const goals = [mkGoal({ effectiveFrom: '2026-04-01', limit: 1 })];
    const events = [
      mkEvent({ id: '1', timestamp: '2026-04-08T08:00:00-03:00' }),
      mkEvent({ id: '2', timestamp: '2026-04-08T10:00:00-03:00' }),
    ];
    expect(getCurrentStreak(events, goals)).toBe(0);
  });

  it('returns 1 when only today is within (yesterday has no goal)', () => {
    vi.setSystemTime(new Date('2026-04-08T14:00:00Z'));
    const goals = [mkGoal({ effectiveFrom: '2026-04-08', limit: 5 })];
    const events = [
      mkEvent({ id: '1', timestamp: '2026-04-08T08:00:00-03:00' }),
    ];
    expect(getCurrentStreak(events, goals)).toBe(1);
  });

  it('counts consecutive within days including today', () => {
    vi.setSystemTime(new Date('2026-04-10T14:00:00Z'));
    const goals = [mkGoal({ effectiveFrom: '2026-04-01', limit: 5 })];
    const events = [
      // Apr 8: 1 event (within)
      mkEvent({ id: '1', timestamp: '2026-04-08T08:00:00-03:00' }),
      // Apr 9: 2 events (within)
      mkEvent({ id: '2', timestamp: '2026-04-09T08:00:00-03:00' }),
      mkEvent({ id: '3', timestamp: '2026-04-09T10:00:00-03:00' }),
      // Apr 10 (today): 1 event (within)
      mkEvent({ id: '4', timestamp: '2026-04-10T08:00:00-03:00' }),
    ];
    expect(getCurrentStreak(events, goals)).toBe(3);
  });

  it('stops at the first over day going backward', () => {
    vi.setSystemTime(new Date('2026-04-10T14:00:00Z'));
    const goals = [mkGoal({ effectiveFrom: '2026-04-01', limit: 2 })];
    const events = [
      // Apr 8: 3 events (OVER)
      mkEvent({ id: '1', timestamp: '2026-04-08T08:00:00-03:00' }),
      mkEvent({ id: '2', timestamp: '2026-04-08T10:00:00-03:00' }),
      mkEvent({ id: '3', timestamp: '2026-04-08T12:00:00-03:00' }),
      // Apr 9: 1 event (within)
      mkEvent({ id: '4', timestamp: '2026-04-09T08:00:00-03:00' }),
      // Apr 10 (today): 1 event (within)
      mkEvent({ id: '5', timestamp: '2026-04-10T08:00:00-03:00' }),
    ];
    expect(getCurrentStreak(events, goals)).toBe(2);
  });

  it('stops at a no-goal day going backward', () => {
    vi.setSystemTime(new Date('2026-04-10T14:00:00Z'));
    // Goal starts Apr 9 — Apr 8 has no goal
    const goals = [mkGoal({ effectiveFrom: '2026-04-09', limit: 10 })];
    const events = [
      mkEvent({ id: '1', timestamp: '2026-04-08T08:00:00-03:00' }),
      mkEvent({ id: '2', timestamp: '2026-04-09T08:00:00-03:00' }),
      mkEvent({ id: '3', timestamp: '2026-04-10T08:00:00-03:00' }),
    ];
    expect(getCurrentStreak(events, goals)).toBe(2);
  });

  it('counts days with zero events as within', () => {
    vi.setSystemTime(new Date('2026-04-10T14:00:00Z'));
    const goals = [mkGoal({ effectiveFrom: '2026-04-01', limit: 5 })];
    // Only today has an event; Apr 8 and Apr 9 have zero events (within: 0 <= 5)
    const events = [
      mkEvent({ id: '1', timestamp: '2026-04-10T08:00:00-03:00' }),
    ];
    expect(getCurrentStreak(events, goals)).toBe(10);
    // Apr 1 through Apr 10 = 10 days, all within
  });

  it('handles 5+ consecutive day scenario', () => {
    vi.setSystemTime(new Date('2026-04-08T14:00:00Z'));
    const goals = [mkGoal({ effectiveFrom: '2026-04-01', limit: 3 })];
    const events = [
      // Apr 3: 1 (within)
      mkEvent({ id: '1', timestamp: '2026-04-03T10:00:00-03:00' }),
      // Apr 4: 2 (within)
      mkEvent({ id: '2', timestamp: '2026-04-04T10:00:00-03:00' }),
      mkEvent({ id: '3', timestamp: '2026-04-04T12:00:00-03:00' }),
      // Apr 5: 0 (within)
      // Apr 6: 1 (within)
      mkEvent({ id: '4', timestamp: '2026-04-06T10:00:00-03:00' }),
      // Apr 7: 3 (within, exactly at limit)
      mkEvent({ id: '5', timestamp: '2026-04-07T08:00:00-03:00' }),
      mkEvent({ id: '6', timestamp: '2026-04-07T10:00:00-03:00' }),
      mkEvent({ id: '7', timestamp: '2026-04-07T12:00:00-03:00' }),
      // Apr 8 (today): 1 (within)
      mkEvent({ id: '8', timestamp: '2026-04-08T08:00:00-03:00' }),
    ];
    // Apr 1 through Apr 8 = 8 days, all within
    expect(getCurrentStreak(events, goals)).toBe(8);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/stats.test.ts`
Expected: FAIL — `getCurrentStreak` is not exported

- [ ] **Step 3: Implement `getCurrentStreak`**

Append to `src/lib/stats.ts`:

```ts
import { subDays, format } from 'date-fns';

/**
 * Current streak of consecutive days within goal, anchored at today.
 * Today counts if currently within; streak = 0 if today is over or no-goal.
 */
export function getCurrentStreak(
  events: TrackerEvent[],
  goals: GoalEntry[],
): number {
  const today = todayKey();
  const todayStatus = getDayGoalStatus(events, goals, today);
  if (todayStatus !== 'within') return 0;

  let streak = 1;
  let cursor = new Date(today + 'T12:00:00');
  while (true) {
    cursor = subDays(cursor, 1);
    const dayKey = format(cursor, 'yyyy-MM-dd');
    const status = getDayGoalStatus(events, goals, dayKey);
    if (status !== 'within') break;
    streak++;
  }
  return streak;
}
```

Note: add `subDays` and `format` to the existing imports from `date-fns` at the top of the file.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/stats.test.ts`
Expected: all PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/stats.ts src/lib/stats.test.ts
git commit -m "feat: add getCurrentStreak helper (TDD)"
```

---

### Task 4: `stats.ts` — rolling averages and moving average series (TDD)

**Files:**
- Modify: `src/lib/stats.ts`
- Modify: `src/lib/stats.test.ts`

- [ ] **Step 1: Write failing tests for `getRollingAverage`, `getAverageDelta`, `getMovingAverageSeries`**

Append to `src/lib/stats.test.ts`:

```ts
import {
  getGoalForDay,
  getCurrentGoal,
  getDayGoalStatus,
  getCurrentStreak,
  getRollingAverage,
  getAverageDelta,
  getMovingAverageSeries,
} from './stats';

// ... (keep existing tests, add below)

describe('getRollingAverage', () => {
  it('divides total events by number of days, not by days with events', () => {
    // 3 events over 7 days = 3/7 ≈ 0.4286
    const events = [
      mkEvent({ id: '1', timestamp: '2026-04-05T10:00:00-03:00' }),
      mkEvent({ id: '2', timestamp: '2026-04-05T12:00:00-03:00' }),
      mkEvent({ id: '3', timestamp: '2026-04-08T10:00:00-03:00' }),
    ];
    const avg = getRollingAverage(events, 7, '2026-04-08');
    expect(avg).toBeCloseTo(3 / 7, 4);
  });

  it('returns 0 when no events in range', () => {
    expect(getRollingAverage([], 7, '2026-04-08')).toBe(0);
  });

  it('counts only events within the N-day window', () => {
    const events = [
      mkEvent({ id: '1', timestamp: '2026-04-01T10:00:00-03:00' }), // outside 7d window ending Apr 8
      mkEvent({ id: '2', timestamp: '2026-04-05T10:00:00-03:00' }), // inside
    ];
    const avg = getRollingAverage(events, 7, '2026-04-08');
    expect(avg).toBeCloseTo(1 / 7, 4);
  });

  it('uses todayKey when anchor is omitted', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-08T14:00:00Z'));
    const events = [
      mkEvent({ id: '1', timestamp: '2026-04-08T10:00:00-03:00' }),
    ];
    expect(getRollingAverage(events, 7)).toBeCloseTo(1 / 7, 4);
    vi.useRealTimers();
  });
});

describe('getAverageDelta', () => {
  it('returns negative fraction when current period < previous', () => {
    // Previous 7 days (Apr 1–Apr 7): 10 events
    // Current 7 days (Apr 8–Apr 14): 7 events
    const events: TrackerEvent[] = [];
    for (let i = 0; i < 10; i++) {
      events.push(mkEvent({ id: `prev-${i}`, timestamp: '2026-04-03T10:00:00-03:00' }));
    }
    for (let i = 0; i < 7; i++) {
      events.push(mkEvent({ id: `cur-${i}`, timestamp: '2026-04-10T10:00:00-03:00' }));
    }
    const delta = getAverageDelta(events, 7, '2026-04-14');
    // current avg = 7/7 = 1, prev avg = 10/7 ≈ 1.4286
    // delta = (1 - 1.4286) / 1.4286 ≈ -0.3
    expect(delta).toBeCloseTo(-0.3, 1);
  });

  it('returns positive fraction when current period > previous', () => {
    const events: TrackerEvent[] = [];
    for (let i = 0; i < 3; i++) {
      events.push(mkEvent({ id: `prev-${i}`, timestamp: '2026-04-03T10:00:00-03:00' }));
    }
    for (let i = 0; i < 7; i++) {
      events.push(mkEvent({ id: `cur-${i}`, timestamp: '2026-04-10T10:00:00-03:00' }));
    }
    const delta = getAverageDelta(events, 7, '2026-04-14');
    // current avg = 1, prev avg = 3/7 ≈ 0.4286
    // delta = (1 - 0.4286) / 0.4286 ≈ 1.333
    expect(delta).toBeCloseTo(1.333, 1);
  });

  it('returns null when previous period has zero events', () => {
    const events = [
      mkEvent({ id: '1', timestamp: '2026-04-10T10:00:00-03:00' }),
    ];
    expect(getAverageDelta(events, 7, '2026-04-14')).toBeNull();
  });
});

describe('getMovingAverageSeries', () => {
  it('computes correct moving window averages for each dayKey', () => {
    const events = [
      mkEvent({ id: '1', timestamp: '2026-04-01T10:00:00-03:00' }),
      mkEvent({ id: '2', timestamp: '2026-04-01T12:00:00-03:00' }),
      mkEvent({ id: '3', timestamp: '2026-04-03T10:00:00-03:00' }),
    ];
    const dayKeys = ['2026-04-01', '2026-04-02', '2026-04-03'];
    const result = getMovingAverageSeries(events, dayKeys, 3);

    expect(result).toHaveLength(3);
    // Apr 1: window Mar 30–Apr 1: 2 events / 3 days
    expect(result[0]).toEqual({ dayKey: '2026-04-01', average: expect.closeTo(2 / 3, 4) });
    // Apr 2: window Mar 31–Apr 2: 2 events / 3 days
    expect(result[1]).toEqual({ dayKey: '2026-04-02', average: expect.closeTo(2 / 3, 4) });
    // Apr 3: window Apr 1–Apr 3: 3 events / 3 days
    expect(result[2]).toEqual({ dayKey: '2026-04-03', average: expect.closeTo(1, 4) });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/stats.test.ts`
Expected: FAIL — functions not exported

- [ ] **Step 3: Implement the functions**

Append to `src/lib/stats.ts`:

```ts
/**
 * Average daily event count over the last N days ending on anchor (inclusive).
 * Divides total events by N, not by days-with-events.
 */
export function getRollingAverage(
  events: TrackerEvent[],
  days: number,
  anchor?: string,
): number {
  const to = anchor ?? todayKey();
  const from = format(subDays(new Date(to + 'T12:00:00'), days - 1), 'yyyy-MM-dd');
  let count = 0;
  for (const e of events) {
    const dk = getDayKey(e.timestamp);
    if (dk >= from && dk <= to) count++;
  }
  return count / days;
}

/**
 * Percentage delta: (currentAvg - prevAvg) / prevAvg.
 * Returns null if previous period has zero events.
 */
export function getAverageDelta(
  events: TrackerEvent[],
  days: number,
  anchor?: string,
): number | null {
  const to = anchor ?? todayKey();
  const currentAvg = getRollingAverage(events, days, to);
  const prevTo = format(subDays(new Date(to + 'T12:00:00'), days), 'yyyy-MM-dd');
  const prevAvg = getRollingAverage(events, days, prevTo);
  if (prevAvg === 0) return null;
  return (currentAvg - prevAvg) / prevAvg;
}

/**
 * Moving average series for chart overlay.
 * For each dayKey, computes the average over the windowDays ending on that day.
 */
export function getMovingAverageSeries(
  events: TrackerEvent[],
  dayKeys: string[],
  windowDays: number,
): Array<{ dayKey: string; average: number }> {
  return dayKeys.map((dk) => ({
    dayKey: dk,
    average: getRollingAverage(events, windowDays, dk),
  }));
}
```

Note: add `getDayKey` to the imports from `./events` at the top:
```ts
import { getEventsForDay, getDayKey, todayKey } from './events';
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/stats.test.ts`
Expected: all PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/stats.ts src/lib/stats.test.ts
git commit -m "feat: add rolling average and moving average helpers (TDD)"
```

---

### Task 5: `export.ts` — bump to v2 with goals support (TDD)

**Files:**
- Modify: `src/lib/export.ts`
- Modify: `src/lib/export.test.ts`

- [ ] **Step 1: Write failing tests for v2 export/import + `mergeGoals`**

Add to `src/lib/export.test.ts`:

```ts
import {
  buildExport,
  EXPORT_VERSION,
  mergeEvents,
  mergeGoals,
  parseImport,
  serializeExport,
} from './export';
import { TrackerEvent, GoalEntry } from '@/types';
```

Update existing test in `serializeExport` block — change expected version to 2:
```ts
  it('returns pretty-printed JSON parseable into the same shape', () => {
    // ...existing...
    expect(parsed.version).toBe(2);
    // ...rest unchanged...
  });
```

Update the existing "rejects unsupported version" test — version 2 is now valid:
```ts
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
```

Add these new test blocks:

```ts
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
      goals: [
        { id: 'g1', limit: 10, effectiveFrom: '2026-04-01' },
      ],
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
    expect(result.merged[0].limit).toBe(10); // kept current
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/lib/export.test.ts`
Expected: FAIL — `mergeGoals` not exported, version mismatch, missing `goals` field

- [ ] **Step 3: Implement the changes**

Update `src/lib/export.ts`:

```ts
import { TrackerEvent, GoalEntry } from '@/types';
import { getDayKey, nowLocalIso } from './events';

export const EXPORT_VERSION = 2;

export interface ExportFile {
  version: number;
  exportedAt: string;
  eventCount: number;
  dateRange: {
    from: string | null;
    to: string | null;
  };
  events: TrackerEvent[];
  goals: GoalEntry[];
}

export function serializeExport(events: TrackerEvent[], goals: GoalEntry[] = []): string {
  return JSON.stringify(buildExport(events, goals), null, 2);
}

export type ImportError =
  | 'invalid-json'
  | 'invalid-shape'
  | 'unsupported-version'
  | 'invalid-events'
  | 'invalid-goals';

export type ParseResult =
  | { ok: true; events: TrackerEvent[]; goals: GoalEntry[]; exportedAt: string; eventCount: number }
  | { ok: false; error: ImportError };

const REQUIRED_ROOT_KEYS = ['version', 'exportedAt', 'eventCount', 'dateRange', 'events'] as const;
const VALID_TYPES: ReadonlySet<string> = new Set(['tobacco', 'cannabis']);
const DAY_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

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

function isValidGoal(value: unknown): value is GoalEntry {
  if (!isPlainObject(value)) return false;
  if (typeof value.id !== 'string') return false;
  if (typeof value.limit !== 'number' || !Number.isInteger(value.limit) || value.limit <= 0) return false;
  if (typeof value.effectiveFrom !== 'string' || !DAY_KEY_RE.test(value.effectiveFrom)) return false;
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

  const version = parsed.version;
  if (version !== 1 && version !== 2) {
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

  // v1 files have no goals field — default to empty
  let goals: GoalEntry[] = [];
  if (version === 2) {
    if (!Array.isArray(parsed.goals)) {
      return { ok: false, error: 'invalid-goals' };
    }
    for (const g of parsed.goals) {
      if (!isValidGoal(g)) {
        return { ok: false, error: 'invalid-goals' };
      }
    }
    goals = parsed.goals as GoalEntry[];
  }

  return {
    ok: true,
    events: parsed.events as TrackerEvent[],
    goals,
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

export interface GoalMergeResult {
  merged: GoalEntry[];
  added: number;
  skipped: number;
}

export function mergeGoals(
  current: GoalEntry[],
  incoming: GoalEntry[],
): GoalMergeResult {
  const existingIds = new Set(current.map((g) => g.id));
  const additions: GoalEntry[] = [];
  let skipped = 0;
  for (const g of incoming) {
    if (existingIds.has(g.id)) {
      skipped++;
    } else {
      additions.push(g);
      existingIds.add(g.id);
    }
  }
  const merged = [...current, ...additions].sort((a, b) =>
    a.effectiveFrom < b.effectiveFrom ? -1 : a.effectiveFrom > b.effectiveFrom ? 1 : 0
  );
  return { merged, added: additions.length, skipped };
}

export function buildExport(events: TrackerEvent[], goals: GoalEntry[] = []): ExportFile {
  const from = events.length > 0 ? getDayKey(events[0].timestamp) : null;
  const to = events.length > 0 ? getDayKey(events[events.length - 1].timestamp) : null;
  return {
    version: EXPORT_VERSION,
    exportedAt: nowLocalIso(),
    eventCount: events.length,
    dateRange: { from, to },
    events,
    goals,
  };
}
```

- [ ] **Step 4: Update existing tests that assert version === 1**

In `src/lib/export.test.ts`, update the `buildExport` test:

```ts
// Change: expect(file.version).toBe(EXPORT_VERSION);  — this line is fine, EXPORT_VERSION is now 2
```

In `useTracker.test.ts`, update the export round-trip test:

```ts
    expect(parsed.version).toBe(2);
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/lib/export.test.ts`
Expected: all PASS

Then: `npx vitest run`
Expected: all PASS (including other test files)

- [ ] **Step 6: Commit**

```bash
git add src/lib/export.ts src/lib/export.test.ts src/hooks/useTracker.test.ts
git commit -m "feat: bump export to v2 with goals support and mergeGoals (TDD)"
```

---

### Task 6: `useTracker` — goals state, `setGoal`, persistence (TDD)

**Files:**
- Modify: `src/hooks/useTracker.ts`
- Modify: `src/hooks/useTracker.test.ts`

- [ ] **Step 1: Write failing tests for goals boot, `setGoal`, and persistence**

Add to `src/hooks/useTracker.test.ts`:

```ts
import { GoalEntry } from '@/types';

// ... (keep existing tests, add below)

describe('useTracker — goals boot', () => {
  it('starts with empty goals when storage has no goals field', () => {
    const events = [
      { id: '1', timestamp: '2026-04-08T12:00:00-03:00', type: 'tobacco' as const },
    ];
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ events }));
    const { result } = renderHook(() => useTracker());
    expect(result.current.goals).toEqual([]);
    expect(result.current.events).toEqual(events);
  });

  it('loads valid goals from storage', () => {
    const goals: GoalEntry[] = [
      { id: 'g1', limit: 10, effectiveFrom: '2026-04-01' },
    ];
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ events: [], goals }));
    const { result } = renderHook(() => useTracker());
    expect(result.current.goals).toEqual(goals);
  });

  it('discards everything when goals array has invalid entry', () => {
    const goals = [{ id: 'g1', limit: -1, effectiveFrom: '2026-04-01' }];
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ events: [], goals }));
    const { result } = renderHook(() => useTracker());
    expect(result.current.events).toEqual([]);
    expect(result.current.goals).toEqual([]);
  });

  it('discards everything when goals is not an array', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ events: [], goals: 'bad' }));
    const { result } = renderHook(() => useTracker());
    expect(result.current.events).toEqual([]);
    expect(result.current.goals).toEqual([]);
  });
});

describe('useTracker — setGoal', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('creates first goal entry with effectiveFrom = today', () => {
    vi.setSystemTime(new Date('2026-04-08T14:00:00Z'));
    const { result } = renderHook(() => useTracker());
    act(() => { result.current.setGoal(10); });
    expect(result.current.goals).toHaveLength(1);
    expect(result.current.goals[0].limit).toBe(10);
    expect(result.current.goals[0].effectiveFrom).toMatch(/^2026-04-08$/);
  });

  it('is no-op when value equals current goal limit', () => {
    vi.setSystemTime(new Date('2026-04-08T14:00:00Z'));
    const goals: GoalEntry[] = [
      { id: 'g1', limit: 10, effectiveFrom: '2026-04-01' },
    ];
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ events: [], goals }));
    const { result } = renderHook(() => useTracker());
    act(() => { result.current.setGoal(10); });
    expect(result.current.goals).toHaveLength(1);
    expect(result.current.goals[0].id).toBe('g1');
  });

  it('overwrites same-day entry instead of creating duplicate', () => {
    vi.setSystemTime(new Date('2026-04-08T14:00:00Z'));
    const { result } = renderHook(() => useTracker());
    act(() => { result.current.setGoal(10); });
    act(() => { result.current.setGoal(8); });
    expect(result.current.goals).toHaveLength(1);
    expect(result.current.goals[0].limit).toBe(8);
  });

  it('appends new entry for a different day', () => {
    vi.setSystemTime(new Date('2026-04-10T14:00:00Z'));
    const goals: GoalEntry[] = [
      { id: 'g1', limit: 12, effectiveFrom: '2026-04-01' },
    ];
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ events: [], goals }));
    const { result } = renderHook(() => useTracker());
    act(() => { result.current.setGoal(8); });
    expect(result.current.goals).toHaveLength(2);
    expect(result.current.goals[1].limit).toBe(8);
    expect(result.current.goals[1].effectiveFrom).toBe('2026-04-10');
  });

  it('removes vigent goal when passed null', () => {
    vi.setSystemTime(new Date('2026-04-08T14:00:00Z'));
    const goals: GoalEntry[] = [
      { id: 'g1', limit: 10, effectiveFrom: '2026-04-01' },
    ];
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ events: [], goals }));
    const { result } = renderHook(() => useTracker());
    act(() => { result.current.setGoal(null); });
    expect(result.current.goals).toEqual([]);
  });

  it('ignores invalid values (0, negative, NaN)', () => {
    vi.setSystemTime(new Date('2026-04-08T14:00:00Z'));
    const { result } = renderHook(() => useTracker());
    act(() => { result.current.setGoal(0); });
    act(() => { result.current.setGoal(-5); });
    act(() => { result.current.setGoal(NaN); });
    expect(result.current.goals).toEqual([]);
  });

  it('persists goals to localStorage', () => {
    vi.setSystemTime(new Date('2026-04-08T14:00:00Z'));
    const { result } = renderHook(() => useTracker());
    act(() => { result.current.setGoal(10); });
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    expect(raw.goals).toHaveLength(1);
    expect(raw.goals[0].limit).toBe(10);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/hooks/useTracker.test.ts`
Expected: FAIL — `goals` and `setGoal` not on the hook API

- [ ] **Step 3: Implement goals state, boot validation, setGoal, and persistence**

Replace `src/hooks/useTracker.ts` with:

```ts
import { useCallback, useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { EventType, GoalEntry, TrackerEvent, DayTotals } from '@/types';
import {
  getDayKey,
  getDayTotals as calcDayTotals,
  getEventsForDay as calcEventsForDay,
  nowLocalIso,
  todayKey,
} from '@/lib/events';
import {
  getCurrentGoal as calcCurrentGoal,
  getDayGoalStatus as calcDayGoalStatus,
  getCurrentStreak as calcCurrentStreak,
  getRollingAverage as calcRollingAverage,
  getAverageDelta as calcAverageDelta,
  DayGoalStatus,
} from '@/lib/stats';
import {
  ImportError,
  mergeEvents,
  mergeGoals,
  parseImport,
  serializeExport,
} from '@/lib/export';

const STORAGE_KEY = 'smoking-tracker';
const DAY_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

export interface UseTrackerAPI {
  events: TrackerEvent[];
  addEvent(input: { type: EventType; location?: string; reason?: string }): void;
  removeEvent(id: string): void;
  updateEvent(id: string, patch: Partial<Omit<TrackerEvent, 'id'>>): void;
  clearDay(dayKey: string): void;
  getDayTotals(dayKey: string): DayTotals;
  getEventsForDay(dayKey: string): TrackerEvent[];
  getTodayTotals(): DayTotals;
  exportEvents(): string;
  importEvents(raw: string): ImportOutcome;

  goals: GoalEntry[];
  setGoal(limit: number | null): void;
  getCurrentGoal(): GoalEntry | null;
  getDayGoalStatus(dayKey: string): DayGoalStatus;
  getCurrentStreak(): number;
  getRollingAverage(days: number): number;
  getAverageDelta(days: number): number | null;
}

export type ImportOutcome =
  | { ok: true; added: number; skipped: number; goalsAdded: number; goalsSkipped: number }
  | { ok: false; error: ImportError };

function isValidGoalEntry(value: unknown): value is GoalEntry {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const obj = value as Record<string, unknown>;
  if (typeof obj.id !== 'string') return false;
  if (typeof obj.limit !== 'number' || !Number.isInteger(obj.limit) || obj.limit <= 0) return false;
  if (typeof obj.effectiveFrom !== 'string' || !DAY_KEY_RE.test(obj.effectiveFrom)) return false;
  return true;
}

function loadFromStorage(): { events: TrackerEvent[]; goals: GoalEntry[] } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { events: [], goals: [] };
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return { events: [], goals: [] };
    if (!Array.isArray(parsed.events)) return { events: [], goals: [] };

    // Validate goals
    if ('goals' in parsed) {
      if (!Array.isArray(parsed.goals)) return { events: [], goals: [] };
      for (const g of parsed.goals) {
        if (!isValidGoalEntry(g)) return { events: [], goals: [] };
      }
      const goals = (parsed.goals as GoalEntry[]).sort((a, b) =>
        a.effectiveFrom < b.effectiveFrom ? -1 : a.effectiveFrom > b.effectiveFrom ? 1 : 0
      );
      return { events: parsed.events as TrackerEvent[], goals };
    }

    return { events: parsed.events as TrackerEvent[], goals: [] };
  } catch {
    return { events: [], goals: [] };
  }
}

export function useTracker(): UseTrackerAPI {
  const [events, setEvents] = useState<TrackerEvent[]>(() => loadFromStorage().events);
  const [goals, setGoals] = useState<GoalEntry[]>(() => loadFromStorage().goals);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ events, goals }));
  }, [events, goals]);

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

  const setGoal = useCallback<UseTrackerAPI['setGoal']>((limit) => {
    if (limit === null) {
      setGoals((prev) => {
        const current = calcCurrentGoal(prev);
        if (!current) return prev;
        return prev.filter((g) => g.id !== current.id);
      });
      return;
    }
    if (typeof limit !== 'number' || !Number.isFinite(limit) || !Number.isInteger(limit) || limit <= 0) return;
    setGoals((prev) => {
      const current = calcCurrentGoal(prev);
      if (current && current.limit === limit) return prev;
      const today = todayKey();
      const existingToday = prev.findIndex((g) => g.effectiveFrom === today);
      if (existingToday >= 0) {
        const updated = [...prev];
        updated[existingToday] = { ...updated[existingToday], limit };
        return updated;
      }
      return [...prev, { id: uuidv4(), limit, effectiveFrom: today }].sort(
        (a, b) => (a.effectiveFrom < b.effectiveFrom ? -1 : a.effectiveFrom > b.effectiveFrom ? 1 : 0)
      );
    });
  }, []);

  const getCurrentGoal = useCallback<UseTrackerAPI['getCurrentGoal']>(
    () => calcCurrentGoal(goals),
    [goals]
  );

  const getDayGoalStatus = useCallback<UseTrackerAPI['getDayGoalStatus']>(
    (dayKey) => calcDayGoalStatus(events, goals, dayKey),
    [events, goals]
  );

  const getCurrentStreak = useCallback<UseTrackerAPI['getCurrentStreak']>(
    () => calcCurrentStreak(events, goals),
    [events, goals]
  );

  const getRollingAverage = useCallback<UseTrackerAPI['getRollingAverage']>(
    (days) => calcRollingAverage(events, days),
    [events]
  );

  const getAverageDelta = useCallback<UseTrackerAPI['getAverageDelta']>(
    (days) => calcAverageDelta(events, days),
    [events]
  );

  const exportEvents = useCallback<UseTrackerAPI['exportEvents']>(
    () => serializeExport(events, goals),
    [events, goals]
  );

  const importEvents = useCallback<UseTrackerAPI['importEvents']>(
    (raw) => {
      const parsed = parseImport(raw);
      if (!parsed.ok) {
        return { ok: false, error: parsed.error };
      }
      const evtResult = mergeEvents(events, parsed.events);
      const goalResult = mergeGoals(goals, parsed.goals);
      setEvents(evtResult.merged);
      setGoals(goalResult.merged);
      return {
        ok: true,
        added: evtResult.added,
        skipped: evtResult.skipped,
        goalsAdded: goalResult.added,
        goalsSkipped: goalResult.skipped,
      };
    },
    [events, goals]
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
    exportEvents,
    importEvents,
    goals,
    setGoal,
    getCurrentGoal,
    getDayGoalStatus,
    getCurrentStreak,
    getRollingAverage,
    getAverageDelta,
  };
}
```

- [ ] **Step 4: Fix the double `loadFromStorage` call**

The `useState` initializer calls `loadFromStorage()` twice. Fix by loading once:

```ts
export function useTracker(): UseTrackerAPI {
  const [state] = useState(() => loadFromStorage());
  const [events, setEvents] = useState<TrackerEvent[]>(state.events);
  const [goals, setGoals] = useState<GoalEntry[]>(state.goals);
  // ... rest unchanged
```

Wait — this doesn't work because `useState` for events/goals needs initial values, not a ref. Instead, use a ref for the initial load:

```ts
export function useTracker(): UseTrackerAPI {
  const [{ events: initEvents, goals: initGoals }] = useState(loadFromStorage);
  const [events, setEvents] = useState<TrackerEvent[]>(initEvents);
  const [goals, setGoals] = useState<GoalEntry[]>(initGoals);
```

Actually, `useState(loadFromStorage)` returns the object as state. Simplest fix:

```ts
export function useTracker(): UseTrackerAPI {
  const [initial] = useState(loadFromStorage);
  const [events, setEvents] = useState<TrackerEvent[]>(() => initial.events);
  const [goals, setGoals] = useState<GoalEntry[]>(() => initial.goals);
```

This calls `loadFromStorage` once.

- [ ] **Step 5: Update existing import tests for new `ImportOutcome` shape**

In `src/hooks/useTracker.test.ts`, update the import outcome assertions:

```ts
    // Old: expect(outcome!).toEqual({ ok: true, added: 1, skipped: 0 });
    // New:
    expect(outcome!.ok).toBe(true);
    if (outcome!.ok) {
      expect(outcome!.added).toBe(1);
      expect(outcome!.skipped).toBe(0);
    }
```

Do this for all import test assertions. The `goalsAdded`/`goalsSkipped` fields are new and can be asserted loosely.

- [ ] **Step 6: Run all tests**

Run: `npx vitest run`
Expected: all PASS

- [ ] **Step 7: Commit**

```bash
git add src/hooks/useTracker.ts src/hooks/useTracker.test.ts
git commit -m "feat: extend useTracker with goals state, setGoal, and derived queries (TDD)"
```

---

### Task 7: `useTracker` — reactive streak test + import goals test

**Files:**
- Modify: `src/hooks/useTracker.test.ts`

- [ ] **Step 1: Add tests for reactive streak and import with goals**

Append to `src/hooks/useTracker.test.ts`:

```ts
describe('useTracker — reactive streak', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('streak goes to 0 when adding event over limit', () => {
    vi.setSystemTime(new Date('2026-04-08T14:00:00Z'));
    const goals: GoalEntry[] = [
      { id: 'g1', limit: 1, effectiveFrom: '2026-04-01' },
    ];
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ events: [], goals }));
    const { result } = renderHook(() => useTracker());

    // First event — within limit
    act(() => { result.current.addEvent({ type: 'tobacco' }); });
    expect(result.current.getCurrentStreak()).toBeGreaterThan(0);

    // Second event — over limit
    act(() => { result.current.addEvent({ type: 'tobacco' }); });
    expect(result.current.getCurrentStreak()).toBe(0);
  });

  it('streak restores when removing event back under limit', () => {
    vi.setSystemTime(new Date('2026-04-08T14:00:00Z'));
    const goals: GoalEntry[] = [
      { id: 'g1', limit: 1, effectiveFrom: '2026-04-01' },
    ];
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ events: [], goals }));
    const { result } = renderHook(() => useTracker());

    act(() => { result.current.addEvent({ type: 'tobacco' }); });
    act(() => { result.current.addEvent({ type: 'tobacco' }); });
    expect(result.current.getCurrentStreak()).toBe(0);

    const secondId = result.current.events[1].id;
    act(() => { result.current.removeEvent(secondId); });
    expect(result.current.getCurrentStreak()).toBeGreaterThan(0);
  });
});

describe('useTracker — import with goals', () => {
  it('imports v2 file and merges goals', () => {
    const goals: GoalEntry[] = [
      { id: 'g1', limit: 10, effectiveFrom: '2026-04-01' },
    ];
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ events: [], goals }));
    const { result } = renderHook(() => useTracker());

    const file = {
      version: 2,
      exportedAt: '2026-04-08T20:00:00-03:00',
      eventCount: 1,
      dateRange: { from: '2026-04-08', to: '2026-04-08' },
      events: [{ id: 'e1', timestamp: '2026-04-08T12:00:00-03:00', type: 'tobacco' }],
      goals: [
        { id: 'g1', limit: 10, effectiveFrom: '2026-04-01' },
        { id: 'g2', limit: 8, effectiveFrom: '2026-04-10' },
      ],
    };

    let outcome: ReturnType<typeof result.current.importEvents>;
    act(() => { outcome = result.current.importEvents(JSON.stringify(file)); });

    expect(outcome!.ok).toBe(true);
    if (outcome!.ok) {
      expect(outcome!.added).toBe(1);
      expect(outcome!.goalsAdded).toBe(1);
      expect(outcome!.goalsSkipped).toBe(1);
    }
    expect(result.current.goals).toHaveLength(2);
  });

  it('imports v1 file — events merge, goals unchanged', () => {
    const goals: GoalEntry[] = [
      { id: 'g1', limit: 10, effectiveFrom: '2026-04-01' },
    ];
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ events: [], goals }));
    const { result } = renderHook(() => useTracker());

    const file = {
      version: 1,
      exportedAt: '2026-04-08T20:00:00-03:00',
      eventCount: 1,
      dateRange: { from: '2026-04-08', to: '2026-04-08' },
      events: [{ id: 'e1', timestamp: '2026-04-08T12:00:00-03:00', type: 'tobacco' }],
    };

    act(() => { result.current.importEvents(JSON.stringify(file)); });
    expect(result.current.events).toHaveLength(1);
    expect(result.current.goals).toEqual(goals); // unchanged
  });
});
```

- [ ] **Step 2: Run tests**

Run: `npx vitest run src/hooks/useTracker.test.ts`
Expected: all PASS (implementation already done in Task 6)

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useTracker.test.ts
git commit -m "test: add reactive streak and import-goals tests for useTracker"
```

---

### Task 8: `MetricsCard` component

**Files:**
- Create: `src/components/MetricsCard.tsx`

- [ ] **Step 1: Create the component**

```tsx
// src/components/MetricsCard.tsx
import { Card } from '@/components/ui/card';

interface MetricsCardProps {
  todayTotal: number;
  goalLimit: number;
  streak: number;
  average7d: number;
  delta7d: number | null;
}

export const MetricsCard = ({
  todayTotal,
  goalLimit,
  streak,
  average7d,
  delta7d,
}: MetricsCardProps) => {
  const isOver = todayTotal > goalLimit;
  const progressPct = Math.min(100, (todayTotal / goalLimit) * 100);

  const formatDelta = (d: number | null): { text: string; className: string } => {
    if (d === null) return { text: '—', className: 'text-muted-foreground' };
    const pct = Math.abs(d * 100).toFixed(0);
    if (d < 0) return { text: `▼ ${pct}%`, className: 'text-emerald-500' };
    if (d > 0) return { text: `▲ ${pct}%`, className: 'text-rose-500' };
    return { text: '0%', className: 'text-muted-foreground' };
  };

  const delta = formatDelta(delta7d);

  return (
    <Card className="p-4" style={{ boxShadow: 'var(--shadow-soft)' }}>
      <div className="flex text-center divide-x divide-border">
        {/* Today / Goal */}
        <div className="flex-1 px-3">
          <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
            hoje / meta
          </div>
          <div className="text-xl font-bold mt-1">
            {todayTotal}
            <span className="text-muted-foreground font-normal">/{goalLimit}</span>
          </div>
          <div className="h-1 bg-muted rounded-full mt-2 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${isOver ? 'bg-rose-500' : 'bg-emerald-500'}`}
              style={{ width: `${isOver ? 100 : progressPct}%` }}
            />
          </div>
        </div>

        {/* Streak */}
        <div className="flex-1 px-3">
          <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
            streak
          </div>
          <div className="text-xl font-bold mt-1">
            {streak > 0 ? `🔥 ${streak}` : '0'}
          </div>
          <div className="text-[10px] text-muted-foreground mt-2">
            dias na meta
          </div>
        </div>

        {/* 7d average */}
        <div className="flex-1 px-3">
          <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
            média 7d
          </div>
          <div className="text-xl font-bold mt-1">
            {average7d.toFixed(1)}
          </div>
          <div className={`text-[10px] mt-2 ${delta.className}`}>
            {delta.text}
          </div>
        </div>
      </div>
    </Card>
  );
};
```

- [ ] **Step 2: Verify build**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/components/MetricsCard.tsx
git commit -m "feat: add MetricsCard component"
```

---

### Task 9: `SettingsDrawer` — add goal section

**Files:**
- Modify: `src/components/SettingsDrawer.tsx`

- [ ] **Step 1: Update `SettingsDrawerProps` and add goal section**

Update the interface:

```tsx
interface SettingsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExport: () => string;
  onImport: (raw: string) => ImportOutcome;
  currentGoalLimit: number | null;
  onSetGoal: (limit: number | null) => void;
}
```

Add goal state and section. Full updated component:

```tsx
import { useRef, useState, useEffect } from 'react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ImportOutcome } from '@/hooks/useTracker';
import { ImportError } from '@/lib/export';
import { todayKey } from '@/lib/events';

interface SettingsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExport: () => string;
  onImport: (raw: string) => ImportOutcome;
  currentGoalLimit: number | null;
  onSetGoal: (limit: number | null) => void;
}

const IMPORT_ERROR_MESSAGES: Record<ImportError, string> = {
  'invalid-json': 'Arquivo não é um JSON válido',
  'invalid-shape': 'Arquivo não parece ser um backup do Smoking Tracker',
  'unsupported-version': 'Versão do arquivo não suportada',
  'invalid-events': 'Arquivo contém eventos inválidos',
  'invalid-goals': 'Arquivo contém metas inválidas',
};

export const SettingsDrawer = ({
  open,
  onOpenChange,
  onExport,
  onImport,
  currentGoalLimit,
  onSetGoal,
}: SettingsDrawerProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [goalInput, setGoalInput] = useState('');

  useEffect(() => {
    if (open) {
      setGoalInput(currentGoalLimit !== null ? String(currentGoalLimit) : '');
    }
  }, [open, currentGoalLimit]);

  const parsedGoal = Number(goalInput);
  const isGoalValid = goalInput !== '' && Number.isInteger(parsedGoal) && parsedGoal > 0;

  const handleSaveGoal = () => {
    if (!isGoalValid) return;
    onSetGoal(parsedGoal);
    toast.success('Meta atualizada');
  };

  const handleRemoveGoal = () => {
    if (!window.confirm('Remover meta atual? O streak volta pra zero.')) return;
    onSetGoal(null);
    toast.success('Meta removida');
  };

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
        const parts: string[] = [];
        if (result.added > 0 || result.skipped > 0) {
          parts.push(`${result.added} eventos importados (${result.skipped} duplicados)`);
        }
        if (result.goalsAdded > 0 || result.goalsSkipped > 0) {
          parts.push(`${result.goalsAdded} metas importadas`);
        }
        toast.success(parts.join('. ') || 'Nenhum dado novo encontrado');
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
          <DrawerDescription>Meta diária, backup e restauração.</DrawerDescription>
        </DrawerHeader>
        <div className="px-4 pb-6 space-y-6">
          <section className="space-y-2">
            <h3 className="text-sm font-semibold">Meta diária</h3>
            <p className="text-xs text-muted-foreground">
              Máx. eventos por dia (tabaco + cannabis).
            </p>
            <div className="flex gap-2">
              <Input
                type="number"
                min={1}
                step={1}
                placeholder="ex: 10"
                value={goalInput}
                onChange={(e) => setGoalInput(e.target.value)}
                className="flex-1"
              />
              <Button onClick={handleSaveGoal} disabled={!isGoalValid}>
                Salvar
              </Button>
            </div>
            {currentGoalLimit !== null && (
              <button
                onClick={handleRemoveGoal}
                className="text-xs text-rose-500 hover:underline"
              >
                Remover meta
              </button>
            )}
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-semibold">Exportar dados</h3>
            <p className="text-xs text-muted-foreground">
              Baixa um arquivo JSON com todos os seus eventos e metas.
            </p>
            <Button onClick={handleExport} className="w-full">
              <Download className="w-4 h-4 mr-2" />
              Exportar JSON
            </Button>
          </section>

          <section className="space-y-2">
            <h3 className="text-sm font-semibold">Importar dados</h3>
            <p className="text-xs text-muted-foreground">
              Adiciona eventos e metas de um backup. Duplicados (mesmo id) são ignorados.
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

- [ ] **Step 2: Verify build**

Run: `npx tsc --noEmit`
Expected: errors about `App.tsx` not passing the new props yet — that's expected, will fix in Task 12

- [ ] **Step 3: Commit**

```bash
git add src/components/SettingsDrawer.tsx
git commit -m "feat: add goal section to SettingsDrawer"
```

---

### Task 10: `CalendarView` — status dot

**Files:**
- Modify: `src/components/CalendarView.tsx`

- [ ] **Step 1: Add `getDayGoalStatus` prop and render dot in `DayCell`**

Add to interface:

```tsx
import { DayGoalStatus } from '@/lib/stats';

interface CalendarViewProps {
  getDayTotals: (dayKey: string) => DayTotals;
  getDayGoalStatus: (dayKey: string) => DayGoalStatus;
  onDayClick: (dayKey: string) => void;
  events: TrackerEvent[];
}
```

Update `DayCell` to show dot. Add inside the component function, right after the opening `<div>` of each cell, in the top-right corner:

```tsx
  const DayCell = ({ dayKey }: { dayKey: string }) => {
    const totals = getDayTotals(dayKey);
    const total = totals.tobacco + totals.cannabis;
    const isToday = dayKey === todayStr;
    const date = parseISO(dayKey + 'T00:00:00');
    const goalStatus = getDayGoalStatus(dayKey);

    return (
      <div
        onClick={() => onDayClick(dayKey)}
        className={`
          relative flex flex-col items-center gap-2 p-3 rounded-2xl transition-all cursor-pointer hover:scale-105 active:scale-95
          ${isToday ? 'bg-accent ring-2 ring-primary' : 'bg-card'}
          ${total > 0 ? 'opacity-100' : 'opacity-40'}
        `}
      >
        {goalStatus !== 'no-goal' && (
          <span
            aria-hidden
            className={`absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full ${
              goalStatus === 'within' ? 'bg-emerald-500' : 'bg-rose-500'
            }`}
          />
        )}
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
```

Update the destructured props:

```tsx
export const CalendarView = ({ getDayTotals, getDayGoalStatus, onDayClick, events }: CalendarViewProps) => {
```

- [ ] **Step 2: Verify build**

Run: `npx tsc --noEmit`
Expected: error in `App.tsx` about missing prop — expected, fix in Task 12

- [ ] **Step 3: Commit**

```bash
git add src/components/CalendarView.tsx
git commit -m "feat: add goal status dot to CalendarView cells"
```

---

### Task 11: `MonthlyChart` — moving average line

**Files:**
- Modify: `src/components/MonthlyChart.tsx`

- [ ] **Step 1: Switch to `ComposedChart` and add moving average `Line`**

```tsx
import {
  Bar,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { Card } from '@/components/ui/card';
import { format, parseISO } from 'date-fns';
import { DayTotals, TrackerEvent } from '@/types';
import { getMovingAverageSeries } from '@/lib/stats';

interface MonthlyChartProps {
  dayKeys: string[];
  getDayTotals: (dayKey: string) => DayTotals;
  onDayClick: (dayKey: string) => void;
  events: TrackerEvent[];
}

export const MonthlyChart = ({ dayKeys, getDayTotals, onDayClick, events }: MonthlyChartProps) => {
  const movingAvg = getMovingAverageSeries(events, dayKeys, 7);
  const avgMap = new Map(movingAvg.map((p) => [p.dayKey, p.average]));

  const chartData = dayKeys.map((dayKey) => {
    const totals = getDayTotals(dayKey);
    return {
      dayKey,
      day: format(parseISO(dayKey + 'T00:00:00'), 'dd'),
      fullDate: format(parseISO(dayKey + 'T00:00:00'), 'dd/MM'),
      tobacco: totals.tobacco,
      cannabis: totals.cannabis,
      avg7d: avgMap.get(dayKey) ?? 0,
    };
  });

  const handleChartClick = (e: any) => {
    const payload = e?.activePayload?.[0]?.payload;
    if (payload?.dayKey) onDayClick(payload.dayKey);
  };

  return (
    <div className="h-[200px] w-full mt-4 mb-6" style={{ fontFamily: 'inherit' }}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={chartData} onClick={handleChartClick}>
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
                const p = payload[0].payload as {
                  fullDate: string;
                  tobacco: number;
                  cannabis: number;
                  avg7d: number;
                };
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
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span className="text-sm font-bold">{p.avg7d.toFixed(1)}</span>
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
          <Line
            dataKey="avg7d"
            type="monotone"
            stroke="#10b981"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 3 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};
```

- [ ] **Step 2: Update `CalendarView.tsx` to pass `events` prop to `MonthlyChart`**

In `CalendarView.tsx`, the `MonthlyChart` invocation becomes:

```tsx
<MonthlyChart dayKeys={monthDays} getDayTotals={getDayTotals} onDayClick={onDayClick} events={events} />
```

This already has `events` available in `CalendarView` props.

- [ ] **Step 3: Verify build**

Run: `npx tsc --noEmit`
Expected: errors only in `App.tsx` (missing new props) — expected

- [ ] **Step 4: Commit**

```bash
git add src/components/MonthlyChart.tsx src/components/CalendarView.tsx
git commit -m "feat: add 7-day moving average line to MonthlyChart"
```

---

### Task 12: `App.tsx` — wire everything together

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Update App.tsx**

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
import { MetricsCard } from '@/components/MetricsCard';
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
  const currentGoal = tracker.getCurrentGoal();

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

          {currentGoal && (
            <div className="mb-8">
              <MetricsCard
                todayTotal={totals.tobacco + totals.cannabis}
                goalLimit={currentGoal.limit}
                streak={tracker.getCurrentStreak()}
                average7d={tracker.getRollingAverage(7)}
                delta7d={tracker.getAverageDelta(7)}
              />
            </div>
          )}

          <CalendarView
            getDayTotals={tracker.getDayTotals}
            getDayGoalStatus={tracker.getDayGoalStatus}
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
          currentGoalLimit={currentGoal?.limit ?? null}
          onSetGoal={tracker.setGoal}
        />
      </div>
    </TooltipProvider>
  );
};

export default App;
```

- [ ] **Step 2: Verify build**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "feat: wire MetricsCard, goal status, and settings into App"
```

---

### Task 13: Final verification

- [ ] **Step 1: Run full test suite**

Run: `npx vitest run`
Expected: all PASS

- [ ] **Step 2: Run production build**

Run: `npm run build`
Expected: clean build, `dist/index.html` generated, no warnings

- [ ] **Step 3: Verify no type errors**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 4: Commit any remaining changes and tag completion**

```bash
git status
# If clean, no commit needed
# If there are loose changes, commit them
```
