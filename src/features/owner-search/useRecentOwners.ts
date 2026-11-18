/**
 * Customers call back, so the last few owners handled in this shift stay one
 * click away. Session-scoped on purpose: it is a convenience for the current
 * shift, not a record, and `sessionStorage` can legitimately be unavailable.
 */

import { useCallback, useState } from 'react';
import type { OwnerId } from '~/domain/ids';
import { ownerId as brandOwnerId } from '~/domain/ids';

const KEY = 'reception-desk.recent-owners';
const LIMIT = 5;

export interface RecentOwner {
  id: OwnerId;
  label: string;
}

const read = (): readonly RecentOwner[] => {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (raw === null) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((entry): RecentOwner[] => {
      if (typeof entry !== 'object' || entry === null) return [];
      const { id, label } = entry as { id?: unknown; label?: unknown };
      if (typeof id !== 'number' || typeof label !== 'string') return [];
      return [{ id: brandOwnerId(id), label }];
    });
  } catch {
    return [];
  }
};

export const useRecentOwners = (): {
  recent: readonly RecentOwner[];
  remember: (entry: RecentOwner) => void;
} => {
  const [recent, setRecent] = useState<readonly RecentOwner[]>(read);

  const remember = useCallback((entry: RecentOwner) => {
    setRecent((current) => {
      const next = [entry, ...current.filter((o) => o.id !== entry.id)].slice(0, LIMIT);
      try {
        sessionStorage.setItem(KEY, JSON.stringify(next));
      } catch {
        // Private browsing or blocked storage: the list simply does not persist.
      }
      return next;
    });
  }, []);

  return { recent, remember };
};
