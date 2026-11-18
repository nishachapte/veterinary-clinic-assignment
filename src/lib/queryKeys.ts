import type { OwnerId } from '~/types/ids';

/**
 * One hierarchy, so a broad invalidation reaches the narrow queries beneath it.
 *
 * Everything owner-shaped sits under `['owners']`: the search lookup and each
 * loaded owner. That is what lets a mutation say "owners changed" once and
 * have both the detail panel and the result list on the left refresh. Keeping
 * the lookup on a SEPARATE root is how it previously went stale — the
 * invalidation named a key nothing was subscribed to.
 *
 * `satisfies` keeps every key a readonly tuple without widening the returns.
 */
export const qk = {
  petTypes: () => ['petTypes'] as const,
  /** Everything owner-shaped; invalidating this reaches the two below. */
  owners: () => ['owners'] as const,
  ownerLookup: (query: string) => ['owners', 'lookup', query] as const,
  owner: (id: OwnerId | null) => ['owners', 'detail', id] as const,
} satisfies Record<string, (...args: never[]) => readonly unknown[]>;
