import styles from './Meter.module.css';

export type MeterTone = 'red' | 'orange' | 'gold' | 'green' | 'teal';

interface MeterProps {
  /** Заполнение от 0 до 100. */
  percent: number;
  tone: MeterTone;
  /** Метки на шкале: положение в процентах и подпись. */
  marks: { at: number; label: string }[];
  start: string;
  end: string;
}

export function Meter({ percent, tone, marks, start, end }: MeterProps) {
  const width = `${Math.max(0, Math.min(100, percent))}%`;
  return (
    <div className={styles.meter} aria-hidden="true">
      <div className={styles.track}>
        <div className={[styles.fill, styles[tone]].join(' ')} style={{ width }} />
        {marks.map(mark => (
          <span key={mark.at} className={styles.tick} style={{ left: `${mark.at}%` }} />
        ))}
      </div>
      <div className={styles.labels}>
        <span style={{ left: 0 }}>{start}</span>
        {marks.map(mark => (
          <span key={mark.at} className={styles.mid} style={{ left: `${mark.at}%` }}>
            {mark.label}
          </span>
        ))}
        <span className={styles.end}>{end}</span>
      </div>
    </div>
  );
}
