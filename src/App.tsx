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
      {
        duration: 5000,
        action: {
          label: 'Desfazer',
          onClick: () => tracker.executeUndo(),
        },
      }
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
