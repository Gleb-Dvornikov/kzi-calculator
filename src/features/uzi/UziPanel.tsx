import { useMemo } from 'react';
import { useMessage } from '../../app/messages';
import { PanelRows, ResultPanel } from '../../app/ResultPanel';
import { useReports } from '../../app/ReportsContext';
import { formatUzi } from '../../domain/common/format';
import { uziOffer } from '../../domain/offer';
import { UZI_DIRECTIONS } from '../../domain/uzi/methodology';
import { useAppState, useDispatch, useUziResult } from '../../state/store';

export function UziPanel({ onReport }: { onReport: () => void }) {
  const { uzi, requisites } = useAppState();
  const dispatch = useDispatch();
  const result = useUziResult();
  const showMessage = useMessage();
  const { busy, generate } = useReports();
  const offer = useMemo(() => uziOffer(result, requisites), [result, requisites]);
  const answered = result.count > 0 && result.answered > 0;

  const reset = () => {
    const previous = uzi;
    dispatch({ type: 'uzi/resetAnswers' });
    showMessage({
      text: 'Ответы сброшены. Целевой уровень и документы сохранены.',
      action: { label: 'Вернуть', onClick: () => dispatch({ type: 'uzi/restore', uzi: previous }) },
    });
  };

  return (
    <ResultPanel
      label="Уровень зрелости (Узи)"
      value={formatUzi(result.value)}
      tag={answered && result.level ? { tone: result.level.tone, text: result.level.name } : null}
      meter={{
        percent: result.value / 4,
        tone: result.level?.tone ?? 'red',
        marks: [1, 2, 3].map(level => ({ at: level * 25, label: String(level) })),
        start: '0',
        end: '4',
      }}
      busy={busy}
      onReset={reset}
      onCurrentReport={() => void generate('uziCurrent')}
      onReport={onReport}
      offer={offer}
    >
      <PanelRows
        rows={[
          { key: 'target', label: 'Целевой уровень направлений', value: `не ниже ${result.target}` },
          { key: 'count', label: 'Направлений в оценке', value: `${result.count} из ${UZI_DIRECTIONS.length}` },
          {
            key: 'below',
            label: 'Ниже целевого уровня',
            value: String(result.below),
            alert: answered && result.below > 0,
          },
          { key: 'answered', label: 'Заполнено ответов', value: `${result.answered} из ${result.questions}` },
        ]}
      />
    </ResultPanel>
  );
}
