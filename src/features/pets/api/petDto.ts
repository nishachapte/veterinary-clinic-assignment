import { z } from 'zod';
import { isoDateSchema } from '~/shared/schemas/isoDate';
import { compareIso } from '~/shared/utils/date';
import { petId, petTypeId } from '~/types/ids';
import { toVisit, visitDtoSchema } from '~/features/visits/api/visitDto';
import type { Owner } from '~/features/owners/types';
import type { Pet, PetTypeRef } from '../types';

const idNumber = z.number().int().nonnegative();

export const petTypeDtoSchema = z.object({ id: idNumber, name: z.string() });
export const petTypeListDtoSchema = z.array(petTypeDtoSchema);

export const petDtoSchema = z.object({
  id: idNumber,
  /** Not in the spec's `required` list, so it can be absent when nested. */
  ownerId: idNumber.optional(),
  name: z.string(),
  birthDate: isoDateSchema,
  type: petTypeDtoSchema,
  visits: z.array(visitDtoSchema).default([]),
});

export type PetDto = z.infer<typeof petDtoSchema>;

export const toPetTypeRef = (dto: z.infer<typeof petTypeDtoSchema>): PetTypeRef => ({
  id: petTypeId(dto.id),
  name: dto.name,
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
