import { formatIsoDate } from '~/shared/utils/date';
import { EmptyState } from '~/shared/components/Feedback';
import type { Visit } from '~/features/visits/types';
import styles from './VisitList.module.css';

export const VisitList = ({
  visits,
}: {
  visits: readonly Visit[];
}) => {
  if (visits.length === 0) {
    return <EmptyState>No visits recorded for this pet yet.</EmptyState>;
  }

  return (
    <ol className={styles.list}>
      {visits.map((visit) => (
        <li key={visit.id} className={styles.item}>
          <time className={styles.date} dateTime={visit.date}>
            {formatIsoDate(visit.date)}
          </time>
          <p className={styles.description}>{visit.description}</p>
        </li>
      ))}
    </ol>
  );
};
