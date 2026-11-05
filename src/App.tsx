import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { BottomNav } from '@/components/BottomNav';
import { TopNav } from '@/components/TopNav';
import { TrackerPage } from '@/pages/TrackerPage';
import { HistoryPage } from '@/pages/HistoryPage';
import { GoalsPage } from '@/pages/GoalsPage';
import { NewEventDrawer, NewEventInput } from '@/components/NewEventDrawer';
import { EditDayDialog } from '@/components/EditDayDialog';
import { EditEventDrawer } from '@/components/EditEventDrawer';
import { LoginScreen } from '@/components/LoginScreen';
import { useTracker } from '@/hooks/useTracker';
import { useSync } from '@/hooks/useSync';
import { getDayKey, todayKey } from '@/lib/events';
import { EventType, TrackerEvent } from '@/types';

type Tab = 'tracker' | 'history' | 'goals';

const App = () => {
  const tracker = useTracker();
  const sync = useSync(tracker);
  const [loginOpen, setLoginOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('tracker');
  const [drawerType, setDrawerType] = useState<EventType | null>(null);
  const [editingDay, setEditingDay] = useState<string | null>(null);
  const [editingEvent, setEditingEvent] = useState<TrackerEvent | null>(null);

  const handleSubmitEvent = (input: NewEventInput) => {
    tracker.addEvent(input);
    const label = input.type === 'tobacco' ? 'tabaco' : 'cannabis';
    // Point out when the event didn't land on today, since "Consumo de Hoje" won't move
    const daySuffix = getDayKey(input.timestamp) === todayKey()
      ? ''
      : ` · ${format(parseISO(input.timestamp), 'dd/MM')}`;
    toast.success(`+1 ${label}${daySuffix}`, {
      duration: 5000,
      action: {
        label: 'Desfazer',
        onClick: () => tracker.executeUndo(),
      },
    });
  };

  const dayEvents = editingDay ? tracker.getEventsForDay(editingDay) : [];
  const dayNotes = editingDay ? tracker.getDayNotes(editingDay) : [];

  if (sync.status === 'loading') return null;
  if (sync.status === 'needs-login') return <LoginScreen sync={sync} />;

  return (
    <TooltipProvider>
      <Toaster />
      <Sonner />

      {sync.status === 'expired' && (
        <div className="fixed top-16 inset-x-0 z-[45] bg-primary text-primary-foreground border-b-2 border-border px-4 py-1.5 flex items-center justify-between gap-3">
          <span className="text-xs font-bold">Sem login: salvando só neste aparelho</span>
          <button
            onClick={() => setLoginOpen(true)}
            className="text-xs font-bold uppercase tracking-wide underline shrink-0"
          >
            Entrar de novo
          </button>
        </div>
      )}
      {loginOpen && sync.status === 'expired' && (
        <LoginScreen sync={sync} onCancel={() => setLoginOpen(false)} />
      )}

      {/* Mobile header */}
      <header className="md:hidden fixed top-0 w-full z-50 bg-card flex justify-between items-center px-6 h-16 border-b-2 border-border">
        <span className="text-foreground font-bold tracking-tight text-xl">Smoking Tracker</span>
        <button
          onClick={() => setTab('goals')}
          aria-label="Configurações"
          className="p-2 text-foreground hover:bg-muted transition-colors"
        >
          <span className="material-symbols-outlined">settings</span>
        </button>
      </header>

      {/* Desktop nav + sidebar */}
      <TopNav
        tab={tab}
        onChange={setTab}
        tracker={tracker}
        sync={sync}
        onOpenNewEvent={(type) => setDrawerType(type)}
      />

      {/* Page content */}
      {tab === 'tracker' && (
        <TrackerPage
          tracker={tracker}
          onOpenNewEvent={(type) => setDrawerType(type)}
          onOpenEditEvent={(event) => setEditingEvent(event)}
          onOpenEditDay={(dayKey) => setEditingDay(dayKey)}
        />
      )}
      {tab === 'history' && (
        <HistoryPage
          tracker={tracker}
          onOpenEditDay={(dayKey) => setEditingDay(dayKey)}
        />
      )}
      {tab === 'goals' && (
        <GoalsPage tracker={tracker} sync={sync} />
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

      <EditEventDrawer
        open={editingEvent !== null}
        onOpenChange={(open) => !open && setEditingEvent(null)}
        event={editingEvent}
        onSave={tracker.updateEvent}
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
        notes={dayNotes}
        onAddNote={tracker.addDayNote}
        onUpdateNote={tracker.updateDayNote}
        onRemoveNote={tracker.removeDayNote}
        onRestoreNote={tracker.restoreDayNote}
      />
    </TooltipProvider>
  );
};

export default App;
