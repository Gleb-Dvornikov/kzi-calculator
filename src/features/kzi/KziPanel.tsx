import { useMemo } from 'react';
import { useMessage } from '../../app/messages';
import { PanelRows, ResultPanel } from '../../app/ResultPanel';
import { scrollToElement } from '../../app/scrollTo';
import { useReports } from '../../app/ReportsContext';
import type { MeterTone } from '../../components/Meter';
import { formatKzi } from '../../domain/common/format';
import { KZI_TARGET, type KziBlocker, type KziResult } from '../../domain/kzi/calculate';
import type { KziLevelId } from '../../domain/kzi/types';
import { kziOffer } from '../../domain/offer';
import { useAppState, useDispatch, useKziResult } from '../../state/store';
import { indicatorElementId } from './IndicatorCard';
import { ZERO_SECTION_ID } from './ZeroConditions';
import styles from './KziPanel.module.css';

const METER_TONES: Record<KziLevelId, MeterTone> = { base: 'green', low: 'orange', critical: 'red' };
const BLOCKERS_SHOWN = 3;

function blockerLabel(blocker: KziBlocker) {
  if (blocker.kind === 'zeroedGroup') {
    const byTest = blocker.group.zeroReasons.some(reason => reason.kind === 'test');
    return {
      code: `R${blocker.group.group.id} = 0`,
      title: `${blocker.group.group.shortTitle}: ${byTest ? 'результаты тестирования' : 'повторное невыполнение'}`,
      gain: null,
    };
  }
  return {
    code: blocker.result.indicator.code,
    title: blocker.result.indicator.shortTitle,
    gain: `+${formatKzi(blocker.result.potential)}`,
  };
}

/** «Что мешает Кзи = 1»: самые весомые причины, по нажатию переход к показателю. */
function Blockers({ result }: { result: KziResult }) {
  const dispatch = useDispatch();
  if (!result.hasAnswers || result.value >= KZI_TARGET || !result.blockers.length) return null;
  const shown = result.blockers.slice(0, BLOCKERS_SHOWN);
  const rest = result.blockers.length - shown.length;

  const open = (blocker: KziBlocker) => {
    if (blocker.kind === 'zeroedGroup') {
      dispatch({ type: 'ui/section', key: 'kziZero', open: true });
      scrollToElement(ZERO_SECTION_ID, { flash: true });
      return;
    }
    dispatch({ type: 'ui/group', group: blocker.result.group.id, open: true });
    scrollToElement(indicatorElementId(blocker.result.indicator.code), { flash: true });
  };

  return (
    <div className={styles.blockers}>
      <div className={styles.title}>Что мешает получить Кзи = 1</div>
      <ul className={styles.list}>
        {shown.map(blocker => {
          const label = blockerLabel(blocker);
          return (
            <li key={label.code}>
              <button type="button" className={styles.item} onClick={() => open(blocker)}>
                <span className={blocker.kind === 'zeroedGroup' ? styles.codeAlert : styles.code}>{label.code}</span>
                <span className={styles.name}>{label.title}</span>
                {label.gain && <span className={styles.gain}>{label.gain}</span>}
              </button>
            </li>
          );
        })}
      </ul>
      {rest > 0 && <p className={styles.more}>И еще {rest}, полный список в текущем отчете</p>}
    </div>
  );
}

export function KziPanel({ onReport }: { onReport: () => void }) {
  const { kzi, requisites } = useAppState();
  const dispatch = useDispatch();
  const result = useKziResult();
  const showMessage = useMessage();
  const { busy, generate } = useReports();
  const offer = useMemo(() => kziOffer(result, requisites), [result, requisites]);

  const reset = () => {
    const previous = kzi;
    dispatch({ type: 'kzi/resetAnswers' });
    showMessage({
      text: 'Отметки и числа сброшены. Документы и заметки сохранены.',
      action: { label: 'Вернуть', onClick: () => dispatch({ type: 'kzi/restore', kzi: previous }) },
    });
  };

  return (
    <ResultPanel
      label="Показатель защищенности (Кзи)"
      value={formatKzi(result.value)}
      tag={result.hasAnswers ? { tone: result.level.tone, text: result.level.name } : null}
      meter={{
        percent: result.value / 100,
        tone: METER_TONES[result.level.id],
        marks: [{ at: 75, label: '0,75' }],
        start: '0',
        end: '1',
      }}
      busy={busy}
      onReset={reset}
      onCurrentReport={() => void generate('kziCurrent')}
      onReport={onReport}
      offer={offer}
    >
      <PanelRows
        rows={result.groups.map(group => ({
          key: String(group.group.id),
          label: `${group.group.id}. ${group.group.shortTitle}`,
          value: formatKzi(group.score),
          alert: group.zeroed,
        }))}
      />
      <Blockers result={result} />
    </ResultPanel>
  );
}
