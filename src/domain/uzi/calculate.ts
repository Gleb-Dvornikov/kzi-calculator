import {
  UZI_DIRECTIONS,
  UZI_LEVEL_REQUIREMENTS,
  UZI_LEVELS,
  UZI_REQUIREMENT_TYPES,
  UZI_TYPE_COUNT,
} from './methodology';
import type { Comparison, Direction, MaturityLevel, MaturityLevelIndex, RequirementType, TargetLevel } from './types';

/**
 * Расчет Узи:
 *  - степень выполнения вида требований Dij = wj * aj (п. 29)
 *  - значение уровня зрелости направления Pзн = сумма Dij (п. 30)
 *  - текущий уровень направления: наибольший уровень таблицы 3, все условия которого выполнены, иначе 0 (п. 31)
 *  - Узи = сумма текущих уровней направлений / N, где N - число оцениваемых направлений (п. 10, п. 13)
 *  - вид требований без ответа получает значение 0 (п. 24)
 */

/** Ответы пользователя по Узи. */
export interface UziAnswers {
  /** id направления -> значения a по 8 видам требований (в десятых), null - нет ответа. */
  values: Readonly<Record<number, readonly (number | null)[]>>;
  /** Направление исключено как неприменимое (п. 13). */
  excluded: Readonly<Record<number, boolean>>;
  target: TargetLevel;
}

export interface DirectionLevel {
  /** Dij по видам требований, в тысячных. */
  degrees: number[];
  /** Pзн, в тысячных. */
  total: number;
  level: MaturityLevelIndex;
}

/** Вид требований, который нужно поднять до целевого уровня. */
export interface RequirementGap {
  type: RequirementType;
  current: number | null;
  /** Наименьшее значение a, при котором условие таблицы 3 выполняется. */
  required: number;
}

export interface DirectionResult extends DirectionLevel {
  direction: Direction;
  values: (number | null)[];
  excluded: boolean;
  answered: number;
  /** Недостатки до целевого уровня. Пусто, если направление исключено или цель достигнута. */
  gaps: RequirementGap[];
}

export interface UziResult {
  directions: DirectionResult[];
  /** Оцениваемые направления (не исключенные). */
  included: DirectionResult[];
  /** Сумма текущих уровней оцениваемых направлений. */
  sum: number;
  /** N: число оцениваемых направлений. */
  count: number;
  /** Ответов по оцениваемым направлениям. */
  answered: number;
  /** Всего вопросов по оцениваемым направлениям: N * 8. */
  questions: number;
  reached: number;
  below: number;
  target: TargetLevel;
  /** Узи в сотых с округлением: 148 означает 1,48. */
  value: number;
  level: MaturityLevel | null;
  /** Оцениваемые направления, по которым есть хотя бы один ответ. */
  assessed: number;
}

const holds = (value: number, comparison: Comparison, bound: number): boolean =>
  comparison === 'eq' ? value === bound : value >= bound;

/** Приводит ответы направления к 8 значениям из допустимых вариантов. */
export function normalizeDirectionValues(
  values: readonly (number | null | undefined)[] | undefined
): (number | null)[] {
  return UZI_REQUIREMENT_TYPES.map((type, index) => {
    const value = values?.[index];
    return typeof value === 'number' && type.options.some(option => option.value === value) ? value : null;
  });
}

export function calculateDirectionLevel(values: readonly (number | null)[]): DirectionLevel {
  const degrees = UZI_REQUIREMENT_TYPES.map((type, index) => type.weight * (values[index] ?? 0));
  const total = degrees.reduce((sum, degree) => sum + degree, 0);
  let level: MaturityLevelIndex = 0;
  for (const row of UZI_LEVEL_REQUIREMENTS) {
    const met =
      total >= row.minTotal &&
      row.conditions.every(condition => holds(degrees[condition.type - 1] ?? 0, condition.comparison, condition.value));
    if (met && row.level > level) level = row.level;
  }
  return { degrees, total, level };
}

/**
 * Виды требований, которые не выполняют условия целевого уровня, и наименьшие достаточные значения a.
 * Минимальные значения Pзн в таблице 3 равны сумме минимальных Dij, поэтому выполнения условий по Dij достаточно.
 */
export function findRequirementGaps(
  values: readonly (number | null)[],
  degrees: readonly number[],
  target: TargetLevel
): RequirementGap[] {
  const row = UZI_LEVEL_REQUIREMENTS[target - 1];
  if (!row) return [];
  return row.conditions.flatMap(condition => {
    if (holds(degrees[condition.type - 1] ?? 0, condition.comparison, condition.value)) return [];
    const type = UZI_REQUIREMENT_TYPES[condition.type - 1];
    if (!type) return [];
    const option = type.options.find(o => holds(type.weight * o.value, condition.comparison, condition.value));
    if (!option) return [];
    return [{ type, current: values[condition.type - 1] ?? null, required: option.value }];
  });
}

export function uziLevelFor(sum: number, count: number): MaturityLevel | null {
  if (count === 0) return null;
  let index = 0;
  for (let level = 1; level <= 4; level++) if (sum >= level * count) index = level;
  return UZI_LEVELS[index] ?? null;
}

export function calculateUzi(answers: UziAnswers): UziResult {
  const directions = UZI_DIRECTIONS.map((direction): DirectionResult => {
    const values = normalizeDirectionValues(answers.values[direction.id]);
    const excluded = answers.excluded[direction.id] === true;
    const level = calculateDirectionLevel(values);
    const reached = level.level >= answers.target;
    return {
      ...level,
      direction,
      values,
      excluded,
      answered: values.filter(value => value !== null).length,
      gaps: excluded || reached ? [] : findRequirementGaps(values, level.degrees, answers.target),
    };
  });
  const included = directions.filter(direction => !direction.excluded);
  const count = included.length;
  const sum = included.reduce((total, direction) => total + direction.level, 0);
  const reached = included.filter(direction => direction.level >= answers.target).length;
  return {
    directions,
    included,
    sum,
    count,
    answered: included.reduce((total, direction) => total + direction.answered, 0),
    questions: count * UZI_TYPE_COUNT,
    reached,
    below: count - reached,
    target: answers.target,
    value: count ? Math.round((sum * 100) / count) : 0,
    level: uziLevelFor(sum, count),
    assessed: included.filter(direction => direction.answered > 0).length,
  };
}
