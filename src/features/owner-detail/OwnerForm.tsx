import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { TextField } from '~/components/Field';
import { FormShell } from '~/features/forms/FormShell';
import { applyServerErrors } from '~/features/forms/serverErrors';
import { ownerFieldsSchema } from '~/domain/schemas';
import type { OwnerFieldsPayload, OwnerFormValues } from '~/domain/schemas';

const FIELDS = ['firstName', 'lastName', 'address', 'city', 'telephone'] as const;

const EMPTY: OwnerFormValues = {
  firstName: '',
  lastName: '',
  address: '',
  city: '',
  telephone: '',
};

interface OwnerFormProps {
  readonly defaultValues?: OwnerFormValues;
  readonly submitLabel: string;
  readonly pending: boolean;
  readonly onSubmit: (values: OwnerFieldsPayload) => Promise<unknown>;
  readonly onCancel: () => void;
}

export const OwnerForm = ({
  defaultValues,
  submitLabel,
  pending,
  onSubmit,
  onCancel,
}: OwnerFormProps): React.JSX.Element => {
  const [formErrors, setFormErrors] = useState<readonly string[]>([]);

  const { register, handleSubmit, setError, formState } = useForm<
    OwnerFormValues,
    unknown,
    OwnerFieldsPayload
  >({
    resolver: zodResolver(ownerFieldsSchema),
    defaultValues: defaultValues ?? EMPTY,
  });

  const { errors } = formState;

  const submit = handleSubmit(async (values) => {
    setFormErrors([]);
    try {
      await onSubmit(values);
    } catch (error) {
      setFormErrors(applyServerErrors(error, setError, FIELDS));
    }
  });

  return (
    <FormShell
      onSubmit={(event) => {
        void submit(event);
      }}
      onCancel={onCancel}
      submitLabel={submitLabel}
      pending={pending}
      formErrors={formErrors}
    >
      <TextField
        label="First name"
        autoFocus
        error={errors.firstName?.message}
        {...register('firstName')}
      />
      <TextField
        label="Last name"
        error={errors.lastName?.message}
        {...register('lastName')}
      />
      <TextField
        label="Address"
        error={errors.address?.message}
        {...register('address')}
      />
      <TextField label="City" error={errors.city?.message} {...register('city')} />
      <TextField
        label="Telephone"
        inputMode="tel"
        hint="Ten digits. Separators are removed automatically."
        error={errors.telephone?.message}
        {...register('telephone')}
      />
    </FormShell>
  );
};
