import { useEffect, useRef, useState } from 'react';
import { Panel } from '~/components/Panel';
import { EmptyState, ErrorNotice, Loading } from '~/components/Feedback';
import { fullName, type Owner } from '~/domain/models';
import type { OwnerId } from '~/domain/ids';
import { SCAN_LIMIT, useOwnerLookup } from './useOwnerLookup';
import { useDebouncedValue } from './useDebouncedValue';
import type { RecentOwner } from './useRecentOwners';
import styles from './SearchZone.module.css';

const DEBOUNCE_MS = 250;

interface SearchZoneProps {
  readonly query: string;
  readonly onQueryChange: (query: string) => void;
  readonly onSelect: (owner: Owner) => void;
  readonly onSelectRecent: (id: OwnerId) => void;
  readonly selectedOwnerId: OwnerId | null;
  readonly recent: readonly RecentOwner[];
  readonly onNewOwner: () => void;
}

export const SearchZone = ({
  query,
  onQueryChange,
  onSelect,
  onSelectRecent,
  selectedOwnerId,
  recent,
  onNewOwner,
}: SearchZoneProps): React.JSX.Element => {
  const [draft, setDraft] = useState(query);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // One debounced value drives BOTH the lookup and the URL write, so typing
  // neither fires a request per keystroke nor pushes a history entry per key.
  const settled = useDebouncedValue(draft, DEBOUNCE_MS);

  useEffect(() => {
    if (settled !== query) onQueryChange(settled);
  }, [settled, query, onQueryChange]);

  // "/" focuses search from anywhere: the receptionist is typing while listening.
  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      const target = event.target;
      const typingElsewhere =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement;
      if (event.key === '/' && !typingElsewhere) {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
    };
  }, []);

  const lookup = useOwnerLookup(settled);
  const matches = lookup.data?.matches ?? [];

  useEffect(() => {
    setActive(0);
  }, [lookup.data]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>): void => {
    if (matches.length === 0) return;
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((i) => Math.min(i + 1, matches.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const owner = matches[active];
      if (owner !== undefined) onSelect(owner);
    }
  };

  /** Explicit plural form: English suffix rules do not survive "match". */
  const plural = (count: number, one: string, many: string): string =>
    `${String(count)} ${count === 1 ? one : many}`;

  const scope = ((): string => {
    const data = lookup.data;
    if (data === undefined) return '';
    if (!data.truncated) return `searched all ${plural(data.totalElements, 'record', 'records')}`;
    return `searched the first ${String(data.scanned)} of ${String(data.totalElements)}`;
  })();

  return (
    <Panel title="Find a customer" subtitle="Press / to search" ariaLabel="Customer search">
      <label className="visually-hidden" htmlFor="owner-search">
        Search by last name, first name, telephone or pet name
      </label>
      <input
        id="owner-search"
        ref={inputRef}
        value={draft}
        placeholder="Last name, phone, pet…"
        autoComplete="off"
        onChange={(e) => {
          setDraft(e.target.value);
        }}
        onKeyDown={handleKeyDown}
        aria-describedby="search-scope"
      />

      <p id="search-scope" className={styles.live} role="status" aria-live="polite">
        {lookup.isFetching
          ? 'Searching…'
          : lookup.data === undefined
            ? ''
            : `${plural(matches.length, 'match', 'matches')}, ${scope}.`}
      </p>

      <button type="button" className={styles.newOwner} onClick={onNewOwner}>
        + New owner
      </button>

      {lookup.isError && (
        <ErrorNotice
          error={lookup.error}
          onRetry={() => {
            void lookup.refetch();
          }}
        />
      )}

      {lookup.isLoading && <Loading label="Searching records…" />}

      {lookup.data !== undefined && matches.length === 0 && (
        <EmptyState>
          {lookup.data.truncated
            ? `No match in the first ${String(SCAN_LIMIT)} records. Try a last name to narrow the search.`
            : 'No customer matches that. Create a new owner if this is their first visit.'}
        </EmptyState>
      )}

      {matches.length > 0 && (
        <ul className={styles.results} aria-label="Search results">
          {matches.map((owner, index) => (
            <li key={owner.id}>
              <button
                type="button"
                className={styles.result}
                aria-current={owner.id === selectedOwnerId}
                data-active={index === active}
                onClick={() => {
                  onSelect(owner);
                }}
              >
                <span className={styles.resultName}>{fullName(owner)}</span>
                <span className={styles.resultMeta}>
                  {owner.telephone} · {owner.city}
                  {owner.pets.length > 0 &&
                    ` · ${owner.pets.map((p) => p.name).join(', ')}`}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {recent.length > 0 && (
        <div className={styles.recent}>
          <h3 className={styles.recentTitle}>Recent</h3>
          <ul className={styles.recentList}>
            {recent.map((entry) => (
              <li key={entry.id}>
                <button
                  type="button"
                  className={styles.recentItem}
                  onClick={() => {
                    onSelectRecent(entry.id);
                  }}
                >
                  {entry.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Panel>
  );
};
