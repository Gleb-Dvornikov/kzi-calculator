import { SelectField } from '../../components/Field';
import { abbreviationsIn } from '../../domain/abbreviations';
import { UZI_TARGETS } from '../../domain/uzi/methodology';
import { useAppState, useDispatch } from '../../state/store';
import viewStyles from '../shared/view.module.css';

const LEGEND = abbreviationsIn(UZI_TARGETS.map(target => target.text).join(' '))
  .map(item => `${item.short} - ${item.full}`)
  .join(', ');

/** Целевой уровень зрелости направлений (п. 11 Методики или требование Заказчика). */
export function TargetSelect() {
  const { uzi } = useAppState();
  const dispatch = useDispatch();
  return (
    <section className={viewStyles.block}>
      <h2 className={viewStyles.blockTitle}>Целевой уровень зрелости направлений</h2>
      <SelectField
        label="Рекомендация п. 11 Методики или уровень, установленный Заказчиком"
        value={uzi.target}
        options={UZI_TARGETS.map(target => ({ value: target.value, label: target.text }))}
        onChange={value => dispatch({ type: 'uzi/target', value })}
        hint={`Сокращения: ${LEGEND}.`}
      />
    </section>
  );
}
