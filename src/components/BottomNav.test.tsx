import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BottomNav } from './BottomNav';

describe('BottomNav', () => {
  it('renders all three tab buttons', () => {
    render(<BottomNav tab="tracker" onChange={() => {}} />);
    expect(screen.getByRole('button', { name: /hoje/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /histórico/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /metas/i })).toBeInTheDocument();
  });

  it('applies primary background class to the active tab only', () => {
    render(<BottomNav tab="history" onChange={() => {}} />);
    const historyBtn = screen.getByRole('button', { name: /histórico/i });
    const trackerBtn = screen.getByRole('button', { name: /hoje/i });
    expect(historyBtn.className).toContain('bg-card');
    expect(trackerBtn.className).not.toContain('bg-card');
  });

  it('calls onChange with the correct tab when a button is clicked', () => {
    const onChange = vi.fn();
    render(<BottomNav tab="tracker" onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: /histórico/i }));
    expect(onChange).toHaveBeenCalledOnce();
    expect(onChange).toHaveBeenCalledWith('history');
  });
});
