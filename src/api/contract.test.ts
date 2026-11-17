// @vitest-environment node
//
// Runs in the node environment, not jsdom. jsdom installs its OWN global
// `AbortSignal`, while `fetch` is Node's undici, which rejects a signal that
// is not an instance of its own class ("Expected signal to be an instance of
// AbortSignal"). The probe below silently caught that and skipped every test.
// These tests touch no DOM, so the node environment is both correct and faster.

/**
 * Contract test.
 *
 * The wire schemas in dto.ts are hand-written, so the risk is that they drift
 * from the real server. This suite parses actual responses with the real
 * schemas: it fails if the backend changes shape, which unit tests with
 * handwritten fixtures never would.
 *
 * It is skipped automatically when the backend is not running, so `npm test`
 * stays green without Docker.
 */

import { beforeAll, describe, expect, it } from 'vitest';
import {
  ownerDtoSchema,
  ownerPageDtoSchema,
  petTypeListDtoSchema,
  toOwner,
  toOwnerPage,
} from './dto';

const BASE = 'http://localhost:9966/petclinic/api';

let reachable = false;

beforeAll(async () => {
  try {
    const res = await fetch(`${BASE}/pettypes`, {
      signal: AbortSignal.timeout(2000),
    });
    reachable = res.ok;
  } catch {
    reachable = false;
  }
});

const liveIt = (name: string, fn: () => Promise<void>) => { it(name, async (ctx) => {
    if (!reachable) ctx.skip();
    await fn();
  }); };

describe('live API contract', () => {
  liveIt('GET /pettypes matches petTypeListDtoSchema', async () => {
    const body: unknown = await fetch(`${BASE}/pettypes`).then((r) => r.json());
    const parsed = petTypeListDtoSchema.safeParse(body);
    expect(parsed.error?.issues ?? []).toEqual([]);
    expect(parsed.success && parsed.data.length).toBeGreaterThan(0);
  });

  liveIt('GET /owners/{id} matches ownerDtoSchema and maps cleanly', async () => {
    const body: unknown = await fetch(`${BASE}/owners/1`).then((r) => r.json());
    const parsed = ownerDtoSchema.safeParse(body);
    expect(parsed.error?.issues ?? []).toEqual([]);
    if (!parsed.success) return;

    const owner = toOwner(parsed.data);
    expect(owner.id).toBeGreaterThan(0);
    expect(owner.pets.length).toBeGreaterThan(0);

    // The mapper must supply ownerId even though the API omits it on nested pets.
    for (const pet of owner.pets) {
      expect(pet.ownerId).toBe(owner.id);
    }

    // Visit history must arrive newest-first.
    for (const pet of owner.pets) {
      const dates = pet.visits.map((v) => v.date);
      expect([...dates].sort((a, b) => (a < b ? 1 : -1))).toEqual(dates);
    }
  });

  liveIt('GET /v2/owners matches ownerPageDtoSchema', async () => {
    const body: unknown = await fetch(`${BASE}/v2/owners?page=0&size=3`).then((r) =>
      r.json(),
    );
    const parsed = ownerPageDtoSchema.safeParse(body);
    expect(parsed.error?.issues ?? []).toEqual([]);
    if (!parsed.success) return;

    const page = toOwnerPage(parsed.data);
    expect(page.size).toBe(3);
    expect(page.content.length).toBeLessThanOrEqual(3);
    expect(page.totalElements).toBeGreaterThanOrEqual(page.content.length);
  });

  liveIt('nested pets carry ownerId at runtime, though the spec does not require it', async () => {
    const body = (await fetch(`${BASE}/owners/1`).then((r) => r.json())) as {
      pets?: { ownerId?: number }[];
    };
    const first = body.pets?.[0];
    expect(first).toBeDefined();

    // `Pet.ownerId` is absent from the spec's `required` list, so a conforming
    // server may omit it. This one sends it. The schema keeps it optional and
    // the mapper supplies it from the parent owner regardless: coding to the
    // contract rather than to this server's generosity.
    expect(first?.ownerId).toBe(1);
  });
});
