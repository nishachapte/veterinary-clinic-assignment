import { useMutation, useQueryClient, type UseMutationResult } from '@tanstack/react-query';
import { apiRequest } from '~/lib/apiClient';
import { qk } from '~/lib/queryKeys';
import { withVisit, type Owner } from '~/features/owners/types';
import type { OwnerId, PetId } from '~/types/ids';
import type { VisitFieldsPayload } from '../schemas/visitSchema';
import type { Visit } from '../types';
import { toVisit, visitDtoSchema } from './visitDto';

export interface VisitRequestBody {
  date: string;
  description: string;
}

export const visitBody = (v: VisitFieldsPayload): VisitRequestBody => ({
  date: v.date,
  description: v.description,
});

/**
 * Creating a visit is the one write where the API returns the created entity
 * WITH its id (finding C2), so the result is written straight into the cache
 * instead of triggering a refetch.
 */
export const useCreateVisit = (
  owner: OwnerId,
  pet: PetId,
): UseMutationResult<Visit, Error, VisitFieldsPayload> => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (values) =>
      apiRequest(
        `/owners/${String(owner)}/pets/${String(pet)}/visits`,
        visitDtoSchema,
        { method: 'POST', body: visitBody(values) },
      ).then(toVisit),
    onSuccess: (visit) => {
      client.setQueryData<Owner>(qk.owner(owner), (current) =>
        current === undefined ? current : withVisit(current, visit),
      );
    },
  });
};
