/**
 * The wire format, and the mapping from it to the domain models.
 *
 * Responses are parsed, not cast. Anything that does not match the schema is
 * an error at the boundary rather than `undefined` three components deep.
 */

import { z } from 'zod';
import { ownerId } from '~/types/ids';
import { petDtoSchema, toPet } from '~/features/pets/api/petDto';
import type { Owner, OwnerPage } from '../types';

const idNumber = z.number().int().nonnegative();

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

export type OwnerDto = z.infer<typeof ownerDtoSchema>;

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
