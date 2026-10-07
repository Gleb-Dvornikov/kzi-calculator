import { useId } from 'react';
import { formatA, formatD, formatFraction } from '../../domain/common/format';
import type { RequirementType } from '../../domain/uzi/types';
import styles from './RequirementQuestion.module.css';

interface RequirementQuestionProps {
  directionId: number;
  type: RequirementType;
  value: number | null;
  degree: number;
  onChange: (value: number) => void;
}

/** Вид требований: выбор варианта из таблицы 2 Методики. */
export function RequirementQuestion({ directionId, type, value, degree, onChange }: RequirementQuestionProps) {
  const headingId = useId();
  const name = `uzi-${directionId}-${type.id}`;
  return (
    <div className={styles.question} role="radiogroup" aria-labelledby={headingId}>
      <div className={styles.head}>
        <span className={styles.name} id={headingId}>
          {type.id}. {type.name}
        </span>
        <span className={styles.weight}>w = {formatFraction(type.weight, 2)}</span>
        <span className={styles.degree}>D = {formatD(degree)}</span>
      </div>
      <p className={styles.characteristic}>{type.characteristic}</p>
      <div className={styles.options}>
        {type.options.map(option => {
          const checked = value === option.value;
          return (
            <label key={option.value} className={[styles.option, checked ? styles.checked : ''].join(' ')}>
              <input
                type="radio"
                name={name}
                value={option.value}
                checked={checked}
                onChange={() => onChange(option.value)}
              />
              <span className={styles.dot} aria-hidden="true" />
              <span className={styles.text}>{option.text}</span>
              <span className={styles.value}>{formatA(option.value)}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
