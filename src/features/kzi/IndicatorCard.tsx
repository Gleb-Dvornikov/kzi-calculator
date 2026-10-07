import { Checkbox } from '../../components/Checkbox';
import { StatusIcon } from '../../components/StatusIcon';
import { Pill } from '../../components/Tag';
import { formatKzi } from '../../domain/common/format';
import type { IndicatorResult } from '../../domain/kzi/calculate';
import { useAppState, useDispatch } from '../../state/store';
import { EvidenceEditor } from './EvidenceEditor';
import { RatioField } from './RatioField';
import styles from './IndicatorCard.module.css';

export const indicatorElementId = (code: string) => `indicator-${code}`;

const lowerFirst = (text: string) => text.charAt(0).toLowerCase() + text.slice(1);

/**
 * Показатель Кзи. Значок слева только показывает состояние: показатель выполняется отметкой всех критериев
 * или неприменимостью, отдельной галочки «выполнено» нет.
 */
export function IndicatorCard({ result }: { result: IndicatorResult }) {
  const { kzi } = useAppState();
  const dispatch = useDispatch();
  const { indicator, notApplicable, status } = result;
  const total = result.criteria.length;

  return (
    <article
      className={[styles.card, notApplicable ? styles.na : '', result.met ? styles.met : ''].join(' ')}
      id={indicatorElementId(indicator.code)}
    >
      <div className={styles.head}>
        <StatusIcon status={status} />
        <h3 className={styles.title}>
          <span className={styles.code}>
            k<sub>{indicator.code.slice(1)}</sub>
          </span>
          {indicator.text}
        </h3>
        <div className={styles.meta}>
          <Pill
            done={result.met}
            label={notApplicable ? 'Показатель неприменим' : `Выполнено критериев: ${result.metCriteria} из ${total}`}
          >
            {notApplicable ? 'не применимо' : `${result.metCriteria}/${total}`}
          </Pill>
          <span className={styles.value} title="Вклад в Кзи">
            {formatKzi(result.contribution)}
          </span>
        </div>
      </div>

      <div className={styles.criteria}>
        {result.criteria.map(item =>
          item.criterion.kind === 'check' ? (
            <Checkbox
              key={item.criterion.id}
              className={styles.criterion}
              checked={kzi.checks[item.criterion.id] === true}
              disabled={notApplicable}
              onChange={checked => dispatch({ type: 'kzi/check', criterionId: item.criterion.id, checked })}
            >
              {item.criterion.text}
            </Checkbox>
          ) : (
            <RatioField
              key={item.criterion.id}
              criterion={item.criterion}
              answer={kzi.ratios[item.criterion.id]}
              evaluation={item.ratio ?? { status: 'empty', percentTenths: null }}
              disabled={notApplicable}
              hasNotApplicable={Boolean(indicator.notApplicable)}
              onChange={(field, value) => dispatch({ type: 'kzi/ratio', criterionId: item.criterion.id, field, value })}
            />
          )
        )}
      </div>

      {indicator.notApplicable && (
        <div className={styles.notApplicable}>
          <Checkbox
            checked={notApplicable}
            onChange={value => dispatch({ type: 'kzi/notApplicable', code: indicator.code, value })}
          >
            <b>Не применимо:</b> {lowerFirst(indicator.notApplicable.text)}{' '}
            <span className={styles.source}>{indicator.notApplicable.source}</span>
          </Checkbox>
        </div>
      )}

      <EvidenceEditor
        indicator={indicator}
        items={kzi.evidence[indicator.code] ?? []}
        notApplicable={notApplicable}
        met={result.met}
      />
    </article>
  );
}
