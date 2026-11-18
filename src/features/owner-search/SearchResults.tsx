import { fullName, type Owner } from '~/domain/models';
import type { OwnerId } from '~/domain/ids';
import styles from './SearchZone.module.css';

interface SearchResultsProps {
  matches: readonly Owner[];
  selectedOwnerId: OwnerId | null;
  /** Index highlighted by the arrow keys, which is not the same as selected. */
  activeIndex: number;
  onSelect: (owner: Owner) => void;
}

const petNames = (owner: Owner): string =>
  owner.pets.map((pet) => pet.name).join(', ');

export const SearchResults = ({
  matches,
  selectedOwnerId,
  activeIndex,
  onSelect,
}: SearchResultsProps) => (
  <ul className={styles.results} aria-label="Search results">
    {matches.map((owner, index) => (
      <li key={owner.id}>
        <button
          type="button"
          className={styles.result}
          aria-current={owner.id === selectedOwnerId}
          data-active={index === activeIndex}
          onClick={() => {
            onSelect(owner);
          }}
        >
          <span className={styles.resultName}>{fullName(owner)}</span>
          <span className={styles.resultMeta}>
            {owner.telephone} · {owner.city}
            {owner.pets.length > 0 && ` · ${petNames(owner)}`}
          </span>
        </button>
      </li>
    ))}
  </ul>
);
