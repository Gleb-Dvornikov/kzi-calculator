import { MODES, MODE_LABELS, type Mode } from '../domain/mode';
import styles from './ModeSwitch.module.css';

/** Переключатель «Кзи · Показатель защищенности» / «Узи · Уровень зрелости». */
export function ModeSwitch({ mode, onChange }: { mode: Mode; onChange: (mode: Mode) => void }) {
  return (
    <div className={styles.switch} role="tablist" aria-label="Что рассчитать">
      {MODES.map(item => (
        <button
          key={item}
          type="button"
          role="tab"
          aria-selected={mode === item}
          className={[styles.button, mode === item ? styles.active : ''].join(' ')}
          onClick={() => onChange(item)}
        >
          <span className={styles.name}>{MODE_LABELS[item].short}</span>
          <span className={styles.caption}>{MODE_LABELS[item].full}</span>
        </button>
      ))}
    </div>
  );
}
