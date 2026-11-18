import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { TextField } from '~/shared/components/Field';
import { FormShell } from '~/shared/components/FormShell';
import { useGuardedSubmit } from '~/shared/hooks/useGuardedSubmit';
import { applyServerErrors } from '~/shared/utils/serverErrors';
import { ownerFieldsSchema } from '~/features/owners/schemas/ownerSchema';
import type { OwnerFieldsPayload, OwnerFormValues } from '~/features/owners/schemas/ownerSchema';

const FIELDS = ['firstName', 'lastName', 'address', 'city', 'telephone'] as const;

const EMPTY: OwnerFormValues = {
  firstName: '',
  lastName: '',
  address: '',
  city: '',
  telephone: '',
};

interface OwnerFormProps {
  defaultValues?: OwnerFormValues;
  submitLabel: string;
  pending: boolean;
  onSubmit: (values: OwnerFieldsPayload) => Promise<unknown>;
  onCancel: () => void;
}

export const OwnerForm = ({
  defaultValues,
  submitLabel,
  pending,
  onSubmit,
  onCancel,
}: OwnerFormProps) => {
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

  const guardedSubmit = useGuardedSubmit(submit);

  return (
    <FormShell
      onSubmit={guardedSubmit}
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
