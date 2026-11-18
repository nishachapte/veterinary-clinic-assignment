import type { ReactNode } from 'react';
import { ApiError, ResponseShapeError, TransportError } from '~/lib/apiClient';
import styles from './Feedback.module.css';

export const EmptyState = ({ children }: { children: ReactNode }) => (
  <p className={styles.empty}>{children}</p>
);

export const Loading = ({ label }: { label: string }) => (
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
  error: unknown;
  onRetry?: (() => void) | undefined;
  extra?: readonly string[];
}

export const ErrorNotice = ({
  error,
  onRetry,
  extra = [],
}: ErrorNoticeProps) => (
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
