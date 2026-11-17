import { QueryClient } from '@tanstack/react-query';
import { ApiError } from '~/api/client';

/**
 * A 4xx will not succeed on retry, so retrying it only delays the error the
 * receptionist needs to see. Transport failures are worth one retry.
 */
export const createQueryClient = (): QueryClient =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: (failureCount, error) =>
          !(error instanceof ApiError) && failureCount < 1,
        staleTime: 10_000,
        refetchOnWindowFocus: false,
      },
      mutations: { retry: false },
    },
  });
