import { useRef, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { Plus, Trash2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getDayKey } from '@/lib/events';
import { DayNote } from '@/types';

interface DayNotesProps {
  /** Day the notes belong to — a note written on another day shows its date too */
  dayKey: string;
  notes: DayNote[];
  onAdd: (text: string) => void;
  onUpdate: (noteId: string, text: string) => void;
  onRemove: (noteId: string) => void;
  /** Fires when an inline edit starts/ends, so a host dialog can keep Escape for the edit */
  onEditingChange?: (editing: boolean) => void;
}

/** Free-text notes for a day: add (Enter/button), edit inline (click), remove. */
export const DayNotes = ({
  dayKey,
  notes,
  onAdd,
  onUpdate,
  onRemove,
  onEditingChange,
}: DayNotesProps) => {
  const [draft, setDraft] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  // Escape unmounts the input, and some browsers fire blur on removal — don't let that save
  const cancelledRef = useRef(false);

  const handleAdd = () => {
    const text = draft.trim();
    if (!text) return;
    onAdd(text);
    setDraft('');
  };

  const startEdit = (note: DayNote) => {
    cancelledRef.current = false;
    setEditingId(note.id);
    setEditText(note.text);
    onEditingChange?.(true);
  };

  const stopEdit = () => {
    setEditingId(null);
    onEditingChange?.(false);
  };

  const cancelEdit = () => {
    cancelledRef.current = true;
    stopEdit();
  };

  // Blank or unchanged text keeps the previous note — deleting is the trash button's job
  const commitEdit = (note: DayNote) => {
    if (cancelledRef.current) return;
    const text = editText.trim();
    if (text && text !== note.text) onUpdate(note.id, text);
    stopEdit();
  };

  return (
    <section className="space-y-2">
      <Label htmlFor="day-note-input">Anotações</Label>
      <div className="flex gap-2">
        <Input
          id="day-note-input"
          aria-label="Nova anotação"
          placeholder="dia muito estressante…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleAdd();
          }}
        />
        <button
          type="button"
          onClick={handleAdd}
          aria-label="Adicionar anotação"
          className="min-w-11 px-3 flex items-center justify-center rounded-md bg-primary text-primary-foreground active:scale-95 transition-transform"
        >
          <Plus aria-hidden="true" className="w-5 h-5" />
        </button>
      </div>

      {notes.length > 0 && (
        <ul className="space-y-1">
          {notes.map((note) => {
            const created = parseISO(note.createdAt);
            const time = format(created, getDayKey(note.createdAt) === dayKey ? 'HH:mm' : 'dd/MM HH:mm');
            const isEditing = editingId === note.id;
            return (
              <li
                key={note.id}
                className="flex items-center gap-2 px-3 py-2 rounded-md bg-muted/50"
              >
                <span className="text-sm text-muted-foreground shrink-0">{time}</span>
                {isEditing ? (
                  <Input
                    autoFocus
                    aria-label="Editar anotação"
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    onBlur={() => commitEdit(note)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') commitEdit(note);
                      if (e.key === 'Escape') cancelEdit();
                    }}
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => startEdit(note)}
                    className="flex-1 min-w-0 text-left text-sm break-words hover:underline"
                  >
                    {note.text}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onRemove(note.id)}
                  aria-label="Remover anotação"
                  className="h-11 w-11 -my-1 -mr-2 flex items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-destructive transition-colors shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};
