import type { ReactNode } from 'react';
import { Panel } from '~/shared/components/Panel';
import { VisitList } from '~/features/visits/components/VisitList';
import { formatAge, formatIsoDate } from '~/shared/utils/date';
import type { Pet } from '~/features/pets/types';
import type { ZoneAction } from '~/shared/types';
import styles from './PetZone.module.css';

interface PetSummaryProps {
  pet: Pet;
  /** An edit that failed and was then cancelled out of, already turned into copy. */
  staleError: string | null;
  edit: ZoneAction;
  newVisit: ZoneAction;
  onClose: () => void;
  /**
   * Rendered in place of the "New visit" button while a visit is being
   * recorded. Its presence IS the "adding a visit" state, so this component
   * needs no mode flag of its own.
   */
  visitForm?: ReactNode;
}

export const PetSummary = ({
  pet,
  staleError,
  edit,
  newVisit,
  onClose,
  visitForm,
}: PetSummaryProps) => (
  <Panel
    title={pet.name}
    subtitle={`${pet.type.name} · born ${formatIsoDate(pet.birthDate)} · ${formatAge(pet.birthDate)}`}
    ariaLabel="Pet details"
    actions={
      <>
        <button
          type="button"
          ref={edit.ref}
          className={styles.action}
          onClick={edit.onOpen}
        >
          Edit
        </button>
        <button type="button" className={styles.action} onClick={onClose}>
          Close
        </button>
      </>
    }
  >
    {staleError !== null && (
      <p className={styles.staleError} role="alert">
        {staleError}
      </p>
    )}

    <div className={styles.sectionHead}>
      <h3 className={styles.sectionTitle}>
        Visit history <span className={styles.count}>{pet.visits.length}</span>
      </h3>
      {visitForm === undefined && (
        <button
          type="button"
          ref={newVisit.ref}
          className={styles.action}
          onClick={newVisit.onOpen}
        >
          New visit
        </button>
      )}
    </div>

    {visitForm !== undefined && <div className={styles.visitForm}>{visitForm}</div>}

    <VisitList visits={pet.visits} />
  </Panel>
);
