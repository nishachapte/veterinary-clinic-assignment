/**
 * The desk's selection lives in the URL, not in React state.
 *
 * It is held in SEARCH parameters (`/desk?q=&owner=&pet=`) rather than path
 * segments. Both are deep-linkable and refresh-safe, but search params keep the
 * desk on a SINGLE route, so switching owner or pet can never remount the
 * layout — which is what guarantees the three zones persist. A path hierarchy
 * would also imply pet is a sub-resource of owner in navigation terms, when in
 * this UI they are two independent selections.
 */

import { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ownerId, parseIdParam, petId } from '~/types/ids';
import type { OwnerId, PetId } from '~/types/ids';

export interface Selection {
  query: string;
  ownerId: OwnerId | null;
  petId: PetId | null;
}

export interface SelectionPatch {
  query?: string;
  ownerId?: OwnerId | null;
  petId?: PetId | null;
}

const PARAM = { query: 'q', owner: 'owner', pet: 'pet' } as const;

export const useSelection = (): {
  selection: Selection;
  select: (patch: SelectionPatch) => void;
} => {
  const [params, setParams] = useSearchParams();

  const selection = useMemo<Selection>(() => {
    const rawOwner = parseIdParam(params.get(PARAM.owner) ?? undefined);
    const rawPet = parseIdParam(params.get(PARAM.pet) ?? undefined);
    return {
      query: params.get(PARAM.query) ?? '',
      ownerId: rawOwner === null ? null : ownerId(rawOwner),
      petId: rawPet === null ? null : petId(rawPet),
    };
  }, [params]);

  const select = useCallback(
    (patch: SelectionPatch) => {
      setParams(
        (previous) => {
          const next = new URLSearchParams(previous);

          if (patch.query !== undefined) {
            if (patch.query === '') next.delete(PARAM.query);
            else next.set(PARAM.query, patch.query);
          }

          if (patch.ownerId !== undefined) {
            if (patch.ownerId === null) {
              next.delete(PARAM.owner);
              next.delete(PARAM.pet);
            } else {
              // Changing owner invalidates the pet selection: a pet id is only
              // meaningful within its owner.
              if (next.get(PARAM.owner) !== String(patch.ownerId)) {
                next.delete(PARAM.pet);
              }
              next.set(PARAM.owner, String(patch.ownerId));
            }
          }

          if (patch.petId !== undefined) {
            if (patch.petId === null) next.delete(PARAM.pet);
            else next.set(PARAM.pet, String(patch.petId));
          }

          return next;
        },
        { replace: patch.query !== undefined && patch.ownerId === undefined },
      );
    },
    [setParams],
  );

  return { selection, select };
};
