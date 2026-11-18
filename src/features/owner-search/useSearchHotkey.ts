import { useEffect } from 'react';
import type { RefObject } from 'react';

/**
 * "/" focuses the search box from anywhere on the desk: the receptionist is
 * typing while listening, and should never have to reach for the mouse.
 *
 * Ignored while the caret is already in a field, or the shortcut would eat a
 * slash someone is trying to type into an address.
 */
export const useSearchHotkey = (target: RefObject<HTMLInputElement | null>): void => {
  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      const typingElsewhere =
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLSelectElement;

      if (event.key === '/' && !typingElsewhere) {
        event.preventDefault();
        target.current?.focus();
      }
    };

    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
    };
  }, [target]);
};
