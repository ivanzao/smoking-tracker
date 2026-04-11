import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from './App';

describe('App navigation', () => {
  it('renders TrackerPage content by default', () => {
    render(<App />);
    expect(screen.getAllByText(/quick log/i).length).toBeGreaterThan(0);
  });

  it('switches to HistoryPage when history bottom nav button is clicked', () => {
    render(<App />);
    fireEvent.click(screen.getAllByRole('button', { name: /history/i })[0]);
    expect(screen.getByText(/dias na meta|sem meta/i)).toBeInTheDocument();
  });

  it('switches to GoalsPage when goals bottom nav button is clicked', () => {
    render(<App />);
    fireEvent.click(screen.getAllByRole('button', { name: /goals/i })[0]);
    expect(screen.getByText(/meta diária/i)).toBeInTheDocument();
  });
});
