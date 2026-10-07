import { useId } from 'react';
import { scrollToElement } from '../../app/scrollTo';
import { Button } from '../../components/Button';
import { Checkbox } from '../../components/Checkbox';
import { Expander } from '../../components/Expander';
import { TextArea } from '../../components/Field';
import { Pill, Tag } from '../../components/Tag';
import { formatP } from '../../domain/common/format';
import type { DirectionResult } from '../../domain/uzi/calculate';
import { UZI_DIRECTIONS, UZI_REQUIREMENT_TYPES, UZI_TYPE_COUNT } from '../../domain/uzi/methodology';
import type { TargetLevel } from '../../domain/uzi/types';
import { useAppState, useDispatch } from '../../state/store';
import groupStyles from '../kzi/GroupSection.module.css';
import { RequirementQuestion } from './RequirementQuestion';
import styles from './DirectionSection.module.css';

export const directionElementId = (id: number) => `direction-${id}`;

function LevelTag({ result, target }: { result: DirectionResult; target: TargetLevel }) {
  if (result.excluded)
    return (
      <Tag tone="muted" size="sm">
        Исключено
      </Tag>
    );
  if (!result.answered)
    return (
      <Tag tone="muted" size="sm">
        Не оценено
      </Tag>
    );
  const tone = result.level >= target ? 'green' : result.level === 0 ? 'red' : 'orange';
  return (
    <Tag tone={tone} size="sm" title={`Целевой уровень: не ниже ${target}`}>
      Уровень {result.level}
    </Tag>
  );
}

/** Направление деятельности Узи: 8 видов требований, исключение и подтверждающие документы. */
export function DirectionSection({ result, target }: { result: DirectionResult; target: TargetLevel }) {
  const { ui, uzi } = useAppState();
  const dispatch = useDispatch();
  const bodyId = useId();
  const { direction } = result;
  const open = ui.uziDirections[direction.id] === true;
  const isLast = direction.id === UZI_DIRECTIONS.length;

  return (
    <section
      className={[groupStyles.group, styles.direction, result.excluded ? styles.excluded : ''].join(' ')}
      id={directionElementId(direction.id)}
    >
      <div className={[groupStyles.head, styles.head].join(' ')}>
        <button
          type="button"
          className={groupStyles.toggle}
          aria-expanded={open}
          aria-controls={bodyId}
          onClick={() => dispatch({ type: 'ui/direction', direction: direction.id, open: !open })}
        >
          <Expander open={open} />
          <span className={[groupStyles.name, styles.name].join(' ')}>
            {direction.id}. {direction.title}
          </span>
        </button>
        <div className={groupStyles.meta}>
          {!result.excluded && (
            <Pill done={result.answered === UZI_TYPE_COUNT} label={`Ответов: ${result.answered} из ${UZI_TYPE_COUNT}`}>
              {result.answered}/{UZI_TYPE_COUNT}
            </Pill>
          )}
          <LevelTag result={result} target={target} />
          {!result.excluded && <span className={styles.total}>Pзн {formatP(result.total)}</span>}
        </div>
      </div>
      <div className={groupStyles.body} id={bodyId} hidden={!open}>
        <div className={styles.exclude}>
          <Checkbox
            checked={result.excluded}
            onChange={value => dispatch({ type: 'uzi/excluded', direction: direction.id, value })}
          >
            Направление неприменимо, исключить из оценки <span className={styles.source}>п. 13 Методики</span>
          </Checkbox>
        </div>
        {!result.excluded &&
          UZI_REQUIREMENT_TYPES.map((type, index) => (
            <RequirementQuestion
              key={type.id}
              directionId={direction.id}
              type={type}
              value={result.values[index] ?? null}
              degree={result.degrees[index] ?? 0}
              onChange={value => dispatch({ type: 'uzi/value', direction: direction.id, requirement: type.id, value })}
            />
          ))}
        <div className={styles.evidence}>
          <TextArea
            label="Подтверждающие документы, инструменты, результаты мероприятий"
            rows={2}
            value={uzi.evidence[direction.id] ?? ''}
            placeholder="Войдут в отчет. Для исключенного направления укажите обоснование"
            onChange={text => dispatch({ type: 'uzi/evidence', direction: direction.id, text })}
          />
        </div>
        {!isLast && (
          <div className={styles.footer}>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                dispatch({ type: 'ui/nextDirection', direction: direction.id });
                scrollToElement(directionElementId(direction.id + 1));
              }}
            >
              Следующее направление
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
