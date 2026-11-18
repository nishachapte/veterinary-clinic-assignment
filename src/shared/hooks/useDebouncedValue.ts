import { useEffect, useState } from 'react';

/**
 * Delays a value until it stops changing.
 *
 * The search field needs this on the LOOKUP, not just on the URL write: a
 * receptionist typing "Franklin" otherwise fires eight bounded scans, each of
 * which can be several requests.
 */
export const useDebouncedValue = <T,>(value: T, delayMs: number): T => {
  const [settled, setSettled] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSettled(value);
    }, delayMs);
    return () => {
      clearTimeout(timer);
    };
  }, [value, delayMs]);

  return settled;
};
