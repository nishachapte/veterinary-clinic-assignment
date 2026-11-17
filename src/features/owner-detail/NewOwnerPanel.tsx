import { Panel } from '~/components/Panel';
import { useCreateOwner } from '~/api/queries';
import type { OwnerId } from '~/domain/ids';
import { OwnerForm } from './OwnerForm';

interface NewOwnerPanelProps {
  /** Receives the id so the desk can switch straight to the new customer. */
  readonly onCreated: (id: OwnerId) => void;
  readonly onCancel: () => void;
}

export const NewOwnerPanel = ({
  onCreated,
  onCancel,
}: NewOwnerPanelProps): React.JSX.Element => {
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
