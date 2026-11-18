/**
 * Mirrors the server's own constraints, so the form rejects bad input before a
 * request is made and the 400 path stays rare. Every rule is sourced from the
 * contract or from probing the running server — see docs/ai/01-api-findings.md.
 */

import { z } from 'zod';

/** openapi.yml: letters, up to three words. */
const FIRST_NAME = /^\p{L}+([ '-]\p{L}+){0,2}$/u;
/** Same, with an optional trailing dot. */
const LAST_NAME = /^\p{L}+([ '-]\p{L}+){0,2}\.?$/u;
/** Exactly ten digits, no separators or prefix. */
const TELEPHONE = /^[0-9]{10}$/;

/** Strips the separators a receptionist naturally types, before validating. */
export const normaliseTelephone = (raw: string): string => raw.replace(/[^0-9]/g, '');

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
