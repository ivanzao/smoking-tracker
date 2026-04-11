# Desktop UI Fixes — Design Spec

**Date:** 2026-04-11  
**Status:** Approved

## Problem Summary

Three issues identified on the desktop layout:

1. The fixed top header (64px) overlaps the streak number in HistoryPage due to insufficient top padding.
2. TrackerPage is hidden on desktop (`md:hidden`), leaving the main content area blank when on the Tracker tab.
3. GoalsPage exists as a full navigation tab on desktop; user wants it embedded at the bottom of the sidebar instead.

---

## Changes

### 1. Fix Header Overlap (HistoryPage + GoalsPage)

**Files:** `src/pages/HistoryPage.tsx`, `src/pages/GoalsPage.tsx`

Change `md:pt-8` to `md:pt-24` on the `<main>` element in both pages. The fixed header is `h-16` (64px); `pt-24` (96px) gives 32px of breathing room below it, matching the mobile pattern.

---

### 2. TrackerPage on Desktop — Recent Logs Section

**File:** `src/pages/TrackerPage.tsx`

- Remove `md:hidden` from the `<main>` element.
- Add `md:ml-80 md:pt-24` so the content sits to the right of the sidebar and below the header.
- Add a "Logs Recentes" section (`hidden md:block`) showing events from **today + the 2 previous days** (3 days total), grouped by day with a date heading.
  - Day headings: "Hoje", "Ontem", or formatted date (e.g., "09/04").
  - Each event row: type icon, type label ("Tabaco" / "Cannabis"), and formatted time (HH:mm).
  - Days with zero events are omitted entirely.
  - Events within each day are sorted descending by timestamp (most recent first).

**Approach:** Keep the existing `<main className="... md:hidden">` untouched for mobile. Add a sibling desktop-only `<main className="hidden md:flex flex-col px-8 pt-24 pb-8 ml-80 overflow-y-auto min-h-screen">` with just the recent logs section. This avoids touching the mobile layout at all.

---

### 3. Goals Embedded in Sidebar

**New file:** `src/components/GoalsContent.tsx`

Extract all JSX, state, and handlers from `GoalsPage` into `GoalsContent`. It receives only `tracker: UseTrackerAPI` as a prop and is self-contained (manages `goalValue` state, `fileInputRef`, all handlers).

Sections inside `GoalsContent`:
- Meta Diária (goal slider + save/remove buttons)
- Dados (export + import JSON)
- Danger Zone (clear all data)

**File:** `src/pages/GoalsPage.tsx`

Becomes a thin wrapper:
```tsx
<main className="flex-1 px-6 pt-24 pb-32 overflow-y-auto max-w-lg mx-auto md:hidden">
  <GoalsContent tracker={tracker} />
</main>
```

The `md:hidden` hides GoalsPage entirely on desktop since goals are now in the sidebar.

**File:** `src/components/TopNav.tsx`

- Remove `goals` from `NAV_TABS` array (desktop nav shows only Tracker + History).
- Remove the gear icon button from the desktop header (redundant since Goals is always visible in sidebar).
- At the bottom of the `<aside>`, add a `<hr>` separator and render `<GoalsContent tracker={tracker} />`.
- The `TopNav` props interface gains `tracker: UseTrackerAPI` (already present) — no change needed.

**File:** `src/App.tsx`

- The `tab === 'goals'` branch can remain for mobile (GoalsPage renders with `md:hidden`).
- No structural change needed; desktop simply never shows the goals tab in the nav.

---

## Component Diagram

```
TopNav (desktop sidebar)
├── Quick Log buttons
├── Streak card
├── Today stats
├── <hr>
└── GoalsContent          ← new, extracted from GoalsPage

GoalsPage (mobile only, md:hidden)
└── GoalsContent          ← same component

TrackerPage
├── <main md:hidden>      ← existing mobile layout, untouched
└── <main hidden md:block> ← new desktop layout
    └── Recent Logs (today + 2 prev days, grouped by day)

HistoryPage
└── <main md:pt-24>       ← was md:pt-8

```

---

## Out of Scope

- No changes to mobile navigation or GoalsPage mobile behaviour.
- No changes to BottomNav.
- No changes to History or Tracker mobile layouts.
