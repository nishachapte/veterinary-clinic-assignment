import { formatIsoDate } from '~/domain/date';
import { EmptyState } from '~/components/Feedback';
import type { Visit } from '~/domain/models';
import styles from './VisitList.module.css';

export const VisitList = ({
  visits,
}: {
  readonly visits: readonly Visit[];
}): React.JSX.Element => {
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
