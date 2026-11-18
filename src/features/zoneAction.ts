import type { RefObject } from 'react';

/**
 * A button that switches a zone into one of its modes, together with the ref
 * used to put focus back on it afterwards.
 *
 * Grouped into one prop rather than passed as a loose `ref` + `onClick` pair,
 * because the two are meaningless apart: the ref exists only so the mode the
 * button opens can return focus to it on the way out.
 */
export interface ZoneAction {
  ref: RefObject<HTMLButtonElement | null>;
  onOpen: () => void;
}
