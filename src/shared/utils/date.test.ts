import { describe, expect, it } from 'vitest';
import {
  ageInYears,
  compareIso,
  formatAge,
  isFuture,
  isIsoDate,
  isOlderThanMaxPetAge,
  isoDate,
  todayIso,
  toLocalDate,
} from './date';

describe('isIsoDate', () => {
  it.each(['2013-01-01', '2000-02-29', '2024-12-31'])('accepts %s', (v) => {
    expect(isIsoDate(v)).toBe(true);
  });

  it.each([
    '2013-1-1',
    '13-01-01',
    '2013-13-01',
    '2013-00-01',
    '2013-01-32',
    '2023-02-29', // not a leap year
    '',
    '2013-01-01T00:00:00Z',
  ])('rejects %s', (v) => {
    expect(isIsoDate(v)).toBe(false);
  });
});

describe('toLocalDate — the UTC-shift regression', () => {
  it('yields the same calendar day it was given, in local time', () => {
    const d = toLocalDate(isoDate('2013-01-01'));
    expect(d.getFullYear()).toBe(2013);
    expect(d.getMonth()).toBe(0);
    expect(d.getDate()).toBe(1);
  });

  it('does NOT agree with the naive Date constructor in negative offsets', () => {
    // This is the bug the helper exists to prevent: `new Date(iso)` is UTC
    // midnight, so its *local* day can be the day before.
    const naive = new Date('2013-01-01');
    const safe = toLocalDate(isoDate('2013-01-01'));
    if (naive.getTimezoneOffset() > 0) {
      expect(naive.getDate()).not.toBe(safe.getDate());
    } else {
      expect(naive.getDate()).toBe(safe.getDate());
    }
  });
});

describe('compareIso', () => {
  it('orders chronologically', () => {
    const dates = ['2013-05-01', '2011-01-01', '2013-01-05'].map(isoDate);
    expect([...dates].sort(compareIso)).toEqual([
      '2011-01-01',
      '2013-01-05',
      '2013-05-01',
    ]);
  });
});

describe('ageInYears', () => {
  it('counts a birthday that has passed', () => {
    expect(ageInYears(isoDate('2010-09-07'), isoDate('2026-11-17'))).toBe(16);
  });

  it('does not count a birthday still to come this year', () => {
    expect(ageInYears(isoDate('2010-12-25'), isoDate('2026-11-17'))).toBe(15);
  });

  it('counts the birthday itself', () => {
    expect(ageInYears(isoDate('2010-11-17'), isoDate('2026-11-17'))).toBe(16);
  });

  it('is unaffected by timezone because it never builds a Date', () => {
    expect(ageInYears(isoDate('2000-01-01'), isoDate('2000-12-31'))).toBe(0);
  });
});

describe('server-rule mirrors', () => {
  it('detects a future birth date', () => {
    expect(isFuture(isoDate('2030-01-01'), isoDate('2026-11-17'))).toBe(true);
    expect(isFuture(isoDate('2026-11-17'), isoDate('2026-11-17'))).toBe(false);
  });

  it('detects a birth date older than the 50-year server limit', () => {
    expect(isOlderThanMaxPetAge(isoDate('1900-01-01'), isoDate('2026-11-17'))).toBe(true);
    expect(isOlderThanMaxPetAge(isoDate('1980-01-01'), isoDate('2026-11-17'))).toBe(false);
  });
});

describe('formatAge', () => {
  it.each([
    ['2026-01-01', 'under a year'],
    ['2025-01-01', '1 year'],
    ['2020-01-01', '6 years'],
  ])('%s -> %s', (birth, expected) => {
    expect(formatAge(isoDate(birth), isoDate('2026-11-17'))).toBe(expected);
  });
});

describe('todayIso', () => {
  it('uses local calendar fields, not the UTC date', () => {
    const fixed = new Date(2026, 10, 17, 23, 30); // 17 Nov local, late evening
    expect(todayIso(fixed)).toBe('2026-11-17');
  });
});
