/**
 * The owner as the application works with it — NOT the wire DTO.
 *
 * The wire types have optional fields everywhere (`Pet.ownerId` is absent from
 * the spec's required list), which would push `?.` chains into every
 * component. Hold one of these and its fields are present and its ids branded.
 *
 * `readonly` here is load-bearing: these objects live in the TanStack cache and
 * are shared by every component reading that query, so an in-place edit would
 * change what all of them see with no re-render.
 */

import type { OwnerId, PetId } from '~/types/ids';
import type { Pet } from '~/features/pets/types';
import type { Visit } from '~/features/visits/types';

export interface Owner {
  readonly id: OwnerId;
  readonly firstName: string;
  readonly lastName: string;
  readonly address: string;
  readonly city: string;
  readonly telephone: string;
  readonly pets: readonly Pet[];
}

export interface OwnerPage {
  readonly content: readonly Owner[];
  readonly page: number;
  readonly size: number;
  readonly totalElements: number;
  readonly totalPages: number;
}

export const fullName = (o: Pick<Owner, 'firstName' | 'lastName'>): string =>
  `${o.firstName} ${o.lastName}`;

export const findPet = (owner: Owner, id: PetId): Pet | undefined =>
  owner.pets.find((p) => p.id === id);

/** Pure insertion of a visit into the owner tree, keeping newest-first order. */
export const withVisit = (owner: Owner, visit: Visit): Owner => ({
  ...owner,
  pets: owner.pets.map((pet) =>
    pet.id === visit.petId
      ? {
          ...pet,
          visits: [visit, ...pet.visits].sort((a, b) => (a.date < b.date ? 1 : -1)),
        }
      : pet,
  ),
});
