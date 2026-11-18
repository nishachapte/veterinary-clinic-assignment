import type { ReactNode } from 'react';
import styles from './Panel.module.css';

interface PanelProps {
  title: string;
  subtitle?: string | undefined;
  actions?: ReactNode;
  children: ReactNode;
  /** Rendered as the zone's landmark label for screen readers. */
  ariaLabel?: string | undefined;
}

export const Panel = ({
  title,
  subtitle,
  actions,
  children,
  ariaLabel,
}: PanelProps) => (
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
