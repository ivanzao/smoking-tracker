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
