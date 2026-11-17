import { describe, expect, it } from 'vitest';
import { petFieldsSchema, visitFieldsSchema } from './schemas';
import {
  MAX_PET_AGE_YEARS,
  fromCalendarDate,
  toCalendarDate,
  todayIso,
} from './date';

const birthDateMessages = (birthDate: string): string[] => {
  const result = petFieldsSchema.safeParse({ name: 'Rex', birthDate, typeId: 1 });
  return result.success ? [] : result.error.issues.map((i) => i.message);
};

const visitDateMessages = (date: string): string[] => {
  const result = visitFieldsSchema.safeParse({ date, description: 'x' });
  return result.success ? [] : result.error.issues.map((i) => i.message);
};

const BAD_FORMAT = ['Use the format YYYY-MM-DD'];

// Built through `date.ts` rather than by slicing the ISO string, because that
// module is the only one allowed to decode a date (see its header and the
// `noRawDates` rule in eslint.config.js).
const { year: thisYear } = toCalendarDate(todayIso());
const janFirst = (year: number): string =>
  fromCalendarDate({ year, month: 1, day: 1 });

describe('petFieldsSchema birthDate', () => {
  /**
   * Regression guard — see the comment on `isoDateSchema` in ./schemas.ts.
   *
   * Two things are asserted per row, and both matter. `not.toThrow` is the
   * regression itself: a bad date used to escape `safeParse` as a TypeError,
   * leaving the form with nothing to show. `toEqual` (not `toContain`) then
   * proves the parse ABORTED — a merely-failed parse would go on to run the
   * rules below the format check and report their complaints too.
   */
  it.each([
    ['', 'empty, which is how the form opens'],
    ['04/03/2021', 'what a date input displays in en-GB'],
    ['2021-3-4', 'unpadded'],
  ])('fails rather than throws on %s (%s)', (birthDate) => {
    expect(() => birthDateMessages(birthDate)).not.toThrow();
    expect(birthDateMessages(birthDate)).toEqual(BAD_FORMAT);
  });

  it('still enforces the server rules once the format is valid', () => {
    expect(birthDateMessages(janFirst(thisYear + 1))).toContain(
      'Birth date cannot be in the future',
    );
    expect(birthDateMessages(janFirst(thisYear - MAX_PET_AGE_YEARS - 1))).toContain(
      `Birth date cannot be more than ${String(MAX_PET_AGE_YEARS)} years ago`,
    );
  });

  it('accepts a well-formed birth date', () => {
    expect(birthDateMessages('2021-03-04')).toEqual([]);
  });
});

describe('visitFieldsSchema date', () => {
  // Shares `isoDateSchema`, so it is held to the same contract.
  it.each(['', 'not-a-date'])('fails rather than throws on %s', (date) => {
    expect(() => visitDateMessages(date)).not.toThrow();
    expect(visitDateMessages(date)).toEqual(BAD_FORMAT);
  });
});
