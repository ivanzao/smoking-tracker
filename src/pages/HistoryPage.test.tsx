import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { HistoryPage } from './HistoryPage';
import type { UseTrackerAPI } from '@/hooks/useTracker';
import type { DayGoalStatus } from '@/lib/stats';

function makeTracker(status: (dayKey: string) => DayGoalStatus): UseTrackerAPI {
  return {
    events: [],
    goals: [],
    getDayTotals: () => ({ tobacco: 0, cannabis: 0 }),
    getDayGoalStatus: status,
    getDayNotes: () => [],
    getCurrentGoal: () => ({ id: 'g', limit: 3, effectiveFrom: '2026-01-01' }),
    getCurrentStreak: () => 0,
    getDaysWithinGoal: () => 0,
    getRollingAverage: () => 0,
    getAverageDelta: () => null,
  } as unknown as UseTrackerAPI;
}

describe('HistoryPage calendar', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    // November 2026 starts on a Sunday
    vi.setSystemTime(new Date('2026-11-05T14:00:00Z'));
  });
  afterEach(() => { vi.useRealTimers(); });

  it('puts the first of the month under its weekday', () => {
    render(<HistoryPage tracker={makeTracker(() => 'empty')} onOpenEditDay={vi.fn()} />);
    const first = screen.getByRole('button', { name: /^1 de novembro/ });
    const blanks = Array.from(first.parentElement!.children).indexOf(first);
    expect(blanks).toBe(6);
  });

  it('does not open future days', () => {
    const onOpenEditDay = vi.fn();
    const tracker = makeTracker((d) => (d > '2026-11-05' ? 'future' : 'empty'));
    render(<HistoryPage tracker={tracker} onOpenEditDay={onOpenEditDay} />);
    const future = screen.getByRole('button', { name: /^20 de novembro/ });
    expect(future).toBeDisabled();
    fireEvent.click(future);
    expect(onOpenEditDay).not.toHaveBeenCalled();
  });

  it('names the goal state of a day for assistive tech', () => {
    render(<HistoryPage tracker={makeTracker(() => 'over')} onOpenEditDay={vi.fn()} />);
    expect(screen.getByRole('button', { name: /^3 de novembro.*acima da meta/ })).toBeInTheDocument();
  });
});
