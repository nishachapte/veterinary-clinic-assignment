import { describe, expect, it } from 'vitest';
import { fieldNameFromMessage, parseProblemDetail, toFieldErrors } from './apiError';

/**
 * Fixtures are copied verbatim from the running server (see
 * docs/ai/01-api-findings.md). They are the contract this module actually has
 * to survive, including the parts openapi.yml never declares.
 */

const missingLastName = {
  detail: 'The request contains invalid or missing parameters',
  instance: '/petclinic/api/owners',
  status: 400,
  title: 'MethodArgumentNotValidException',
  timestamp: '2026-11-17T09:28:54.511806050Z',
  schemaValidationErrors: [
    {
      message: "Field 'lastName' must not be null (rejected value: null)",
      field: 'lastName',
      defaultMessage: 'must not be null',
      rejectedValue: 'null',
    },
  ],
};

const futureBirthDate = {
  detail: 'The request contains invalid or missing parameters',
  status: 400,
  title: 'MethodArgumentNotValidException',
  schemaValidationErrors: [
    {
      message:
        "Field 'birthDate' Birth date cannot be in the future (rejected value: 2030-01-01)",
      field: 'birthDate',
      defaultMessage: 'Birth date cannot be in the future',
      rejectedValue: '2030-01-01',
    },
  ],
};

/** The shape openapi.yml actually promises: `message` only. */
const specShapedOnly = {
  status: 400,
  title: 'ConstraintViolation',
  detail: 'Validation failed',
  schemaValidationErrors: [
    {
      message:
        "[Path '/lastName'] Instance type (null) does not match any allowed primitive type (allowed: ['string'])",
    },
  ],
};

describe('fieldNameFromMessage', () => {
  it("reads the \"Field 'x'\" form the server actually sends", () => {
    expect(fieldNameFromMessage("Field 'lastName' must not be null")).toBe('lastName');
  });

  it("reads the \"[Path '/x']\" form the spec's example shows", () => {
    expect(fieldNameFromMessage("[Path '/telephone'] does not match")).toBe('telephone');
  });

  it('returns null when neither shape is present', () => {
    expect(fieldNameFromMessage('Something went wrong')).toBeNull();
  });
});

describe('toFieldErrors', () => {
  it('prefers the structured field and the clean defaultMessage', () => {
    const { fieldErrors, formErrors } = toFieldErrors(
      missingLastName.schemaValidationErrors,
    );
    expect(fieldErrors).toEqual({ lastName: 'must not be null' });
    expect(formErrors).toEqual([]);
  });

  it('falls back to prose when the undocumented fields are absent', () => {
    const { fieldErrors, formErrors } = toFieldErrors(
      specShapedOnly.schemaValidationErrors,
    );
    expect(Object.keys(fieldErrors)).toEqual(['lastName']);
    expect(formErrors).toEqual([]);
  });

  it('sends unattributable messages to formErrors rather than dropping them', () => {
    const { fieldErrors, formErrors } = toFieldErrors([
      { message: 'Database temporarily unavailable' },
    ]);
    expect(fieldErrors).toEqual({});
    expect(formErrors).toEqual(['Database temporarily unavailable']);
  });

  it('keeps the first error when a field has several', () => {
    const { fieldErrors } = toFieldErrors([
      { message: "Field 'lastName' x", field: 'lastName', defaultMessage: 'first' },
      { message: "Field 'lastName' y", field: 'lastName', defaultMessage: 'second' },
    ]);
    expect(fieldErrors.lastName).toBe('first');
  });

  it('ignores a blank structured field and uses the prose instead', () => {
    const { fieldErrors } = toFieldErrors([
      { message: "Field 'city' must not be blank", field: '   ' },
    ]);
    expect(Object.keys(fieldErrors)).toEqual(['city']);
  });

  it('handles an empty list', () => {
    expect(toFieldErrors([])).toEqual({ fieldErrors: {}, formErrors: [] });
  });
});

describe('parseProblemDetail', () => {
  it('maps a real validation failure onto its field', () => {
    const problem = parseProblemDetail(400, missingLastName);
    expect(problem.status).toBe(400);
    expect(problem.fieldErrors).toEqual({ lastName: 'must not be null' });
    expect(problem.detail).toBe('The request contains invalid or missing parameters');
  });

  it('surfaces the probed birth-date rule as a field error', () => {
    const problem = parseProblemDetail(400, futureBirthDate);
    expect(problem.fieldErrors.birthDate).toBe('Birth date cannot be in the future');
  });

  it('keeps the leaked Java class name available for diagnostics only', () => {
    // finding A2: `title` is an implementation detail, never shown as-is.
    expect(parseProblemDetail(400, missingLastName).title).toBe(
      'MethodArgumentNotValidException',
    );
  });

  it('degrades safely on a body it cannot read', () => {
    for (const body of ['not json at all', null, 42, []]) {
      const problem = parseProblemDetail(500, body);
      expect(problem.status).toBe(500);
      expect(problem.fieldErrors).toEqual({});
    }
  });

  it('falls back to the transport status when the body omits one', () => {
    expect(parseProblemDetail(503, { detail: 'down' }).status).toBe(503);
  });
});
