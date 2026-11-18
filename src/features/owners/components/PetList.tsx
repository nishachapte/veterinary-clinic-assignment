import { EmptyState } from '~/shared/components/Feedback';
import { formatAge } from '~/shared/utils/date';
import type { Pet } from '~/features/pets/types';
import type { PetId } from '~/types/ids';
import styles from './OwnerZone.module.css';

interface PetListProps {
  pets: readonly Pet[];
  selectedPetId: PetId | null;
  onSelect: (id: PetId) => void;
}

const visitSummary = (count: number): string =>
  count === 0 ? 'no visits' : `${String(count)} visit${count === 1 ? '' : 's'}`;

export const PetList = ({ pets, selectedPetId, onSelect }: PetListProps) => {
  if (pets.length === 0) {
    return <EmptyState>No pets recorded for this customer yet.</EmptyState>;
  }

  return (
    <ul className={styles.pets}>
      {pets.map((pet) => (
        <li key={pet.id}>
          <button
            type="button"
            className={styles.pet}
            aria-current={pet.id === selectedPetId}
            onClick={() => {
              onSelect(pet.id);
            }}
          >
            <span className={styles.petName}>{pet.name}</span>
            <span className={styles.petMeta}>
              {pet.type.name} · {formatAge(pet.birthDate)} ·{' '}
              {visitSummary(pet.visits.length)}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
};
