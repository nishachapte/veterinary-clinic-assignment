import { describe, expect, it } from 'vitest';
import { digitsOnly, foldCase, looksNumeric, matchesOwner } from './matching';
import { isoDate } from '~/domain/date';
import { ownerId, petId, petTypeId } from '~/domain/ids';
import type { Owner } from '~/domain/models';

const owner = (patch: Partial<Owner> = {}): Owner => ({
  id: ownerId(1),
  firstName: 'George',
  lastName: 'Franklin',
  address: '110 W. Liberty St.',
  city: 'Madison',
  telephone: '6085551023',
  pets: [
    {
      id: petId(1),
      ownerId: ownerId(1),
      name: 'Leo',
      birthDate: isoDate('2010-09-07'),
      type: { id: petTypeId(1), name: 'cat' },
      visits: [],
    },
  ],
  ...patch,
});

describe('helpers', () => {
  it('folds case and accents', () => {
    expect(foldCase('José')).toBe('jose');
    expect(foldCase('MCTAVISH')).toBe('mctavish');
  });

  it('strips telephone separators', () => {
    expect(digitsOnly('(608) 555-1023')).toBe('6085551023');
  });

  it.each([
    ['6085551023', true],
    ['555-1023', true],
    ['608', true],
    ['franklin', false],
    ['', false],
    ['Leo', false],
  ])('looksNumeric(%s) === %s', (query, expected) => {
    expect(looksNumeric(query)).toBe(expected);
  });
});

describe('matchesOwner', () => {
  it('matches an empty query, so an unfiltered scan lists everyone', () => {
    expect(matchesOwner(owner(), '')).toBe(true);
    expect(matchesOwner(owner(), '   ')).toBe(true);
  });

  describe('names', () => {
    it('matches the last name regardless of case', () => {
      expect(matchesOwner(owner(), 'franklin')).toBe(true);
      expect(matchesOwner(owner(), 'FRANKLIN')).toBe(true);
    });

    it('matches the first name', () => {
      expect(matchesOwner(owner(), 'george')).toBe(true);
    });

    it('matches a substring, not only a prefix', () => {
      // The server can only do prefixes; this is the value the client adds.
      expect(matchesOwner(owner(), 'ankl')).toBe(true);
    });

    it('ignores accents in stored names', () => {
      expect(matchesOwner(owner({ lastName: 'Ortegá' }), 'ortega')).toBe(true);
    });

    it('rejects a name that is not there', () => {
      expect(matchesOwner(owner(), 'rodriquez')).toBe(false);
    });
  });

  describe('telephone', () => {
    it('matches the full number', () => {
      expect(matchesOwner(owner(), '6085551023')).toBe(true);
    });

    it('matches the last four digits read back on a call', () => {
      expect(matchesOwner(owner(), '1023')).toBe(true);
    });

    it('matches a number typed with separators', () => {
      expect(matchesOwner(owner(), '608-555-1023')).toBe(true);
    });

    it('rejects a different number', () => {
      expect(matchesOwner(owner(), '6085559999')).toBe(false);
    });

    it('does NOT let a numeric query match the house number in the address', () => {
      // "110 W. Liberty St." must not be found by searching "110".
      expect(matchesOwner(owner(), '110')).toBe(false);
    });
  });

  describe('pets', () => {
    it('matches a pet by name', () => {
      expect(matchesOwner(owner(), 'leo')).toBe(true);
    });

    it('matches any pet, not just the first', () => {
      const withTwo = owner({
        pets: [
          { ...owner().pets[0]!, name: 'Leo' },
          { ...owner().pets[0]!, id: petId(2), name: 'Basil' },
        ],
      });
      expect(matchesOwner(withTwo, 'basil')).toBe(true);
    });

    it('rejects an owner with no matching pet', () => {
      expect(matchesOwner(owner(), 'iggy')).toBe(false);
    });

    it('handles an owner with no pets', () => {
      expect(matchesOwner(owner({ pets: [] }), 'leo')).toBe(false);
    });
  });
});
