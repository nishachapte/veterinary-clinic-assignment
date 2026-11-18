/**
 * TanStack Query bindings for owners.
 *
 * Because `GET /owners/{id}` nests pets and their visits, the desk runs on a
 * single query per conversation. Every mutation therefore reconciles exactly
 * one cache key, which is why no client-side store is needed.
 */

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import { apiMutateVoid, apiRequest } from '~/lib/apiClient';
import { qk } from '~/lib/queryKeys';
import type { OwnerId } from '~/types/ids';
import type { OwnerFieldsPayload } from '../schemas/ownerSchema';
import type { Owner } from '../types';
import { ownerDtoSchema, toOwner } from './ownerDto';

export interface OwnerRequestBody {
  firstName: string;
  lastName: string;
  address: string;
  city: string;
  telephone: string;
}

export const ownerBody = (v: OwnerFieldsPayload): OwnerRequestBody => ({
  firstName: v.firstName,
  lastName: v.lastName,
  address: v.address,
  city: v.city,
  telephone: v.telephone,
});

export const useOwner = (id: OwnerId | null): UseQueryResult<Owner> =>
  useQuery({
    queryKey: qk.owner(id),
    queryFn: ({ signal }) =>
      apiRequest(`/owners/${String(id)}`, ownerDtoSchema, { signal }).then(toOwner),
    enabled: id !== null,
  });

export const useCreateOwner = (): UseMutationResult<Owner, Error, OwnerFieldsPayload> => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (values) =>
      apiRequest('/owners', ownerDtoSchema, {
        method: 'POST',
        body: ownerBody(values),
      }).then(toOwner),
    onSuccess: async (owner) => {
      client.setQueryData(qk.owner(owner.id), owner);
      await client.invalidateQueries({ queryKey: qk.owners() });
    },
  });
};

export const useUpdateOwner = (
  id: OwnerId,
): UseMutationResult<void, Error, OwnerFieldsPayload> => {
  const client = useQueryClient();
  return useMutation({
    // The API answers 204 with no body, so the fresh owner must be refetched.
    mutationFn: (values) =>
      apiMutateVoid(`/owners/${String(id)}`, {
        method: 'PUT',
        body: ownerBody(values),
      }),
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: qk.owner(id) }),
        client.invalidateQueries({ queryKey: qk.owners() }),
      ]);
    },
  });
};
