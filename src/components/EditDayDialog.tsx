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
import { DayNotes } from './DayNotes';
import { getDayKey } from '@/lib/events';
import { DayNote, TrackerEvent } from '@/types';

interface EditDayDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dayKey: string | null;
  events: TrackerEvent[];
  onRemoveEvent: (id: string) => void;
  onClearDay: (dayKey: string) => void;
  onUndo: () => void;
  onUpdateEvent: (id: string, patch: Partial<Omit<TrackerEvent, 'id'>>) => void;
  notes: DayNote[];
  onAddNote: (dayKey: string, text: string) => void;
  onUpdateNote: (dayKey: string, noteId: string, text: string) => void;
  onRemoveNote: (dayKey: string, noteId: string) => void;
  onRestoreNote: (dayKey: string, note: DayNote) => void;
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
  notes,
  onAddNote,
  onUpdateNote,
  onRemoveNote,
  onRestoreNote,
}: EditDayDialogProps) => {
  const [confirmClear, setConfirmClear] = useState(false);
  const [editingEvent, setEditingEvent] = useState<TrackerEvent | null>(null);
  const [editingNote, setEditingNote] = useState(false);

  const prettyDate = dayKey
    ? format(parseISO(dayKey + 'T00:00:00'), 'dd/MM/yyyy')
    : '';

  const sorted = [...events].sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  // The list only shows this day's events, so an event moved elsewhere vanishes — say where it went
  const handleSaveEvent = (id: string, patch: Partial<Omit<TrackerEvent, 'id'>>) => {
    onUpdateEvent(id, patch);
    if (patch.timestamp && dayKey && getDayKey(patch.timestamp) !== dayKey) {
      toast(`Movido para ${format(parseISO(patch.timestamp), 'dd/MM')}`);
    }
  };

  // The undo toast carries the note itself, so it never collides with the events' pendingUndo slot
  const handleRemoveNote = (noteId: string) => {
    if (!dayKey) return;
    const note = notes.find((n) => n.id === noteId);
    if (!note) return;
    onRemoveNote(dayKey, noteId);
    toast('Anotação removida', {
      duration: 5000,
      action: {
        label: 'Desfazer',
        onClick: () => onRestoreNote(dayKey, note),
      },
    });
  };

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
          setEditingNote(false);
        }
        onOpenChange(next);
      }}
    >
      <DialogContent
        className="sm:max-w-[480px]"
        // Radix listens for Escape on document (capture); while a note is being edited,
        // Escape belongs to the inline input, not to the dialog
        onEscapeKeyDown={(e) => {
          if (editingNote) e.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle>Dia {prettyDate}</DialogTitle>
          <DialogDescription>
            {sorted.length === 0
              ? 'Nenhum evento registrado neste dia.'
              : `${sorted.length} evento(s) registrado(s)`}
            {notes.length > 0 && ` · ${notes.length} anotação(ões)`}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[50vh] overflow-y-auto space-y-2 py-2">
          {sorted.map((ev) => {
            const Icon = ev.type === 'tobacco' ? Cigarette : Leaf;
            const time = format(parseISO(ev.timestamp), 'HH:mm');
            const context = [ev.location, ev.reason].filter(Boolean).join(' · ');

            return (
              <div
                key={ev.id}
                onClick={() => setEditingEvent(ev)}
                className="flex items-center gap-3 p-3 border-2 border-border bg-card cursor-pointer hover:bg-muted active:translate-x-[1px] active:translate-y-[1px] transition-transform"
              >
                <div className="w-9 h-9 border-2 border-border bg-primary flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold">{time}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {context || <span className="text-muted-foreground/60">sem contexto</span>}
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
                  className="p-2 text-foreground hover:bg-destructive hover:text-destructive-foreground transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
              </div>
            );
          })}
        </div>

        {dayKey && (
          <DayNotes
            dayKey={dayKey}
            notes={notes}
            onEditingChange={setEditingNote}
            onAdd={(text) => onAddNote(dayKey, text)}
            onUpdate={(noteId, text) => onUpdateNote(dayKey, noteId, text)}
            onRemove={handleRemoveNote}
          />
        )}

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
          onSave={handleSaveEvent}
        />
      </DialogContent>
    </Dialog>
  );
};
