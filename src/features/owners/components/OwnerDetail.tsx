import { useRef, useState } from 'react';
import type { RefObject } from 'react';
import { describeError } from '~/shared/components/Feedback';
import type { Owner } from '~/features/owners/types';
import type { PetId } from '~/types/ids';
import { useCreatePet, usePetTypes } from '~/features/pets/api/petApi';
import { useUpdateOwner } from '~/features/owners/api/ownerApi';
import { AddPetPanel } from '~/features/pets/components/AddPetPanel';
import { EditOwnerPanel } from './EditOwnerPanel';
import { OwnerSummary } from './OwnerSummary';

/** Exactly one thing happens in this zone at a time. */
type Mode = 'view' | 'editOwner' | 'addPet';

interface OwnerDetailProps {
  owner: Owner;
  selectedPetId: PetId | null;
  onSelectPet: (id: PetId) => void;
}

/**
 * Owns which panel is showing and where focus goes afterwards — nothing else.
 *
 * The mutation hooks stay HERE rather than inside each panel on purpose: a
 * save that failed must still be reportable once the receptionist cancels back
 * to the summary, and a hook unmounted along with its panel would lose that.
 */
export const OwnerDetail = ({
  owner,
  selectedPetId,
  onSelectPet,
}: OwnerDetailProps) => {
  const [mode, setMode] = useState<Mode>('view');
  const editButton = useRef<HTMLButtonElement>(null);
  const addPetButton = useRef<HTMLButtonElement>(null);

  const species = usePetTypes();
  const updateOwner = useUpdateOwner(owner.id);
  const createPet = useCreatePet(owner.id, species.data ?? []);

  const backToView = (focus: RefObject<HTMLButtonElement | null>): void => {
    setMode('view');
    // Return focus to the control that opened the form, or a keyboard user is
    // dropped at the top of the document.
    requestAnimationFrame(() => focus.current?.focus());
  };

  if (mode === 'editOwner') {
    return (
      <EditOwnerPanel
        owner={owner}
        pending={updateOwner.isPending}
        onSubmit={updateOwner.mutateAsync}
        onDone={() => {
          backToView(editButton);
        }}
      />
    );
  }

  if (mode === 'addPet') {
    return (
      <AddPetPanel
        owner={owner}
        species={species}
        pending={createPet.isPending}
        onSubmit={createPet.mutateAsync}
        onDone={() => {
          backToView(addPetButton);
        }}
      />
    );
  }

  return (
    <OwnerSummary
      owner={owner}
      selectedPetId={selectedPetId}
      onSelectPet={onSelectPet}
      staleError={updateOwner.isError ? describeError(updateOwner.error) : null}
      edit={{
        ref: editButton,
        onOpen: () => {
          setMode('editOwner');
        },
      }}
      addPet={{
        ref: addPetButton,
        onOpen: () => {
          setMode('addPet');
        },
      }}
    />
  );
};
