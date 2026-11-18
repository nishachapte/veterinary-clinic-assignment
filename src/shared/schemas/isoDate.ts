import { z } from 'zod';
import { isIsoDate } from '~/shared/utils/date';
import type { IsoDate } from '~/types/ids';

// The canonical note on this schema; its regression tests point here rather
// than restating it.
//
// `isIsoDate` is a type predicate, and a type-predicate `superRefine` narrows
// the output type exactly as `.refine` does, so the IsoDate brand still
// arrives without a cast.
//
// `fatal: true` is the point of it. A check that merely FAILS leaves the parse
// "dirty", so Zod still runs the refinements chained below — on the value that
// just failed — and `birthDate` chains `isOlderThanMaxPetAge`, which throws on
// a non-ISO string. That throw escaped `safeParse` entirely, so the pet form
// refused to submit while showing nothing at all. Aborting protects every
// later refinement automatically, at any depth. It must be `superRefine`:
// `fatal` is absent from `.refine`'s published types, and typed only on
// `addIssue`.
export const isoDateSchema = z
  .string()
  .superRefine((value, ctx): value is IsoDate => {
    if (isIsoDate(value)) return true;
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Use the format YYYY-MM-DD',
      fatal: true,
    });
    return false;
  });
