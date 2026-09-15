import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NewEventDrawer } from './NewEventDrawer';

describe('NewEventDrawer — date/time', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-04-08T14:30:00'));
  });
  afterEach(() => { vi.useRealTimers(); });

  const renderOpen = (onSubmit = vi.fn()) => {
    render(<NewEventDrawer open onOpenChange={vi.fn()} type="tobacco" onSubmit={onSubmit} />);
    return onSubmit;
  };

  it('defaults date and time to now', () => {
    renderOpen();
    expect(screen.getByLabelText('Data')).toHaveValue('2026-04-08');
    expect(screen.getByLabelText('Horário')).toHaveValue('14:30');
  });

  it('submits the chosen date and time as a local ISO timestamp', () => {
    const onSubmit = renderOpen();
    fireEvent.change(screen.getByLabelText('Data'), { target: { value: '2026-04-06' } });
    fireEvent.change(screen.getByLabelText('Horário'), { target: { value: '09:15' } });
    fireEvent.click(screen.getByRole('button', { name: 'Registrar' }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0][0].timestamp).toMatch(/^2026-04-06T09:15:00[+-]\d{2}:\d{2}$/);
  });

  it('blocks a timestamp in the future', () => {
    const onSubmit = renderOpen();
    fireEvent.change(screen.getByLabelText('Horário'), { target: { value: '23:00' } });
    const submit = screen.getByRole('button', { name: 'Registrar' });
    expect(submit).toBeDisabled();
    fireEvent.click(submit);
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
