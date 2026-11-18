import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { TextAreaField, TextField } from '~/shared/components/Field';
import { FormShell } from '~/shared/components/FormShell';
import { applyServerErrors } from '~/shared/utils/serverErrors';
import { visitFieldsSchema } from '~/features/visits/schemas/visitSchema';
import type { VisitFieldsPayload, VisitFormValues } from '~/features/visits/schemas/visitSchema';
import { todayIso } from '~/shared/utils/date';

const FIELDS = ['date', 'description'] as const;

interface VisitFormProps {
  pending: boolean;
  onSubmit: (values: VisitFieldsPayload) => Promise<unknown>;
  onCancel: () => void;
}

export const VisitForm = ({
  pending,
  onSubmit,
  onCancel,
}: VisitFormProps) => {
  const [formErrors, setFormErrors] = useState<readonly string[]>([]);

  const { register, handleSubmit, setError, formState, reset } = useForm<
    VisitFormValues,
    unknown,
    VisitFieldsPayload
  >({
    resolver: zodResolver(visitFieldsSchema),
    // Defaults to today, because that is what a receptionist is recording.
    defaultValues: { date: todayIso(), description: '' },
  });

  const { errors } = formState;

  const submit = handleSubmit(async (values) => {
    setFormErrors([]);
    try {
      await onSubmit(values);
      reset({ date: todayIso(), description: '' });
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
      submitLabel="Record visit"
      pending={pending}
      formErrors={formErrors}
    >
      <TextField
        label="Date"
        type="date"
        max={todayIso()}
        error={errors.date?.message}
        {...register('date')}
      />
      <TextAreaField
        label="Description"
        autoFocus
        maxLength={255}
        placeholder="Reason for the visit"
        error={errors.description?.message}
        {...register('description')}
      />
    </FormShell>
  );
};
