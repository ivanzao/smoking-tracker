import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EditDayDialog } from './EditDayDialog';
import { DayNote, TrackerEvent } from '@/types';

const notes: DayNote[] = [
  { id: 'n1', text: 'dia estressante', createdAt: '2026-04-08T10:00:00-03:00' },
];

const setup = (events: TrackerEvent[] = []) => {
  const props = {
    open: true,
    onOpenChange: vi.fn(),
    dayKey: '2026-04-08',
    events,
    onRemoveEvent: vi.fn(),
    onClearDay: vi.fn(),
    onUndo: vi.fn(),
    onUpdateEvent: vi.fn(),
    notes,
    onAddNote: vi.fn(),
    onUpdateNote: vi.fn(),
    onRemoveNote: vi.fn(),
    onRestoreNote: vi.fn(),
  };
  render(<EditDayDialog {...props} />);
  return props;
};

describe('EditDayDialog — notes', () => {
  it('shows the notes and their count', () => {
    setup();
    expect(screen.getByText('dia estressante')).toBeInTheDocument();
    expect(screen.getByText(/1 anotação/)).toBeInTheDocument();
  });

  it('adds, edits and removes notes scoped to the dialog day', () => {
    const { onAddNote, onUpdateNote, onRemoveNote } = setup();

    const input = screen.getByLabelText('Nova anotação');
    fireEvent.change(input, { target: { value: 'dormi mal' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onAddNote).toHaveBeenCalledWith('2026-04-08', 'dormi mal');

    fireEvent.click(screen.getByText('dia estressante'));
    const edit = screen.getByDisplayValue('dia estressante');
    fireEvent.change(edit, { target: { value: 'dia ok' } });
    fireEvent.keyDown(edit, { key: 'Enter' });
    expect(onUpdateNote).toHaveBeenCalledWith('2026-04-08', 'n1', 'dia ok');

    fireEvent.click(screen.getByRole('button', { name: 'Remover anotação' }));
    expect(onRemoveNote).toHaveBeenCalledWith('2026-04-08', 'n1');
  });

  it('Escape while editing a note cancels the edit without closing the dialog', () => {
    const { onOpenChange, onUpdateNote } = setup();
    fireEvent.click(screen.getByText('dia estressante'));
    const edit = screen.getByDisplayValue('dia estressante');
    fireEvent.change(edit, { target: { value: 'descartado' } });
    fireEvent.keyDown(edit, { key: 'Escape' });
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(onUpdateNote).not.toHaveBeenCalled();
    expect(screen.getByText('dia estressante')).toBeInTheDocument();

    // Once the edit is over, Escape closes the dialog as usual
    fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('"Limpar dia" clears events but leaves notes alone', () => {
    const { onClearDay, onRemoveNote } = setup([
      { id: 'e1', timestamp: '2026-04-08T09:00:00-03:00', type: 'tobacco' },
    ]);
    fireEvent.click(screen.getByRole('button', { name: /limpar dia/i }));
    fireEvent.click(screen.getByRole('button', { name: /confirmar: limpar dia/i }));
    expect(onClearDay).toHaveBeenCalledWith('2026-04-08');
    expect(onRemoveNote).not.toHaveBeenCalled();
  });
});
