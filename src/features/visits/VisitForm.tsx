import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { TextAreaField, TextField } from '~/components/Field';
import { FormShell } from '~/features/forms/FormShell';
import { applyServerErrors } from '~/features/forms/serverErrors';
import { visitFieldsSchema } from '~/domain/schemas';
import type { VisitFieldsPayload, VisitFormValues } from '~/domain/schemas';
import { todayIso } from '~/domain/date';

const FIELDS = ['date', 'description'] as const;

interface VisitFormProps {
  readonly pending: boolean;
  readonly onSubmit: (values: VisitFieldsPayload) => Promise<unknown>;
  readonly onCancel: () => void;
}

export const VisitForm = ({
  pending,
  onSubmit,
  onCancel,
}: VisitFormProps): React.JSX.Element => {
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
