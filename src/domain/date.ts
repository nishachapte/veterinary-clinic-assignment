/**
 * The ONLY module permitted to use the Date API (enforced by eslint.config.js).
 *
 * Why: the API sends `format: date` strings such as "2013-01-01".
 * `new Date("2013-01-01")` is parsed as **UTC midnight**, so in any
 * negative-offset timezone `toLocaleDateString()` renders "2012-12-31".
 * Visit dates silently shifting a day backwards is a correctness bug, so ISO
 * date strings stay strings everywhere and are only turned into a Date here,
 * explicitly in local time.
 */

import type { IsoDate } from './ids';

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

export interface CalendarDate {
  readonly year: number;
  readonly month: number; // 1-12, not 0-11
  readonly day: number; // 1-31
}

export const isIsoDate = (value: string): value is IsoDate => {
  const m = ISO_DATE.exec(value);
  if (m === null) return false;
  const [, y, mo, d] = m;
  const year = Number(y);
  const month = Number(mo);
  const day = Number(d);
  if (month < 1 || month > 12 || day < 1) return false;
  return day <= daysInMonth(year, month);
};

/** Asserting constructor for literals and parsed input. */
export const isoDate = (value: string): IsoDate => {
  if (!isIsoDate(value)) throw new TypeError(`Not an ISO date: ${value}`);
  return value;
};

export const toCalendarDate = (iso: IsoDate): CalendarDate => {
  const m = ISO_DATE.exec(iso);
  // The IsoDate brand is COMPILE-TIME only, so this throw is not unreachable:
  // a caller that validates at runtime (a Zod chain, say) can still hand over
  // an unchecked string. `isoDateSchema` in ./schemas.ts aborts on a bad
  // format precisely so no refinement below it can reach here with one.
  if (m === null) throw new TypeError(`Not an ISO date: ${iso}`);
  const [, y, mo, d] = m;
  return { year: Number(y), month: Number(mo), day: Number(d) };
};

export const fromCalendarDate = ({ year, month, day }: CalendarDate): IsoDate =>
  `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(
    day,
  ).padStart(2, '0')}` as IsoDate;

function daysInMonth(year: number, month: number): number {
  // Day 0 of the next month is the last day of this one, in LOCAL time.
  return new Date(year, month, 0).getDate();
}

/** Local midnight for the given calendar date — never UTC. */
export const toLocalDate = (iso: IsoDate): Date => {
  const { year, month, day } = toCalendarDate(iso);
  return new Date(year, month - 1, day);
};

/** Today in the user's own timezone. The one legitimate "now" in the app. */
export const todayIso = (now: Date = new Date()): IsoDate =>
  fromCalendarDate({
    year: now.getFullYear(),
    month: now.getMonth() + 1,
    day: now.getDate(),
  });

/**
 * ISO dates sort chronologically under plain string comparison, so neither
 * sorting nor comparing needs a Date at all.
 */
export const compareIso = (a: IsoDate, b: IsoDate): number =>
  a < b ? -1 : a > b ? 1 : 0;

export const isFuture = (iso: IsoDate, today: IsoDate = todayIso()): boolean =>
  compareIso(iso, today) > 0;

/** Pure arithmetic — no Date, so no timezone can affect the result. */
export const ageInYears = (birth: IsoDate, today: IsoDate = todayIso()): number => {
  const b = toCalendarDate(birth);
  const t = toCalendarDate(today);
  let age = t.year - b.year;
  if (t.month < b.month || (t.month === b.month && t.day < b.day)) age -= 1;
  return age;
};

/** The server rejects birth dates more than 50 years ago (see 01-api-findings A5). */
export const MAX_PET_AGE_YEARS = 50;

export const isOlderThanMaxPetAge = (
  birth: IsoDate,
  today: IsoDate = todayIso(),
): boolean => ageInYears(birth, today) > MAX_PET_AGE_YEARS;

export const formatIsoDate = (iso: IsoDate, locale?: string): string =>
  toLocalDate(iso).toLocaleDateString(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

export const formatAge = (birth: IsoDate, today: IsoDate = todayIso()): string => {
  const years = ageInYears(birth, today);
  if (years < 0) return 'not yet born';
  if (years === 0) return 'under a year';
  return years === 1 ? '1 year' : `${String(years)} years`;
};
