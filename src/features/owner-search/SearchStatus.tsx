import type { LookupResult } from './useOwnerLookup';
import styles from './SearchZone.module.css';

/** Explicit plural form: English suffix rules do not survive "match". */
const plural = (count: number, one: string, many: string): string =>
  `${String(count)} ${count === 1 ? one : many}`;

const scopeOf = (result: LookupResult): string =>
  result.truncated
    ? `searched the first ${String(result.scanned)} of ${String(result.totalElements)}`
    : `searched all ${plural(result.totalElements, 'record', 'records')}`;

interface SearchStatusProps {
  id: string;
  fetching: boolean;
  result: LookupResult | undefined;
}

/**
 * Reports how much was looked at, not just how much was found.
 *
 * A bounded scan that says only "no matches" claims an absence it did not
 * verify; naming the scope is what keeps the message honest.
 */
export const SearchStatus = ({ id, fetching, result }: SearchStatusProps) => {
  const message = fetching
    ? 'Searching…'
    : result === undefined
      ? ''
      : `${plural(result.matches.length, 'match', 'matches')}, ${scopeOf(result)}.`;

  return (
    <p id={id} className={styles.live} role="status" aria-live="polite">
      {message}
    </p>
  );
};
