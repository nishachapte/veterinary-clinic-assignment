import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { SelectField, TextField } from '~/components/Field';
import { FormShell } from '~/features/forms/FormShell';
import { applyServerErrors } from '~/features/forms/serverErrors';
import { petFieldsSchema } from '~/domain/schemas';
import type { PetFieldsPayload, PetFormValues } from '~/domain/schemas';
import { todayIso } from '~/domain/date';
import type { PetTypeRef } from '~/domain/models';

/**
 * `type` is what the server names in a rejection, but the form shows a
 * `typeId` select, so both are declared known: otherwise a server complaint
 * about the species would land in the form-level banner instead of on the
 * field the receptionist has to change.
 */
const FIELDS = ['name', 'birthDate', 'typeId', 'type'] as const;

interface PetFormProps {
  readonly defaultValues?: PetFormValues;
  readonly types: readonly PetTypeRef[];
  readonly submitLabel: string;
  readonly pending: boolean;
  readonly onSubmit: (values: PetFieldsPayload) => Promise<unknown>;
  readonly onCancel: () => void;
}

export const PetForm = ({
  defaultValues,
  types,
  submitLabel,
  pending,
  onSubmit,
  onCancel,
}: PetFormProps): React.JSX.Element => {
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
