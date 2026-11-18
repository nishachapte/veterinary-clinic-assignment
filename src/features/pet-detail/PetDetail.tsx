import { useRef, useState } from 'react';
import type { RefObject } from 'react';
import { describeError } from '~/components/Feedback';
import { VisitForm } from '~/features/visits/VisitForm';
import type { Pet } from '~/domain/models';
import { useCreateVisit, usePetTypes, useUpdatePet } from '~/api/queries';
import { EditPetPanel } from './EditPetPanel';
import { PetSummary } from './PetSummary';

/** Exactly one thing happens in this zone at a time. */
type Mode = 'view' | 'editPet' | 'addVisit';

interface PetDetailProps {
  pet: Pet;
  onClose: () => void;
}

/** Owns which panel is showing and where focus goes afterwards — nothing else. */
export const PetDetail = ({ pet, onClose }: PetDetailProps) => {
  const [mode, setMode] = useState<Mode>('view');
  const editButton = useRef<HTMLButtonElement>(null);
  const visitButton = useRef<HTMLButtonElement>(null);

  const species = usePetTypes();
  const updatePet = useUpdatePet(pet.ownerId, pet.id, species.data ?? []);
  const createVisit = useCreateVisit(pet.ownerId, pet.id);

  const backToView = (focus: RefObject<HTMLButtonElement | null>): void => {
    setMode('view');
    requestAnimationFrame(() => focus.current?.focus());
  };

  if (mode === 'editPet') {
    return (
      <EditPetPanel
        pet={pet}
        species={species}
        pending={updatePet.isPending}
        onSubmit={updatePet.mutateAsync}
        onDone={() => {
          backToView(editButton);
        }}
      />
    );
  }

  // Recording a visit happens INSIDE the summary rather than replacing it, so
  // the history stays on screen while the receptionist types.
  return (
    <PetSummary
      pet={pet}
      onClose={onClose}
      staleError={updatePet.isError ? describeError(updatePet.error) : null}
      edit={{
        ref: editButton,
        onOpen: () => {
          setMode('editPet');
        },
      }}
      newVisit={{
        ref: visitButton,
        onOpen: () => {
          setMode('addVisit');
        },
      }}
      visitForm={
        mode === 'addVisit' ? (
          <VisitForm
            pending={createVisit.isPending}
            onSubmit={async (values) => {
              await createVisit.mutateAsync(values);
              backToView(visitButton);
            }}
            onCancel={() => {
              backToView(visitButton);
            }}
          />
        ) : undefined
      }
    />
  );
};
