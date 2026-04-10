import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { Cigarette, Leaf, Trash2 } from 'lucide-react';
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
import { TrackerEvent } from '@/types';

interface EditDayDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dayKey: string | null;
  events: TrackerEvent[];
  onRemoveEvent: (id: string) => void;
  onClearDay: (dayKey: string) => void;
  onUndo: () => void;
}

export const EditDayDialog = ({
  open,
  onOpenChange,
  dayKey,
  events,
  onRemoveEvent,
  onClearDay,
  onUndo,
}: EditDayDialogProps) => {
  const [confirmClear, setConfirmClear] = useState(false);

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
        if (!next) setConfirmClear(false);
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
            return (
              <div
                key={ev.id}
                className="flex items-start gap-3 p-3 rounded-lg border bg-card"
              >
                <Icon className="w-5 h-5 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{time}</div>
                  {ev.location && (
                    <div className="text-xs text-muted-foreground truncate">
                      Onde: {ev.location}
                    </div>
                  )}
                  {ev.reason && (
                    <div className="text-xs text-muted-foreground truncate">
                      Por quê: {ev.reason}
                    </div>
                  )}
                </div>
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
      </DialogContent>
    </Dialog>
  );
};
