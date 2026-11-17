import type { ReactNode } from 'react';
import { ApiError, ResponseShapeError, TransportError } from '~/api/client';
import styles from './Feedback.module.css';

export const EmptyState = ({ children }: { children: ReactNode }): React.JSX.Element => (
  <p className={styles.empty}>{children}</p>
);

export const Loading = ({ label }: { label: string }): React.JSX.Element => (
  <p className={styles.loading} role="status">
    {label}
  </p>
);

/**
 * Error copy is chosen by failure mode, because the receptionist's next action
 * differs: a rejected request needs correcting, an unreachable server needs
 * retrying, and an unreadable response is a defect to report.
 */
export const describeError = (error: unknown): string => {
  if (error instanceof TransportError)
    return 'The clinic system cannot be reached. Check the connection and try again.';
  if (error instanceof ResponseShapeError)
    return 'The clinic system returned data this app could not read. Please report this.';
  if (error instanceof ApiError) return error.problem.detail;
  return 'Something went wrong.';
};

interface ErrorNoticeProps {
  readonly error: unknown;
  readonly onRetry?: (() => void) | undefined;
  readonly extra?: readonly string[];
}

export const ErrorNotice = ({
  error,
  onRetry,
  extra = [],
}: ErrorNoticeProps): React.JSX.Element => (
  <div className={styles.error} role="alert">
    <p className={styles.errorText}>{describeError(error)}</p>
    {extra.map((m) => (
      <p className={styles.errorText} key={m}>
        {m}
      </p>
    ))}
    {onRetry !== undefined && (
      <button type="button" className={styles.retry} onClick={onRetry}>
        Try again
      </button>
    )}
  </div>
);
