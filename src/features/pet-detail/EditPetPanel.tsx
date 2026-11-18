import type { UseQueryResult } from '@tanstack/react-query';
import { Panel } from '~/components/Panel';
import { QueryGate } from '~/components/QueryGate';
import type { Pet, PetTypeRef } from '~/domain/models';
import type { PetFieldsPayload } from '~/domain/schemas';
import { PetForm } from './PetForm';

interface EditPetPanelProps {
  pet: Pet;
  species: UseQueryResult<readonly PetTypeRef[]>;
  pending: boolean;
  /** Rejects on a server rejection, which `PetForm` turns into field errors. */
  onSubmit: (values: PetFieldsPayload) => Promise<unknown>;
  onDone: () => void;
}

export const EditPetPanel = ({
  pet,
  species,
  pending,
  onSubmit,
  onDone,
}: EditPetPanelProps) => (
  <Panel title={`Editing ${pet.name}`} ariaLabel="Pet details">
    <QueryGate
      query={species}
      loadingLabel="Loading species…"
      errorExtra={['The species list is required before a pet can be edited.']}
    >
      {(types) => (
        <PetForm
          types={types}
          defaultValues={{
            name: pet.name,
            birthDate: pet.birthDate,
            typeId: pet.type.id,
          }}
          submitLabel="Save changes"
          pending={pending}
          onSubmit={async (values) => {
            await onSubmit(values);
            onDone();
          }}
          onCancel={onDone}
        />
      )}
    </QueryGate>
  </Panel>
);
