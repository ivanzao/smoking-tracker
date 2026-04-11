# Obsidian Pulse Redesign — Design Spec

**Date:** 2026-04-11  
**Source:** Stitch project 1751756495702566250 ("Melhoria Design Mobile")  
**Target screens:** Final Mobile Tracker + Final Web Dashboard

---

## 1. Goal

Adapt the smoking-tracker app to match the "Obsidian Pulse" design system proposed in Stitch, including:
- Multi-tab navigation (Tracker / History / Goals)
- Full dark-only palette based on tonal depth (no borders for sectioning)
- Mobile bottom nav + desktop sidebar nav
- Premium editorial aesthetic with neon green (cannabis) and coral (tobacco) accents

---

## 2. Navigation Architecture

**Approach:** State-based navigation — `useState<'tracker' | 'history' | 'goals'>` in `App.tsx`. No router added.

```
App.tsx (shell)
  ├── TopNav (desktop header + sidebar)
  ├── BottomNav (mobile only, fixed bottom)
  ├── tab === 'tracker'  → <TrackerPage />
  ├── tab === 'history'  → <HistoryPage />
  └── tab === 'goals'    → <GoalsPage />
```

**Mobile layout:** fixed header (64px) + scrollable content + fixed bottom nav (80px)  
**Desktop layout:** fixed header with inline nav links + left sidebar (320px, always visible) + main content area

All pages receive tracker data via props from `App.tsx`. `useTracker` is never called inside pages.

---

## 3. Design System (Obsidian Pulse)

### Color Palette — replace `index.css` CSS vars

| CSS Variable | Hex Value | Usage |
|---|---|---|
| `--background` | `#131313` | App canvas |
| `--surface-container-lowest` | `#0e0e0e` | Deepest background |
| `--surface-container-low` | `#1c1b1b` | Main cards |
| `--surface-container` | `#201f1f` | Secondary cards |
| `--surface-container-high` | `#2a2a2a` | Interactive elements |
| `--surface-container-highest` | `#353534` | Active / hover states |
| `--primary` | `#75ff9e` | Cannabis, primary actions |
| `--primary-container` | `#00e676` | Gradient endpoint |
| `--secondary` | `#ffb59f` | Tobacco |
| `--on-surface` | `#e5e2e1` | Primary text |
| `--on-surface-variant` | `#bacbb9` | Labels, secondary text |
| `--outline-variant` | `#3b4a3d` | Ghost borders (charts only) |
| `--on-primary` | `#003918` | Text on primary buttons |

### Typography
- Font: Inter (already in project, no change)
- Hero stats: `text-5xl font-bold tracking-tight`
- Section labels: `text-[10px] font-medium uppercase tracking-[0.1em]`
- Card values: `text-3xl font-bold`

### Rules
- **No 1px borders for sectioning** — use background color shifts between layers
- Ghost borders (`border border-primary/20` or `border-outline-variant/10`) only on selected/focused interactive elements
- Primary buttons: pill shape, gradient `from-primary to-primary-container`, text `on-primary`
- Card radii: `rounded-xl` (12px) for main cards, `rounded-lg` (8px) for nested children
- Bottom nav backdrop: `bg-[#1c1b1b]/80 backdrop-blur-xl rounded-t-2xl`
- Active nav item: `text-primary bg-primary/10 rounded-xl`

---

## 4. Page Designs

### 4.1 TrackerPage

**Mobile:**
- Header: logo (`text-primary font-black tracking-tighter`) + settings icon button
- **Quick Log section:** 2-column grid of large tap buttons (`bg-surface-container-high p-6 rounded-2xl`), each with icon + label. Tap → opens existing `NewEventDrawer`
  - Tabaco: `smoke_free` Material Symbol, `text-secondary`
  - Cannabis: `potted_plant` Material Symbol, `text-primary`
- **Hero Streak:** `text-5xl font-bold text-primary` number + `text-primary/60` "dias" label. Only shown when a goal is active.
- **Bento grid:**
  - Col-span-2 card: Today's consumption — tobacco count, cannabis count, daily goal progress bar (gradient `from-primary to-primary-container`, 6px height)
  - Col-span-2 card: "Últimas 7 horas" mini bar chart — simple div bars using data from `useTracker`, tobacco = `bg-secondary`, cannabis = `bg-primary`

**Desktop (sidebar):**
- Quick Log buttons (same as mobile)
- Streak card with icon `bolt` (filled)
- Quick Stats: consumption delta % vs previous 7 days

**Desktop (main area):**
- Monthly Narrative section: reuses `MonthlyChart` at full height
- Last 7 Days bento: 7 day-cards in a row (Mon–Sun), each showing total, colored by type

### 4.2 HistoryPage

- **Hero stat:** "X dias limpos" — `text-[3.5rem] font-bold tracking-tighter text-on-surface`
- **2-col bento:** "Esta semana" (total + delta vs last week, `text-primary`) / "Média 7d" (value + delta, `text-secondary`)
- **Month navigation + `MonthlyChart`** — reuses existing component
- **Month calendar grid:** reuses `DayCell` component extracted from `CalendarView`
- **Recent Logs list:** 5 most recent events, each row has type icon, label ("Cannabis Session" / "Tobacco Stick"), timestamp, edit button → opens `EditDayDialog`

### 4.3 GoalsPage

- **Goal cards:** one for Tobacco, one for Cannabis
  - Each: `bg-surface-container rounded-xl p-5 border-l-4` (tobacco: `border-secondary`, cannabis: `border-primary`)
  - Icon + label + current value (large italic number)
  - Progress bar
  - Range slider (`accent-primary` / `accent-secondary`)
- **Data section:** Export JSON button, Import JSON button (existing logic)
- **Danger zone:** "Limpar todos os dados" button (`text-error`)

---

## 5. Component Inventory

### Kept unchanged
- `useTracker` hook
- `MonthlyChart.tsx`
- `NewEventDrawer.tsx`
- `EditDayDialog.tsx`
- `types.ts`, `lib/events.ts`, `lib/stats.ts`
- shadcn primitives (`Drawer`, `Dialog`, `Tooltip`, `Toaster`)

### Refactored
| File | Change |
|---|---|
| `index.css` | Replace entire palette with Obsidian Pulse tokens |
| `App.tsx` | Shell: tab state, renders TopNav + active page + BottomNav |
| `CalendarView.tsx` | Extract `DayCell` and `MonthNavigation` as named exports; remove internal tabs |

### Deleted
| File | Reason |
|---|---|
| `SettingsDrawer.tsx` | Content migrates to `GoalsPage` |

### New files
| File | Purpose |
|---|---|
| `src/components/BottomNav.tsx` | Mobile fixed bottom nav (4 tabs) |
| `src/components/TopNav.tsx` | Desktop: fixed header with inline nav + left sidebar |
| `src/components/CounterCard.tsx` | Rewritten as Quick Log button (Material Symbols, large tap target) |
| `src/pages/TrackerPage.tsx` | Today view |
| `src/pages/HistoryPage.tsx` | History + analytics view |
| `src/pages/GoalsPage.tsx` | Goals + data management view |

---

## 6. Data Flow

All pages receive data via props from `App.tsx`:

```tsx
// App.tsx passes down:
interface PageProps {
  tracker: ReturnType<typeof useTracker>;
  onOpenNewEvent: (type: EventType) => void;
  onOpenEditDay: (dayKey: string) => void;
}
```

`NewEventDrawer` and `EditDayDialog` remain controlled by `App.tsx` state (open/closed).

---

## 7. Out of Scope

- Dark/light mode toggle — app is dark-only
- Notifications / streak reminders (shown in Stitch Settings screen)
- Profile photo / user account
- "Savings" metric (shown in Stitch History screen)
- Separate "Tracker" tab as distinct from "Dashboard" — merged into TrackerPage
