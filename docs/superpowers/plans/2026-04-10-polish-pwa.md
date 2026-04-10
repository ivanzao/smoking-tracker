# Polish Visual + PWA — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Polish the UI for better mobile density and UX (compact header, horizontal counter cards, 7-col week grid, improved event rows, unified colors) and add PWA support with offline capability.

**Architecture:** Purely presentational changes to existing components — no hook or logic changes. PWA via `vite-plugin-pwa` (Workbox service worker) replacing `vite-plugin-singlefile`. All 111 existing tests must continue passing unchanged.

**Tech Stack:** React 18 · Vite · TypeScript · TailwindCSS · shadcn/ui · vite-plugin-pwa · Workbox · date-fns · lucide-react · recharts

**Spec:** [docs/superpowers/specs/2026-04-10-polish-pwa-design.md](../specs/2026-04-10-polish-pwa-design.md)

---

## File Map

**New files:**
- `public/manifest.json` — PWA web app manifest
- `public/icon-192.png` — PWA icon 192×192
- `public/icon-512.png` — PWA icon 512×512

**Modified:**
- `src/App.tsx` — compact header, always-render MetricsCard
- `src/components/CounterCard.tsx` — horizontal layout, compact, tactile feedback
- `src/components/MetricsCard.tsx` — `goalLimit` nullable, conditional progress bar
- `src/components/CalendarView.tsx` — 7-col grid, dot counters, weekday labels
- `src/components/EditDayDialog.tsx` — tinted icon box, chevron, inline context, better trash
- `src/components/MonthlyChart.tsx` — CSS variables for colors
- `vite.config.ts` — remove singlefile, add vite-plugin-pwa
- `index.html` — manifest link, theme-color meta
- `package.json` — swap singlefile for pwa plugin
- `Dockerfile` — copy full dist/ directory

---

## Task 1: Unify colors via CSS variables

**Files:**
- Modify: `src/components/CounterCard.tsx`
- Modify: `src/components/MonthlyChart.tsx`

- [ ] **Step 1: Replace hardcoded hex in CounterCard.tsx**

Replace the entire `META` object and card className in `src/components/CounterCard.tsx`:

```tsx
const META: Record<EventType, { label: string; icon: typeof Cigarette; hoverBorder: string; hoverBg: string }> = {
  tobacco: {
    label: 'Tabaco',
    icon: Cigarette,
    hoverBorder: 'hover:border-secondary',
    hoverBg: 'hover:bg-secondary/5',
  },
  cannabis: {
    label: 'Cannabis',
    icon: Leaf,
    hoverBorder: 'hover:border-primary',
    hoverBg: 'hover:bg-primary/5',
  },
};
```

- [ ] **Step 2: Replace hardcoded hex in MonthlyChart.tsx**

In `src/components/MonthlyChart.tsx`, replace the tooltip dots and bar fills.

Replace the tooltip dots section (lines 79-89):

```tsx
                    <div className="flex gap-3">
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-secondary" />
                        <span className="text-sm font-bold">{p.tobacco}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-primary" />
                        <span className="text-sm font-bold">{p.cannabis}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span className="text-sm font-bold">{p.avg7d.toFixed(1)}</span>
                      </div>
                    </div>
```

Replace the Bar and Line components (lines 97-106):

```tsx
          <Bar dataKey="tobacco" fill="hsl(var(--secondary))" fillOpacity={0.8} radius={[4, 4, 0, 0]} />
          <Bar dataKey="cannabis" fill="hsl(var(--primary))" fillOpacity={0.8} radius={[4, 4, 0, 0]} />
          <Line
            dataKey="avg7d"
            type="monotone"
            stroke="#10b981"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 3 }}
          />
```

- [ ] **Step 3: Run tests**

```bash
npm run test:run
```

Expected: 111 tests PASS (no logic changes).

- [ ] **Step 4: Verify type check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/CounterCard.tsx src/components/MonthlyChart.tsx
git commit -m "refactor: unify colors via CSS variables"
```

---

## Task 2: Compact header in App.tsx

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Replace the header block**

In `src/App.tsx`, replace lines 48-62 (the `<header>` block):

```tsx
          <header className="flex items-start justify-between mb-5">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">
                Smoking Tracker
              </h1>
              <p className="text-xs text-muted-foreground">do but don't forget</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSettingsOpen(true)}
              aria-label="Configurações"
              className="p-2 shrink-0"
            >
              <Settings className="w-5 h-5" />
            </Button>
          </header>
```

- [ ] **Step 2: Verify type check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "style: compact header with left-aligned layout"
```

---

## Task 3: Compact CounterCards with tactile feedback

**Files:**
- Modify: `src/components/CounterCard.tsx`

- [ ] **Step 1: Replace the card body**

Replace the entire return JSX in `src/components/CounterCard.tsx` (the `<Card>` and its contents):

```tsx
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
      className={`relative cursor-pointer border-2 rounded-xl transition-transform duration-150 active:scale-[0.96] ${hoverBorder} ${hoverBg}`}
      style={{ boxShadow: 'var(--shadow-soft)' }}
    >
      <div className="p-4 sm:p-6">
        <div className="flex items-center justify-center gap-3">
          <Icon className="w-7 h-7 text-foreground" strokeWidth={1.5} />
          <div>
            <div className="text-3xl sm:text-4xl font-bold text-foreground leading-none">{count}</div>
            <div className="text-[0.65rem] uppercase tracking-wider text-muted-foreground">{label}</div>
          </div>
        </div>
      </div>
    </Card>
  );
```

- [ ] **Step 2: Update the grid gap in App.tsx**

In `src/App.tsx`, change the counter cards grid wrapper from:

```tsx
          <div className="grid grid-cols-2 gap-4 sm:gap-6 mb-8">
```

to:

```tsx
          <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-4">
```

- [ ] **Step 3: Verify type check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/CounterCard.tsx src/App.tsx
git commit -m "style: compact horizontal CounterCards with tactile feedback"
```

---

## Task 4: MetricsCard always visible

**Files:**
- Modify: `src/components/MetricsCard.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Update MetricsCard to handle nullable goalLimit**

Replace the entire `src/components/MetricsCard.tsx`:

```tsx
import { Card } from '@/components/ui/card';

interface MetricsCardProps {
  todayTotal: number;
  goalLimit: number | null;
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
  const hasGoal = goalLimit !== null;
  const isOver = hasGoal && todayTotal > goalLimit;
  const progressPct = hasGoal ? Math.min(100, (todayTotal / goalLimit) * 100) : 0;

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
            {hasGoal ? 'hoje / meta' : 'hoje'}
          </div>
          <div className="text-xl font-bold mt-1">
            {todayTotal}
            {hasGoal && (
              <span className="text-muted-foreground font-normal">/{goalLimit}</span>
            )}
          </div>
          {hasGoal && (
            <div className="h-1 bg-muted rounded-full mt-2 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${isOver ? 'bg-rose-500' : 'bg-emerald-500'}`}
                style={{ width: `${isOver ? 100 : progressPct}%` }}
              />
            </div>
          )}
        </div>

        {/* Streak */}
        <div className="flex-1 px-3">
          <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
            streak
          </div>
          <div className="text-xl font-bold mt-1">
            {hasGoal && streak > 0 ? `🔥 ${streak}` : '—'}
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

- [ ] **Step 2: Update App.tsx to always render MetricsCard**

In `src/App.tsx`, replace lines 77-87 (the conditional MetricsCard block):

```tsx
          <div className="mb-4">
            <MetricsCard
              todayTotal={totals.tobacco + totals.cannabis}
              goalLimit={currentGoal?.limit ?? null}
              streak={tracker.getCurrentStreak()}
              average7d={tracker.getRollingAverage(7)}
              delta7d={tracker.getAverageDelta(7)}
            />
          </div>
```

- [ ] **Step 3: Run tests**

```bash
npm run test:run
```

Expected: 111 tests PASS.

- [ ] **Step 4: Verify type check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/MetricsCard.tsx src/App.tsx
git commit -m "style: MetricsCard always visible with nullable goalLimit"
```

---

## Task 5: 7-col week grid with dot counters

**Files:**
- Modify: `src/components/CalendarView.tsx`

- [ ] **Step 1: Replace the DayCell component and week grid**

In `src/components/CalendarView.tsx`, replace the `DayCell` component (lines 57-101) and the week `TabsContent` (lines 111-116).

First, remove the `Cigarette` and `Leaf` imports from lucide-react (line 5) since we're replacing icons with dots. Keep `ChevronLeft` and `ChevronRight`.

Replace line 5:

```tsx
import { ChevronLeft, ChevronRight } from 'lucide-react';
```

Replace the `DayCell` component (lines 57-101):

```tsx
  const DayCell = ({ dayKey }: { dayKey: string }) => {
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
              goalStatus === 'within' ? 'bg-emerald-500' : 'bg-rose-500'
            }`}
          />
        )}
        <div className="text-[0.55rem] font-medium text-muted-foreground capitalize">
          {weekday}
        </div>
        <div className={`text-[0.7rem] ${isToday ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
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
          <span className="text-[0.6rem] text-muted-foreground">—</span>
        )}
      </div>
    );
  };
```

Replace the week `TabsContent` (lines 111-116):

```tsx
        <TabsContent value="week" className="mt-0">
          <div className="grid grid-cols-7 gap-1.5">
            {weekDays.map((d) => (
              <DayCell key={d} dayKey={d} />
            ))}
          </div>
        </TabsContent>
```

- [ ] **Step 2: Compact the card padding**

Replace line 104:

```tsx
    <Card className="p-4 sm:p-6" style={{ boxShadow: 'var(--shadow-soft)' }}>
```

- [ ] **Step 3: Run tests**

```bash
npm run test:run
```

Expected: 111 tests PASS.

- [ ] **Step 4: Verify type check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/CalendarView.tsx
git commit -m "style: 7-col week grid with dot counters and weekday labels"
```

---

## Task 6: EditDayDialog row improvements

**Files:**
- Modify: `src/components/EditDayDialog.tsx`

- [ ] **Step 1: Add ChevronRight import**

In `src/components/EditDayDialog.tsx`, update the lucide-react import (line 3):

```tsx
import { Cigarette, Leaf, Trash2, ChevronRight } from 'lucide-react';
```

- [ ] **Step 2: Replace the event row rendering**

Replace the `.map` block (lines 80-123) inside the scrollable div:

```tsx
          {sorted.map((ev) => {
            const Icon = ev.type === 'tobacco' ? Cigarette : Leaf;
            const time = format(parseISO(ev.timestamp), 'HH:mm');
            const iconBg = ev.type === 'tobacco'
              ? 'hsl(var(--secondary) / 0.15)'
              : 'hsl(var(--primary) / 0.15)';
            const context = [ev.location, ev.reason].filter(Boolean).join(' · ');

            return (
              <div
                key={ev.id}
                onClick={() => setEditingEvent(ev)}
                className="flex items-center gap-3 p-3.5 rounded-lg border bg-card cursor-pointer hover:bg-accent/50 active:scale-[0.98] transition-all duration-100"
              >
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: iconBg }}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold">{time}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {context || <span className="text-muted-foreground/50">sem contexto</span>}
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveEvent(ev.id);
                    toast('Evento removido', {
                      duration: 5000,
                      action: {
                        label: 'Desfazer',
                        onClick: () => onUndo(),
                      },
                    });
                  }}
                  aria-label="Remover evento"
                  className="p-2 rounded-md text-muted-foreground hover:bg-destructive/15 hover:text-destructive transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <ChevronRight className="w-4 h-4 text-muted-foreground/40 shrink-0" />
              </div>
            );
          })}
```

- [ ] **Step 3: Run tests**

```bash
npm run test:run
```

Expected: 111 tests PASS.

- [ ] **Step 4: Verify type check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/EditDayDialog.tsx
git commit -m "style: improved event rows with tinted icons, chevron, and inline context"
```

---

## Task 7: PWA setup — remove singlefile, add vite-plugin-pwa

**Files:**
- Modify: `package.json`
- Modify: `vite.config.ts`
- Modify: `index.html`
- Create: `public/manifest.json`

- [ ] **Step 1: Swap npm packages**

```bash
npm uninstall vite-plugin-singlefile
npm install --save-dev vite-plugin-pwa
```

- [ ] **Step 2: Replace vite.config.ts**

Replace the entire `vite.config.ts`:

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  base: "./",
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg}'],
      },
      manifest: false,
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
```

- [ ] **Step 3: Create public/manifest.json**

```json
{
  "name": "Smoking Tracker",
  "short_name": "Smoking",
  "description": "Contador de consumo diário de tabaco e cannabis",
  "start_url": "./",
  "display": "standalone",
  "background_color": "#2b2b2b",
  "theme_color": "#2b2b2b",
  "icons": [
    { "src": "./icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "./icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

- [ ] **Step 4: Update index.html**

Add manifest link and theme-color meta inside `<head>`, after the viewport meta:

```html
  <link rel="manifest" href="./manifest.json" />
  <meta name="theme-color" content="#2b2b2b" />
```

- [ ] **Step 5: Run tests**

```bash
npm run test:run
```

Expected: 111 tests PASS.

- [ ] **Step 6: Verify type check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add vite.config.ts package.json package-lock.json index.html public/manifest.json
git commit -m "feat: add PWA support with vite-plugin-pwa, remove singlefile"
```

---

## Task 8: PWA icons

**Files:**
- Create: `public/icon-192.png`
- Create: `public/icon-512.png`

- [ ] **Step 1: Generate PWA icons**

Create simple PWA icons using an inline Node script. The icons will be a dark background with a cigarette emoji:

```bash
node -e "
const { createCanvas } = require('canvas');
[192, 512].forEach(size => {
  const c = createCanvas(size, size);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#2b2b2b';
  ctx.fillRect(0, 0, size, size);
  ctx.font = size * 0.5 + 'px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('🚬', size/2, size/2);
  require('fs').writeFileSync('public/icon-' + size + '.png', c.toBuffer('image/png'));
  console.log('Generated icon-' + size + '.png');
});
"
```

If `canvas` is not available, create simple SVG-based icons instead:

```bash
node -e "
const fs = require('fs');
const svg = (s) => \`<svg xmlns='http://www.w3.org/2000/svg' width='\${s}' height='\${s}' viewBox='0 0 \${s} \${s}'>
  <rect width='\${s}' height='\${s}' fill='#2b2b2b'/>
  <text x='50%' y='55%' font-size='\${s*0.45}' text-anchor='middle' dominant-baseline='middle'>🚬</text>
</svg>\`;
[192, 512].forEach(s => {
  fs.writeFileSync('public/icon-' + s + '.svg', svg(s));
  console.log('Generated icon-' + s + '.svg');
});
"
```

If using SVG fallback, update `public/manifest.json` to reference `.svg` instead of `.png` and set `type` to `image/svg+xml`.

- [ ] **Step 2: Verify icons exist**

```bash
ls -la public/icon-*
```

Expected: two icon files present.

- [ ] **Step 3: Commit**

```bash
git add public/icon-*
git commit -m "feat: add PWA icons"
```

---

## Task 9: Update Dockerfile

**Files:**
- Modify: `Dockerfile`

- [ ] **Step 1: Update Dockerfile**

The current Dockerfile copies `COPY --from=builder /app/dist /` which copies all dist contents to root. This still works with multi-file output since it copies the entire `dist/` contents. However, verify the Dockerfile is correct by checking the build:

```bash
npm run build && ls dist/
```

Expected: `index.html`, `assets/` directory, `manifest.json`, `sw.js` (or `registerSW.js`), icon files.

The Dockerfile already copies the full `dist/` directory, so no change is needed unless the build output structure changes.

- [ ] **Step 2: Commit (only if changes were needed)**

```bash
git status
# If Dockerfile was changed:
# git add Dockerfile
# git commit -m "chore: update Dockerfile for multi-file dist output"
```

---

## Task 10: Final verification

- [ ] **Step 1: Run full test suite**

```bash
npm run test:run
```

Expected: 111 tests PASS.

- [ ] **Step 2: Type check**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Production build**

```bash
npm run build
```

Expected: `dist/` generated with `index.html`, assets, service worker files, manifest, icons.

- [ ] **Step 4: Verify no hardcoded hex colors remain**

```bash
grep -rnE "#ba5f27|#27ba42" --include="*.tsx" --include="*.ts" src/
```

Expected: zero matches.

- [ ] **Step 5: Manual smoke test**

```bash
npm run preview
```

Open the printed URL and verify:
- **Mobile (375px):** header compact left-aligned, cards horizontal small, metrics visible, 7-col grid no scroll, everything above the fold
- **Desktop (1024px+):** proportional layout, not stretched, decent spacing
- **Tap CounterCard:** scale-down feedback, drawer opens
- **Tap grid cell:** dialog opens
- **EditDayDialog rows:** tinted icon box, chevron visible, inline context, trash hover red
- **PWA:** "Install" prompt available in browser, `manifest.json` loads correctly
- **Offline:** after initial load, disconnect network, reload — app still works

---

## Notes for the implementer

- **No logic changes:** all hook/helper code is untouched. The 111 existing tests validate nothing broke.
- **CSS variables:** use `bg-primary`, `bg-secondary`, `hsl(var(--primary))`, `hsl(var(--secondary))` — never hardcode hex colors.
- **Touch targets:** minimum 44px for interactive elements. Verify on 375px viewport.
- **PWA icons:** if `canvas` npm package is unavailable, SVG icons work as fallback. Update manifest `type` accordingly.
- **Commits:** commit at every task boundary. Do not squash.
- **When unsure:** the spec in `docs/superpowers/specs/2026-04-10-polish-pwa-design.md` is authoritative.
