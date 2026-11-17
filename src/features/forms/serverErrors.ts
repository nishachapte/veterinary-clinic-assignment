/**
 * Routes a failed mutation into a form.
 *
 * Field errors the form actually has go onto their inputs. Anything else — a
 * field the form does not render, or a message the server could not attribute
 * — is returned for display as a form-level banner. Nothing is dropped: a
 * silently swallowed error means the form refuses to submit while showing the
 * receptionist nothing.
 */

import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import { ApiError } from '~/api/client';
import { describeError } from '~/components/Feedback';

export const applyServerErrors = <T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  knownFields: readonly string[],
): readonly string[] => {
  if (!(error instanceof ApiError)) return [describeError(error)];

  const { fieldErrors, formErrors } = error.problem;
  const unroutable: string[] = [...formErrors];

  for (const [field, message] of Object.entries(fieldErrors)) {
    if (knownFields.includes(field)) {
      setError(field as Path<T>, { type: 'server', message });
    } else {
      // e.g. the server rejects `type` while the form shows a `typeId` select.
      unroutable.push(`${field}: ${message}`);
    }
  }

  // A rejection with nothing attributable still needs to say something.
  if (unroutable.length === 0 && Object.keys(fieldErrors).length === 0) {
    unroutable.push(error.problem.detail);
  }

  return unroutable;
};
