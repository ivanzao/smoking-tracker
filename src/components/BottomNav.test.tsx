import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BottomNav } from './BottomNav';

describe('BottomNav', () => {
  it('renders all three tab buttons', () => {
    render(<BottomNav tab="tracker" onChange={() => {}} />);
    expect(screen.getByRole('button', { name: /tracker/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /history/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /goals/i })).toBeInTheDocument();
  });

  it('applies primary color class to the active tab only', () => {
    render(<BottomNav tab="history" onChange={() => {}} />);
    const historyBtn = screen.getByRole('button', { name: /history/i });
    const trackerBtn = screen.getByRole('button', { name: /tracker/i });
    expect(historyBtn.className).toContain('text-primary');
    expect(trackerBtn.className).not.toContain('text-primary');
  });

  it('calls onChange with the correct tab when a button is clicked', () => {
    const onChange = vi.fn();
    render(<BottomNav tab="tracker" onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: /history/i }));
    expect(onChange).toHaveBeenCalledOnce();
    expect(onChange).toHaveBeenCalledWith('history');
  });
});
