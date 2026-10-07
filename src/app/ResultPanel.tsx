import type { ReactNode } from 'react';
import { Button } from '../components/Button';
import { Meter, type MeterTone } from '../components/Meter';
import { Tag, type TagTone } from '../components/Tag';
import { CONTACTS } from '../config';
import type { Offer } from '../domain/offer';
import styles from './ResultPanel.module.css';

interface ResultPanelProps {
  label: string;
  value: string;
  tag: { tone: TagTone; text: string } | null;
  meter: { percent: number; tone: MeterTone; marks: { at: number; label: string }[]; start: string; end: string };
  children?: ReactNode;
  busy: boolean;
  onReset: () => void;
  onCurrentReport: () => void;
  onReport: () => void;
  offer: Offer;
}

/** Правая панель: результат, кнопки отчетов и ненавязчивое предложение помощи. */
export function ResultPanel({
  label,
  value,
  tag,
  meter,
  children,
  busy,
  onReset,
  onCurrentReport,
  onReport,
  offer,
}: ResultPanelProps) {
  return (
    <div className={styles.card}>
      <div className={styles.label}>{label}</div>
      <div className={styles.result}>
        <div className={styles.value} data-testid="result-value">
          {value}
        </div>
        <div className={styles.status}>
          {tag ? <Tag tone={tag.tone}>{tag.text}</Tag> : <span className={styles.dash}>-</span>}
        </div>
      </div>
      <Meter {...meter} />
      {children}
      <div className={styles.actions}>
        <div className={styles.row}>
          <Button variant="light" onClick={onReset}>
            Сброс
          </Button>
          <Button variant="outline" onClick={onCurrentReport} disabled={busy}>
            Текущий отчет
          </Button>
        </div>
        <Button variant="dark" block onClick={onReport} disabled={busy}>
          Сформировать отчет
        </Button>
      </div>
      <div className={styles.contact}>
        <p className={styles.offer}>{offer.text}</p>
        {offer.action && (
          <a className={styles.lead} href={offer.action.href}>
            {offer.action.label}
          </a>
        )}
        <div className={styles.links}>
          <a href={`tel:${CONTACTS.phoneHref}`}>{CONTACTS.phone}</a>
          <a href={`mailto:${CONTACTS.email}`}>{CONTACTS.email}</a>
        </div>
      </div>
    </div>
  );
}

/** Строки «название - значение» под шкалой. */
export function PanelRows({ rows }: { rows: { key: string; label: ReactNode; value: string; alert?: boolean }[] }) {
  return (
    <ul className={styles.rows}>
      {rows.map(row => (
        <li key={row.key}>
          <span>{row.label}</span>
          <b className={row.alert ? styles.alert : undefined}>{row.value}</b>
        </li>
      ))}
    </ul>
  );
}
