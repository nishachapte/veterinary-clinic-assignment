import { useEffect, useState } from 'react';
import type { KeyboardEvent } from 'react';

interface ListKeyboard {
  /** Index of the highlighted item, for `data-active` styling. */
  active: number;
  /** Attach to the INPUT, not the list: focus stays in the search box. */
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
}

/**
 * Arrow-key navigation over a list that is driven from a text input.
 *
 * `items` must keep a stable identity between renders when the list has not
 * changed — a fresh `[]` on every render would reset the highlight constantly.
 * Callers hold one shared empty array for the "nothing yet" case.
 */
export const useListKeyboard = <T,>(
  items: readonly T[],
  onChoose: (item: T) => void,
): ListKeyboard => {
  const [active, setActive] = useState(0);

  // A different list makes the previous highlight meaningless.
  useEffect(() => {
    setActive(0);
  }, [items]);

  const onKeyDown = (event: KeyboardEvent<HTMLElement>): void => {
    if (items.length === 0) return;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((i) => Math.min(i + 1, items.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const chosen = items[active];
      if (chosen !== undefined) onChoose(chosen);
    }
  };

  return { active, onKeyDown };
};
