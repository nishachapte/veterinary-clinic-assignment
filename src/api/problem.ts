/**
 * Turning a server error response into something a form can render.
 *
 * The contract (`ValidationMessage` in openapi.yml) declares exactly ONE
 * required property — `message` — with `additionalProperties: true`. The
 * running server actually sends more:
 *
 *   { "message": "Field 'lastName' must not be null (rejected value: null)",
 *     "field": "lastName",
 *     "defaultMessage": "must not be null",
 *     "rejectedValue": "null" }
 *
 * So `field` and `defaultMessage` exist but are UNDOCUMENTED, which means they
 * work today and are not guaranteed tomorrow. Both routes to a field name must
 * therefore be supported. See docs/ai/01-api-findings.md, finding A1.
 */

import { z } from 'zod';

const validationMessageSchema = z
  .object({
    message: z.string(),
    /** Undocumented but present on the running server. */
    field: z.string().optional(),
    /** Undocumented. The message without the "Field 'x'" prefix. */
    defaultMessage: z.string().optional(),
    /** Undocumented. Arrives as the STRING "null", not JSON null (finding A3). */
    rejectedValue: z.unknown().optional(),
  })
  .passthrough();

const problemDetailSchema = z
  .object({
    status: z.number().optional(),
    title: z.string().optional(),
    detail: z.string().optional(),
    schemaValidationErrors: z.array(validationMessageSchema).optional(),
  })
  .passthrough();

export type ValidationMessage = z.infer<typeof validationMessageSchema>;

export interface FieldErrorMap {
  /** Field name -> message, ready for react-hook-form's `setError`. */
  readonly fieldErrors: Readonly<Record<string, string>>;
  /** Messages that could not be attributed to any field. */
  readonly formErrors: readonly string[];
}

export interface ApiProblem extends FieldErrorMap {
  readonly status: number;
  readonly title: string;
  readonly detail: string;
}

/**
 * Pulls a field name out of the prose message. The server has used two shapes:
 *   "Field 'lastName' must not be null (rejected value: null)"
 *   "[Path '/lastName'] Instance type (null) does not match ..."
 * Returns null when neither matches.
 */
export const fieldNameFromMessage = (message: string): string | null => {
  const quoted = /Field '([^']+)'/.exec(message);
  if (quoted?.[1] !== undefined) return quoted[1];
  const pointer = /\[Path '\/([^']+)'\]/.exec(message);
  if (pointer?.[1] !== undefined) return pointer[1];
  return null;
};

/**
 * Policy for turning the server's validation messages into field-level errors.
 *
 * Decided behaviour:
 *  - Field name: the undocumented structured `field` is tried first, falling
 *    back to parsing the server's prose. The undocumented path is the fast
 *    path and the contract-guaranteed one is the safety net, which is the
 *    right way round here: `field` is exact, while the prose shape is what
 *    survives a backend version change.
 *  - Display text: `defaultMessage` ("must not be null") is preferred over
 *    `message`, which repeats the field name and the rejected value and reads
 *    badly directly beneath a labelled input.
 *  - First error per field wins, so a field with several violations shows one
 *    stable message rather than flickering between them.
 *  - Anything unattributable goes to `formErrors`, so no error can vanish and
 *    leave the form rejecting a submission silently.
 */
export const toFieldErrors = (
  errors: readonly ValidationMessage[]
): FieldErrorMap => {
  const fieldErrors: Record<string, string> = {};
  const formErrors: string[] = [];

  for (const entry of errors) {
    const field =
      entry.field?.trim() || fieldNameFromMessage(entry.message);

    if (!field) {
      formErrors.push(entry.message);
      continue;
    }

    const message =
      entry.defaultMessage?.trim() || entry.message;

    // Preserve the first error for each field.
    if (!fieldErrors[field]) {
      fieldErrors[field] = message;
    }
  }

  return { fieldErrors, formErrors };
};

/** Parses any error response body into a shape the UI can rely on. */
export const parseProblemDetail = (status: number, body: unknown): ApiProblem => {
  const parsed = problemDetailSchema.safeParse(body);

  if (!parsed.success) {
    return {
      status,
      title: 'Unexpected error',
      detail: 'The clinic system returned a response this application cannot read.',
      fieldErrors: {},
      formErrors: [],
    };
  }

  const { data } = parsed;
  const { fieldErrors, formErrors } = toFieldErrors(data.schemaValidationErrors ?? []);

  return {
    status: data.status ?? status,
    // `title` leaks the Java exception class name (finding A2), so it is kept
    // for diagnostics but never shown to a receptionist as-is.
    title: data.title ?? 'Error',
    detail: data.detail ?? 'The request could not be completed.',
    fieldErrors,
    formErrors,
  };
};

export const isApiProblem = (value: unknown): value is ApiProblem =>
  typeof value === 'object' &&
  value !== null &&
  'status' in value &&
  'fieldErrors' in value;
