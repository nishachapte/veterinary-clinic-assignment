import type { UseQueryResult } from '@tanstack/react-query';
import { Panel } from '~/shared/components/Panel';
import { QueryGate } from '~/shared/components/QueryGate';
import { PetForm } from '~/features/pets/components/PetForm';
import { fullName, type Owner } from '~/features/owners/types';
import type { PetTypeRef } from '~/features/pets/types';
import type { PetFieldsPayload } from '~/features/pets/schemas/petSchema';

interface AddPetPanelProps {
  owner: Owner;
  species: UseQueryResult<readonly PetTypeRef[]>;
  pending: boolean;
  /** Rejects on a server rejection, which `PetForm` turns into field errors. */
  onSubmit: (values: PetFieldsPayload) => Promise<unknown>;
  onDone: () => void;
}

export const AddPetPanel = ({
  owner,
  species,
  pending,
  onSubmit,
  onDone,
}: AddPetPanelProps) => (
  <Panel title={`New pet for ${fullName(owner)}`} ariaLabel="Customer details">
    {/* Without the species list the form cannot be completed at all, so it is
        never rendered half-working. */}
    <QueryGate
      query={species}
      loadingLabel="Loading species…"
      errorExtra={['The species list is required before a pet can be added.']}
    >
      {(types) => (
        <PetForm
          types={types}
          submitLabel="Add pet"
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
