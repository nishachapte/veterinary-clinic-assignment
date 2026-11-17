import type { ReactNode } from 'react';
import styles from './Panel.module.css';

interface PanelProps {
  readonly title: string;
  readonly subtitle?: string | undefined;
  readonly actions?: ReactNode;
  readonly children: ReactNode;
  /** Rendered as the zone's landmark label for screen readers. */
  readonly ariaLabel?: string | undefined;
}

export const Panel = ({
  title,
  subtitle,
  actions,
  children,
  ariaLabel,
}: PanelProps): React.JSX.Element => (
  <section className={styles.panel} aria-label={ariaLabel ?? title}>
    <header className={styles.header}>
      <div>
        <h2 className={styles.title}>{title}</h2>
        {subtitle !== undefined && <p className={styles.subtitle}>{subtitle}</p>}
      </div>
      {actions !== undefined && <div className={styles.actions}>{actions}</div>}
    </header>
    <div className={styles.body}>{children}</div>
  </section>
);
