import { forwardRef, useId } from 'react';
import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react';
import styles from './Field.module.css';

interface Wrapper {
  readonly label: string;
  readonly error?: string | undefined;
  readonly hint?: string | undefined;
}

type TextFieldProps = Wrapper & InputHTMLAttributes<HTMLInputElement>;
type SelectFieldProps = Wrapper & SelectHTMLAttributes<HTMLSelectElement>;
type TextAreaFieldProps = Wrapper & TextareaHTMLAttributes<HTMLTextAreaElement>;

/**
 * `aria-describedby` points at the error when there is one and the hint
 * otherwise, so a screen reader announces the correction rather than the
 * original instruction once a field is rejected.
 */
const describedBy = (
  errorId: string,
  hintId: string,
  error: string | undefined,
  hint: string | undefined,
): string | undefined => {
  if (error !== undefined) return errorId;
  if (hint !== undefined) return hintId;
  return undefined;
};

const Shell = ({
  id,
  label,
  error,
  hint,
  errorId,
  hintId,
  children,
}: Wrapper & {
  readonly id: string;
  readonly errorId: string;
  readonly hintId: string;
  readonly children: ReactNode;
}): React.JSX.Element => (
  <div className={styles.field}>
    <label className={styles.label} htmlFor={id}>
      {label}
    </label>
    {children}
    {error !== undefined ? (
      <p className={styles.error} id={errorId} role="alert">
        {error}
      </p>
    ) : (
      hint !== undefined && (
        <p className={styles.hint} id={hintId}>
          {hint}
        </p>
      )
    )}
  </div>
);

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
  ({ label, error, hint, ...rest }, ref) => {
    const id = useId();
    const errorId = `${id}-error`;
    const hintId = `${id}-hint`;
    return (
      <Shell
        id={id}
        label={label}
        error={error}
        hint={hint}
        errorId={errorId}
        hintId={hintId}
      >
        <input
          {...rest}
          id={id}
          ref={ref}
          aria-invalid={error !== undefined}
          aria-describedby={describedBy(errorId, hintId, error, hint)}
        />
      </Shell>
    );
  },
);
TextField.displayName = 'TextField';

export const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(
  ({ label, error, hint, children, ...rest }, ref) => {
    const id = useId();
    const errorId = `${id}-error`;
    const hintId = `${id}-hint`;
    return (
      <Shell
        id={id}
        label={label}
        error={error}
        hint={hint}
        errorId={errorId}
        hintId={hintId}
      >
        <select
          {...rest}
          id={id}
          ref={ref}
          aria-invalid={error !== undefined}
          aria-describedby={describedBy(errorId, hintId, error, hint)}
        >
          {children}
        </select>
      </Shell>
    );
  },
);
SelectField.displayName = 'SelectField';

export const TextAreaField = forwardRef<HTMLTextAreaElement, TextAreaFieldProps>(
  ({ label, error, hint, ...rest }, ref) => {
    const id = useId();
    const errorId = `${id}-error`;
    const hintId = `${id}-hint`;
    return (
      <Shell
        id={id}
        label={label}
        error={error}
        hint={hint}
        errorId={errorId}
        hintId={hintId}
      >
        <textarea
          {...rest}
          id={id}
          ref={ref}
          rows={3}
          aria-invalid={error !== undefined}
          aria-describedby={describedBy(errorId, hintId, error, hint)}
        />
      </Shell>
    );
  },
);
TextAreaField.displayName = 'TextAreaField';
