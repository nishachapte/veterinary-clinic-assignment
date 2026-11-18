import { useEffect, useRef, useState } from 'react';
import { Panel } from '~/shared/components/Panel';
import { EmptyState, ErrorNotice, Loading } from '~/shared/components/Feedback';
import type { Owner } from '~/features/owners/types';
import type { OwnerId } from '~/types/ids';
import { SCAN_LIMIT, useOwnerLookup } from '../hooks/useOwnerLookup';
import { useDebouncedValue } from '~/shared/hooks/useDebouncedValue';
import { useSearchHotkey } from '../hooks/useSearchHotkey';
import { useListKeyboard } from '~/shared/hooks/useListKeyboard';
import { SearchStatus } from './SearchStatus';
import { SearchResults } from './SearchResults';
import { RecentOwners } from './RecentOwners';
import type { RecentOwner } from '../hooks/useRecentOwners';
import styles from './OwnerSearch.module.css';

const DEBOUNCE_MS = 250;
const SCOPE_ID = 'search-scope';

/** One shared array, so "no results yet" keeps a stable identity across renders. */
const NO_MATCHES: readonly Owner[] = [];

interface OwnerSearchProps {
  query: string;
  onQueryChange: (query: string) => void;
  onSelect: (owner: Owner) => void;
  onSelectRecent: (id: OwnerId) => void;
  selectedOwnerId: OwnerId | null;
  recent: readonly RecentOwner[];
  onNewOwner: () => void;
}

export const OwnerSearch = ({
  query,
  onQueryChange,
  onSelect,
  onSelectRecent,
  selectedOwnerId,
  recent,
  onNewOwner,
}: OwnerSearchProps) => {
  const [draft, setDraft] = useState(query);
  const inputRef = useRef<HTMLInputElement>(null);

  // One debounced value drives BOTH the lookup and the URL write, so typing
  // neither fires a request per keystroke nor pushes a history entry per key.
  const settled = useDebouncedValue(draft, DEBOUNCE_MS);

  useEffect(() => {
    if (settled !== query) onQueryChange(settled);
  }, [settled, query, onQueryChange]);

  useSearchHotkey(inputRef);

  const lookup = useOwnerLookup(settled);
  const matches = lookup.data?.matches ?? NO_MATCHES;
  const { active, onKeyDown } = useListKeyboard(matches, onSelect);

  return (
    <Panel
      title="Find a customer"
      subtitle="Press / to search"
      ariaLabel="Customer search"
    >
      <label className="visually-hidden" htmlFor="owner-search">
        Search by last name, first name, telephone or pet name
      </label>
      <input
        id="owner-search"
        ref={inputRef}
        value={draft}
        placeholder="Last name, phone, pet…"
        autoComplete="off"
        onChange={(event) => {
          setDraft(event.target.value);
        }}
        onKeyDown={onKeyDown}
        aria-describedby={SCOPE_ID}
      />

      <SearchStatus id={SCOPE_ID} fetching={lookup.isFetching} result={lookup.data} />

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
        <SearchResults
          matches={matches}
          selectedOwnerId={selectedOwnerId}
          activeIndex={active}
          onSelect={onSelect}
        />
      )}

      <RecentOwners recent={recent} onSelect={onSelectRecent} />
    </Panel>
  );
};
