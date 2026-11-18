import { Panel } from '~/shared/components/Panel';
import { useCreateOwner } from '~/features/owners/api/ownerApi';
import type { OwnerId } from '~/types/ids';
import { OwnerForm } from './OwnerForm';

interface NewOwnerPanelProps {
  /** Receives the id so the desk can switch straight to the new customer. */
  onCreated: (id: OwnerId) => void;
  onCancel: () => void;
}

export const NewOwnerPanel = ({
  onCreated,
  onCancel,
}: NewOwnerPanelProps) => {
  const createOwner = useCreateOwner();

  return (
    <Panel
      title="New customer"
      subtitle="Added to the clinic's records"
      ariaLabel="Customer details"
    >
      <OwnerForm
        submitLabel="Create customer"
        pending={createOwner.isPending}
        onSubmit={async (values) => {
          // POST /owners returns the created owner, so the desk can open it
          // immediately rather than making the receptionist search again.
          const owner = await createOwner.mutateAsync(values);
          onCreated(owner.id);
        }}
        onCancel={onCancel}
      />
    </Panel>
  );
};
