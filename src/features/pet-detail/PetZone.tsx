import { useRef, useState } from 'react';
import { Panel } from '~/components/Panel';
import { EmptyState, ErrorNotice, Loading, describeError } from '~/components/Feedback';
import { VisitList } from '~/features/visits/VisitList';
import { VisitForm } from '~/features/visits/VisitForm';
import { formatAge, formatIsoDate } from '~/domain/date';
import type { Pet } from '~/domain/models';
import { useCreateVisit, usePetTypes, useUpdatePet } from '~/api/queries';
import { PetForm } from './PetForm';
import styles from './PetZone.module.css';

type Mode = { kind: 'view' } | { kind: 'editPet' } | { kind: 'addVisit' };

interface PetZoneProps {
  readonly pet: Pet | undefined;
  readonly hasOwner: boolean;
  readonly onClose: () => void;
}

export const PetZone = ({ pet, hasOwner, onClose }: PetZoneProps): React.JSX.Element => {
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

  return <PetDetail key={pet.id} pet={pet} onClose={onClose} />;
};

const PetDetail = ({
  pet,
  onClose,
}: {
  readonly pet: Pet;
  readonly onClose: () => void;
}): React.JSX.Element => {
  const [mode, setMode] = useState<Mode>({ kind: 'view' });
  const editButton = useRef<HTMLButtonElement>(null);
  const visitButton = useRef<HTMLButtonElement>(null);

  const petTypes = usePetTypes();
  const updatePet = useUpdatePet(pet.ownerId, pet.id, petTypes.data ?? []);
  const createVisit = useCreateVisit(pet.ownerId, pet.id);

  const backToView = (focus: React.RefObject<HTMLButtonElement | null>): void => {
    setMode({ kind: 'view' });
    requestAnimationFrame(() => focus.current?.focus());
  };

  if (mode.kind === 'editPet') {
    return (
      <Panel title={`Editing ${pet.name}`} ariaLabel="Pet details">
        {petTypes.isError ? (
          <ErrorNotice
            error={petTypes.error}
            extra={['The species list is required before a pet can be edited.']}
            onRetry={() => {
              void petTypes.refetch();
            }}
          />
        ) : petTypes.data === undefined ? (
          <Loading label="Loading species…" />
        ) : (
          <PetForm
            types={petTypes.data}
            defaultValues={{
              name: pet.name,
              birthDate: pet.birthDate,
              typeId: pet.type.id,
            }}
            submitLabel="Save changes"
            pending={updatePet.isPending}
            onSubmit={async (values) => {
              await updatePet.mutateAsync(values);
              backToView(editButton);
            }}
            onCancel={() => {
              backToView(editButton);
            }}
          />
        )}
      </Panel>
    );
  }

  return (
    <Panel
      title={pet.name}
      subtitle={`${pet.type.name} · born ${formatIsoDate(pet.birthDate)} · ${formatAge(pet.birthDate)}`}
      ariaLabel="Pet details"
      actions={
        <>
          <button
            type="button"
            ref={editButton}
            className={styles.action}
            onClick={() => {
              setMode({ kind: 'editPet' });
            }}
          >
            Edit
          </button>
          <button type="button" className={styles.action} onClick={onClose}>
            Close
          </button>
        </>
      }
    >
      {updatePet.isError && (
        <p className={styles.staleError} role="alert">
          {describeError(updatePet.error)}
        </p>
      )}

      <div className={styles.sectionHead}>
        <h3 className={styles.sectionTitle}>
          Visit history <span className={styles.count}>{pet.visits.length}</span>
        </h3>
        {mode.kind === 'view' && (
          <button
            type="button"
            ref={visitButton}
            className={styles.action}
            onClick={() => {
              setMode({ kind: 'addVisit' });
            }}
          >
            New visit
          </button>
        )}
      </div>

      {mode.kind === 'addVisit' && (
        <div className={styles.visitForm}>
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
        </div>
      )}

      <VisitList visits={pet.visits} />
    </Panel>
  );
};
