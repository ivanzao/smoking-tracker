import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { Cigarette, Leaf, Plus, Trash2, ChevronRight } from 'lucide-react';
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
import { DayNote, EventType, TrackerEvent } from '@/types';

interface EditDayDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dayKey: string | null;
  events: TrackerEvent[];
  onAddEvent: (dayKey: string, type: EventType) => void;
  onRemoveEvent: (id: string) => void;
  onClearDay: (dayKey: string) => void;
  onRestoreEvent: (event: TrackerEvent) => void;
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
  onAddEvent,
  onRemoveEvent,
  onClearDay,
  onRestoreEvent,
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

  // Newest first: the one someone came to fix is usually the last one logged
  const sorted = [...events].sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  // The list only shows this day's events, so an event moved elsewhere vanishes — say where it went
  const handleSaveEvent = (id: string, patch: Partial<Omit<TrackerEvent, 'id'>>) => {
    onUpdateEvent(id, patch);
    if (patch.timestamp && dayKey && getDayKey(patch.timestamp) !== dayKey) {
      toast(`Movido para ${format(parseISO(patch.timestamp), 'dd/MM')}`);
    }
  };

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
        className="sm:max-w-[480px] flex flex-col overflow-hidden"
        // Land on the dialog, not on the first control: that's a delete button or the note field
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          (e.currentTarget as HTMLElement | null)?.focus();
        }}
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
              : `${sorted.length} ${sorted.length === 1 ? 'evento registrado' : 'eventos registrados'}`}
            {notes.length > 0 && ` · ${notes.length} ${notes.length === 1 ? 'anotação' : 'anotações'}`}
          </DialogDescription>
        </DialogHeader>

        {/* The only scroller, so the title and the actions never leave the screen */}
        <div className="min-h-0 flex-1 overflow-y-auto space-y-4 p-1 -m-1">
          {sorted.length > 0 && (
            <ul className="space-y-2">
              {sorted.map((ev) => {
                const Icon = ev.type === 'tobacco' ? Cigarette : Leaf;
                const time = format(parseISO(ev.timestamp), 'HH:mm');
                const context = [ev.location, ev.reason].filter(Boolean).join(' · ');

                return (
                  <li key={ev.id} className="flex items-center border-2 border-border bg-card">
                    <button
                      type="button"
                      onClick={() => setEditingEvent(ev)}
                      className="min-w-0 flex-1 flex items-center gap-3 p-3 text-left hover:bg-muted active:translate-x-[1px] active:translate-y-[1px] transition-transform"
                    >
                      <span className="w-9 h-9 border-2 border-border bg-primary flex items-center justify-center shrink-0">
                        <Icon aria-hidden="true" className="w-4 h-4" />
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm font-bold">
                          {time} <span className="sr-only">{ev.type === 'tobacco' ? 'tabaco' : 'cannabis'}</span>
                        </span>
                        <span className="block text-xs text-muted-foreground truncate">
                          {context || 'sem contexto'}
                        </span>
                      </span>
                      <ChevronRight aria-hidden="true" className="w-4 h-4 text-muted-foreground shrink-0" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onRemoveEvent(ev.id);
                        toast('Evento removido', {
                          duration: 5000,
                          action: {
                            label: 'Desfazer',
                            onClick: () => onRestoreEvent(ev),
                          },
                        });
                      }}
                      aria-label={`Remover evento das ${time}`}
                      className="w-11 h-11 mr-1 flex items-center justify-center shrink-0 text-foreground hover:bg-destructive hover:text-destructive-foreground transition-colors"
                    >
                      <Trash2 aria-hidden="true" className="w-4 h-4" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {dayKey && (
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" onClick={() => onAddEvent(dayKey, 'tobacco')}>
                <Plus aria-hidden="true" /> Tabaco
              </Button>
              <Button variant="outline" onClick={() => onAddEvent(dayKey, 'cannabis')}>
                <Plus aria-hidden="true" /> Cannabis
              </Button>
            </div>
          )}

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
        </div>

        <DialogFooter className="flex-col sm:flex-row sm:justify-between gap-2">
          {sorted.length > 0 && (
            <Button
              variant={confirmClear ? 'destructive' : 'outline'}
              onClick={handleClearDay}
              className={confirmClear ? undefined : 'text-destructive'}
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
