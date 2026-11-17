/**
 * Zod schemas mirroring the server's own constraints, so the form rejects bad
 * input before a request is made and the 400 path stays rare.
 *
 * Every rule below is sourced from the real contract or from probing the
 * running server — see docs/ai/01-api-findings.md. The `z.infer` types are the
 * form types, so a rule and its type can never drift apart.
 */

import { z } from 'zod';
import { isIsoDate, isFuture, isOlderThanMaxPetAge, MAX_PET_AGE_YEARS } from './date';
import type { IsoDate } from './ids';

/** OwnerFields.firstName — openapi.yml: letters, up to three words. */
const FIRST_NAME = /^\p{L}+([ '-]\p{L}+){0,2}$/u;
/** OwnerFields.lastName — same, with an optional trailing dot. */
const LAST_NAME = /^\p{L}+([ '-]\p{L}+){0,2}\.?$/u;
/** OwnerFields.telephone — exactly ten digits, no separators or prefix. */
const TELEPHONE = /^[0-9]{10}$/;

/** Strips the separators a receptionist naturally types, before validating. */
export const normaliseTelephone = (raw: string): string => raw.replace(/[^0-9]/g, '');

// The canonical note on this schema; its regression tests point here rather
// than restating it.
//
// `isIsoDate` is a type predicate, and a type-predicate `superRefine` narrows
// the output type exactly as `.refine` does, so the IsoDate brand still
// arrives without a cast.
//
// `fatal: true` is the point of it. A check that merely FAILS leaves the parse
// "dirty", so Zod still runs the refinements chained below — on the value that
// just failed — and `birthDate` chains `isOlderThanMaxPetAge`, which throws on
// a non-ISO string. That throw escaped `safeParse` entirely, so the pet form
// refused to submit while showing nothing at all. Aborting protects every
// later refinement automatically, at any depth. It must be `superRefine`:
// `fatal` is absent from `.refine`'s published types, and typed only on
// `addIssue`.
export const isoDateSchema = z
  .string()
  .superRefine((value, ctx): value is IsoDate => {
    if (isIsoDate(value)) return true;
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Use the format YYYY-MM-DD',
      fatal: true,
    });
    return false;
  });

export const ownerFieldsSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(1, 'First name is required')
    .max(30, 'First name cannot exceed 30 characters')
    .regex(FIRST_NAME, 'Letters only, at most three words'),
  lastName: z
    .string()
    .trim()
    .min(1, 'Last name is required')
    .max(30, 'Last name cannot exceed 30 characters')
    .regex(LAST_NAME, 'Letters only, at most three words'),
  address: z
    .string()
    .trim()
    .min(1, 'Address is required')
    .max(255, 'Address cannot exceed 255 characters'),
  city: z
    .string()
    .trim()
    .min(1, 'City is required')
    .max(80, 'City cannot exceed 80 characters'),
  telephone: z
    .string()
    .transform(normaliseTelephone)
    .refine((v) => TELEPHONE.test(v), {
      message: 'The clinic system accepts exactly 10 digits',
    }),
});

export type OwnerFormValues = z.input<typeof ownerFieldsSchema>;
export type OwnerFieldsPayload = z.output<typeof ownerFieldsSchema>;

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

/** VisitFields — no vet and no time of day exist in the API (findings B2). */
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
