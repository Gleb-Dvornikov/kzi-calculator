import type { ReactNode } from 'react';
import { Icon } from './Icon';
import styles from './Checkbox.module.css';

interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  children: ReactNode;
  className?: string;
}

/** Флажок в стиле CheckU: скрытый input и нарисованный квадрат. */
export function Checkbox({ checked, onChange, disabled, children, className }: CheckboxProps) {
  return (
    <label className={[styles.check, disabled ? styles.disabled : '', className ?? ''].filter(Boolean).join(' ')}>
      <input
        type="checkbox"
        className={styles.input}
        checked={checked}
        disabled={disabled}
        onChange={event => onChange(event.target.checked)}
      />
      <span className={styles.box} aria-hidden="true">
        <Icon name="tick" size={14} strokeWidth={3.2} />
      </span>
      <span className={styles.text}>{children}</span>
    </label>
  );
}
