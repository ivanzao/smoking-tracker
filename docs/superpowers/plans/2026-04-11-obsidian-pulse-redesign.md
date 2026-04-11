# Obsidian Pulse Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adapt the smoking-tracker app to match the "Obsidian Pulse" design system from Stitch, introducing multi-tab navigation (Tracker / History / Goals), a premium dark-only palette, and mobile bottom nav + desktop sidebar nav.

**Architecture:** State-based navigation via `useState<'tracker' | 'history' | 'goals'>` in `App.tsx`. Three new page components (`TrackerPage`, `HistoryPage`, `GoalsPage`) plus `BottomNav` and `TopNav` shell components. All tracker data flows from `useTracker` in `App.tsx` down via props — pages never call `useTracker` directly.

**Tech Stack:** React 18, TypeScript, Tailwind CSS 3, shadcn/ui (Radix), Recharts, Vitest + Testing Library, Vite PWA.

---

## File Map

| Action | File | Purpose |
|--------|------|---------|
| Modify | `src/index.css` | Replace palette with Obsidian Pulse tokens |
| Modify | `tailwind.config.ts` | Add surface-container-* and on-surface-* color tokens |
| Modify | `index.html` | Add Inter + Material Symbols fonts, update theme-color |
| Rewrite | `src/components/CounterCard.tsx` | Quick Log button (Material Symbols, large tap) |
| Modify | `src/components/CalendarView.tsx` | Export `DayCell` and `MonthNavigation` as named exports |
| Create | `src/components/BottomNav.tsx` | Mobile fixed bottom navigation (3 tabs) |
| Create | `src/components/BottomNav.test.tsx` | Tests for active state and onChange |
| Create | `src/components/TopNav.tsx` | Desktop fixed header + left sidebar |
| Create | `src/pages/TrackerPage.tsx` | Today view: Quick Log + streak + bento |
| Create | `src/pages/HistoryPage.tsx` | History view: stats + chart + calendar + logs |
| Create | `src/pages/GoalsPage.tsx` | Goals view: goal slider + export/import |
| Create | `src/pages/GoalsPage.test.tsx` | Tests for setGoal callback |
| Rewrite | `src/App.tsx` | Navigation shell with tab state |
| Create | `src/App.test.tsx` | Tests for navigation switching |
| Delete | `src/components/SettingsDrawer.tsx` | Content migrated to GoalsPage |
| Delete | `src/components/MetricsCard.tsx` | Content migrated to TrackerPage bento |

---

## Task 1: Design Tokens + Google Fonts

**Files:**
- Modify: `src/index.css`
- Modify: `tailwind.config.ts`
- Modify: `index.html`

- [ ] **Step 1: Replace `src/index.css` with Obsidian Pulse tokens**

Replace the entire file content:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    /* Core surface palette */
    --background:                0 0% 7%;
    --foreground:               20 6% 89%;

    --card:                      0 2% 11%;
    --card-foreground:          20 6% 89%;

    --popover:                   0 0% 16%;
    --popover-foreground:       20 6% 89%;

    /* Brand colors */
    --primary:                 141 100% 73%;
    --primary-foreground:      148 100% 11%;

    --secondary:                17 100% 81%;
    --secondary-foreground:     14 100% 18%;

    /* Surface containers (tonal depth) */
    --surface-container-lowest:  0 0% 5%;
    --surface-container-low:     0 2% 11%;
    --surface-container:         0 2% 12%;
    --surface-container-high:    0 0% 16%;
    --surface-container-highest: 60 1% 21%;

    /* On-surface text */
    --on-surface:               20 6% 89%;
    --on-surface-variant:      118 13% 76%;
    --on-primary:              148 100% 11%;

    /* Borders (outline only — no structural borders) */
    --outline-variant:         126 11% 26%;
    --border:                  126 11% 26%;
    --input:                     0 0% 16%;
    --ring:                    141 100% 73%;

    /* Utility */
    --muted:                     0 2% 12%;
    --muted-foreground:        118 13% 76%;
    --accent:                    0 0% 16%;
    --accent-foreground:        20 6% 89%;
    --destructive:               5 100% 84%;
    --destructive-foreground:  357 100% 21%;

    --radius: 0.5rem;
  }
}

@layer base {
  * {
    @apply border-border;
  }

  html {
    scrollbar-width: none;
    -ms-overflow-style: none;
  }

  html::-webkit-scrollbar {
    display: none;
  }

  body {
    @apply bg-background text-foreground;
    font-family: 'Inter', sans-serif;
    -webkit-font-smoothing: antialiased;
  }

  input[type=number]::-webkit-inner-spin-button,
  input[type=number]::-webkit-outer-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  input[type=number] {
    -moz-appearance: textfield;
  }
}

/* Material Symbols */
.material-symbols-outlined {
  font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
  font-family: 'Material Symbols Outlined';
  font-style: normal;
  font-weight: normal;
  line-height: 1;
  letter-spacing: normal;
  text-transform: none;
  display: inline-block;
  white-space: nowrap;
  word-wrap: normal;
  direction: ltr;
  -webkit-font-smoothing: antialiased;
  user-select: none;
}

.material-symbols-filled {
  font-variation-settings: 'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24;
}
```

- [ ] **Step 2: Update `tailwind.config.ts` — add surface-container and on-surface tokens**

In the `colors` object inside `theme.extend`, add these entries alongside the existing ones:

```ts
// Add inside colors: { ... }
'surface-container-lowest': 'hsl(var(--surface-container-lowest))',
'surface-container-low':    'hsl(var(--surface-container-low))',
'surface-container':        'hsl(var(--surface-container))',
'surface-container-high':   'hsl(var(--surface-container-high))',
'surface-container-highest':'hsl(var(--surface-container-highest))',
'on-surface':               'hsl(var(--on-surface))',
'on-surface-variant':       'hsl(var(--on-surface-variant))',
'on-primary':               'hsl(var(--on-primary))',
'outline-variant':          'hsl(var(--outline-variant))',
```

The full `colors` block should now look like:

```ts
colors: {
  border: 'hsl(var(--border))',
  input: 'hsl(var(--input))',
  ring: 'hsl(var(--ring))',
  background: 'hsl(var(--background))',
  foreground: 'hsl(var(--foreground))',
  primary: {
    DEFAULT: 'hsl(var(--primary))',
    foreground: 'hsl(var(--primary-foreground))',
  },
  secondary: {
    DEFAULT: 'hsl(var(--secondary))',
    foreground: 'hsl(var(--secondary-foreground))',
  },
  destructive: {
    DEFAULT: 'hsl(var(--destructive))',
    foreground: 'hsl(var(--destructive-foreground))',
  },
  muted: {
    DEFAULT: 'hsl(var(--muted))',
    foreground: 'hsl(var(--muted-foreground))',
  },
  accent: {
    DEFAULT: 'hsl(var(--accent))',
    foreground: 'hsl(var(--accent-foreground))',
  },
  popover: {
    DEFAULT: 'hsl(var(--popover))',
    foreground: 'hsl(var(--popover-foreground))',
  },
  card: {
    DEFAULT: 'hsl(var(--card))',
    foreground: 'hsl(var(--card-foreground))',
  },
  'surface-container-lowest': 'hsl(var(--surface-container-lowest))',
  'surface-container-low':    'hsl(var(--surface-container-low))',
  'surface-container':        'hsl(var(--surface-container))',
  'surface-container-high':   'hsl(var(--surface-container-high))',
  'surface-container-highest':'hsl(var(--surface-container-highest))',
  'on-surface':               'hsl(var(--on-surface))',
  'on-surface-variant':       'hsl(var(--on-surface-variant))',
  'on-primary':               'hsl(var(--on-primary))',
  'outline-variant':          'hsl(var(--outline-variant))',
},
```

Also remove the `leaf` and `cigarette` custom colors (no longer used) and the `sidebar-*` CSS vars from `index.css` (already removed above).

- [ ] **Step 3: Update `index.html` — fonts and theme-color**

Replace the `<head>` section:

```html
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <link rel="manifest" href="./manifest.json" />
  <meta name="theme-color" content="#131313" />
  <title>Smoking Tracker</title>
  <meta property="og:title" content="Smoking Tracker" />
  <meta property="og:type" content="website" />
  <meta property="og:image" content="/og-image.png" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap" rel="stylesheet" />
</head>
```

- [ ] **Step 4: Run dev server and verify dark canvas loads**

```bash
cd /home/ivanzao/dev/repository/smoking-tracker && npm run dev
```

Open http://localhost:5173 — background should be `#131313` (nearly black). No light flash.

- [ ] **Step 5: Run existing tests to confirm no regressions**

```bash
npm run test:run
```

Expected: all existing `useTracker.test.ts` tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/index.css tailwind.config.ts index.html
git commit -m "feat: apply Obsidian Pulse design tokens and add Material Symbols font"
```

---

## Task 2: BottomNav Component

**Files:**
- Create: `src/components/BottomNav.tsx`
- Create: `src/components/BottomNav.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/components/BottomNav.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BottomNav } from './BottomNav';

describe('BottomNav', () => {
  it('renders all three tab buttons', () => {
    render(<BottomNav tab="tracker" onChange={() => {}} />);
    expect(screen.getByRole('button', { name: /tracker/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /history/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /goals/i })).toBeInTheDocument();
  });

  it('applies primary color class to the active tab only', () => {
    render(<BottomNav tab="history" onChange={() => {}} />);
    const historyBtn = screen.getByRole('button', { name: /history/i });
    const trackerBtn = screen.getByRole('button', { name: /tracker/i });
    expect(historyBtn.className).toContain('text-primary');
    expect(trackerBtn.className).not.toContain('text-primary');
  });

  it('calls onChange with the correct tab when a button is clicked', () => {
    const onChange = vi.fn();
    render(<BottomNav tab="tracker" onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: /history/i }));
    expect(onChange).toHaveBeenCalledOnce();
    expect(onChange).toHaveBeenCalledWith('history');
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
npm run test:run -- BottomNav
```

Expected: FAIL with "Cannot find module './BottomNav'"

- [ ] **Step 3: Implement `src/components/BottomNav.tsx`**

```tsx
type Tab = 'tracker' | 'history' | 'goals';

interface BottomNavProps {
  tab: Tab;
  onChange: (tab: Tab) => void;
}

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'tracker', label: 'Tracker', icon: 'add_circle' },
  { id: 'history', label: 'History', icon: 'history' },
  { id: 'goals',   label: 'Goals',   icon: 'bolt' },
];

export const BottomNav = ({ tab, onChange }: BottomNavProps) => (
  <nav
    aria-label="Main navigation"
    className="md:hidden fixed bottom-0 left-0 w-full flex justify-around items-center h-20 pb-safe px-4 bg-surface-container-low/80 backdrop-blur-xl z-50 rounded-t-2xl shadow-[0_-4px_24px_rgba(0,0,0,0.4)]"
  >
    {TABS.map(({ id, label, icon }) => {
      const active = tab === id;
      return (
        <button
          key={id}
          aria-label={label}
          aria-current={active ? 'page' : undefined}
          onClick={() => onChange(id)}
          className={`flex flex-col items-center justify-center gap-1 px-3 py-1 rounded-xl transition-all duration-200 active:scale-90 ${
            active
              ? 'text-primary bg-primary/10'
              : 'text-on-surface-variant hover:text-on-surface'
          }`}
        >
          <span className="material-symbols-outlined">{icon}</span>
          <span className="font-medium uppercase text-[10px] tracking-[0.1em]">{label}</span>
        </button>
      );
    })}
  </nav>
);
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm run test:run -- BottomNav
```

Expected: 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/BottomNav.tsx src/components/BottomNav.test.tsx
git commit -m "feat: add BottomNav component with 3 tabs"
```

---

## Task 3: CounterCard Rewrite

**Files:**
- Rewrite: `src/components/CounterCard.tsx`

- [ ] **Step 1: Rewrite `src/components/CounterCard.tsx` as Quick Log button**

```tsx
import { EventType } from '@/types';

interface CounterCardProps {
  type: EventType;
  count: number;
  onTap: () => void;
}

const META: Record<EventType, { label: string; icon: string; colorClass: string; hoverBorder: string }> = {
  tobacco: {
    label: 'Tabaco',
    icon: 'smoke_free',
    colorClass: 'text-secondary',
    hoverBorder: 'hover:border-secondary/30',
  },
  cannabis: {
    label: 'Cannabis',
    icon: 'potted_plant',
    colorClass: 'text-primary',
    hoverBorder: 'hover:border-primary/30',
  },
};

export const CounterCard = ({ type, count, onTap }: CounterCardProps) => {
  const { label, icon, colorClass, hoverBorder } = META[type];

  return (
    <button
      onClick={onTap}
      className={`flex flex-col items-center justify-center gap-3 bg-surface-container-high p-6 rounded-2xl border border-transparent ${hoverBorder} transition-all active:scale-95 group`}
    >
      <span className={`material-symbols-outlined text-4xl group-hover:scale-110 transition-transform ${colorClass}`}>
        {icon}
      </span>
      <div className="flex flex-col items-center gap-0.5">
        <span className="text-2xl font-bold text-on-surface">{count}</span>
        <span className="text-[10px] font-bold tracking-widest text-on-surface-variant uppercase">{label}</span>
      </div>
    </button>
  );
};
```

- [ ] **Step 2: Verify dev server renders Quick Log buttons correctly**

```bash
npm run dev
```

Open http://localhost:5173. The two counter cards should now look like large tap buttons with Material Symbols icons.

- [ ] **Step 3: Commit**

```bash
git add src/components/CounterCard.tsx
git commit -m "refactor: rewrite CounterCard as Quick Log button with Material Symbols"
```

---

## Task 4: CalendarView — Extract Named Exports

**Files:**
- Modify: `src/components/CalendarView.tsx`

The `DayCell` and `MonthNavigation` inner components need to become named exports so `HistoryPage` can use them directly.

- [ ] **Step 1: Extract `DayCell` and `MonthNavigation` as named exports at top of file**

Add these interfaces and components as named exports before the `CalendarView` function. Then remove the inline definitions inside `CalendarView` and use the exported versions.

The extracted types and components to add at the top of `CalendarView.tsx` (after imports):

```tsx
import { DayGoalStatus } from '@/lib/stats';
import { DayTotals } from '@/types';
// (these are already imported — verify and keep)

export interface DayCellProps {
  dayKey: string;
  getDayTotals: (dayKey: string) => DayTotals;
  getDayGoalStatus: (dayKey: string) => DayGoalStatus;
  onDayClick: (dayKey: string) => void;
  todayStr: string;
}

export const DayCell = ({
  dayKey,
  getDayTotals,
  getDayGoalStatus,
  onDayClick,
  todayStr,
}: DayCellProps) => {
  const totals = getDayTotals(dayKey);
  const total = totals.tobacco + totals.cannabis;
  const isToday = dayKey === todayStr;
  const date = parseISO(dayKey + 'T00:00:00');
  const goalStatus = getDayGoalStatus(dayKey);
  const weekday = format(date, 'EEE', { locale: ptBR }).slice(0, 3);

  return (
    <div
      onClick={() => onDayClick(dayKey)}
      className={`
        relative flex flex-col items-center gap-1 p-2 rounded-lg transition-transform duration-100 cursor-pointer hover:scale-105 active:scale-[0.93]
        ${isToday ? 'bg-accent ring-2 ring-primary' : 'bg-card'}
        ${total > 0 ? 'opacity-100' : 'opacity-40'}
      `}
    >
      {goalStatus !== 'no-goal' && (
        <span
          aria-hidden
          className={`absolute top-1 right-1 w-1.5 h-1.5 rounded-full ${
            goalStatus === 'within' ? 'bg-primary' : 'bg-destructive'
          }`}
        />
      )}
      <div className="text-[0.55rem] font-medium text-on-surface-variant capitalize">{weekday}</div>
      <div className={`text-[0.7rem] ${isToday ? 'font-semibold text-on-surface' : 'text-on-surface-variant'}`}>
        {format(date, 'dd')}
      </div>
      {total > 0 ? (
        <div className="flex flex-col items-center gap-0.5">
          {totals.tobacco > 0 && (
            <div className="flex items-center gap-1">
              <div className="w-[5px] h-[5px] rounded-full bg-secondary" />
              <span className="text-[0.65rem] font-semibold">{totals.tobacco}</span>
            </div>
          )}
          {totals.cannabis > 0 && (
            <div className="flex items-center gap-1">
              <div className="w-[5px] h-[5px] rounded-full bg-primary" />
              <span className="text-[0.65rem] font-semibold">{totals.cannabis}</span>
            </div>
          )}
        </div>
      ) : (
        <span className="text-[0.6rem] text-on-surface-variant">—</span>
      )}
    </div>
  );
};

export interface MonthNavigationProps {
  label: string;
  canGoBack: boolean;
  canGoForward: boolean;
  onBack: () => void;
  onForward: () => void;
}

export const MonthNavigation = ({
  label,
  canGoBack,
  canGoForward,
  onBack,
  onForward,
}: MonthNavigationProps) => (
  <div className="flex items-center justify-between">
    <button
      onClick={onBack}
      disabled={!canGoBack}
      aria-label="Mês anterior"
      className="w-8 h-8 flex items-center justify-center rounded-lg bg-surface-container-high text-on-surface-variant hover:text-on-surface disabled:opacity-30 transition-colors"
    >
      <span className="material-symbols-outlined text-sm">chevron_left</span>
    </button>
    <span className="text-sm font-medium capitalize text-on-surface">{label}</span>
    <button
      onClick={onForward}
      disabled={!canGoForward}
      aria-label="Próximo mês"
      className="w-8 h-8 flex items-center justify-center rounded-lg bg-surface-container-high text-on-surface-variant hover:text-on-surface disabled:opacity-30 transition-colors"
    >
      <span className="material-symbols-outlined text-sm">chevron_right</span>
    </button>
  </div>
);
```

- [ ] **Step 2: Update `CalendarView` to use the exported components**

Inside `CalendarView`, remove the inline `DayCell` and `MonthNavigation` definitions and use the exported ones instead. Pass all required props explicitly:

```tsx
// In the "week" tab and desktop week section — update DayCell usage:
<DayCell
  key={d}
  dayKey={d}
  getDayTotals={getDayTotals}
  getDayGoalStatus={getDayGoalStatus}
  onDayClick={onDayClick}
  todayStr={todayStr}
/>

// For MonthNavigation — pass the computed values:
<MonthNavigation
  label={monthLabel}
  canGoBack={canGoBack}
  canGoForward={canGoForward}
  onBack={goBack}
  onForward={goForward}
/>
```

Also update the goal status dot colors (previously used `bg-emerald-500` / `bg-rose-500` — now use `bg-primary` / `bg-destructive` to match the design system).

- [ ] **Step 3: Run existing tests to verify no regression**

```bash
npm run test:run
```

Expected: all tests still pass.

- [ ] **Step 4: Commit**

```bash
git add src/components/CalendarView.tsx
git commit -m "refactor: export DayCell and MonthNavigation from CalendarView"
```

---

## Task 5: TrackerPage

**Files:**
- Create: `src/pages/TrackerPage.tsx`

- [ ] **Step 1: Create `src/pages/TrackerPage.tsx`**

```tsx
import { format, parseISO, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { EventType } from '@/types';
import { UseTrackerAPI } from '@/hooks/useTracker';
import { getDaysInRange, todayKey } from '@/lib/events';

interface TrackerPageProps {
  tracker: UseTrackerAPI;
  onOpenNewEvent: (type: EventType) => void;
}

export const TrackerPage = ({ tracker, onOpenNewEvent }: TrackerPageProps) => {
  const totals = tracker.getTodayTotals();
  const todayTotal = totals.tobacco + totals.cannabis;
  const currentGoal = tracker.getCurrentGoal();
  const streak = tracker.getCurrentStreak();

  const today = new Date();
  const weekDays = getDaysInRange(subDays(today, 6), today);
  const weekTotals = weekDays.map((d) => {
    const t = tracker.getDayTotals(d);
    return { dayKey: d, total: t.tobacco + t.cannabis, tobacco: t.tobacco, cannabis: t.cannabis };
  });
  const maxTotal = Math.max(1, ...weekTotals.map((w) => w.total));

  return (
    <main className="flex-1 px-6 pt-24 pb-32 overflow-y-auto md:hidden">
      {/* Quick Log */}
      <section className="mb-8 space-y-4">
        <p className="text-[10px] font-medium text-on-surface-variant uppercase tracking-[0.1em]">
          Quick Log
        </p>
        <div className="grid grid-cols-2 gap-4">
          {(['tobacco', 'cannabis'] as EventType[]).map((type) => {
            const isTobacco = type === 'tobacco';
            return (
              <button
                key={type}
                onClick={() => onOpenNewEvent(type)}
                className={`flex flex-col items-center justify-center gap-3 bg-surface-container-high p-6 rounded-2xl border border-transparent transition-all active:scale-95 group ${
                  isTobacco ? 'hover:border-secondary/30' : 'hover:border-primary/30'
                }`}
              >
                <span
                  className={`material-symbols-outlined text-4xl group-hover:scale-110 transition-transform ${
                    isTobacco ? 'text-secondary' : 'text-primary'
                  }`}
                >
                  {isTobacco ? 'smoke_free' : 'potted_plant'}
                </span>
                <span className="text-[10px] font-bold tracking-widest text-on-surface uppercase">
                  {isTobacco ? 'Tabaco' : 'Cannabis'}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Hero Streak */}
      {currentGoal && streak > 0 && (
        <section className="mb-8">
          <div className="flex flex-col items-start">
            <span className="text-[10px] font-medium text-on-surface-variant uppercase tracking-[0.2em] mb-1">
              Streak Atual
            </span>
            <div className="flex items-baseline gap-2">
              <h2 className="text-5xl font-bold tracking-tight text-primary">{streak}</h2>
              <span className="text-xl font-semibold text-primary/60">dias</span>
            </div>
          </div>
        </section>
      )}

      {/* Bento Grid */}
      <div className="grid grid-cols-2 gap-4">
        {/* Today's Consumption */}
        <div className="col-span-2 bg-surface-container-low rounded-xl p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16" />
          <div className="relative z-10">
            <p className="text-[10px] font-medium text-on-surface-variant uppercase tracking-[0.1em] mb-4">
              Consumo de Hoje
            </p>
            <div className="flex justify-between items-end">
              <div className="space-y-4">
                <div>
                  <p className="text-secondary text-sm font-medium mb-1">Tabaco</p>
                  <p className="text-3xl font-bold text-on-surface">{totals.tobacco}</p>
                </div>
                <div>
                  <p className="text-primary text-sm font-medium mb-1">Cannabis</p>
                  <p className="text-3xl font-bold text-on-surface">{totals.cannabis}</p>
                </div>
              </div>
              {currentGoal && (
                <div className="text-right">
                  <p className="text-[10px] text-on-surface-variant uppercase tracking-widest mb-1">
                    Meta Diária
                  </p>
                  <div className="flex items-baseline justify-end gap-1">
                    <span className="text-4xl font-black text-on-surface">{todayTotal}</span>
                    <span className="text-xl font-medium text-on-surface-variant">
                      / {currentGoal.limit}
                    </span>
                  </div>
                </div>
              )}
            </div>
            {currentGoal && (
              <div className="mt-6 h-1.5 w-full bg-surface-container-high rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-primary to-primary-container rounded-full transition-all"
                  style={{ width: `${Math.min(100, (todayTotal / currentGoal.limit) * 100)}%` }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Last 7 Days mini chart */}
        <div className="col-span-2 bg-surface-container rounded-xl p-5">
          <p className="text-[10px] font-medium text-on-surface-variant uppercase tracking-[0.1em] mb-6">
            Últimos 7 Dias
          </p>
          <div className="h-24 flex items-end justify-between gap-1">
            {weekTotals.map(({ dayKey, total, tobacco, cannabis }) => {
              const heightPct = total > 0 ? Math.max(5, (total / maxTotal) * 100) : 3;
              const colorClass =
                cannabis > tobacco ? 'bg-primary' : tobacco > 0 ? 'bg-secondary' : 'bg-surface-container-highest';
              return (
                <div
                  key={dayKey}
                  className={`w-full rounded-t-sm ${colorClass}`}
                  style={{ height: `${heightPct}%` }}
                />
              );
            })}
          </div>
          <div className="flex justify-between mt-2">
            {weekTotals.map(({ dayKey }) => (
              <span key={dayKey} className="text-[8px] text-on-surface-variant/50">
                {format(parseISO(dayKey + 'T00:00:00'), 'EEE', { locale: ptBR })
                  .slice(0, 1)
                  .toUpperCase()}
              </span>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
};
```

- [ ] **Step 2: Run test suite to verify no compilation errors**

```bash
npm run test:run
```

Expected: all tests pass (no imports of TrackerPage yet — just verify no TS errors).

- [ ] **Step 3: Commit**

```bash
git add src/pages/TrackerPage.tsx
git commit -m "feat: add TrackerPage with Quick Log, streak hero, and bento grid"
```

---

## Task 6: HistoryPage

**Files:**
- Create: `src/pages/HistoryPage.tsx`

- [ ] **Step 1: Create `src/pages/HistoryPage.tsx`**

```tsx
import { useMemo, useState } from 'react';
import { format, parseISO, startOfMonth, endOfMonth, subDays, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { UseTrackerAPI } from '@/hooks/useTracker';
import { getDaysInRange, getEarliestEventMonth, getMonthKey, todayKey } from '@/lib/events';
import { MonthlyChart } from '@/components/MonthlyChart';
import { DayCell, MonthNavigation } from '@/components/CalendarView';

interface HistoryPageProps {
  tracker: UseTrackerAPI;
  onOpenEditDay: (dayKey: string) => void;
}

const WEEK_HEADER = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'];

export const HistoryPage = ({ tracker, onOpenEditDay }: HistoryPageProps) => {
  const today = new Date();
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(today));

  const earliest = useMemo(() => getEarliestEventMonth(tracker.events), [tracker.events]);
  const currentMonthKey = getMonthKey(today);
  const viewMonthKey = getMonthKey(viewMonth);

  const canGoBack = earliest !== null && viewMonth > earliest;
  const canGoForward = viewMonthKey !== currentMonthKey;

  const monthLabel = format(viewMonth, 'MMMM yyyy', { locale: ptBR });
  const monthDays = getDaysInRange(startOfMonth(viewMonth), endOfMonth(viewMonth));

  const streak = tracker.getCurrentStreak();
  const currentGoal = tracker.getCurrentGoal();
  const avg7d = tracker.getRollingAverage(7);
  const delta7d = tracker.getAverageDelta(7);

  const weekDays = getDaysInRange(subDays(today, 6), today);
  const weekTotal = weekDays.reduce((sum, d) => {
    const t = tracker.getDayTotals(d);
    return sum + t.tobacco + t.cannabis;
  }, 0);

  const recentEvents = [...tracker.events]
    .sort((a, b) => (a.timestamp > b.timestamp ? -1 : 1))
    .slice(0, 5);

  const todayStr = todayKey();

  return (
    <main className="flex-1 px-6 pt-24 pb-32 overflow-y-auto md:pt-8 md:pl-8 md:pr-8 md:ml-80">
      {/* Hero stat */}
      <section className="mb-8">
        <div className="flex items-end gap-2 mb-1">
          <span className="text-[3.5rem] font-bold tracking-tighter text-on-surface leading-none">
            {currentGoal ? streak : '—'}
          </span>
          <span className="text-xs font-medium uppercase tracking-[0.1em] text-on-surface-variant mb-2">
            {currentGoal ? 'dias na meta' : 'sem meta'}
          </span>
        </div>
        <p className="text-sm text-on-surface-variant">
          {!currentGoal
            ? 'Defina uma meta em Goals para acompanhar seu progresso.'
            : streak === 0
            ? 'Nenhum dia consecutivo ainda.'
            : `${streak} dia${streak !== 1 ? 's' : ''} consecutivo${streak !== 1 ? 's' : ''} dentro da meta.`}
        </p>
      </section>

      {/* Weekly bento */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-surface-container-low p-5 rounded-xl">
          <span className="text-[10px] font-medium text-on-surface-variant uppercase tracking-[0.1em] block mb-4">
            Esta semana
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-primary">{weekTotal}</span>
            <span className="text-xs text-on-surface-variant">unidades</span>
          </div>
          {delta7d !== null && (
            <div
              className={`mt-2 flex items-center gap-1 text-[10px] ${
                delta7d <= 0 ? 'text-primary' : 'text-secondary'
              }`}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                {delta7d <= 0 ? 'trending_down' : 'trending_up'}
              </span>
              <span>{Math.abs(delta7d * 100).toFixed(0)}% vs semana passada</span>
            </div>
          )}
        </div>
        <div className="bg-surface-container-low p-5 rounded-xl">
          <span className="text-[10px] font-medium text-on-surface-variant uppercase tracking-[0.1em] block mb-4">
            Média 7d
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-secondary">{avg7d.toFixed(1)}</span>
            <span className="text-xs text-on-surface-variant">por dia</span>
          </div>
        </div>
      </div>

      {/* Monthly chart */}
      <section className="mb-8 bg-surface-container-low rounded-xl p-6">
        <div className="mb-4">
          <MonthNavigation
            label={monthLabel}
            canGoBack={canGoBack}
            canGoForward={canGoForward}
            onBack={() => setViewMonth((m) => subMonths(m, 1))}
            onForward={() => setViewMonth((m) => addMonths(m, 1))}
          />
        </div>
        <MonthlyChart
          dayKeys={monthDays}
          getDayTotals={tracker.getDayTotals}
          onDayClick={onOpenEditDay}
          events={tracker.events}
          goalLimit={currentGoal?.limit ?? null}
          className="h-[200px]"
        />
      </section>

      {/* Calendar grid */}
      <section className="mb-8">
        <h2 className="text-[10px] font-black text-on-surface-variant uppercase tracking-[0.1em] mb-4">
          Calendário
        </h2>
        <div className="bg-surface-container p-4 rounded-2xl">
          <div className="grid grid-cols-7 gap-2 mb-2">
            {WEEK_HEADER.map((d, i) => (
              <span key={i} className="text-[10px] text-center font-bold text-on-surface-variant uppercase">
                {d}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {monthDays.map((dayKey) => (
              <DayCell
                key={dayKey}
                dayKey={dayKey}
                getDayTotals={tracker.getDayTotals}
                getDayGoalStatus={tracker.getDayGoalStatus}
                onDayClick={onOpenEditDay}
                todayStr={todayStr}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Recent logs */}
      {recentEvents.length > 0 && (
        <section className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-[10px] font-black text-on-surface-variant uppercase tracking-[0.1em]">
              Últimos Registros
            </h2>
          </div>
          <div className="space-y-3">
            {recentEvents.map((event) => {
              const isCannabis = event.type === 'cannabis';
              const label = format(
                parseISO(event.timestamp),
                "dd/MM 'às' HH:mm",
                { locale: ptBR }
              );
              return (
                <div
                  key={event.id}
                  className="bg-surface-container-low p-4 rounded-xl flex items-center justify-between group"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        isCannabis ? 'bg-primary/10 text-primary' : 'bg-secondary/10 text-secondary'
                      }`}
                    >
                      <span className="material-symbols-outlined">
                        {isCannabis ? 'eco' : 'smoking_rooms'}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-bold text-on-surface">
                        {isCannabis ? 'Cannabis' : 'Tabaco'}
                      </p>
                      <p className="text-[11px] text-on-surface-variant uppercase tracking-wider">
                        {label}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      const dayKey = event.timestamp.slice(0, 10);
                      onOpenEditDay(dayKey);
                    }}
                    aria-label="Editar"
                    className="w-8 h-8 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-surface-container-highest transition-all active:scale-90"
                  >
                    <span className="material-symbols-outlined text-lg">edit</span>
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </main>
  );
};
```

- [ ] **Step 2: Run tests**

```bash
npm run test:run
```

Expected: all pass.

- [ ] **Step 3: Commit**

```bash
git add src/pages/HistoryPage.tsx
git commit -m "feat: add HistoryPage with streak hero, weekly stats, chart, calendar, and recent logs"
```

---

## Task 7: GoalsPage

**Files:**
- Create: `src/pages/GoalsPage.tsx`
- Create: `src/pages/GoalsPage.test.tsx`

- [ ] **Step 1: Write the failing tests**

Create `src/pages/GoalsPage.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GoalsPage } from './GoalsPage';
import type { UseTrackerAPI } from '@/hooks/useTracker';

function makeTracker(overrides: Partial<UseTrackerAPI> = {}): UseTrackerAPI {
  return {
    events: [],
    addEvent: vi.fn(),
    removeEvent: vi.fn(),
    updateEvent: vi.fn(),
    clearDay: vi.fn(),
    getDayTotals: vi.fn(() => ({ tobacco: 0, cannabis: 0 })),
    getEventsForDay: vi.fn(() => []),
    getTodayTotals: vi.fn(() => ({ tobacco: 0, cannabis: 0 })),
    exportEvents: vi.fn(() => '{}'),
    importEvents: vi.fn(() => ({ ok: true, added: 0, skipped: 0, goalsAdded: 0, goalsSkipped: 0 })),
    pendingUndo: null,
    executeUndo: vi.fn(),
    goals: [],
    setGoal: vi.fn(),
    getCurrentGoal: vi.fn(() => null),
    getDayGoalStatus: vi.fn(() => 'no-goal' as const),
    getCurrentStreak: vi.fn(() => 0),
    getRollingAverage: vi.fn(() => 0),
    getAverageDelta: vi.fn(() => null),
    ...overrides,
  } as UseTrackerAPI;
}

describe('GoalsPage', () => {
  it('calls setGoal with the slider value when save is clicked', () => {
    const setGoal = vi.fn();
    const tracker = makeTracker({
      setGoal,
      getCurrentGoal: vi.fn(() => ({ id: '1', limit: 5, effectiveFrom: '2024-01-01' })),
    });
    render(<GoalsPage tracker={tracker} />);
    const slider = screen.getByRole('slider');
    fireEvent.change(slider, { target: { value: '10' } });
    fireEvent.click(screen.getByRole('button', { name: /salvar meta/i }));
    expect(setGoal).toHaveBeenCalledWith(10);
  });

  it('shows current goal limit in the slider', () => {
    const tracker = makeTracker({
      getCurrentGoal: vi.fn(() => ({ id: '1', limit: 7, effectiveFrom: '2024-01-01' })),
    });
    render(<GoalsPage tracker={tracker} />);
    expect(screen.getByRole('slider')).toHaveValue('7');
  });

  it('calls exportEvents and triggers download when export button clicked', () => {
    const exportEvents = vi.fn(() => '{"events":[]}');
    const tracker = makeTracker({ exportEvents });
    // Mock URL.createObjectURL
    global.URL.createObjectURL = vi.fn(() => 'blob:mock');
    global.URL.revokeObjectURL = vi.fn();
    render(<GoalsPage tracker={tracker} />);
    fireEvent.click(screen.getByRole('button', { name: /exportar json/i }));
    expect(exportEvents).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
npm run test:run -- GoalsPage
```

Expected: FAIL with "Cannot find module './GoalsPage'"

- [ ] **Step 3: Implement `src/pages/GoalsPage.tsx`**

```tsx
import { useRef, useState, useEffect } from 'react';
import { toast } from 'sonner';
import { UseTrackerAPI, ImportOutcome } from '@/hooks/useTracker';
import { ImportError } from '@/lib/export';
import { todayKey } from '@/lib/events';

interface GoalsPageProps {
  tracker: UseTrackerAPI;
}

const IMPORT_ERROR_MESSAGES: Record<ImportError, string> = {
  'invalid-json': 'Arquivo não é um JSON válido',
  'invalid-shape': 'Arquivo não parece ser um backup do Smoking Tracker',
  'unsupported-version': 'Versão do arquivo não suportada',
  'invalid-events': 'Arquivo contém eventos inválidos',
  'invalid-goals': 'Arquivo contém metas inválidas',
};

export const GoalsPage = ({ tracker }: GoalsPageProps) => {
  const currentGoal = tracker.getCurrentGoal();
  const [goalValue, setGoalValue] = useState(currentGoal?.limit ?? 10);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setGoalValue(currentGoal?.limit ?? 10);
  }, [currentGoal?.limit]);

  const handleSaveGoal = () => {
    tracker.setGoal(goalValue);
    toast.success('Meta atualizada');
  };

  const handleRemoveGoal = () => {
    if (!window.confirm('Remover meta? O streak volta para zero.')) return;
    tracker.setGoal(null);
    toast.success('Meta removida');
  };

  const handleExport = () => {
    const json = tracker.exportEvents();
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
      const result: ImportOutcome = tracker.importEvents(raw);
      if (result.ok) {
        const parts: string[] = [];
        if (result.added > 0 || result.skipped > 0) {
          parts.push(`${result.added} eventos importados (${result.skipped} duplicados)`);
        }
        if (result.goalsAdded > 0) parts.push(`${result.goalsAdded} metas importadas`);
        toast.success(parts.join('. ') || 'Nenhum dado novo encontrado');
      } else {
        toast.error(IMPORT_ERROR_MESSAGES[result.error]);
      }
    } finally {
      e.target.value = '';
    }
  };

  return (
    <main className="flex-1 px-6 pt-24 pb-32 overflow-y-auto max-w-lg mx-auto md:pt-8 md:ml-80">
      {/* Goal section */}
      <section className="mb-10">
        <h2 className="text-[10px] font-medium text-on-surface-variant uppercase tracking-[0.2em] mb-4">
          Meta Diária
        </h2>
        <div className="bg-surface-container rounded-xl p-5 border-l-4 border-primary">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined">track_changes</span>
              </div>
              <div>
                <h4 className="font-bold text-on-surface">Limite por dia</h4>
                <p className="text-xs text-on-surface-variant">Tabaco + Cannabis combinados</p>
              </div>
            </div>
            <span className="text-primary font-black text-2xl italic tracking-tighter">
              {String(goalValue).padStart(2, '0')}
            </span>
          </div>
          <div className="h-1 bg-surface-container-highest rounded-full overflow-hidden mb-4">
            <div
              className="h-full bg-primary rounded-full"
              style={{ width: `${(goalValue / 20) * 100}%` }}
            />
          </div>
          <input
            type="range"
            min={1}
            max={20}
            value={goalValue}
            onChange={(e) => setGoalValue(Number(e.target.value))}
            aria-label="Meta diária"
            className="w-full h-1 bg-surface-container-highest rounded-lg appearance-none cursor-pointer accent-primary mb-4"
          />
          <div className="flex items-center gap-3">
            <button
              onClick={handleSaveGoal}
              aria-label="Salvar meta"
              className="flex-1 py-2.5 rounded-full bg-gradient-to-r from-primary to-primary-container text-on-primary text-sm font-bold tracking-wide transition-all active:scale-95"
            >
              Salvar Meta
            </button>
            {currentGoal && (
              <button
                onClick={handleRemoveGoal}
                className="text-xs text-destructive hover:underline px-2"
              >
                Remover
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Data section */}
      <section className="mb-10">
        <h2 className="text-[10px] font-medium text-on-surface-variant uppercase tracking-[0.2em] mb-4">
          Dados
        </h2>
        <div className="bg-surface-container rounded-xl overflow-hidden">
          <button
            onClick={handleExport}
            aria-label="Exportar JSON"
            className="w-full p-4 flex items-center gap-3 border-b border-outline-variant/10 hover:bg-surface-container-high transition-colors text-left"
          >
            <span className="material-symbols-outlined text-primary">download</span>
            <div>
              <p className="text-sm font-medium text-on-surface">Exportar JSON</p>
              <p className="text-[10px] text-on-surface-variant">Baixa backup de todos os eventos</p>
            </div>
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            aria-label="Importar JSON"
            className="w-full p-4 flex items-center gap-3 hover:bg-surface-container-high transition-colors text-left"
          >
            <span className="material-symbols-outlined text-on-surface-variant">upload</span>
            <div>
              <p className="text-sm font-medium text-on-surface">Importar JSON</p>
              <p className="text-[10px] text-on-surface-variant">Restaura a partir de um backup</p>
            </div>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      </section>

      {/* Danger zone */}
      <section className="text-center">
        <button
          onClick={() => {
            if (!window.confirm('Apagar TODOS os dados? Isso não pode ser desfeito.')) return;
            tracker.events.forEach((e) => tracker.removeEvent(e.id));
            toast.success('Todos os dados apagados');
          }}
          className="text-destructive font-medium text-sm flex items-center justify-center gap-2 mx-auto hover:bg-destructive/5 px-4 py-2 rounded-full transition-colors"
        >
          <span className="material-symbols-outlined text-sm">delete_forever</span>
          Limpar todos os dados
        </button>
      </section>
    </main>
  );
};
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm run test:run -- GoalsPage
```

Expected: 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/pages/GoalsPage.tsx src/pages/GoalsPage.test.tsx
git commit -m "feat: add GoalsPage with goal slider, export/import, and danger zone"
```

---

## Task 8: TopNav (Desktop)

**Files:**
- Create: `src/components/TopNav.tsx`

- [ ] **Step 1: Create `src/components/TopNav.tsx`**

```tsx
import { EventType } from '@/types';
import { UseTrackerAPI } from '@/hooks/useTracker';

type Tab = 'tracker' | 'history' | 'goals';

interface TopNavProps {
  tab: Tab;
  onChange: (tab: Tab) => void;
  tracker: UseTrackerAPI;
  onOpenNewEvent: (type: EventType) => void;
}

const NAV_TABS: { id: Tab; label: string }[] = [
  { id: 'tracker', label: 'Tracker' },
  { id: 'history', label: 'History' },
  { id: 'goals',   label: 'Goals'   },
];

export const TopNav = ({ tab, onChange, tracker, onOpenNewEvent }: TopNavProps) => {
  const streak = tracker.getCurrentStreak();
  const currentGoal = tracker.getCurrentGoal();
  const totals = tracker.getTodayTotals();
  const todayTotal = totals.tobacco + totals.cannabis;

  return (
    <>
      {/* Fixed header — desktop only */}
      <header className="hidden md:flex fixed top-0 w-full z-50 bg-background h-16 items-center justify-between px-6 border-b border-outline-variant/10">
        <span className="text-primary font-black tracking-tighter text-xl">Smoking Tracker</span>
        <nav className="flex gap-6 items-center">
          {NAV_TABS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => onChange(id)}
              aria-current={tab === id ? 'page' : undefined}
              className={`font-bold tracking-tight text-base px-3 py-1 rounded-lg transition-colors ${
                tab === id
                  ? 'text-primary'
                  : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
              }`}
            >
              {label}
            </button>
          ))}
        </nav>
        <button
          onClick={() => onChange('goals')}
          aria-label="Configurações"
          className="p-2 text-primary hover:bg-surface-container-high transition-colors rounded-full active:scale-95"
        >
          <span className="material-symbols-outlined">settings</span>
        </button>
      </header>

      {/* Fixed sidebar — desktop only */}
      <aside className="hidden md:flex flex-col fixed top-16 left-0 w-80 h-[calc(100vh-64px)] bg-surface-container-lowest border-r border-outline-variant/10 p-6 space-y-8 overflow-y-auto z-40">
        {/* Quick Log */}
        <div className="space-y-4">
          <h3 className="text-[10px] font-bold text-on-surface-variant uppercase tracking-[0.1em]">
            Quick Log
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => onOpenNewEvent('tobacco')}
              className="flex flex-col items-center justify-center gap-2 p-4 bg-surface-container-low hover:bg-surface-container border border-outline-variant/10 rounded-xl transition-all group active:scale-95"
            >
              <span className="material-symbols-outlined text-secondary group-hover:scale-110 transition-transform">
                smoking_rooms
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                Tabaco
              </span>
            </button>
            <button
              onClick={() => onOpenNewEvent('cannabis')}
              className="flex flex-col items-center justify-center gap-2 p-4 bg-surface-container-low hover:bg-surface-container border border-outline-variant/10 rounded-xl transition-all group active:scale-95"
            >
              <span className="material-symbols-outlined text-primary group-hover:scale-110 transition-transform">
                potted_plant
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                Cannabis
              </span>
            </button>
          </div>
        </div>

        {/* Streak card */}
        <div className="bg-surface-container-low p-6 rounded-xl space-y-4">
          <div className="flex justify-between items-start">
            <p className="text-[10px] font-medium text-on-surface-variant uppercase tracking-[0.1em]">
              Streak Atual
            </p>
            <span
              className="material-symbols-outlined text-primary material-symbols-filled"
            >
              bolt
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-5xl font-black tracking-tight text-on-surface">
              {currentGoal ? streak : '—'}
            </span>
            <span className="text-on-surface-variant font-medium text-sm uppercase tracking-widest">
              dias
            </span>
          </div>
          {currentGoal && streak === 0 && (
            <p className="text-xs text-on-surface-variant">Sem dias consecutivos ainda</p>
          )}
        </div>

        {/* Quick stats */}
        <div className="space-y-3">
          <h3 className="text-[10px] font-bold text-on-surface-variant uppercase tracking-[0.1em]">
            Hoje
          </h3>
          <div className="bg-surface-container p-4 rounded-xl flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-on-surface-variant">Consumo</p>
              <p className="text-lg font-bold text-primary">{todayTotal}</p>
            </div>
            {currentGoal && (
              <p className="text-on-surface-variant text-sm font-medium">
                / {currentGoal.limit}
              </p>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};
```

- [ ] **Step 2: Run tests**

```bash
npm run test:run
```

Expected: all pass.

- [ ] **Step 3: Commit**

```bash
git add src/components/TopNav.tsx
git commit -m "feat: add TopNav with desktop header and sidebar"
```

---

## Task 9: App.tsx Shell Refactor

**Files:**
- Rewrite: `src/App.tsx`
- Create: `src/App.test.tsx`

- [ ] **Step 1: Write failing navigation tests**

Create `src/App.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from './App';

describe('App navigation', () => {
  it('renders TrackerPage content by default', () => {
    render(<App />);
    expect(screen.getByText(/quick log/i)).toBeInTheDocument();
  });

  it('switches to HistoryPage when history bottom nav button is clicked', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /history/i }));
    expect(screen.getByText(/dias na meta|sem meta/i)).toBeInTheDocument();
  });

  it('switches to GoalsPage when goals bottom nav button is clicked', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /goals/i }));
    expect(screen.getByText(/meta diária/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
npm run test:run -- App.test
```

Expected: FAIL — either can't find module or content not found (App.tsx still has old structure).

- [ ] **Step 3: Rewrite `src/App.tsx` as navigation shell**

```tsx
import { useState } from 'react';
import { toast } from 'sonner';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { BottomNav } from '@/components/BottomNav';
import { TopNav } from '@/components/TopNav';
import { TrackerPage } from '@/pages/TrackerPage';
import { HistoryPage } from '@/pages/HistoryPage';
import { GoalsPage } from '@/pages/GoalsPage';
import { NewEventDrawer } from '@/components/NewEventDrawer';
import { EditDayDialog } from '@/components/EditDayDialog';
import { useTracker } from '@/hooks/useTracker';
import { EventType } from '@/types';

type Tab = 'tracker' | 'history' | 'goals';

const App = () => {
  const tracker = useTracker();
  const [tab, setTab] = useState<Tab>('tracker');
  const [drawerType, setDrawerType] = useState<EventType | null>(null);
  const [editingDay, setEditingDay] = useState<string | null>(null);

  const handleSubmitEvent = (input: { type: EventType; location?: string; reason?: string }) => {
    tracker.addEvent(input);
    toast.success(`+1 ${input.type === 'tobacco' ? 'tabaco' : 'cannabis'}`, {
      duration: 5000,
      action: {
        label: 'Desfazer',
        onClick: () => tracker.executeUndo(),
      },
    });
  };

  const dayEvents = editingDay ? tracker.getEventsForDay(editingDay) : [];

  return (
    <TooltipProvider>
      <Toaster />
      <Sonner />

      {/* Mobile header */}
      <header className="md:hidden fixed top-0 w-full z-50 bg-background flex justify-between items-center px-6 h-16 border-b border-outline-variant/10">
        <span className="text-primary font-black tracking-tighter text-xl">Smoking Tracker</span>
        <button
          onClick={() => setTab('goals')}
          aria-label="Configurações"
          className="p-2 text-on-surface-variant hover:bg-surface-container-high rounded-full transition-colors active:scale-95"
        >
          <span className="material-symbols-outlined">settings</span>
        </button>
      </header>

      {/* Desktop nav + sidebar */}
      <TopNav
        tab={tab}
        onChange={setTab}
        tracker={tracker}
        onOpenNewEvent={(type) => setDrawerType(type)}
      />

      {/* Page content */}
      {tab === 'tracker' && (
        <TrackerPage
          tracker={tracker}
          onOpenNewEvent={(type) => setDrawerType(type)}
        />
      )}
      {tab === 'history' && (
        <HistoryPage
          tracker={tracker}
          onOpenEditDay={(dayKey) => setEditingDay(dayKey)}
        />
      )}
      {tab === 'goals' && (
        <GoalsPage tracker={tracker} />
      )}

      {/* Desktop main content area (for history and goals on desktop) */}
      {tab !== 'tracker' && (
        <div className="hidden md:block" />
      )}

      <BottomNav tab={tab} onChange={setTab} />

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
        onUndo={tracker.executeUndo}
        onUpdateEvent={tracker.updateEvent}
      />
    </TooltipProvider>
  );
};

export default App;
```

- [ ] **Step 4: Run tests to confirm they pass**

```bash
npm run test:run -- App.test
```

Expected: 3 tests PASS.

- [ ] **Step 5: Run all tests**

```bash
npm run test:run
```

Expected: all tests pass.

- [ ] **Step 6: Verify in dev server**

```bash
npm run dev
```

Open http://localhost:5173. Verify:
- Dark background `#131313` 
- Three bottom nav tabs (Tracker / History / Goals) on mobile viewport
- Tracker tab shows Quick Log buttons + streak hero (if goal set) + bento
- Clicking History shows stats + chart
- Clicking Goals shows the goal slider

- [ ] **Step 7: Commit**

```bash
git add src/App.tsx src/App.test.tsx
git commit -m "refactor: convert App.tsx to navigation shell with TrackerPage, HistoryPage, GoalsPage"
```

---

## Task 10: Cleanup

**Files:**
- Delete: `src/components/SettingsDrawer.tsx`
- Delete: `src/components/MetricsCard.tsx`

- [ ] **Step 1: Delete unused components**

```bash
rm src/components/SettingsDrawer.tsx src/components/MetricsCard.tsx
```

- [ ] **Step 2: Verify no remaining imports**

```bash
grep -r "SettingsDrawer\|MetricsCard" src/
```

Expected: no output (nothing imports them).

- [ ] **Step 3: Run full test suite**

```bash
npm run test:run
```

Expected: all tests pass.

- [ ] **Step 4: Run build to verify no TS errors**

```bash
npm run build
```

Expected: build succeeds with no errors.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore: delete SettingsDrawer and MetricsCard (migrated to GoalsPage and TrackerPage)"
```

---

## Self-Review

**Spec coverage check:**

| Spec section | Covered by task |
|---|---|
| State-based navigation | Task 9 (App.tsx) |
| Obsidian Pulse palette | Task 1 |
| Mobile bottom nav | Task 2 |
| Desktop header + sidebar | Task 8 |
| TrackerPage content | Task 5 |
| HistoryPage content | Task 6 |
| GoalsPage content | Task 7 |
| CounterCard → Quick Log | Task 3 |
| DayCell / MonthNavigation exports | Task 4 |
| Delete SettingsDrawer | Task 10 |
| Delete MetricsCard | Task 10 |
| Material Symbols font | Task 1 |

**Type consistency check:**
- `Tab` type defined in `BottomNav.tsx` and `TopNav.tsx` independently — both declare `'tracker' | 'history' | 'goals'`. App.tsx re-declares locally. Consistent.
- `DayCellProps` and `MonthNavigationProps` exported from `CalendarView.tsx` and imported in `HistoryPage.tsx`. Consistent.
- `UseTrackerAPI` imported from `@/hooks/useTracker` in all page components. Consistent.
- `GoalsPage` calls `tracker.setGoal(goalValue)` where `goalValue` is `number`. `setGoal` accepts `number | null`. Consistent.

**Placeholder scan:** No TBDs, all code complete. ✓
