import { useId } from 'react';
import { Icon } from '../../components/Icon';
import { Tag } from '../../components/Tag';
import type { RatioAnswer, RatioEvaluation } from '../../domain/kzi/calculate';
import type { RatioCriterion } from '../../domain/kzi/types';
import { formatPercent } from '../../domain/common/format';
import { LIMITS } from '../../state/normalize';
import styles from './RatioField.module.css';

interface RatioFieldProps {
  criterion: RatioCriterion;
  answer: RatioAnswer | undefined;
  evaluation: RatioEvaluation;
  disabled: boolean;
  /** У показателя есть неприменимость по сноске: подсказка при нулевом количестве. */
  hasNotApplicable: boolean;
  onChange: (field: 'total' | 'part', value: number | null) => void;
}

/** Только цифры: «1 200» и «1200» дают 1200, пустое поле дает null. */
export function parseCount(text: string): number | null {
  const digits = text.replace(/\D/g, '').slice(0, 8);
  if (!digits) return null;
  return Math.min(Number.parseInt(digits, 10), LIMITS.count);
}

function problemText(evaluation: RatioEvaluation, hasNotApplicable: boolean): string | null {
  if (evaluation.problem === 'zeroTotal') {
    return hasNotApplicable
      ? 'Общее количество должно быть больше 0. Если таких объектов нет, отметьте неприменимость показателя.'
      : 'Общее количество должно быть больше 0.';
  }
  if (evaluation.problem === 'partExceedsTotal') return 'Значение «из них» не может быть больше общего количества.';
  return null;
}

/** Критерий с порогом: пользователь вводит количество, доля и выполнение считаются сразу. */
export function RatioField({ criterion, answer, evaluation, disabled, hasNotApplicable, onChange }: RatioFieldProps) {
  const totalId = useId();
  const partId = useId();
  const problem = problemText(evaluation, hasNotApplicable);
  const met = evaluation.status === 'met';

  return (
    <div className={[styles.ratio, disabled ? styles.disabled : ''].join(' ')}>
      <span className={[styles.box, met ? styles.boxMet : ''].join(' ')} aria-hidden="true">
        <Icon name="tick" size={14} strokeWidth={3.2} />
      </span>
      <div className={styles.body}>
        <p className={styles.text}>{criterion.text}</p>
        <div className={styles.inputs}>
          <label className={styles.count} htmlFor={totalId}>
            <input
              id={totalId}
              className={styles.input}
              inputMode="numeric"
              autoComplete="off"
              disabled={disabled}
              value={answer?.total ?? ''}
              placeholder="0"
              onChange={event => onChange('total', parseCount(event.target.value))}
            />
            <span>{criterion.totalLabel}</span>
          </label>
          <label className={styles.count} htmlFor={partId}>
            <input
              id={partId}
              className={styles.input}
              inputMode="numeric"
              autoComplete="off"
              disabled={disabled}
              value={answer?.part ?? ''}
              placeholder="0"
              onChange={event => onChange('part', parseCount(event.target.value))}
            />
            <span>{criterion.partLabel}</span>
          </label>
          <output className={styles.result} htmlFor={`${totalId} ${partId}`} aria-live="polite">
            {evaluation.percentTenths !== null && <b>{formatPercent(evaluation.percentTenths)}</b>}
            {evaluation.status === 'met' && (
              <Tag tone="green" size="sm">
                выполнено
              </Tag>
            )}
            {evaluation.status === 'unmet' && (
              <Tag tone="orange" size="sm">
                не выполнено
              </Tag>
            )}
            <span className={styles.threshold}>нужно не менее {criterion.thresholdPercent}%</span>
          </output>
        </div>
        {problem && !disabled && <p className={styles.problem}>{problem}</p>}
      </div>
    </div>
  );
}
