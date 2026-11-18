/**
 * Branded primitives.
 *
 * The API exposes `/owners/{ownerId}/pets/{petId}` — two positional `int32`
 * values. Without brands nothing stops `getPet(petId, ownerId)` compiling, and
 * the bug surfaces as a 404 at runtime. Brands make the swap a type error.
 *
 * Brands are applied ONLY at the parse boundary (src/api, route params) so they
 * never become ceremony inside components.
 */

declare const brand: unique symbol;

type Brand<T, B extends string> = T & { readonly [brand]: B };

export type OwnerId = Brand<number, 'OwnerId'>;
export type PetId = Brand<number, 'PetId'>;
export type VisitId = Brand<number, 'VisitId'>;
export type PetTypeId = Brand<number, 'PetTypeId'>;

/** An `YYYY-MM-DD` calendar date, as the API sends it. Never a `Date`. */
export type IsoDate = Brand<string, 'IsoDate'>;

const isNonNegativeInt = (n: number): boolean => Number.isInteger(n) && n >= 0;

export const ownerId = (n: number): OwnerId => {
  if (!isNonNegativeInt(n)) throw new TypeError(`Invalid OwnerId: ${String(n)}`);
  return n as OwnerId;
};

export const petId = (n: number): PetId => {
  if (!isNonNegativeInt(n)) throw new TypeError(`Invalid PetId: ${String(n)}`);
  return n as PetId;
};

export const visitId = (n: number): VisitId => {
  if (!isNonNegativeInt(n)) throw new TypeError(`Invalid VisitId: ${String(n)}`);
  return n as VisitId;
};

export const petTypeId = (n: number): PetTypeId => {
  if (!isNonNegativeInt(n)) throw new TypeError(`Invalid PetTypeId: ${String(n)}`);
  return n as PetTypeId;
};

/** Parses an id out of a route param. Returns null rather than throwing,
 *  because a malformed URL is a user-visible state, not a programmer error. */
export const parseIdParam = (raw: string | undefined): number | null => {
  if (raw === undefined || raw.trim() === '') return null;
  const n = Number(raw);
  return isNonNegativeInt(n) ? n : null;
};
