import { useMemo, type ReactNode } from 'react';
import { Button } from '../components/Button';
import { Icon } from '../components/Icon';
import { formatDate } from '../domain/common/format';
import type { Mode } from '../domain/mode';
import { nextAssessmentDate } from '../domain/schedule';
import styles from './PageHeader.module.css';
import { useReports } from './ReportsContext';

const PERIOD: Record<Mode, string> = {
  kzi: 'Кзи рассчитывают не реже одного раза в 6 месяцев.',
  uzi: 'Подрядчик рассчитывает Узи не реже одного раза в 2 года.',
};

/** Заголовок режима и строка о периодичности оценки с напоминанием в календарь. */
export function PageHeader({ mode, title, subtitle }: { mode: Mode; title: string; subtitle: ReactNode }) {
  const { addReminder } = useReports();
  const due = useMemo(() => nextAssessmentDate(mode, new Date()), [mode]);
  return (
    <div className={styles.header}>
      <h1 className={styles.title}>{title}</h1>
      <p className={styles.subtitle}>{subtitle}</p>
      <div className={styles.period}>
        <span className={styles.icon}>
          <Icon name="calendar" size={18} />
        </span>
        <span>
          {PERIOD[mode]} При оценке сегодня следующая не позднее {formatDate(due)}.{' '}
          <Button variant="link" className={styles.reminder} onClick={() => addReminder(mode)}>
            Добавить в календарь
          </Button>
        </span>
      </div>
    </div>
  );
}
