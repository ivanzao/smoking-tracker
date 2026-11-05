import { useRef } from 'react';

/**
 * Radix only hands focus back to a Trigger, and this app opens every dialog from state.
 * Remember what had focus on open and restore it on close.
 */
export function useReturnFocus() {
  const returnTo = useRef<HTMLElement | null>(null);
  return {
    remember: () => {
      returnTo.current = document.activeElement as HTMLElement | null;
    },
    restore: (e: Event) => {
      e.preventDefault();
      returnTo.current?.focus();
    },
  };
}
