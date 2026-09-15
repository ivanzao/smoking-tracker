import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EditEventDrawer } from './EditEventDrawer';
import { TrackerEvent } from '@/types';

const event: TrackerEvent = {
  id: 'a',
  timestamp: '2026-04-08T10:00:00-03:00',
  type: 'tobacco',
  location: 'casa',
};

describe('EditEventDrawer — date/time', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-04-08T14:30:00'));
  });
  afterEach(() => { vi.useRealTimers(); });

  const renderOpen = (onSave = vi.fn()) => {
    render(<EditEventDrawer open onOpenChange={vi.fn()} event={event} onSave={onSave} />);
    return onSave;
  };

  it('prefills date and time from the event', () => {
    renderOpen();
    expect(screen.getByLabelText('Data')).toHaveValue('2026-04-08');
    expect(screen.getByLabelText('Horário')).toHaveValue('10:00');
  });

  it('does not patch the timestamp when date and time are untouched', () => {
    const onSave = renderOpen();
    fireEvent.change(screen.getByLabelText('Onde?'), { target: { value: 'bar' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(onSave).toHaveBeenCalledWith('a', { location: 'bar' });
  });

  it('patches the timestamp when the date changes', () => {
    const onSave = renderOpen();
    fireEvent.change(screen.getByLabelText('Data'), { target: { value: '2026-04-06' } });
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }));
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave.mock.calls[0][1].timestamp).toMatch(/^2026-04-06T10:00:00[+-]\d{2}:\d{2}$/);
  });

  it('blocks a timestamp in the future', () => {
    const onSave = renderOpen();
    fireEvent.change(screen.getByLabelText('Horário'), { target: { value: '23:00' } });
    const save = screen.getByRole('button', { name: 'Salvar' });
    expect(save).toBeDisabled();
    fireEvent.click(save);
    expect(onSave).not.toHaveBeenCalled();
  });
});
