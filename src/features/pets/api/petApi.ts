import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import { apiMutateVoid, apiRequest } from '~/lib/apiClient';
import { qk } from '~/lib/queryKeys';
import type { OwnerId, PetId } from '~/types/ids';
import type { PetFieldsPayload } from '../schemas/petSchema';
import type { PetTypeRef } from '../types';
import { petTypeListDtoSchema, toPetTypeRef } from './petDto';

/**
 * `PetFields.type` is a full `PetType` object rather than a `typeId`
 * (docs/ai/01-api-findings.md), so creating a pet needs the loaded pet-type
 * list to turn the selected id back into `{ id, name }`.
 */
export interface PetRequestBody {
  name: string;
  birthDate: string;
  type: { id: number; name: string };
}

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

export const usePetTypes = (): UseQueryResult<readonly PetTypeRef[]> =>
  useQuery({
    queryKey: qk.petTypes(),
    queryFn: () =>
      apiRequest('/pettypes', petTypeListDtoSchema).then((list) =>
        list.map(toPetTypeRef).sort((a, b) => a.name.localeCompare(b.name)),
      ),
    staleTime: 60 * 60 * 1000, // species do not change during a shift
  });

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
