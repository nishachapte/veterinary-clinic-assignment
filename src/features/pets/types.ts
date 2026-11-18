import type { IsoDate, OwnerId, PetId, PetTypeId } from '~/types/ids';
import type { Visit } from '~/features/visits/types';

export interface PetTypeRef {
  readonly id: PetTypeId;
  readonly name: string;
}

export interface Pet {
  readonly id: PetId;
  readonly ownerId: OwnerId;
  readonly name: string;
  readonly birthDate: IsoDate;
  readonly type: PetTypeRef;
  /** Newest first — the order a receptionist reads history in. */
  readonly visits: readonly Visit[];
}
