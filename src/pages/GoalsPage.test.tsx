import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { GoalsContent } from '@/components/GoalsContent';
import type { UseTrackerAPI } from '@/hooks/useTracker';

function makeTracker(overrides: Partial<UseTrackerAPI> = {}): UseTrackerAPI {
  return {
    events: [],
    addEvent: vi.fn(),
    removeEvent: vi.fn(),
    updateEvent: vi.fn(),
    clearDay: vi.fn(),
    getDayTotals: vi.fn(() => ({ tobacco: 0, cannabis: 0 })),
    getEventsForDay: vi.fn(() => []),
    getTodayTotals: vi.fn(() => ({ tobacco: 0, cannabis: 0 })),
    exportEvents: vi.fn(() => '{}'),
    exportXlsx: vi.fn(async () => ({ buffer: new ArrayBuffer(0), fileName: 'x.xlsx' })),
    importEvents: vi.fn(() => ({
      ok: true, added: 0, skipped: 0, goalsAdded: 0, goalsSkipped: 0, notesAdded: 0, notesSkipped: 0,
    })),
    goals: [],
    setGoal: vi.fn(),
    getCurrentGoal: vi.fn(() => null),
    getDayGoalStatus: vi.fn(() => 'no-goal' as const),
    getCurrentStreak: vi.fn(() => 0),
    streakResetDay: null,
    resetStreak: vi.fn(),
    getRollingAverage: vi.fn(() => 0),
    getAverageDelta: vi.fn(() => null),
    days: [],
    getDayNotes: vi.fn(() => []),
    addDayNote: vi.fn(() => null),
    updateDayNote: vi.fn(),
    removeDayNote: vi.fn(),
    restoreDayNote: vi.fn(),
    ...overrides,
  } as UseTrackerAPI;
}

describe('GoalsContent', () => {
  it('calls setGoal with the stepper value when save is clicked', () => {
    const setGoal = vi.fn();
    const tracker = makeTracker({
      setGoal,
      getCurrentGoal: vi.fn(() => ({ id: '1', limit: 5, effectiveFrom: '2024-01-01' })),
    });
    render(<GoalsContent tracker={tracker} />);
    fireEvent.click(screen.getByRole('button', { name: /aumentar meta/i }));
    fireEvent.click(screen.getByRole('button', { name: /aumentar meta/i }));
    fireEvent.click(screen.getByRole('button', { name: /diminuir meta/i }));
    fireEvent.click(screen.getByRole('button', { name: /salvar meta/i }));
    expect(setGoal).toHaveBeenCalledWith(6);
  });

  it('shows the current goal limit', () => {
    const tracker = makeTracker({
      getCurrentGoal: vi.fn(() => ({ id: '1', limit: 7, effectiveFrom: '2024-01-01' })),
    });
    render(<GoalsContent tracker={tracker} />);
    expect(screen.getByRole('status', { name: /meta diária/i })).toHaveTextContent('07');
  });

  it('accepts a goal above 20', () => {
    const setGoal = vi.fn();
    const tracker = makeTracker({
      setGoal,
      getCurrentGoal: vi.fn(() => ({ id: '1', limit: 20, effectiveFrom: '2024-01-01' })),
    });
    render(<GoalsContent tracker={tracker} />);
    fireEvent.click(screen.getByRole('button', { name: /aumentar meta/i }));
    fireEvent.click(screen.getByRole('button', { name: /salvar meta/i }));
    expect(setGoal).toHaveBeenCalledWith(21);
  });

  it('only clears everything after confirming in the dialog', () => {
    const clearAll = vi.fn();
    render(<GoalsContent tracker={makeTracker({ clearAll })} />);
    fireEvent.click(screen.getByRole('button', { name: /limpar todos os dados/i }));
    expect(clearAll).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toHaveTextContent(/registros, metas, anotações/);
    fireEvent.click(screen.getByRole('button', { name: /apagar tudo/i }));
    expect(clearAll).toHaveBeenCalledOnce();
  });

  it('says data stays on the device when the app runs local-only', () => {
    render(<GoalsContent tracker={makeTracker()} />);
    expect(screen.getByText(/só neste aparelho/i)).toBeInTheDocument();
  });

  it('hides the reset streak button when there is no goal', () => {
    const tracker = makeTracker({ getCurrentStreak: vi.fn(() => 3) });
    render(<GoalsContent tracker={tracker} />);
    expect(screen.queryByRole('button', { name: /zerar sequência/i })).toBeNull();
  });

  it('hides the reset streak button when the streak is already 0', () => {
    const tracker = makeTracker({
      getCurrentGoal: vi.fn(() => ({ id: '1', limit: 5, effectiveFrom: '2024-01-01' })),
      getCurrentStreak: vi.fn(() => 0),
    });
    render(<GoalsContent tracker={tracker} />);
    expect(screen.queryByRole('button', { name: /zerar sequência/i })).toBeNull();
  });

  it('resets the streak after confirmation', () => {
    const resetStreak = vi.fn();
    const tracker = makeTracker({
      resetStreak,
      getCurrentGoal: vi.fn(() => ({ id: '1', limit: 5, effectiveFrom: '2024-01-01' })),
      getCurrentStreak: vi.fn(() => 3),
    });
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<GoalsContent tracker={tracker} />);
    fireEvent.click(screen.getByRole('button', { name: /zerar sequência/i }));
    expect(resetStreak).toHaveBeenCalledTimes(1);
  });

  it('does not reset the streak when confirmation is declined', () => {
    const resetStreak = vi.fn();
    const tracker = makeTracker({
      resetStreak,
      getCurrentGoal: vi.fn(() => ({ id: '1', limit: 5, effectiveFrom: '2024-01-01' })),
      getCurrentStreak: vi.fn(() => 3),
    });
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<GoalsContent tracker={tracker} />);
    fireEvent.click(screen.getByRole('button', { name: /zerar sequência/i }));
    expect(resetStreak).not.toHaveBeenCalled();
  });

  it('calls exportEvents and triggers download when export button clicked', () => {
    const exportEvents = vi.fn(() => '{"events":[]}');
    const tracker = makeTracker({ exportEvents });
    global.URL.createObjectURL = vi.fn(() => 'blob:mock');
    global.URL.revokeObjectURL = vi.fn();
    render(<GoalsContent tracker={tracker} />);
    fireEvent.click(screen.getByRole('button', { name: /exportar json/i }));
    expect(exportEvents).toHaveBeenCalled();
  });

  describe('export planilha', () => {
    beforeEach(() => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      vi.setSystemTime(new Date('2026-04-08T14:30:00'));
      global.URL.createObjectURL = vi.fn(() => 'blob:mock');
      global.URL.revokeObjectURL = vi.fn();
    });
    afterEach(() => { vi.useRealTimers(); });

    const openPicker = () => fireEvent.click(screen.getByRole('button', { name: /exportar planilha/i }));
    const exportBtn = () => screen.getByRole('button', { name: /^exportar$/i });

    it('keeps Exportar disabled until both dates are filled, then downloads the range', async () => {
      const exportXlsx = vi.fn(async () => ({ buffer: new ArrayBuffer(0), fileName: 'smoking-tracker-2026-04-01_2026-04-08.xlsx' }));
      const tracker = makeTracker({ exportXlsx });
      render(<GoalsContent tracker={tracker} />);
      openPicker();
      expect(exportBtn()).toBeDisabled();

      fireEvent.change(screen.getByLabelText(/início/i), { target: { value: '2026-04-01' } });
      expect(exportBtn()).toBeDisabled();
      fireEvent.change(screen.getByLabelText(/fim/i), { target: { value: '2026-04-08' } });
      expect(exportBtn()).toBeEnabled();

      fireEvent.click(exportBtn());
      expect(exportXlsx).toHaveBeenCalledWith({ from: '2026-04-01', to: '2026-04-08' });
      await waitFor(() => expect(global.URL.createObjectURL).toHaveBeenCalled());
    });

    it('shortcuts only fill the inputs — nothing is exported until Exportar is clicked', () => {
      const exportXlsx = vi.fn(async () => ({ buffer: new ArrayBuffer(0), fileName: 'x.xlsx' }));
      const tracker = makeTracker({ exportXlsx });
      render(<GoalsContent tracker={tracker} />);
      openPicker();
      fireEvent.click(screen.getByRole('button', { name: /7 dias/i }));
      expect(screen.getByLabelText(/início/i)).toHaveValue('2026-04-02');
      expect(screen.getByLabelText(/fim/i)).toHaveValue('2026-04-08');
      expect(exportXlsx).not.toHaveBeenCalled();

      fireEvent.click(screen.getByRole('button', { name: /1 ano/i }));
      expect(screen.getByLabelText(/início/i)).toHaveValue('2025-04-09');
      expect(exportXlsx).not.toHaveBeenCalled();
    });

    it('blocks an inverted range and an end date after today', () => {
      render(<GoalsContent tracker={makeTracker()} />);
      openPicker();
      fireEvent.change(screen.getByLabelText(/início/i), { target: { value: '2026-04-05' } });
      fireEvent.change(screen.getByLabelText(/fim/i), { target: { value: '2026-04-01' } });
      expect(exportBtn()).toBeDisabled();
      expect(screen.getByText(/início precisa ser antes do fim/i)).toBeInTheDocument();

      fireEvent.change(screen.getByLabelText(/fim/i), { target: { value: '2026-04-09' } });
      expect(exportBtn()).toBeDisabled();
      expect(screen.getByText(/não pode ser depois de hoje/i)).toBeInTheDocument();
    });
  });
});
