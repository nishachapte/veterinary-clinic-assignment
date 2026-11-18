import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { SelectField, TextField } from '~/shared/components/Field';
import { FormShell } from '~/shared/components/FormShell';
import { useGuardedSubmit } from '~/shared/hooks/useGuardedSubmit';
import { applyServerErrors } from '~/shared/utils/serverErrors';
import { petFieldsSchema } from '~/features/pets/schemas/petSchema';
import type { PetFieldsPayload, PetFormValues } from '~/features/pets/schemas/petSchema';
import { todayIso } from '~/shared/utils/date';
import type { PetTypeRef } from '~/features/pets/types';

/**
 * `type` is what the server names in a rejection, but the form shows a
 * `typeId` select, so both are declared known: otherwise a server complaint
 * about the species would land in the form-level banner instead of on the
 * field the receptionist has to change.
 */
const FIELDS = ['name', 'birthDate', 'typeId', 'type'] as const;

interface PetFormProps {
  defaultValues?: PetFormValues;
  types: readonly PetTypeRef[];
  submitLabel: string;
  pending: boolean;
  onSubmit: (values: PetFieldsPayload) => Promise<unknown>;
  onCancel: () => void;
}

export const PetForm = ({
  defaultValues,
  types,
  submitLabel,
  pending,
  onSubmit,
  onCancel,
}: PetFormProps) => {
  const [formErrors, setFormErrors] = useState<readonly string[]>([]);

  const { register, handleSubmit, setError, formState } = useForm<
    PetFormValues,
    unknown,
    PetFieldsPayload
  >({
    resolver: zodResolver(petFieldsSchema),
    defaultValues: defaultValues ?? {
      name: '',
      birthDate: '',
      typeId: types[0]?.id ?? 0,
    },
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
        label="Name"
        autoFocus
        error={errors.name?.message}
        {...register('name')}
      />
      <TextField
        label="Date of birth"
        type="date"
        max={todayIso()}
        hint="The clinic system does not accept a date more than 50 years ago."
        error={errors.birthDate?.message}
        {...register('birthDate')}
      />
      <SelectField
        label="Species"
        error={errors.typeId?.message}
        {...register('typeId', { valueAsNumber: true })}
      >
        {types.map((type) => (
          <option key={type.id} value={type.id}>
            {type.name}
          </option>
        ))}
      </SelectField>
    </FormShell>
  );
};
