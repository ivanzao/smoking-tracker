import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { Cigarette, Leaf, Trash2, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { EditEventDrawer } from './EditEventDrawer';
import { TrackerEvent } from '@/types';

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
  const [confirmClear, setConfirmClear] = useState(false);
  const [editingEvent, setEditingEvent] = useState<TrackerEvent | null>(null);

  const prettyDate = dayKey
    ? format(parseISO(dayKey + 'T00:00:00'), 'dd/MM/yyyy')
    : '';

  const sorted = [...events].sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  const handleClearDay = () => {
    if (!dayKey) return;
    if (!confirmClear) {
      setConfirmClear(true);
      return;
    }
    onClearDay(dayKey);
    setConfirmClear(false);
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setConfirmClear(false);
          setEditingEvent(null);
        }
        onOpenChange(next);
      }}
    >
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Dia {prettyDate}</DialogTitle>
          <DialogDescription>
            {sorted.length === 0
              ? 'Nenhum evento registrado neste dia.'
              : `${sorted.length} evento(s) registrado(s)`}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[50vh] overflow-y-auto space-y-2 py-2">
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
        </div>

        <DialogFooter className="flex-col sm:flex-row sm:justify-between gap-2">
          {sorted.length > 0 && (
            <Button
              variant="destructive"
              onClick={handleClearDay}
            >
              {confirmClear ? 'Confirmar: limpar dia' : 'Limpar dia'}
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
        <EditEventDrawer
          open={editingEvent !== null}
          onOpenChange={(isOpen) => { if (!isOpen) setEditingEvent(null); }}
          event={editingEvent}
          onSave={onUpdateEvent}
        />
      </DialogContent>
    </Dialog>
  );
};
