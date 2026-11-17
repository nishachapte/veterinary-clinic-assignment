/**
 * Domain models: what the application works with.
 *
 * Deliberately NOT the generated DTOs. The wire types have optional fields
 * everywhere (`Pet.ownerId` is not in the spec's required list, for instance),
 * which would push `?.` chains into every component. These models are the
 * post-validation shape: if you hold one, its fields are present and its ids
 * are branded.
 */

import type { IsoDate, OwnerId, PetId, PetTypeId, VisitId } from './ids';

export interface PetTypeRef {
  readonly id: PetTypeId;
  readonly name: string;
}

export interface Visit {
  readonly id: VisitId;
  readonly petId: PetId;
  readonly date: IsoDate;
  readonly description: string;
}

export interface Pet {
  readonly id: PetId;
  readonly ownerId: OwnerId;
  readonly name: string;
  readonly birthDate: IsoDate;
  readonly type: PetTypeRef;
  /** Newest first — the order a receptionist reads history in. */
  readonly visits: readonly Visit[];
}

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
      ? { ...pet, visits: [visit, ...pet.visits].sort((a, b) => (a.date < b.date ? 1 : -1)) }
      : pet,
  ),
});
