import { z } from 'zod';
import { isoDateSchema } from '~/shared/schemas/isoDate';
import { petId, visitId } from '~/types/ids';
import type { Visit } from '../types';

const idNumber = z.number().int().nonnegative();

export const visitDtoSchema = z.object({
  id: idNumber,
  petId: idNumber,
  date: isoDateSchema,
  description: z.string(),
});

export const toVisit = (dto: z.infer<typeof visitDtoSchema>): Visit => ({
  id: visitId(dto.id),
  petId: petId(dto.petId),
  date: dto.date,
  description: dto.description,
});
