import type { ReactNode } from 'react';
import type { UseQueryResult } from '@tanstack/react-query';
import { Panel } from '~/components/Panel';
import { EmptyState, ErrorNotice, Loading } from '~/components/Feedback';
import type { Owner } from '~/domain/models';
import type { OwnerId, PetId } from '~/domain/ids';
import { OwnerDetail } from './OwnerDetail';

/** The zone's frame, so its four states cannot disagree about its landmark. */
const CustomerPanel = ({ children }: { readonly children: ReactNode }) => (
  <Panel title="Customer" ariaLabel="Customer details">
    {children}
  </Panel>
);

interface OwnerZoneProps {
  ownerId: OwnerId | null;
  owner: UseQueryResult<Owner>;
  selectedPetId: PetId | null;
  onSelectPet: (id: PetId) => void;
}

/** Chooses which of the zone's states to show. It renders no detail itself. */
export const OwnerZone = ({
  ownerId,
  owner,
  selectedPetId,
  onSelectPet,
}: OwnerZoneProps) => {
  if (ownerId === null) {
    return (
      <CustomerPanel>
        <EmptyState>
          Search for a customer on the left, or create a new owner if this is their
          first visit.
        </EmptyState>
      </CustomerPanel>
    );
  }

  if (owner.isLoading) {
    return (
      <CustomerPanel>
        <Loading label="Loading customer…" />
      </CustomerPanel>
    );
  }

  if (owner.isError || owner.data === undefined) {
    return (
      <CustomerPanel>
        {/* One request feeds this zone and the pet zone, so its failure must be
            recoverable here without losing the search results on the left. */}
        <ErrorNotice
          error={owner.error}
          onRetry={() => {
            void owner.refetch();
          }}
        />
      </CustomerPanel>
    );
  }

  // Keyed by id so switching customer resets any open form rather than
  // carrying one person's half-typed edit onto the next.
  return (
    <OwnerDetail
      key={owner.data.id}
      owner={owner.data}
      selectedPetId={selectedPetId}
      onSelectPet={onSelectPet}
    />
  );
};
