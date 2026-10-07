import { useId, type ReactNode } from 'react';
import { Expander } from './Expander';
import styles from './InfoSection.module.css';

interface InfoSectionProps {
  title: string;
  open: boolean;
  onToggle: (open: boolean) => void;
  /** Метка справа от заголовка, например «R2 = 0». */
  badge?: ReactNode;
  id?: string;
  children: ReactNode;
}

/** Сворачиваемый справочный блок. */
export function InfoSection({ title, open, onToggle, badge, id, children }: InfoSectionProps) {
  const bodyId = useId();
  return (
    <section className={styles.section} id={id}>
      <button
        type="button"
        className={styles.toggle}
        aria-expanded={open}
        aria-controls={bodyId}
        onClick={() => onToggle(!open)}
      >
        <Expander open={open} />
        <span className={styles.title}>{title}</span>
        {badge}
        <span className={styles.hint}>{open ? 'Скрыть' : 'Показать'}</span>
      </button>
      <div className={styles.body} id={bodyId} hidden={!open}>
        {children}
      </div>
    </section>
  );
}
