import { z } from 'zod';
import { isoDateSchema } from '~/shared/schemas/isoDate';
import { isFuture, isOlderThanMaxPetAge, MAX_PET_AGE_YEARS } from '~/shared/utils/date';

/**
 * Both birth-date rules are undocumented server behaviour discovered by
 * probing (findings A5). Mirroring them locally turns two opaque 400s into
 * inline field errors.
 */
export const petFieldsSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Name is required')
    .max(30, 'Name cannot exceed 30 characters'),
  birthDate: isoDateSchema
    .refine((d) => !isFuture(d), { message: 'Birth date cannot be in the future' })
    .refine((d) => !isOlderThanMaxPetAge(d), {
      message: `Birth date cannot be more than ${String(MAX_PET_AGE_YEARS)} years ago`,
    }),
  typeId: z.number().int().nonnegative({ message: 'Choose a species' }),
});

export type PetFormValues = z.input<typeof petFieldsSchema>;
export type PetFieldsPayload = z.output<typeof petFieldsSchema>;
