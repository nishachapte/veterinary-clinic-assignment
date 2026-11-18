import type { OwnerId } from '~/types/ids';

/** `satisfies` keeps every key a readonly tuple without widening the returns. */
export const qk = {
  petTypes: () => ['petTypes'] as const,
  ownerSearch: (lastName: string, page: number, size: number) =>
    ['owners', { lastName, page, size }] as const,
  owner: (id: OwnerId | null) => ['owner', id] as const,
} satisfies Record<string, (...args: never[]) => readonly unknown[]>;

export const q = (params: Record<string, string | number>): string =>
  new URLSearchParams(
    Object.entries(params).map(([k, v]) => [k, String(v)]),
  ).toString();
