import { Checkbox } from '../../components/Checkbox';
import { InfoSection } from '../../components/InfoSection';
import { Tag } from '../../components/Tag';
import type { KziResult } from '../../domain/kzi/calculate';
import { KZI_GROUPS, KZI_ZERO_TEST_CONDITIONS } from '../../domain/kzi/methodology';
import { useAppState, useDispatch } from '../../state/store';
import styles from './ZeroConditions.module.css';

export const ZERO_SECTION_ID = 'zero-conditions';

/** Условия обнуления весовых коэффициентов групп: примечание к таблице 1 и п. 35 Методики. */
export function ZeroConditions({ result }: { result: KziResult }) {
  const { kzi, ui } = useAppState();
  const dispatch = useDispatch();
  const zeroed = result.groups.filter(group => group.zeroed).map(group => `R${group.group.id}`);

  return (
    <InfoSection
      id={ZERO_SECTION_ID}
      title="Условия обнуления групп показателей"
      open={ui.sections.kziZero}
      onToggle={open => dispatch({ type: 'ui/section', key: 'kziZero', open })}
      badge={
        zeroed.length ? (
          <Tag tone="red" size="sm">
            {zeroed.join(', ')} = 0
          </Tag>
        ) : null
      }
    >
      <div>
        <div className={styles.lead}>
          По результатам выявления уязвимостей сайта, информационной системы или программ, тестирования на
          проникновение, учений или тренировок (примечание к таблице 1 Методики):
        </div>
        <div className={styles.list}>
          {KZI_ZERO_TEST_CONDITIONS.map(condition => {
            const on = kzi.zeroTests[condition.key] === true;
            return (
              <Checkbox
                key={condition.key}
                checked={on}
                onChange={value => dispatch({ type: 'kzi/zeroTest', key: condition.key, value })}
              >
                {condition.text}{' '}
                <span className={[styles.effect, on ? styles.on : ''].join(' ')}>
                  {condition.groups.map(group => `R${group}`).join(' и ')} = 0
                </span>
              </Checkbox>
            );
          })}
        </div>
      </div>
      <div>
        <div className={styles.lead}>
          Показатель группы не выполнен повторно в течение 12 месяцев и ему повторно присвоено значение 0 (п. 35
          Методики). Обнуление действует, пока в группе есть невыполненный показатель:
        </div>
        <div className={styles.list}>
          {KZI_GROUPS.map(group => {
            const checked = kzi.repeatedFailure[group.id] === true;
            const active = result.groups
              .find(item => item.group.id === group.id)
              ?.zeroReasons.some(r => r.kind === 'repeated');
            return (
              <Checkbox
                key={group.id}
                checked={checked}
                onChange={value => dispatch({ type: 'kzi/repeatedFailure', group: group.id, value })}
              >
                Группа {group.id}. {group.title}{' '}
                <span className={[styles.effect, active ? styles.on : ''].join(' ')}>R{group.id} = 0</span>
              </Checkbox>
            );
          })}
        </div>
      </div>
    </InfoSection>
  );
}
