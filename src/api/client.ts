/**
 * The HTTP boundary. Knows nothing about React.
 *
 * Three distinct failure modes are modelled separately, because the UI reacts
 * to them differently: the server rejected the request (ApiError, has field
 * errors), the server could not be reached (TransportError, offer retry), or
 * the server answered something we cannot read (ResponseShapeError, a bug or a
 * backend version mismatch).
 */

import type { z } from 'zod';
import { parseProblemDetail, type ApiProblem } from './problem';

const BASE_URL: string = import.meta.env.VITE_API_BASE_URL ?? '/api';

export class ApiError extends Error {
  readonly problem: ApiProblem;

  constructor(problem: ApiProblem) {
    super(problem.detail);
    this.name = 'ApiError';
    this.problem = problem;
  }
}

export class TransportError extends Error {
  constructor(cause: unknown) {
    super('The clinic system could not be reached.');
    this.name = 'TransportError';
    this.cause = cause;
  }
}

export class ResponseShapeError extends Error {
  constructor(readonly issues: z.ZodIssue[]) {
    super('The clinic system returned data in an unexpected shape.');
    this.name = 'ResponseShapeError';
  }
}

export const isApiError = (e: unknown): e is ApiError => e instanceof ApiError;

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

interface RequestInit_ {
  readonly method?: HttpMethod;
  readonly body?: unknown;
  readonly signal?: AbortSignal | undefined;
}

async function send(path: string, init: RequestInit_): Promise<Response> {
  const hasBody = init.body !== undefined;
  try {
    return await fetch(`${BASE_URL}${path}`, {
      method: init.method ?? 'GET',
      headers: hasBody ? { 'Content-Type': 'application/json' } : {},
      body: hasBody ? JSON.stringify(init.body) : null,
      signal: init.signal ?? null,
    });
  } catch (cause) {
    // An aborted request is a cancellation, not a failure; let it propagate so
    // TanStack Query treats it as such.
    if (cause instanceof DOMException && cause.name === 'AbortError') throw cause;
    throw new TransportError(cause);
  }
}

/** Reads an error body defensively: it may be JSON, HTML, or empty. */
async function readErrorBody(res: Response): Promise<unknown> {
  const text = await res.text().catch(() => '');
  if (text === '') return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

async function failFor(res: Response): Promise<never> {
  throw new ApiError(parseProblemDetail(res.status, await readErrorBody(res)));
}

/**
 * A request whose response body matters.
 *
 * The schema is typed `ZodType<T, ZodTypeDef, unknown>` rather than
 * `ZodType<T>`. `ZodType` is generic over BOTH output and input, and its
 * single-argument form sets input = output, so a schema containing
 * `.default()` or a narrowing `.refine()` (where the two genuinely differ)
 * makes TypeScript infer T as the INPUT type. The response would then be typed
 * as the raw wire shape — `birthDate: string`, `pets` possibly undefined —
 * silently losing every brand the parse just established. Pinning input to
 * `unknown` forces inference through the output position only.
 */
export async function apiRequest<T>(
  path: string,
  schema: z.ZodType<T, z.ZodTypeDef, unknown>,
  init: RequestInit_ = {},
): Promise<T> {
  const res = await send(path, init);
  if (!res.ok) await failFor(res);

  const raw: unknown = await res.json().catch(() => null);
  const parsed = schema.safeParse(raw);
  if (!parsed.success) throw new ResponseShapeError(parsed.error.issues);
  return parsed.data;
}

/** A request whose response body is irrelevant — the API returns 204 on PUT. */
export async function apiMutateVoid(
  path: string,
  init: RequestInit_,
): Promise<void> {
  const res = await send(path, init);
  if (!res.ok) await failFor(res);
}
