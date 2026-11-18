import { Panel } from '~/components/Panel';
import { EmptyState } from '~/components/Feedback';
import type { Pet } from '~/domain/models';
import { PetDetail } from './PetDetail';

interface PetZoneProps {
  pet: Pet | undefined;
  hasOwner: boolean;
  onClose: () => void;
}

/** Chooses whether there is a pet to show. It renders no detail itself. */
export const PetZone = ({ pet, hasOwner, onClose }: PetZoneProps) => {
  if (pet === undefined) {
    return (
      <Panel title="Pet" ariaLabel="Pet details">
        <EmptyState>
          {hasOwner
            ? 'Choose a pet to see its details and visit history.'
            : 'No customer selected.'}
        </EmptyState>
      </Panel>
    );
  }

  // Keyed by id so switching pet resets any open form.
  return <PetDetail key={pet.id} pet={pet} onClose={onClose} />;
};
