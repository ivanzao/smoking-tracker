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
