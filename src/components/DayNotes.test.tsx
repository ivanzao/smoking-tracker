import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DayNotes } from './DayNotes';
import { DayNote } from '@/types';

const notes: DayNote[] = [
  { id: 'n1', text: 'dia estressante', createdAt: '2026-04-08T10:00:00-03:00' },
  { id: 'n2', text: 'dormi mal', createdAt: '2026-04-08T22:15:00-03:00' },
];

const setup = (overrides: Partial<React.ComponentProps<typeof DayNotes>> = {}) => {
  const props = {
    dayKey: '2026-04-08',
    notes,
    onAdd: vi.fn(),
    onUpdate: vi.fn(),
    onRemove: vi.fn(),
    ...overrides,
  };
  render(<DayNotes {...props} />);
  return props;
};

describe('DayNotes', () => {
  it('lists notes with their creation time', () => {
    setup();
    expect(screen.getByText('dia estressante')).toBeInTheDocument();
    expect(screen.getByText('10:00')).toBeInTheDocument();
    expect(screen.getByText('22:15')).toBeInTheDocument();
  });

  it('shows the date too when a note was written on another day', () => {
    setup({ notes: [{ id: 'n3', text: 'retro', createdAt: '2026-04-10T14:00:00-03:00' }] });
    expect(screen.getByText('10/04 14:00')).toBeInTheDocument();
  });

  it('reports when an inline edit starts and ends', () => {
    const { onEditingChange } = setup({ onEditingChange: vi.fn() });
    fireEvent.click(screen.getByText('dia estressante'));
    expect(onEditingChange).toHaveBeenLastCalledWith(true);
    fireEvent.keyDown(screen.getByDisplayValue('dia estressante'), { key: 'Escape' });
    expect(onEditingChange).toHaveBeenLastCalledWith(false);
  });

  it('adds a note on Enter and clears the input', () => {
    const { onAdd } = setup();
    const input = screen.getByLabelText('Nova anotação');
    fireEvent.change(input, { target: { value: 'festa hoje' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onAdd).toHaveBeenCalledWith('festa hoje');
    expect(input).toHaveValue('');
  });

  it('adds a note via the button and ignores blank text', () => {
    const { onAdd } = setup();
    const input = screen.getByLabelText('Nova anotação');
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar anotação' }));
    expect(onAdd).not.toHaveBeenCalled();
    fireEvent.change(input, { target: { value: 'x' } });
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar anotação' }));
    expect(onAdd).toHaveBeenCalledWith('x');
  });

  it('edits inline: Enter saves', () => {
    const { onUpdate } = setup();
    fireEvent.click(screen.getByText('dia estressante'));
    const input = screen.getByDisplayValue('dia estressante');
    fireEvent.change(input, { target: { value: 'dia tranquilo' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onUpdate).toHaveBeenCalledWith('n1', 'dia tranquilo');
    expect(screen.queryByDisplayValue('dia tranquilo')).toBeNull();
  });

  it('edits inline: blur saves, Escape cancels', () => {
    const { onUpdate } = setup();
    fireEvent.click(screen.getByText('dormi mal'));
    let input = screen.getByDisplayValue('dormi mal');
    fireEvent.change(input, { target: { value: 'dormi bem' } });
    fireEvent.blur(input);
    expect(onUpdate).toHaveBeenCalledWith('n2', 'dormi bem');

    fireEvent.click(screen.getByText('dia estressante'));
    input = screen.getByDisplayValue('dia estressante');
    fireEvent.change(input, { target: { value: 'descartado' } });
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(onUpdate).toHaveBeenCalledTimes(1);
    expect(screen.getByText('dia estressante')).toBeInTheDocument();
  });

  it('does not save an unchanged or blank edit', () => {
    const { onUpdate } = setup();
    fireEvent.click(screen.getByText('dia estressante'));
    const input = screen.getByDisplayValue('dia estressante');
    fireEvent.change(input, { target: { value: '   ' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onUpdate).not.toHaveBeenCalled();
    expect(screen.getByText('dia estressante')).toBeInTheDocument();
  });

  it('removes a note', () => {
    const { onRemove } = setup();
    fireEvent.click(screen.getAllByRole('button', { name: 'Remover anotação' })[1]);
    expect(onRemove).toHaveBeenCalledWith('n2');
  });
});
