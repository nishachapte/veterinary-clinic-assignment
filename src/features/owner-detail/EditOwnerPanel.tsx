import { Panel } from '~/components/Panel';
import { fullName, type Owner } from '~/domain/models';
import type { OwnerFieldsPayload } from '~/domain/schemas';
import { OwnerForm } from './OwnerForm';

interface EditOwnerPanelProps {
  owner: Owner;
  pending: boolean;
  /** Rejects on a server rejection, which `OwnerForm` turns into field errors. */
  onSubmit: (values: OwnerFieldsPayload) => Promise<unknown>;
  onDone: () => void;
}

export const EditOwnerPanel = ({
  owner,
  pending,
  onSubmit,
  onDone,
}: EditOwnerPanelProps) => (
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
      pending={pending}
      onSubmit={async (values) => {
        await onSubmit(values);
        onDone();
      }}
      onCancel={onDone}
    />
  </Panel>
);
