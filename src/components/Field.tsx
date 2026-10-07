import { useId, type ReactNode } from 'react';
import styles from './Field.module.css';

interface FieldShellProps {
  label: string;
  error?: string;
  hint?: ReactNode;
  wide?: boolean;
  children: (props: { id: string; describedBy: string | undefined; invalid: boolean }) => ReactNode;
}

/** Подпись, поле и сообщение об ошибке. */
export function FieldShell({ label, error, hint, wide, children }: FieldShellProps) {
  const id = useId();
  const messageId = `${id}-message`;
  const hasMessage = Boolean(error || hint);
  return (
    <div className={[styles.field, wide ? styles.wide : ''].join(' ')}>
      <label className={styles.label} htmlFor={id}>
        {label}
      </label>
      {children({ id, describedBy: hasMessage ? messageId : undefined, invalid: Boolean(error) })}
      {hasMessage && (
        <p id={messageId} className={error ? styles.error : styles.hint}>
          {error ?? hint}
        </p>
      )}
    </div>
  );
}

interface TextFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: 'text' | 'tel' | 'email';
  autoComplete?: string;
  error?: string;
  hint?: ReactNode;
  wide?: boolean;
  maxLength?: number;
}

export function TextField({ label, value, onChange, error, hint, wide, type = 'text', ...rest }: TextFieldProps) {
  return (
    <FieldShell label={label} error={error} hint={hint} wide={wide}>
      {({ id, describedBy, invalid }) => (
        <input
          id={id}
          className={[styles.input, invalid ? styles.invalid : ''].join(' ')}
          type={type}
          value={value}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          onChange={event => onChange(event.target.value)}
          {...rest}
        />
      )}
    </FieldShell>
  );
}

interface SelectFieldProps<T extends string | number> {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  hint?: ReactNode;
  wide?: boolean;
}

export function SelectField<T extends string | number>({
  label,
  value,
  options,
  onChange,
  hint,
  wide,
}: SelectFieldProps<T>) {
  return (
    <FieldShell label={label} hint={hint} wide={wide}>
      {({ id, describedBy }) => (
        <select
          id={id}
          className={styles.select}
          value={String(value)}
          aria-describedby={describedBy}
          onChange={event => {
            const option = options.find(item => String(item.value) === event.target.value);
            if (option) onChange(option.value);
          }}
        >
          {options.map(option => (
            <option key={String(option.value)} value={String(option.value)}>
              {option.label}
            </option>
          ))}
        </select>
      )}
    </FieldShell>
  );
}

/** Поле для многострочного текста: заметки, перечни документов. */
export function TextArea({
  label,
  value,
  onChange,
  placeholder,
  rows = 2,
  hideLabel,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  hideLabel?: boolean;
}) {
  const id = useId();
  return (
    <div className={styles.field}>
      <label className={hideLabel ? styles.visuallyHidden : styles.labelSmall} htmlFor={id}>
        {label}
      </label>
      <textarea
        id={id}
        className={styles.textarea}
        rows={rows}
        value={value}
        placeholder={placeholder}
        onChange={event => onChange(event.target.value)}
      />
    </div>
  );
}
