import { useId } from 'react';
import { Expander } from '../../components/Expander';
import { TextArea } from '../../components/Field';
import { Pill, Tag } from '../../components/Tag';
import { formatKzi } from '../../domain/common/format';
import type { GroupResult } from '../../domain/kzi/calculate';
import { useAppState, useDispatch } from '../../state/store';
import { IndicatorCard } from './IndicatorCard';
import styles from './GroupSection.module.css';

export const groupElementId = (id: number) => `group-${id}`;

/** Группа показателей Кзи: заголовок со счетом, заметки и показатели. */
export function GroupSection({ result }: { result: GroupResult }) {
  const { ui, kzi } = useAppState();
  const dispatch = useDispatch();
  const bodyId = useId();
  const { group } = result;
  const open = ui.kziGroups[group.id] !== false;
  const allMet = result.metIndicators === result.indicators.length;

  return (
    <section className={styles.group} id={groupElementId(group.id)}>
      <div className={styles.head}>
        <button
          type="button"
          className={styles.toggle}
          aria-expanded={open}
          aria-controls={bodyId}
          onClick={() => dispatch({ type: 'ui/group', group: group.id, open: !open })}
        >
          <Expander open={open} />
          <span className={styles.name}>
            Группа {group.id}. {group.title}
          </span>
        </button>
        <div className={styles.meta}>
          {result.zeroed && (
            <Tag tone="red" size="sm" title="Весовой коэффициент группы обнулен">
              R{group.id} = 0
            </Tag>
          )}
          <Pill done={allMet} label={`Выполнено показателей: ${result.metIndicators} из ${result.indicators.length}`}>
            {result.metIndicators}/{result.indicators.length}
          </Pill>
          <span className={styles.score}>
            <b>{formatKzi(result.score)}</b> из {formatKzi(result.max)}
          </span>
        </div>
        <div className={styles.notes}>
          <TextArea
            label={`Заметки по группе ${group.id}`}
            hideLabel
            rows={1}
            value={kzi.notes[group.id] ?? ''}
            placeholder="Заметки по группе..."
            onChange={text => dispatch({ type: 'kzi/note', group: group.id, text })}
          />
        </div>
      </div>
      <div className={styles.body} id={bodyId} hidden={!open}>
        {result.indicators.map(indicator => (
          <IndicatorCard key={indicator.indicator.code} result={indicator} />
        ))}
      </div>
    </section>
  );
}
