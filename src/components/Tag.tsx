import type { ReactNode } from 'react';
import styles from './Tag.module.css';

export type TagTone = 'red' | 'orange' | 'gold' | 'green' | 'teal' | 'muted' | 'neutral';

export function Tag({
  tone = 'neutral',
  size = 'md',
  children,
  title,
  className,
}: {
  tone?: TagTone;
  size?: 'md' | 'sm';
  children: ReactNode;
  title?: string;
  className?: string;
}) {
  return (
    <span className={[styles.tag, styles[tone], styles[size], className ?? ''].filter(Boolean).join(' ')} title={title}>
      {children}
    </span>
  );
}

/** Счетчик «2/3»: зеленый, когда все выполнено. */
export function Pill({ done, children, label }: { done: boolean; children: ReactNode; label?: string }) {
  return (
    <span className={[styles.pill, done ? styles.pillDone : ''].join(' ')} aria-label={label} title={label}>
      {children}
    </span>
  );
}
