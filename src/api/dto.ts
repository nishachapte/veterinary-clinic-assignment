/**
 * The wire format, and the mapping from it to the domain models.
 *
 * Responses are parsed, not cast. Anything that does not match the schema is
 * an error at the boundary rather than `undefined` three components deep.
 */

import { z } from 'zod';
import { isoDateSchema } from '~/domain/schemas';
import { ownerId, petId, petTypeId, visitId } from '~/domain/ids';
import { compareIso } from '~/domain/date';
import type { Owner, OwnerPage, Pet, PetTypeRef, Visit } from '~/domain/models';

const idNumber = z.number().int().nonnegative();

export const petTypeDtoSchema = z.object({ id: idNumber, name: z.string() });

export const visitDtoSchema = z.object({
  id: idNumber,
  petId: idNumber,
  date: isoDateSchema,
  description: z.string(),
});

export const petDtoSchema = z.object({
  id: idNumber,
  /** Not in the spec's `required` list, so it can be absent when nested. */
  ownerId: idNumber.optional(),
  name: z.string(),
  birthDate: isoDateSchema,
  type: petTypeDtoSchema,
  visits: z.array(visitDtoSchema).default([]),
});

export const ownerDtoSchema = z.object({
  id: idNumber,
  firstName: z.string(),
  lastName: z.string(),
  address: z.string(),
  city: z.string(),
  telephone: z.string(),
  pets: z.array(petDtoSchema).default([]),
});

export const ownerPageDtoSchema = z.object({
  content: z.array(ownerDtoSchema),
  page: z.number().int(),
  size: z.number().int(),
  totalElements: z.number().int(),
  totalPages: z.number().int(),
});

export const ownerListDtoSchema = z.array(ownerDtoSchema);
export const petTypeListDtoSchema = z.array(petTypeDtoSchema);

export type PetDto = z.infer<typeof petDtoSchema>;
export type OwnerDto = z.infer<typeof ownerDtoSchema>;

export const toPetTypeRef = (dto: z.infer<typeof petTypeDtoSchema>): PetTypeRef => ({
  id: petTypeId(dto.id),
  name: dto.name,
});

export const toVisit = (dto: z.infer<typeof visitDtoSchema>): Visit => ({
  id: visitId(dto.id),
  petId: petId(dto.petId),
  date: dto.date,
  description: dto.description,
});

/**
 * `ownerId` is supplied by the caller because the API omits it on nested pets.
 * Taking it as a required argument means a Pet in the domain always knows its
 * owner, which the three-zone layout depends on.
 */
export const toPet = (dto: PetDto, owner: Owner['id']): Pet => ({
  id: petId(dto.id),
  ownerId: owner,
  name: dto.name,
  birthDate: dto.birthDate,
  type: toPetTypeRef(dto.type),
  // Newest first. ISO dates compare chronologically as plain strings.
  visits: [...dto.visits].sort((a, b) => compareIso(b.date, a.date)).map(toVisit),
});

export const toOwner = (dto: OwnerDto): Owner => {
  const id = ownerId(dto.id);
  return {
    id,
    firstName: dto.firstName,
    lastName: dto.lastName,
    address: dto.address,
    city: dto.city,
    telephone: dto.telephone,
    pets: [...dto.pets]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((p) => toPet(p, id)),
  };
};

export const toOwnerPage = (dto: z.infer<typeof ownerPageDtoSchema>): OwnerPage => ({
  content: dto.content.map(toOwner),
  page: dto.page,
  size: dto.size,
  totalElements: dto.totalElements,
  totalPages: dto.totalPages,
});
