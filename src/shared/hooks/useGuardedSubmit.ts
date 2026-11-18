import { useRef } from 'react';
import type { BaseSyntheticEvent } from 'react';

/**
 * Stops a second submit starting while the first is still in flight.
 *
 * `disabled={pending}` in FormShell already covers everything a person can do
 * with a mouse, but it is a RENDER-dependent guard: the button only becomes
 * disabled once React has re-rendered with `isPending`. Two submits dispatched
 * in the SAME TICK therefore both get through — measured, the gap closes at
 * about 10ms, so a human double-click (100-500ms at the OS level) never hits
 * it, while a script, a bouncing mouse switch or Enter key-repeat under load
 * can.
 *
 * A ref closes synchronously, in the same tick the first submit opens it, so
 * it does not depend on render timing at all. The two guards are complementary:
 * the disabled button is what the receptionist SEES, this is what the server
 * actually gets.
 */
export const useGuardedSubmit = (
  submit: (event?: BaseSyntheticEvent) => Promise<unknown>,
): ((event: BaseSyntheticEvent) => void) => {
  const running = useRef(false);

  return (event) => {
    if (running.current) {
      // Nothing will call react-hook-form's own preventDefault on this path,
      // and without it the browser performs a native form POST.
      event.preventDefault();
      return;
    }

    running.current = true;
    void submit(event).finally(() => {
      running.current = false;
    });
  };
};
