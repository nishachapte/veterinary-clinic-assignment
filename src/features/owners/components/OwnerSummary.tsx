import { Panel } from '~/shared/components/Panel';
import { fullName, type Owner } from '~/features/owners/types';
import type { PetId } from '~/types/ids';
import type { ZoneAction } from '~/shared/types';
import { PetList } from './PetList';
import styles from './OwnerZone.module.css';

interface OwnerSummaryProps {
  owner: Owner;
  selectedPetId: PetId | null;
  onSelectPet: (id: PetId) => void;
  /**
   * A save that failed and was then cancelled out of, already turned into
   * copy — this component renders the message and knows nothing about errors.
   */
  staleError: string | null;
  edit: ZoneAction;
  addPet: ZoneAction;
}

export const OwnerSummary = ({
  owner,
  selectedPetId,
  onSelectPet,
  staleError,
  edit,
  addPet,
}: OwnerSummaryProps) => (
  <Panel
    title={fullName(owner)}
    subtitle={`${owner.address}, ${owner.city}`}
    ariaLabel="Customer details"
    actions={
      <button
        type="button"
        ref={edit.ref}
        className={styles.action}
        onClick={edit.onOpen}
      >
        Edit
      </button>
    }
  >
    {staleError !== null && (
      <p className={styles.staleError} role="alert">
        {staleError}
      </p>
    )}

    <dl className={styles.fields}>
      <div>
        <dt>Telephone</dt>
        <dd>{owner.telephone}</dd>
      </div>
      <div>
        <dt>City</dt>
        <dd>{owner.city}</dd>
      </div>
      <div className={styles.wide}>
        <dt>Address</dt>
        <dd>{owner.address}</dd>
      </div>
    </dl>

    <div className={styles.sectionHead}>
      <h3 className={styles.sectionTitle}>
        Pets <span className={styles.count}>{owner.pets.length}</span>
      </h3>
      <button
        type="button"
        ref={addPet.ref}
        className={styles.action}
        onClick={addPet.onOpen}
      >
        Add pet
      </button>
    </div>

    <PetList pets={owner.pets} selectedPetId={selectedPetId} onSelect={onSelectPet} />
  </Panel>
);
