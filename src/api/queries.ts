/**
 * TanStack Query bindings.
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
import { apiMutateVoid, apiRequest } from './client';
import {
  ownerDtoSchema,
  ownerPageDtoSchema,
  petTypeListDtoSchema,
  toOwner,
  toOwnerPage,
  toPetTypeRef,
  toVisit,
  visitDtoSchema,
} from './dto';
import { ownerBody, petBody, visitBody } from './payloads';
import { withVisit, type Owner, type OwnerPage, type PetTypeRef, type Visit } from '~/domain/models';
import type { OwnerId, PetId } from '~/domain/ids';
import type {
  OwnerFieldsPayload,
  PetFieldsPayload,
  VisitFieldsPayload,
} from '~/domain/schemas';

/** `satisfies` keeps every key a readonly tuple without widening the returns. */
export const qk = {
  petTypes: () => ['petTypes'] as const,
  ownerSearch: (lastName: string, page: number, size: number) =>
    ['owners', { lastName, page, size }] as const,
  owner: (id: OwnerId | null) => ['owner', id] as const,
} satisfies Record<string, (...args: never[]) => readonly unknown[]>;

const q = (params: Record<string, string | number>): string =>
  new URLSearchParams(
    Object.entries(params).map(([k, v]) => [k, String(v)]),
  ).toString();

export const usePetTypes = (): UseQueryResult<readonly PetTypeRef[]> =>
  useQuery({
    queryKey: qk.petTypes(),
    queryFn: () =>
      apiRequest('/pettypes', petTypeListDtoSchema).then((list) =>
        list.map(toPetTypeRef).sort((a, b) => a.name.localeCompare(b.name)),
      ),
    staleTime: 60 * 60 * 1000, // species do not change during a shift
  });

export const useOwnerSearch = (
  lastName: string,
  page: number,
  size: number,
  enabled: boolean,
): UseQueryResult<OwnerPage> =>
  useQuery({
    queryKey: qk.ownerSearch(lastName, page, size),
    queryFn: ({ signal }) =>
      apiRequest(`/v2/owners?${q({ lastName, page, size })}`, ownerPageDtoSchema, {
        signal,
      }).then(toOwnerPage),
    enabled,
    placeholderData: (previous) => previous, // keep results visible while retyping
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
      await client.invalidateQueries({ queryKey: ['owners'] });
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
        client.invalidateQueries({ queryKey: ['owners'] }),
      ]);
    },
  });
};

export const useCreatePet = (
  id: OwnerId,
  types: readonly PetTypeRef[],
): UseMutationResult<void, Error, PetFieldsPayload> => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (values) =>
      apiMutateVoid(`/owners/${String(id)}/pets`, {
        method: 'POST',
        body: petBody(values, types),
      }),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: qk.owner(id) });
    },
  });
};

export const useUpdatePet = (
  owner: OwnerId,
  pet: PetId,
  types: readonly PetTypeRef[],
): UseMutationResult<void, Error, PetFieldsPayload> => {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (values) =>
      apiMutateVoid(`/owners/${String(owner)}/pets/${String(pet)}`, {
        method: 'PUT',
        body: petBody(values, types),
      }),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: qk.owner(owner) });
    },
  });
};

/**
 * Creating a visit is the one write where the API returns the created entity
 * WITH its id (finding C2), so the result is written straight into the cache
 * instead of triggering a refetch. The provisional row the receptionist sees
 * while this is in flight is rendered from the mutation's own `variables`, so
 * no placeholder id is ever invented and no rollback is needed.
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
