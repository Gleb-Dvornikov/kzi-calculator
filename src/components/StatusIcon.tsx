import { Icon } from './Icon';
import styles from './StatusIcon.module.css';

export type Status = 'met' | 'partial' | 'empty' | 'notApplicable';

const LABELS: Record<Status, string> = {
  met: 'Выполнен',
  partial: 'Выполнен частично',
  empty: 'Не выполнен',
  notApplicable: 'Не применим',
};

/** Состояние показателя. Только индикатор: на нажатие не реагирует. */
export function StatusIcon({ status, label }: { status: Status; label?: string }) {
  const text = label ?? LABELS[status];
  return (
    <span className={[styles.icon, styles[status]].join(' ')} role="img" aria-label={text} title={text}>
      {status === 'met' && <Icon name="tick" size={13} strokeWidth={3.2} />}
    </span>
  );
}
