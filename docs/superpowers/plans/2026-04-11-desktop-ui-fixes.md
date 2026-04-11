# Desktop UI Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix three desktop layout issues: header overlap in HistoryPage, blank TrackerPage on desktop, and Goals moved from a navigation tab into the bottom of the sidebar.

**Architecture:** Extract `GoalsContent` as a shared component used by both `GoalsPage` (mobile) and `TopNav` sidebar (desktop). `TrackerPage` gains a desktop-only sibling `<main>` with recent logs grouped by day. Two padding fixes.

**Tech Stack:** React 18, TypeScript, Tailwind CSS, date-fns, Vite, Vitest + Testing Library

---

## File Map

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `src/components/GoalsContent.tsx` | Goals UI with state — used in sidebar and GoalsPage |
| Modify | `src/pages/GoalsPage.tsx` | Thin mobile-only wrapper around GoalsContent |
| Modify | `src/components/TopNav.tsx` | Remove Goals tab + gear, add GoalsContent to sidebar bottom |
| Modify | `src/pages/TrackerPage.tsx` | Add desktop-only recent logs main element |
| Modify | `src/pages/HistoryPage.tsx` | Fix `md:pt-8` → `md:pt-24` |
| Modify | `src/pages/GoalsPage.test.tsx` | Update import to use GoalsContent directly |

---

### Task 1: Fix header overlap padding

**Files:**
- Modify: `src/pages/HistoryPage.tsx:48`
- Modify: `src/pages/GoalsPage.tsx:75`

The fixed header is `h-16` (64px). `md:pt-8` (32px) is not enough — content renders beneath the header. `md:pt-24` (96px) gives 32px breathing room.

- [ ] **Step 1: Fix HistoryPage**

In `src/pages/HistoryPage.tsx` line 48, replace the `<main>` opening tag:

```tsx
<main className="flex-1 px-6 pt-24 pb-32 overflow-y-auto md:pt-24 md:pl-8 md:pr-8 md:ml-80">
```

- [ ] **Step 2: Fix GoalsPage**

In `src/pages/GoalsPage.tsx` line 75, replace the `<main>` opening tag:

```tsx
<main className="flex-1 px-6 pt-24 pb-32 overflow-y-auto max-w-lg mx-auto md:pt-24 md:ml-80">
```

- [ ] **Step 3: Run tests**

```bash
cd /home/ivanzao/dev/repository/smoking-tracker && npm test -- --run
```

Expected: all existing tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/pages/HistoryPage.tsx src/pages/GoalsPage.tsx
git commit -m "fix: correct desktop top padding to clear fixed header"
```

---

### Task 2: Extract GoalsContent component

**Files:**
- Create: `src/components/GoalsContent.tsx`

Move all state, refs, handlers, and JSX from `GoalsPage` into a standalone `GoalsContent` component that accepts only `tracker` as a prop. The JSX root becomes a `<div className="space-y-10">` instead of `<main>`.

- [ ] **Step 1: Create GoalsContent.tsx**

Create `src/components/GoalsContent.tsx` with this exact content:

```tsx
import { useRef, useState, useEffect } from 'react';
import { toast } from 'sonner';
import { UseTrackerAPI, ImportOutcome } from '@/hooks/useTracker';
import { ImportError } from '@/lib/export';
import { todayKey } from '@/lib/events';

interface GoalsContentProps {
  tracker: UseTrackerAPI;
}

const IMPORT_ERROR_MESSAGES: Record<ImportError, string> = {
  'invalid-json': 'Arquivo não é um JSON válido',
  'invalid-shape': 'Arquivo não parece ser um backup do Smoking Tracker',
  'unsupported-version': 'Versão do arquivo não suportada',
  'invalid-events': 'Arquivo contém eventos inválidos',
  'invalid-goals': 'Arquivo contém metas inválidas',
};

export const GoalsContent = ({ tracker }: GoalsContentProps) => {
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
    <div className="space-y-10">
      {/* Goal section */}
      <section>
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
      <section>
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
    </div>
  );
};
```

- [ ] **Step 2: Run tests**

```bash
cd /home/ivanzao/dev/repository/smoking-tracker && npm test -- --run
```

Expected: all tests pass (GoalsContent is new, no existing test references it yet).

- [ ] **Step 3: Commit**

```bash
git add src/components/GoalsContent.tsx
git commit -m "feat: extract GoalsContent component"
```

---

### Task 3: Update GoalsPage to use GoalsContent

**Files:**
- Modify: `src/pages/GoalsPage.tsx`
- Modify: `src/pages/GoalsPage.test.tsx`

Replace GoalsPage body with a thin wrapper. Update the test import so it tests GoalsContent directly (the actual logic lives there now).

- [ ] **Step 1: Replace GoalsPage.tsx**

Replace the entire content of `src/pages/GoalsPage.tsx` with:

```tsx
import { UseTrackerAPI } from '@/hooks/useTracker';
import { GoalsContent } from '@/components/GoalsContent';

interface GoalsPageProps {
  tracker: UseTrackerAPI;
}

export const GoalsPage = ({ tracker }: GoalsPageProps) => {
  return (
    <main className="flex-1 px-6 pt-24 pb-32 overflow-y-auto max-w-lg mx-auto md:hidden">
      <GoalsContent tracker={tracker} />
    </main>
  );
};
```

- [ ] **Step 2: Update GoalsPage.test.tsx to import GoalsContent**

The tests exercise the goal UI logic. Since that logic moved to `GoalsContent`, update the import and render target so tests stay meaningful. Replace the entire content of `src/pages/GoalsPage.test.tsx` with:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GoalsContent } from '@/components/GoalsContent';
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

describe('GoalsContent', () => {
  it('calls setGoal with the slider value when save is clicked', () => {
    const setGoal = vi.fn();
    const tracker = makeTracker({
      setGoal,
      getCurrentGoal: vi.fn(() => ({ id: '1', limit: 5, effectiveFrom: '2024-01-01' })),
    });
    render(<GoalsContent tracker={tracker} />);
    const slider = screen.getByRole('slider');
    fireEvent.change(slider, { target: { value: '10' } });
    fireEvent.click(screen.getByRole('button', { name: /salvar meta/i }));
    expect(setGoal).toHaveBeenCalledWith(10);
  });

  it('shows current goal limit in the slider', () => {
    const tracker = makeTracker({
      getCurrentGoal: vi.fn(() => ({ id: '1', limit: 7, effectiveFrom: '2024-01-01' })),
    });
    render(<GoalsContent tracker={tracker} />);
    expect(screen.getByRole('slider')).toHaveValue('7');
  });

  it('calls exportEvents and triggers download when export button clicked', () => {
    const exportEvents = vi.fn(() => '{"events":[]}');
    const tracker = makeTracker({ exportEvents });
    global.URL.createObjectURL = vi.fn(() => 'blob:mock');
    global.URL.revokeObjectURL = vi.fn();
    render(<GoalsContent tracker={tracker} />);
    fireEvent.click(screen.getByRole('button', { name: /exportar json/i }));
    expect(exportEvents).toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: Run tests**

```bash
cd /home/ivanzao/dev/repository/smoking-tracker && npm test -- --run
```

Expected: all tests pass including the renamed GoalsContent suite.

- [ ] **Step 4: Commit**

```bash
git add src/pages/GoalsPage.tsx src/pages/GoalsPage.test.tsx
git commit -m "refactor: GoalsPage becomes mobile-only wrapper around GoalsContent"
```

---

### Task 4: Update TopNav — remove Goals tab, add GoalsContent to sidebar

**Files:**
- Modify: `src/components/TopNav.tsx`

Remove `goals` from `NAV_TABS`, remove the gear icon button from the desktop header, and render `GoalsContent` at the bottom of the sidebar with a separator.

- [ ] **Step 1: Replace TopNav.tsx**

Replace the entire content of `src/components/TopNav.tsx` with:

```tsx
import { EventType } from '@/types';
import { UseTrackerAPI } from '@/hooks/useTracker';
import { GoalsContent } from '@/components/GoalsContent';

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
        {/* spacer to balance the logo */}
        <div className="w-10" />
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
            <span className="material-symbols-outlined text-primary material-symbols-filled">
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

        {/* Goals section */}
        <div className="border-t border-outline-variant/10 pt-8">
          <GoalsContent tracker={tracker} />
        </div>
      </aside>
    </>
  );
};
```

- [ ] **Step 2: Run tests**

```bash
cd /home/ivanzao/dev/repository/smoking-tracker && npm test -- --run
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/components/TopNav.tsx
git commit -m "feat: move Goals into sidebar bottom, remove Goals desktop tab"
```

---

### Task 5: Add desktop recent logs to TrackerPage

**Files:**
- Modify: `src/pages/TrackerPage.tsx`

Keep the existing `<main className="... md:hidden">` untouched. Add a sibling desktop-only `<main>` that shows events from today and the 2 previous days, grouped by day heading, sorted most-recent-first. Days with no events are omitted.

- [ ] **Step 1: Replace TrackerPage.tsx**

Replace the entire content of `src/pages/TrackerPage.tsx` with:

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

  // Desktop: today + 2 previous days, skip days with no events
  const todayStr = todayKey();
  const recentDays = [todayStr, format(subDays(today, 1), 'yyyy-MM-dd'), format(subDays(today, 2), 'yyyy-MM-dd')];
  const recentGroups = recentDays
    .map((dayKey, idx) => {
      const events = tracker
        .getEventsForDay(dayKey)
        .slice()
        .sort((a, b) => (a.timestamp > b.timestamp ? -1 : 1));
      const heading = idx === 0 ? 'Hoje' : idx === 1 ? 'Ontem' : format(parseISO(dayKey + 'T00:00:00'), 'dd/MM', { locale: ptBR });
      return { dayKey, events, heading };
    })
    .filter((g) => g.events.length > 0);

  return (
    <>
      {/* Mobile layout */}
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

      {/* Desktop layout — recent logs */}
      <main className="hidden md:flex flex-col px-8 pt-24 pb-8 ml-80 min-h-screen">
        <h2 className="text-[10px] font-black text-on-surface-variant uppercase tracking-[0.1em] mb-6">
          Logs Recentes
        </h2>
        {recentGroups.length === 0 ? (
          <p className="text-sm text-on-surface-variant">Nenhum registro nos últimos 3 dias.</p>
        ) : (
          <div className="space-y-8">
            {recentGroups.map(({ dayKey, events, heading }) => (
              <section key={dayKey}>
                <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-[0.1em] mb-3">
                  {heading}
                </p>
                <div className="space-y-2">
                  {events.map((event) => {
                    const isCannabis = event.type === 'cannabis';
                    return (
                      <div
                        key={event.id}
                        className="bg-surface-container-low p-4 rounded-xl flex items-center gap-4"
                      >
                        <div
                          className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                            isCannabis ? 'bg-primary/10 text-primary' : 'bg-secondary/10 text-secondary'
                          }`}
                        >
                          <span className="material-symbols-outlined text-base">
                            {isCannabis ? 'eco' : 'smoking_rooms'}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-bold text-on-surface">
                            {isCannabis ? 'Cannabis' : 'Tabaco'}
                          </p>
                          <p className="text-[11px] text-on-surface-variant uppercase tracking-wider">
                            {format(parseISO(event.timestamp), 'HH:mm', { locale: ptBR })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </main>
    </>
  );
};
```

- [ ] **Step 2: Run tests**

```bash
cd /home/ivanzao/dev/repository/smoking-tracker && npm test -- --run
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add src/pages/TrackerPage.tsx
git commit -m "feat: add desktop recent logs to TrackerPage"
```

---

## Self-Review

**Spec coverage:**
- [x] Header overlap fix — Task 1 (HistoryPage + GoalsPage)
- [x] TrackerPage desktop empty — Task 5 (desktop `<main>` with recent logs)
- [x] Goals in sidebar bottom — Tasks 2, 3, 4 (extract + wrap + embed in TopNav)
- [x] Today + 2 previous days grouped by day — Task 5 `recentDays` array
- [x] Days with no events omitted — Task 5 `.filter(g => g.events.length > 0)`
- [x] Events sorted descending — Task 5 `.sort((a, b) => ...)`
- [x] Goals tab removed from desktop nav — Task 4 `NAV_TABS` has 2 entries
- [x] Gear icon removed from desktop header — Task 4 header replaced with spacer div
- [x] GoalsPage mobile-only (`md:hidden`) — Task 3

**Placeholder scan:** No TBDs, TODOs, or vague steps found.

**Type consistency:** `GoalsContent` prop is `tracker: UseTrackerAPI` throughout. `TrackerEvent` has `timestamp` and `type` and `id` — all used correctly. `getEventsForDay(dayKey: string): TrackerEvent[]` matches usage in Task 5.
