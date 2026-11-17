import type { ReactNode, SyntheticEvent } from 'react';
import styles from './FormShell.module.css';

interface FormShellProps {
  // React 19's types deprecate FormEvent/FormEventHandler; SyntheticEvent is
  // the supported shape, and it is what RHF's handleSubmit accepts.
  readonly onSubmit: (event: SyntheticEvent<HTMLFormElement>) => void;
  readonly onCancel: () => void;
  readonly submitLabel: string;
  readonly pending: boolean;
  readonly formErrors: readonly string[];
  readonly children: ReactNode;
}

export const FormShell = ({
  onSubmit,
  onCancel,
  submitLabel,
  pending,
  formErrors,
  children,
}: FormShellProps): React.JSX.Element => (
  <form onSubmit={onSubmit} noValidate>
    {formErrors.length > 0 && (
      <div className={styles.banner} role="alert">
        {formErrors.map((message) => (
          <p key={message} className={styles.bannerText}>
            {message}
          </p>
        ))}
      </div>
    )}

    {children}

    <div className={styles.actions}>
      <button type="submit" className={styles.primary} disabled={pending}>
        {pending ? 'Saving…' : submitLabel}
      </button>
      <button type="button" className={styles.secondary} onClick={onCancel}>
        Cancel
      </button>
    </div>
  </form>
);
