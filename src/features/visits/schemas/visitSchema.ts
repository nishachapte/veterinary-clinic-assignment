import { z } from 'zod';
import { isoDateSchema } from '~/shared/schemas/isoDate';
import { isFuture } from '~/shared/utils/date';

/** No vet and no time of day exist in the API (findings B2). */
export const visitFieldsSchema = z.object({
  date: isoDateSchema.refine((d) => !isFuture(d), {
    message: 'A visit cannot be recorded in the future',
  }),
  description: z
    .string()
    .trim()
    .min(1, 'Describe the visit')
    .max(255, 'Description cannot exceed 255 characters'),
});

export type VisitFormValues = z.input<typeof visitFieldsSchema>;
export type VisitFieldsPayload = z.output<typeof visitFieldsSchema>;
