# Undo & Edição de Eventos — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add undo for addEvent/removeEvent with 5s toast, and a dedicated EditEventDrawer for editing all fields of an existing event.

**Architecture:** `UndoAction` type + `pendingUndo`/`executeUndo()` in `useTracker` hook (TDD). New `EditEventDrawer` component mirrors `NewEventDrawer` style. `EditDayDialog` gets clickable rows + undo toast on remove. `App.tsx` adds undo button to addEvent toast.

**Tech Stack:** React 18, TypeScript, Vitest, sonner (toast), shadcn/ui (Drawer), date-fns, Tailwind CSS.

**Spec:** `docs/superpowers/specs/2026-04-10-undo-edicao-eventos-design.md`

---

### Task 1: Add `UndoAction` type and `pendingUndo` + `executeUndo` to `useTracker` (TDD)

**Files:**
- Modify: `src/hooks/useTracker.ts`
- Modify: `src/hooks/useTracker.test.ts`

- [ ] **Step 1: Write failing tests for undo**

Add to `src/hooks/useTracker.test.ts`:

```ts
describe('useTracker — undo', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-08T14:30:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts with pendingUndo as null', () => {
    const { result } = renderHook(() => useTracker());
    expect(result.current.pendingUndo).toBeNull();
  });

  it('addEvent sets pendingUndo with type remove-event', () => {
    const { result } = renderHook(() => useTracker());
    act(() => { result.current.addEvent({ type: 'tobacco' }); });
    expect(result.current.pendingUndo).toEqual({
      type: 'remove-event',
      eventId: result.current.events[0].id,
    });
  });

  it('executeUndo after addEvent removes the added event', () => {
    const { result } = renderHook(() => useTracker());
    act(() => { result.current.addEvent({ type: 'tobacco' }); });
    expect(result.current.events).toHaveLength(1);
    act(() => { result.current.executeUndo(); });
    expect(result.current.events).toHaveLength(0);
    expect(result.current.pendingUndo).toBeNull();
  });

  it('removeEvent sets pendingUndo with type restore-event', () => {
    const seed: TrackerEvent[] = [
      { id: 'a', timestamp: '2026-04-08T10:00:00-03:00', type: 'tobacco', location: 'casa' },
    ];
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ events: seed }));
    const { result } = renderHook(() => useTracker());
    act(() => { result.current.removeEvent('a'); });
    expect(result.current.pendingUndo).toEqual({
      type: 'restore-event',
      event: seed[0],
    });
  });

  it('executeUndo after removeEvent restores the event', () => {
    const seed: TrackerEvent[] = [
      { id: 'a', timestamp: '2026-04-08T10:00:00-03:00', type: 'tobacco' },
    ];
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ events: seed }));
    const { result } = renderHook(() => useTracker());
    act(() => { result.current.removeEvent('a'); });
    expect(result.current.events).toHaveLength(0);
    act(() => { result.current.executeUndo(); });
    expect(result.current.events).toHaveLength(1);
    expect(result.current.events[0].id).toBe('a');
    expect(result.current.pendingUndo).toBeNull();
  });

  it('new action overwrites previous pendingUndo', () => {
    const { result } = renderHook(() => useTracker());
    act(() => { result.current.addEvent({ type: 'tobacco' }); });
    const firstId = result.current.events[0].id;
    act(() => { result.current.addEvent({ type: 'cannabis' }); });
    expect(result.current.pendingUndo).toEqual({
      type: 'remove-event',
      eventId: result.current.events[1].id,
    });
    // Undo only removes the second event
    act(() => { result.current.executeUndo(); });
    expect(result.current.events).toHaveLength(1);
    expect(result.current.events[0].id).toBe(firstId);
  });

  it('executeUndo is no-op when pendingUndo is null', () => {
    const { result } = renderHook(() => useTracker());
    act(() => { result.current.addEvent({ type: 'tobacco' }); });
    act(() => { result.current.executeUndo(); });
    // Already undone, second call is no-op
    act(() => { result.current.executeUndo(); });
    expect(result.current.events).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/hooks/useTracker.test.ts`
Expected: FAIL — `pendingUndo` and `executeUndo` not in API

- [ ] **Step 3: Implement undo in useTracker**

Add the `UndoAction` type and update the hook in `src/hooks/useTracker.ts`:

1. Add type above `UseTrackerAPI`:

```ts
export type UndoAction =
  | { type: 'restore-event'; event: TrackerEvent }
  | { type: 'remove-event'; eventId: string };
```

2. Add to `UseTrackerAPI` interface:

```ts
  pendingUndo: UndoAction | null;
  executeUndo(): void;
```

3. Add state inside `useTracker`:

```ts
  const [pendingUndo, setPendingUndo] = useState<UndoAction | null>(null);
```

4. Update `addEvent` to set pendingUndo:

```ts
  const addEvent = useCallback<UseTrackerAPI['addEvent']>((input) => {
    const id = uuidv4();
    const event: TrackerEvent = {
      id,
      timestamp: nowLocalIso(),
      type: input.type,
      location: input.location?.trim() ? input.location.trim() : undefined,
      reason: input.reason?.trim() ? input.reason.trim() : undefined,
    };
    setEvents((prev) => [...prev, event]);
    setPendingUndo({ type: 'remove-event', eventId: id });
  }, []);
```

5. Update `removeEvent` to set pendingUndo:

```ts
  const removeEvent = useCallback<UseTrackerAPI['removeEvent']>((id) => {
    setEvents((prev) => {
      const event = prev.find((e) => e.id === id);
      if (event) {
        setPendingUndo({ type: 'restore-event', event });
      }
      return prev.filter((e) => e.id !== id);
    });
  }, []);
```

6. Add `executeUndo`:

```ts
  const executeUndo = useCallback<UseTrackerAPI['executeUndo']>(() => {
    setPendingUndo((current) => {
      if (!current) return null;
      if (current.type === 'remove-event') {
        setEvents((prev) => prev.filter((e) => e.id !== current.eventId));
      } else {
        setEvents((prev) => [...prev, current.event]);
      }
      return null;
    });
  }, []);
```

7. Add `pendingUndo` and `executeUndo` to the return object:

```ts
  return {
    // ... existing fields ...
    pendingUndo,
    executeUndo,
  };
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/hooks/useTracker.test.ts`
Expected: all PASS

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useTracker.ts src/hooks/useTracker.test.ts
git commit -m "feat: add undo support to useTracker (addEvent + removeEvent)"
```

---

### Task 2: Add `updateEvent` tests for type and timestamp changes

**Files:**
- Modify: `src/hooks/useTracker.test.ts`

- [ ] **Step 1: Add tests for updateEvent covering type and timestamp**

Add to the existing `useTracker — updateEvent` describe block in `src/hooks/useTracker.test.ts`:

```ts
  it('updates event type', () => {
    const seed: TrackerEvent[] = [
      { id: 'a', timestamp: '2026-04-08T10:00:00-03:00', type: 'tobacco' },
    ];
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ events: seed }));
    const { result } = renderHook(() => useTracker());
    act(() => {
      result.current.updateEvent('a', { type: 'cannabis' });
    });
    expect(result.current.events[0].type).toBe('cannabis');
  });

  it('updates event timestamp', () => {
    const seed: TrackerEvent[] = [
      { id: 'a', timestamp: '2026-04-08T10:00:00-03:00', type: 'tobacco' },
    ];
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ events: seed }));
    const { result } = renderHook(() => useTracker());
    act(() => {
      result.current.updateEvent('a', { timestamp: '2026-04-08T15:30:00-03:00' });
    });
    expect(result.current.events[0].timestamp).toBe('2026-04-08T15:30:00-03:00');
  });
```

- [ ] **Step 2: Run tests to verify they pass**

Run: `npx vitest run src/hooks/useTracker.test.ts`
Expected: all PASS (updateEvent already handles partial patches generically)

- [ ] **Step 3: Commit**

```bash
git add src/hooks/useTracker.test.ts
git commit -m "test: add updateEvent tests for type and timestamp changes"
```

---

### Task 3: Wire undo toast into `App.tsx` for addEvent

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Update the addEvent toast to include undo button**

In `src/App.tsx`, update the `handleSubmitEvent` function:

```tsx
  const handleSubmitEvent = (input: { type: EventType; location?: string; reason?: string }) => {
    tracker.addEvent(input);
    toast.success(
      `+1 ${input.type === 'tobacco' ? 'tabaco' : 'cannabis'}`,
      {
        duration: 5000,
        action: {
          label: 'Desfazer',
          onClick: () => tracker.executeUndo(),
        },
      }
    );
  };
```

- [ ] **Step 2: Verify build**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "feat: add undo button to addEvent toast"
```

---

### Task 4: Wire undo toast into `EditDayDialog` for removeEvent

**Files:**
- Modify: `src/components/EditDayDialog.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Add `onUndo` prop to EditDayDialog and wire toast on remove**

In `src/components/EditDayDialog.tsx`:

1. Update the interface to add `onUndo`:

```tsx
interface EditDayDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dayKey: string | null;
  events: TrackerEvent[];
  onRemoveEvent: (id: string) => void;
  onClearDay: (dayKey: string) => void;
  onUndo: () => void;
}
```

2. Add `onUndo` to the destructured props:

```tsx
export const EditDayDialog = ({
  open,
  onOpenChange,
  dayKey,
  events,
  onRemoveEvent,
  onClearDay,
  onUndo,
}: EditDayDialogProps) => {
```

3. Add `toast` import at the top:

```tsx
import { toast } from 'sonner';
```

4. Update the remove button's `onClick` to show undo toast. Replace the existing trash button:

```tsx
                <Button
                  variant="ghost"
                  size="icon"
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
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
```

Note: the variable in `.map((ev)` must match — the existing code uses `e` for the event variable in the map. Rename it to `ev` to avoid shadowing the click event `e`. Update the map callback: `{sorted.map((ev) => {` and references inside from `e.id`, `e.type`, `e.timestamp`, `e.location`, `e.reason` to `ev.id`, `ev.type`, `ev.timestamp`, `ev.location`, `ev.reason`.

- [ ] **Step 2: Pass `onUndo` from App.tsx**

In `src/App.tsx`, update the `EditDayDialog` usage:

```tsx
        <EditDayDialog
          open={editingDay !== null}
          onOpenChange={(open) => !open && setEditingDay(null)}
          dayKey={editingDay}
          events={dayEvents}
          onRemoveEvent={tracker.removeEvent}
          onClearDay={tracker.clearDay}
          onUndo={tracker.executeUndo}
        />
```

- [ ] **Step 3: Verify build**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add src/components/EditDayDialog.tsx src/App.tsx
git commit -m "feat: add undo toast to removeEvent in EditDayDialog"
```

---

### Task 5: Create `EditEventDrawer` component

**Files:**
- Create: `src/components/EditEventDrawer.tsx`

- [ ] **Step 1: Create the EditEventDrawer component**

Create `src/components/EditEventDrawer.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { Cigarette, Leaf } from 'lucide-react';
import { format, parseISO } from 'date-fns';
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
import { EventType, TrackerEvent } from '@/types';

interface EditEventDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: TrackerEvent | null;
  onSave: (id: string, patch: Partial<Omit<TrackerEvent, 'id'>>) => void;
}

export const EditEventDrawer = ({ open, onOpenChange, event, onSave }: EditEventDrawerProps) => {
  const [type, setType] = useState<EventType>('tobacco');
  const [time, setTime] = useState('');
  const [location, setLocation] = useState('');
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (open && event) {
      setType(event.type);
      setTime(format(parseISO(event.timestamp), 'HH:mm'));
      setLocation(event.location ?? '');
      setReason(event.reason ?? '');
    }
  }, [open, event]);

  const handleSave = () => {
    if (!event) return;

    const patch: Partial<Omit<TrackerEvent, 'id'>> = {};

    if (type !== event.type) {
      patch.type = type;
    }

    const trimmedLocation = location.trim() || undefined;
    if (trimmedLocation !== (event.location ?? undefined)) {
      patch.location = trimmedLocation;
    }

    const trimmedReason = reason.trim() || undefined;
    if (trimmedReason !== (event.reason ?? undefined)) {
      patch.reason = trimmedReason;
    }

    if (time) {
      const [hours, minutes] = time.split(':').map(Number);
      const original = parseISO(event.timestamp);
      const updated = new Date(original);
      updated.setHours(hours, minutes, 0, 0);
      const newTimestamp = event.timestamp.replace(
        /\d{2}:\d{2}:\d{2}/,
        `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`
      );
      if (newTimestamp !== event.timestamp) {
        patch.timestamp = newTimestamp;
      }
    }

    if (Object.keys(patch).length > 0) {
      onSave(event.id, patch);
    }
    onOpenChange(false);
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Editar evento</DrawerTitle>
          <DrawerDescription>Altere os campos e salve.</DrawerDescription>
        </DrawerHeader>
        <div className="px-4 pb-2 space-y-3">
          <div className="space-y-1.5">
            <Label>Tipo</Label>
            <div className="flex gap-2">
              <Button
                variant={type === 'tobacco' ? 'default' : 'outline'}
                onClick={() => setType('tobacco')}
                className="flex-1"
              >
                <Cigarette className="w-4 h-4 mr-2" />
                Tabaco
              </Button>
              <Button
                variant={type === 'cannabis' ? 'default' : 'outline'}
                onClick={() => setType('cannabis')}
                className="flex-1"
              >
                <Leaf className="w-4 h-4 mr-2" />
                Cannabis
              </Button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-event-time">Horário</Label>
            <Input
              id="edit-event-time"
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-event-location">Onde?</Label>
            <Input
              id="edit-event-location"
              placeholder="casa, trabalho, bar…"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-event-reason">Por quê?</Label>
            <Input
              id="edit-event-reason"
              placeholder="primeiro do dia, pós almoço…"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave();
              }}
            />
          </div>
        </div>
        <DrawerFooter>
          <Button onClick={handleSave}>Salvar</Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};
```

- [ ] **Step 2: Verify build**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/components/EditEventDrawer.tsx
git commit -m "feat: add EditEventDrawer component"
```

---

### Task 6: Integrate `EditEventDrawer` into `EditDayDialog`

**Files:**
- Modify: `src/components/EditDayDialog.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Add onUpdateEvent prop and EditEventDrawer to EditDayDialog**

In `src/components/EditDayDialog.tsx`:

1. Add import:

```tsx
import { EditEventDrawer } from './EditEventDrawer';
import { TrackerEvent } from '@/types';
```

Note: `TrackerEvent` is already imported — just add `EditEventDrawer`.

2. Update the interface:

```tsx
interface EditDayDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dayKey: string | null;
  events: TrackerEvent[];
  onRemoveEvent: (id: string) => void;
  onClearDay: (dayKey: string) => void;
  onUndo: () => void;
  onUpdateEvent: (id: string, patch: Partial<Omit<TrackerEvent, 'id'>>) => void;
}
```

3. Add `onUpdateEvent` to destructured props:

```tsx
export const EditDayDialog = ({
  open,
  onOpenChange,
  dayKey,
  events,
  onRemoveEvent,
  onClearDay,
  onUndo,
  onUpdateEvent,
}: EditDayDialogProps) => {
```

4. Add state for editing event:

```tsx
  const [editingEvent, setEditingEvent] = useState<TrackerEvent | null>(null);
```

5. Make event rows clickable. Update the row div (the one with `key={ev.id}`):

```tsx
              <div
                key={ev.id}
                onClick={() => setEditingEvent(ev)}
                className="flex items-start gap-3 p-3 rounded-lg border bg-card cursor-pointer hover:bg-accent/50 transition-colors"
              >
```

6. Add `EditEventDrawer` before the closing `</DialogContent>`:

```tsx
        <EditEventDrawer
          open={editingEvent !== null}
          onOpenChange={(isOpen) => { if (!isOpen) setEditingEvent(null); }}
          event={editingEvent}
          onSave={onUpdateEvent}
        />
```

7. Reset `editingEvent` when the dialog closes. Update the `onOpenChange` handler:

```tsx
      onOpenChange={(next) => {
        if (!next) {
          setConfirmClear(false);
          setEditingEvent(null);
        }
        onOpenChange(next);
      }}
```

- [ ] **Step 2: Pass `onUpdateEvent` from App.tsx**

In `src/App.tsx`, update the `EditDayDialog` usage:

```tsx
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
```

- [ ] **Step 3: Verify build**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add src/components/EditDayDialog.tsx src/App.tsx
git commit -m "feat: integrate EditEventDrawer into EditDayDialog"
```

---

### Task 7: Final verification

- [ ] **Step 1: Run full test suite**

Run: `npx vitest run`
Expected: all PASS

- [ ] **Step 2: Run production build**

Run: `npm run build`
Expected: clean build, no warnings

- [ ] **Step 3: Verify no type errors**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 4: Commit any remaining changes**

```bash
git status
# If clean, no commit needed
```
