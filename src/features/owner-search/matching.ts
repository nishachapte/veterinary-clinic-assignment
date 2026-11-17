/**
 * Client-side matching, used on top of the server's last-name filter.
 *
 * The API can only filter by last name (docs/ai/01-api-findings.md B1), but a
 * receptionist on the phone usually has a telephone number, a first name, or
 * the pet's name. Those are matched here, over the records the lookup has
 * actually loaded — which is why the empty state reports its scope instead of
 * claiming "no results".
 */

import type { Owner } from '~/domain/models';

/** Digits only — the stored form is ten bare digits, but people type spaces,
 *  brackets and dashes. */
export const digitsOnly = (value: string): string => value.replace(/[^0-9]/g, '');

/** Case- and accent-insensitive key, so "Jose" finds "José". */
export const foldCase = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();

/**
 * True when the query is mostly digits, i.e. a phone number rather than a name.
 * Used to decide whether the query is worth sending to the server's `lastName`
 * filter at all: sending "6085551023" as a last name matches nothing.
 */
export const looksNumeric = (query: string): boolean => {
  const trimmed = query.trim();
  if (trimmed === '') return false;
  const digits = digitsOnly(trimmed);
  return digits.length >= 3 && digits.length >= Math.ceil(trimmed.length / 2);
};

/**
 * Decides whether one owner matches what the receptionist typed.
 *
 * Decided behaviour:
 *  - A numeric query searches telephone numbers ONLY. Letting digits match the
 *    address would make "110" hit every house number in the city.
 *  - Telephone matching is `includes`, not equality, so reading back the last
 *    four digits ("5551023") finds the customer — what actually happens on a
 *    call.
 *  - Name and pet matching is `includes` rather than `startsWith`: more
 *    forgiving when the receptionist mishears the beginning of a name, which
 *    is the common failure on a phone line.
 *  - City and address are not searched. They are disambiguators shown in the
 *    result row, not things a customer identifies themselves by.
 */
export const matchesOwner = (owner: Owner, query: string): boolean => {
  const q = foldCase(query.trim());

  if (q === '') return true;

  // Numeric queries should search telephone numbers only.
  if (looksNumeric(query)) {
    return digitsOnly(owner.telephone).includes(digitsOnly(query));
  }

  // Match first name or last name.
  const matchesName =
    foldCase(owner.firstName).includes(q) ||
    foldCase(owner.lastName).includes(q);

  // Match any pet's name.
  const matchesPet = owner.pets.some((pet) =>
    foldCase(pet.name).includes(q)
  );

  return matchesName || matchesPet;
};
