import { KZI_GROUPS, KZI_LEVELS, KZI_ZERO_TEST_CONDITIONS } from './methodology';
import type {
  Criterion,
  GroupId,
  Indicator,
  IndicatorCode,
  IndicatorGroup,
  KziLevel,
  RatioCriterion,
  ZeroTestCondition,
  ZeroTestKey,
} from './types';

/**
 * Расчет Кзи по п. 34 Методики:
 * Кзи = (k11 + k12 + k13) * R1 + (k21 + ... + k24) * R2 + (k31 + ... + k36) * R3 + (k41 + k42 + k43) * R4.
 *
 * Показатель засчитывается, когда выполнены все его критерии или отмечена его неприменимость по сноске.
 * Весовой коэффициент группы обнуляется по примечанию к таблице 1 (результаты тестирования на проникновение,
 * учений, тренировок) и по п. 35 (повторное невыполнение показателя группы в течение 12 месяцев).
 */

/** Количества для критерия с порогом. null - поле не заполнено. */
export interface RatioAnswer {
  total: number | null;
  part: number | null;
}

/** Ответы пользователя по Кзи. Отсутствующий ключ равен «нет». */
export interface KziAnswers {
  /** Критерии-галочки: id критерия -> выполнен. */
  checks: Readonly<Record<string, boolean>>;
  /** Критерии с порогом: id критерия -> количества. */
  ratios: Readonly<Record<string, RatioAnswer>>;
  /** Неприменимость показателя по сноске Методики. */
  notApplicable: Readonly<Partial<Record<IndicatorCode, boolean>>>;
  /** Результаты тестирования на проникновение, учений, тренировок (примечание к таблице 1). */
  zeroTests: Readonly<Partial<Record<ZeroTestKey, boolean>>>;
  /** Показатель группы не выполнен повторно в течение 12 месяцев (п. 35). */
  repeatedFailure: Readonly<Partial<Record<GroupId, boolean>>>;
}

export type RatioStatus = 'empty' | 'invalid' | 'met' | 'unmet';
export type RatioProblem = 'zeroTotal' | 'partExceedsTotal';

export interface RatioEvaluation {
  status: RatioStatus;
  /** Доля в десятых долях процента с округлением вниз: 455 означает 45,5%. */
  percentTenths: number | null;
  problem?: RatioProblem;
}

export interface CriterionResult {
  criterion: Criterion;
  met: boolean;
  ratio?: RatioEvaluation;
}

export type IndicatorStatus = 'met' | 'notApplicable' | 'partial' | 'empty';

export interface IndicatorResult {
  group: IndicatorGroup;
  indicator: Indicator;
  criteria: CriterionResult[];
  metCriteria: number;
  notApplicable: boolean;
  /** Показатель засчитан: выполнены все критерии или он неприменим. */
  met: boolean;
  status: IndicatorStatus;
  /** Вклад в Кзи с учетом обнуления группы, в десятитысячных. */
  contribution: number;
  /** Вклад при выполнении показателя и без обнуления группы: R * k, в десятитысячных. */
  potential: number;
}

export type ZeroReason = { kind: 'test'; condition: ZeroTestCondition } | { kind: 'repeated' };

export interface GroupResult {
  group: IndicatorGroup;
  indicators: IndicatorResult[];
  /** Сумма вкладов показателей группы, в десятитысячных. */
  score: number;
  /** Наибольший вклад группы: R * 100, в десятитысячных. */
  max: number;
  metIndicators: number;
  hasUnmet: boolean;
  zeroReasons: ZeroReason[];
  zeroed: boolean;
  /** Весовой коэффициент группы после обнуления, в сотых. */
  effectiveWeight: number;
}

export type KziBlocker = { kind: 'zeroedGroup'; group: GroupResult } | { kind: 'indicator'; result: IndicatorResult };

export interface KziResult {
  groups: GroupResult[];
  indicators: IndicatorResult[];
  /** Кзи в десятитысячных: 10000 означает 1. */
  value: number;
  level: KziLevel;
  metIndicators: number;
  /** Пользователь начал отвечать: есть хотя бы одна отметка или число. */
  hasAnswers: boolean;
  /** Что мешает получить Кзи = 1: сначала обнуленные группы, затем показатели по убыванию R * k. */
  blockers: KziBlocker[];
}

/** Нормированное значение Кзи = 1 (п. 9 Методики). */
export const KZI_TARGET = 10000;
/** Граница между низким и критическим состоянием по таблице 2. */
export const KZI_CRITICAL_BOUND = 7500;

export function kziLevelFor(value: number): KziLevel {
  if (value >= KZI_TARGET) return KZI_LEVELS.base;
  if (value > KZI_CRITICAL_BOUND) return KZI_LEVELS.low;
  return KZI_LEVELS.critical;
}

const isCount = (value: number | null | undefined): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0;

/**
 * Проверка критерия с порогом: доля part / total не меньше порога.
 * Сравнение выполняется в целых числах, процент для показа округляется вниз,
 * чтобы 49,96% не выглядели как выполненные 50%.
 */
export function evaluateRatio(answer: RatioAnswer | undefined, thresholdPercent: number): RatioEvaluation {
  const total = answer?.total;
  const part = answer?.part;
  if (!isCount(total) || !isCount(part)) return { status: 'empty', percentTenths: null };
  if (total === 0) return { status: 'invalid', percentTenths: null, problem: 'zeroTotal' };
  if (part > total) return { status: 'invalid', percentTenths: null, problem: 'partExceedsTotal' };
  const percentTenths = Math.floor((part * 1000) / total);
  const met = part * 100 >= thresholdPercent * total;
  return { status: met ? 'met' : 'unmet', percentTenths };
}

function evaluateCriterion(criterion: Criterion, answers: KziAnswers): CriterionResult {
  if (criterion.kind === 'check') return { criterion, met: answers.checks[criterion.id] === true };
  const ratio = evaluateRatio(answers.ratios[criterion.id], (criterion as RatioCriterion).thresholdPercent);
  return { criterion, met: ratio.status === 'met', ratio };
}

function hasAnyAnswer(answers: KziAnswers): boolean {
  return (
    Object.values(answers.checks).some(Boolean) ||
    Object.values(answers.ratios).some(r => r.total !== null || r.part !== null) ||
    Object.values(answers.notApplicable).some(Boolean) ||
    Object.values(answers.zeroTests).some(Boolean)
  );
}

export function calculateKzi(answers: KziAnswers): KziResult {
  const groups = KZI_GROUPS.map((group): GroupResult => {
    const evaluated = group.indicators.map(indicator => {
      const criteria = indicator.criteria.map(criterion => evaluateCriterion(criterion, answers));
      const metCriteria = criteria.filter(c => c.met).length;
      const notApplicable = Boolean(indicator.notApplicable) && answers.notApplicable[indicator.code] === true;
      const met = notApplicable || metCriteria === criteria.length;
      const status: IndicatorStatus = notApplicable
        ? 'notApplicable'
        : met
          ? 'met'
          : metCriteria > 0 || criteria.some(c => c.ratio && c.ratio.status !== 'empty')
            ? 'partial'
            : 'empty';
      return { indicator, criteria, metCriteria, notApplicable, met, status };
    });

    const hasUnmet = evaluated.some(item => !item.met);
    const zeroReasons: ZeroReason[] = KZI_ZERO_TEST_CONDITIONS.filter(
      condition => answers.zeroTests[condition.key] === true && condition.groups.includes(group.id)
    ).map(condition => ({ kind: 'test', condition }));
    if (answers.repeatedFailure[group.id] === true && hasUnmet) zeroReasons.push({ kind: 'repeated' });
    const zeroed = zeroReasons.length > 0;
    const effectiveWeight = zeroed ? 0 : group.weight;

    const indicators = evaluated.map(
      (item): IndicatorResult => ({
        ...item,
        group,
        contribution: item.met ? effectiveWeight * item.indicator.weight : 0,
        potential: group.weight * item.indicator.weight,
      })
    );
    return {
      group,
      indicators,
      score: indicators.reduce((sum, item) => sum + item.contribution, 0),
      max: group.weight * 100,
      metIndicators: indicators.filter(item => item.met).length,
      hasUnmet,
      zeroReasons,
      zeroed,
      effectiveWeight,
    };
  });

  const indicators = groups.flatMap(group => group.indicators);
  const value = groups.reduce((sum, group) => sum + group.score, 0);
  const unmet = indicators
    .map((result, order) => ({ result, order }))
    .filter(({ result }) => !result.met)
    .sort((a, b) => b.result.potential - a.result.potential || a.order - b.order)
    .map(({ result }): KziBlocker => ({ kind: 'indicator', result }));

  return {
    groups,
    indicators,
    value,
    level: kziLevelFor(value),
    metIndicators: indicators.filter(item => item.met).length,
    hasAnswers: hasAnyAnswer(answers),
    blockers: [
      ...groups.filter(group => group.zeroed).map((group): KziBlocker => ({ kind: 'zeroedGroup', group })),
      ...unmet,
    ],
  };
}
