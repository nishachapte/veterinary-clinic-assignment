import type { ReactNode } from 'react';
import type { UseQueryResult } from '@tanstack/react-query';
import { ErrorNotice, Loading } from './Feedback';

/**
 * "The data this panel needs is not here yet" — decided in one place.
 *
 * Three panels needed the same three-way branch (failed / still loading /
 * ready) and each spelled it out as a nested ternary inside its JSX. Those
 * ternaries were why a reader had to hold three states in their head to find
 * the one line that actually rendered the form.
 */
interface QueryGateProps<T> {
  query: UseQueryResult<T>;
  loadingLabel: string;
  /** Extra lines on the error notice: why this data is required here. */
  errorExtra?: readonly string[] | undefined;
  /** Rendered only once the data has arrived, so it never sees `undefined`. */
  children: (data: T) => ReactNode;
}

export const QueryGate = <T,>({
  query,
  loadingLabel,
  errorExtra = [],
  children,
}: QueryGateProps<T>) => {
  if (query.isError) {
    // `refetch` returns a promise nobody awaits, hence the explicit `void`.
    return (
      <ErrorNotice
        error={query.error}
        extra={errorExtra}
        onRetry={() => {
          void query.refetch();
        }}
      />
    );
  }

  if (query.isLoading || query.data === undefined) {
    return <Loading label={loadingLabel} />;
  }

  return <>{children(query.data)}</>;
};