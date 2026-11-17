/**
 * Form values -> request bodies.
 *
 * `PetFields.type` is a full `PetType` object rather than a `typeId`
 * (docs/ai/01-api-findings.md), so creating a pet needs the loaded pet-type
 * list to turn the selected id back into `{ id, name }`. That resolution is
 * done here rather than in a component, so the quirk lives in one place.
 */

import type { PetTypeRef } from '~/domain/models';
import type {
  OwnerFieldsPayload,
  PetFieldsPayload,
  VisitFieldsPayload,
} from '~/domain/schemas';

export interface OwnerRequestBody {
  firstName: string;
  lastName: string;
  address: string;
  city: string;
  telephone: string;
}

export interface PetRequestBody {
  name: string;
  birthDate: string;
  type: { id: number; name: string };
}

export interface VisitRequestBody {
  date: string;
  description: string;
}

export const ownerBody = (v: OwnerFieldsPayload): OwnerRequestBody => ({
  firstName: v.firstName,
  lastName: v.lastName,
  address: v.address,
  city: v.city,
  telephone: v.telephone,
});

export class UnknownPetTypeError extends Error {
  constructor(id: number) {
    super(`No pet type with id ${String(id)} is loaded.`);
    this.name = 'UnknownPetTypeError';
  }
}

export const petBody = (
  v: PetFieldsPayload,
  types: readonly PetTypeRef[],
): PetRequestBody => {
  const type = types.find((t) => t.id === v.typeId);
  if (type === undefined) throw new UnknownPetTypeError(v.typeId);
  return {
    name: v.name,
    birthDate: v.birthDate,
    type: { id: type.id, name: type.name },
  };
};

export const visitBody = (v: VisitFieldsPayload): VisitRequestBody => ({
  date: v.date,
  description: v.description,
});
