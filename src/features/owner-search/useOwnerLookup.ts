/**
 * Bounded lookup.
 *
 * A naive client filter over page 1 reports "no results" for an owner sitting
 * on page 3 — the UI claiming absence when it only means "I did not look".
 * So this scans up to MAX_PAGES and reports exactly how much it saw, letting
 * the UI tell the truth about its own scope.
 */

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { apiRequest } from '~/api/client';
import { ownerPageDtoSchema, toOwnerPage } from '~/api/dto';
import type { Owner } from '~/domain/models';
import { looksNumeric, matchesOwner } from './matching';

export const PAGE_SIZE = 20;
export const MAX_PAGES = 5;
export const SCAN_LIMIT = PAGE_SIZE * MAX_PAGES;

export interface LookupResult {
  readonly matches: readonly Owner[];
  /** How many records were actually examined. */
  readonly scanned: number;
  /** How many exist on the server for this filter. */
  readonly totalElements: number;
  /** True when records exist beyond the scan window. */
  readonly truncated: boolean;
  /** True when the query was narrowed by the server's lastName filter. */
  readonly serverFiltered: boolean;
}

const fetchPage = (lastName: string, page: number, signal: AbortSignal) =>
  apiRequest(
    `/v2/owners?${new URLSearchParams({
      lastName,
      page: String(page),
      size: String(PAGE_SIZE),
    }).toString()}`,
    ownerPageDtoSchema,
    { signal },
  ).then(toOwnerPage);

interface Scan {
  readonly owners: readonly Owner[];
  readonly totalElements: number;
  readonly totalPages: number;
}

const scan = async (lastName: string, signal: AbortSignal): Promise<Scan> => {
  const owners: Owner[] = [];
  let totalElements = 0;
  let totalPages = 1;

  for (let page = 0; page < MAX_PAGES; page += 1) {
    const result = await fetchPage(lastName, page, signal);
    owners.push(...result.content);
    totalElements = result.totalElements;
    totalPages = result.totalPages;
    if (page + 1 >= result.totalPages) break;
  }

  return { owners, totalElements, totalPages };
};

/**
 * The server's `lastName` filter is a CASE-SENSITIVE prefix match (finding
 * B1a), so sending what the receptionist typed returns nothing unless the
 * capitalisation happens to match. Only the first character, upper-cased, is
 * sent: enough to narrow the set server-side, robust to any casing after it.
 */
const initialFilter = (query: string): string => {
  const first = query.trim().charAt(0);
  return first === '' ? '' : first.toUpperCase();
};

const lookup = async (query: string, signal: AbortSignal): Promise<LookupResult> => {
  const trimmed = query.trim();
  // A phone-shaped query is useless as a lastName filter, so it is not sent.
  const canFilter = trimmed !== '' && !looksNumeric(trimmed);

  let result = await scan(canFilter ? initialFilter(trimmed) : '', signal);
  let matches = result.owners.filter((owner) => matchesOwner(owner, trimmed));
  let serverFiltered = canFilter;

  // The initial-letter filter still misses a surname stored in lower case, so
  // an empty result falls back to an unfiltered scan before giving up.
  if (matches.length === 0 && canFilter) {
    result = await scan('', signal);
    matches = result.owners.filter((owner) => matchesOwner(owner, trimmed));
    serverFiltered = false;
  }

  return {
    matches,
    scanned: result.owners.length,
    totalElements: result.totalElements,
    truncated: result.totalPages > MAX_PAGES,
    serverFiltered,
  };
};

export const useOwnerLookup = (query: string): UseQueryResult<LookupResult> =>
  useQuery({
    queryKey: ['ownerLookup', query.trim()] as const,
    queryFn: ({ signal }) => lookup(query, signal),
    enabled: query.trim().length > 0,
    placeholderData: (previous) => previous,
  });
