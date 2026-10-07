import styles from './Expander.module.css';

/** Квадрат «плюс-минус» у сворачиваемых блоков. */
export function Expander({ open }: { open: boolean }) {
  return <span className={[styles.expander, open ? styles.open : ''].join(' ')} aria-hidden="true" />;
}
