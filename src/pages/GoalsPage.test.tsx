import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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
    exportCsv: vi.fn(() => null),
    importEvents: vi.fn(() => ({
      ok: true, added: 0, skipped: 0, goalsAdded: 0, goalsSkipped: 0, notesAdded: 0, notesSkipped: 0,
    })),
    pendingUndo: null,
    executeUndo: vi.fn(),
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
  it('calls setGoal with the slider value when save is clicked', () => {
    const setGoal = vi.fn();
    const tracker = makeTracker({
      setGoal,
      getCurrentGoal: vi.fn(() => ({ id: '1', limit: 5, effectiveFrom: '2024-01-01' })),
    });
    render(<GoalsContent tracker={tracker} />);
    const slider = screen.getByRole('slider');
    fireEvent.change(slider, { target: { value: '10' } });
    fireEvent.click(screen.getByRole('button', { name: /salvar meta/i }));
    expect(setGoal).toHaveBeenCalledWith(10);
  });

  it('shows current goal limit in the slider', () => {
    const tracker = makeTracker({
      getCurrentGoal: vi.fn(() => ({ id: '1', limit: 7, effectiveFrom: '2024-01-01' })),
    });
    render(<GoalsContent tracker={tracker} />);
    expect(screen.getByRole('slider')).toHaveValue('7');
  });

  it('hides the reset streak button when there is no goal', () => {
    const tracker = makeTracker({ getCurrentStreak: vi.fn(() => 3) });
    render(<GoalsContent tracker={tracker} />);
    expect(screen.queryByRole('button', { name: /resetar streak/i })).toBeNull();
  });

  it('hides the reset streak button when the streak is already 0', () => {
    const tracker = makeTracker({
      getCurrentGoal: vi.fn(() => ({ id: '1', limit: 5, effectiveFrom: '2024-01-01' })),
      getCurrentStreak: vi.fn(() => 0),
    });
    render(<GoalsContent tracker={tracker} />);
    expect(screen.queryByRole('button', { name: /resetar streak/i })).toBeNull();
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
    fireEvent.click(screen.getByRole('button', { name: /resetar streak/i }));
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
    fireEvent.click(screen.getByRole('button', { name: /resetar streak/i }));
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

  it('asks for a period before exporting CSV, then downloads it', () => {
    const exportCsv = vi.fn(() => ({ csv: '\uFEFFData;Dia', fileName: 'smoking-tracker-2026-04-02_2026-04-08.csv' }));
    const tracker = makeTracker({ exportCsv });
    global.URL.createObjectURL = vi.fn(() => 'blob:mock');
    global.URL.revokeObjectURL = vi.fn();
    render(<GoalsContent tracker={tracker} />);
    fireEvent.click(screen.getByRole('button', { name: /exportar csv/i }));
    expect(exportCsv).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: /7 dias/i }));
    expect(exportCsv).toHaveBeenCalledWith('7d');
    expect(global.URL.createObjectURL).toHaveBeenCalled();
  });

  it('does not download when "Todos" has nothing to export', () => {
    const exportCsv = vi.fn(() => null);
    const tracker = makeTracker({ exportCsv });
    global.URL.createObjectURL = vi.fn(() => 'blob:mock');
    render(<GoalsContent tracker={tracker} />);
    fireEvent.click(screen.getByRole('button', { name: /exportar csv/i }));
    fireEvent.click(screen.getByRole('button', { name: /todos/i }));
    expect(exportCsv).toHaveBeenCalledWith('all');
    expect(global.URL.createObjectURL).not.toHaveBeenCalled();
  });
});
