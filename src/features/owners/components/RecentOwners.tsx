import type { OwnerId } from '~/types/ids';
import type { RecentOwner } from '../hooks/useRecentOwners';
import styles from './OwnerSearch.module.css';

interface RecentOwnersProps {
  recent: readonly RecentOwner[];
  onSelect: (id: OwnerId) => void;
}

/** A second call about the same customer is common; this saves re-typing. */
export const RecentOwners = ({ recent, onSelect }: RecentOwnersProps) => {
  if (recent.length === 0) return null;

  return (
    <div className={styles.recent}>
      <h3 className={styles.recentTitle}>Recent</h3>
      <ul className={styles.recentList}>
        {recent.map((entry) => (
          <li key={entry.id}>
            <button
              type="button"
              className={styles.recentItem}
              onClick={() => {
                onSelect(entry.id);
              }}
            >
              {entry.label}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};
