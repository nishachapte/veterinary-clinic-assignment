import type { IsoDate, PetId, VisitId } from '~/types/ids';

export interface Visit {
  readonly id: VisitId;
  readonly petId: PetId;
  readonly date: IsoDate;
  readonly description: string;
}
