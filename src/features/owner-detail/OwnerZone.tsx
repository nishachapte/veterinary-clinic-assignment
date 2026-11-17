import { useRef, useState } from 'react';
import type { UseQueryResult } from '@tanstack/react-query';
import { Panel } from '~/components/Panel';
import { EmptyState, ErrorNotice, Loading, describeError } from '~/components/Feedback';
import { formatAge } from '~/domain/date';
import { fullName, type Owner } from '~/domain/models';
import type { OwnerId, PetId } from '~/domain/ids';
import { useCreatePet, usePetTypes, useUpdateOwner } from '~/api/queries';
import { PetForm } from '~/features/pet-detail/PetForm';
import { OwnerForm } from './OwnerForm';
import styles from './OwnerZone.module.css';

/** Exactly one thing happens in this panel at a time. */
type Mode = { kind: 'view' } | { kind: 'editOwner' } | { kind: 'addPet' };

interface OwnerZoneProps {
  readonly ownerId: OwnerId | null;
  readonly owner: UseQueryResult<Owner>;
  readonly selectedPetId: PetId | null;
  readonly onSelectPet: (id: PetId) => void;
}

export const OwnerZone = ({
  ownerId,
  owner,
  selectedPetId,
  onSelectPet,
}: OwnerZoneProps): React.JSX.Element => {
  if (ownerId === null) {
    return (
      <Panel title="Customer" ariaLabel="Customer details">
        <EmptyState>
          Search for a customer on the left, or create a new owner if this is their
          first visit.
        </EmptyState>
      </Panel>
    );
  }

  if (owner.isLoading) {
    return (
      <Panel title="Customer" ariaLabel="Customer details">
        <Loading label="Loading customer…" />
      </Panel>
    );
  }

  if (owner.isError || owner.data === undefined) {
    return (
      <Panel title="Customer" ariaLabel="Customer details">
        {/* One request feeds this zone and the pet zone, so its failure must be
            recoverable here without losing the search results on the left. */}
        <ErrorNotice
          error={owner.error}
          onRetry={() => {
            void owner.refetch();
          }}
        />
      </Panel>
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

interface OwnerDetailProps {
  readonly owner: Owner;
  readonly selectedPetId: PetId | null;
  readonly onSelectPet: (id: PetId) => void;
}

const OwnerDetail = ({
  owner,
  selectedPetId,
  onSelectPet,
}: OwnerDetailProps): React.JSX.Element => {
  const [mode, setMode] = useState<Mode>({ kind: 'view' });
  const editButton = useRef<HTMLButtonElement>(null);
  const addPetButton = useRef<HTMLButtonElement>(null);

  const petTypes = usePetTypes();
  const updateOwner = useUpdateOwner(owner.id);
  const createPet = useCreatePet(owner.id, petTypes.data ?? []);

  const backToView = (focus: React.RefObject<HTMLButtonElement | null>): void => {
    setMode({ kind: 'view' });
    // Return focus to the control that opened the form, or a keyboard user is
    // dropped at the top of the document.
    requestAnimationFrame(() => focus.current?.focus());
  };

  if (mode.kind === 'editOwner') {
    return (
      <Panel title={`Editing ${fullName(owner)}`} ariaLabel="Customer details">
        <OwnerForm
          defaultValues={{
            firstName: owner.firstName,
            lastName: owner.lastName,
            address: owner.address,
            city: owner.city,
            telephone: owner.telephone,
          }}
          submitLabel="Save changes"
          pending={updateOwner.isPending}
          onSubmit={async (values) => {
            await updateOwner.mutateAsync(values);
            backToView(editButton);
          }}
          onCancel={() => {
            backToView(editButton);
          }}
        />
      </Panel>
    );
  }

  if (mode.kind === 'addPet') {
    return (
      <Panel title={`New pet for ${fullName(owner)}`} ariaLabel="Customer details">
        {petTypes.isError ? (
          // Without the species list the form cannot be completed at all, so it
          // is not rendered half-working.
          <ErrorNotice
            error={petTypes.error}
            extra={['The species list is required before a pet can be added.']}
            onRetry={() => {
              void petTypes.refetch();
            }}
          />
        ) : petTypes.data === undefined ? (
          <Loading label="Loading species…" />
        ) : (
          <PetForm
            types={petTypes.data}
            submitLabel="Add pet"
            pending={createPet.isPending}
            onSubmit={async (values) => {
              await createPet.mutateAsync(values);
              backToView(addPetButton);
            }}
            onCancel={() => {
              backToView(addPetButton);
            }}
          />
        )}
      </Panel>
    );
  }

  return (
    <Panel
      title={fullName(owner)}
      subtitle={`${owner.address}, ${owner.city}`}
      ariaLabel="Customer details"
      actions={
        <button
          type="button"
          ref={editButton}
          className={styles.action}
          onClick={() => {
            setMode({ kind: 'editOwner' });
          }}
        >
          Edit
        </button>
      }
    >
      {updateOwner.isError && (
        <p className={styles.staleError} role="alert">
          {describeError(updateOwner.error)}
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
          ref={addPetButton}
          className={styles.action}
          onClick={() => {
            setMode({ kind: 'addPet' });
          }}
        >
          Add pet
        </button>
      </div>

      {owner.pets.length === 0 ? (
        <EmptyState>No pets recorded for this customer yet.</EmptyState>
      ) : (
        <ul className={styles.pets}>
          {owner.pets.map((pet) => (
            <li key={pet.id}>
              <button
                type="button"
                className={styles.pet}
                aria-current={pet.id === selectedPetId}
                onClick={() => {
                  onSelectPet(pet.id);
                }}
              >
                <span className={styles.petName}>{pet.name}</span>
                <span className={styles.petMeta}>
                  {pet.type.name} · {formatAge(pet.birthDate)} ·{' '}
                  {pet.visits.length === 0
                    ? 'no visits'
                    : `${String(pet.visits.length)} visit${pet.visits.length === 1 ? '' : 's'}`}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
};
