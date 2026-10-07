import type { KziAnswers, RatioAnswer } from '../src/domain/kzi/calculate';
import { KZI_INDICATORS } from '../src/domain/kzi/methodology';
import type { IndicatorCode } from '../src/domain/kzi/types';
import { createDefaultState } from '../src/state/defaults';
import type { AppState, KziState } from '../src/state/types';

/** Ответы, при которых выполнены все показатели, кроме перечисленных (у них не отмечено ничего). */
export function kziAnswers(options: { unmet?: IndicatorCode[] } = {}): KziState {
  const unmet = new Set(options.unmet ?? []);
  const state = createDefaultState().kzi;
  for (const { indicator } of KZI_INDICATORS) {
    if (unmet.has(indicator.code)) continue;
    for (const criterion of indicator.criteria) {
      if (criterion.kind === 'check') state.checks[criterion.id] = true;
      else state.ratios[criterion.id] = { total: 10, part: 10 };
    }
  }
  return state;
}

export function withRatio(answers: KziState, criterionId: string, ratio: RatioAnswer): KziState {
  return { ...answers, ratios: { ...answers.ratios, [criterionId]: ratio } };
}

export function withAnswers(answers: KziState, patch: Partial<KziAnswers>): KziState {
  return { ...answers, ...patch } as KziState;
}

/** Состояние с заполненными реквизитами. */
export function sampleState(): AppState {
  const state = createDefaultState();
  state.requisites = {
    ...state.requisites,
    organization: 'ООО «Ромашка»',
    headPosition: 'Генеральный директор',
    headName: 'И.И. Иванов',
    executorName: 'П.П. Петров',
    executorPosition: 'Специалист по защите информации',
    executorPhone: '+7 (343) 000-00-00',
    executorEmail: 'petrov@example.ru',
    customer: 'АО «Заказчик»',
  };
  return state;
}

export const fixedDate = new Date(2026, 9, 7, 12, 0, 0);
