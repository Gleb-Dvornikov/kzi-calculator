/**
 * Модель Методики оценки уровня зрелости деятельности в области технической защиты информации
 * (утв. ФСТЭК России 07.08.2026). Уровень зрелости Узи.
 *
 * Единицы:
 *  - весовой коэффициент вида требований w хранится в сотых: 15 означает 0,15
 *  - значение выполнения требования a хранится в десятых: 5 означает 0,5
 *  - степень выполнения D = w * a и значение Pзн хранятся в тысячных: 75 означает 0,075
 */

export type MaturityLevelIndex = 0 | 1 | 2 | 3 | 4;
export type TargetLevel = 1 | 2 | 3 | 4;

/** Направление деятельности по п. 12 Методики. */
export interface Direction {
  id: number;
  /** Наименование дословно по п. 12, со строчной буквы. */
  name: string;
  /** Наименование с заглавной буквы для заголовков. */
  title: string;
}

export interface RequirementOption {
  /** Значение выполнения требования a, в десятых. */
  value: number;
  /** Текст варианта дословно по таблице 2. */
  text: string;
}

/** Вид требований по таблице 2 Методики. */
export interface RequirementType {
  /** Номер j от 1 до 8. */
  id: number;
  name: string;
  /** Весовой коэффициент w, в сотых. */
  weight: number;
  /** Характеристика вида требований дословно по таблице 2. */
  characteristic: string;
  options: RequirementOption[];
  /** Мероприятия для отчета: partial - чтобы достичь a = 0,5, full - чтобы достичь a = 1. В Методике их нет. */
  recommendations: { partial: string; full: string };
}

export type Comparison = 'eq' | 'gte';

/** Условие таблицы 3: степень выполнения вида требований равна значению или не меньше его. */
export interface DegreeCondition {
  type: number;
  comparison: Comparison;
  /** Значение D, в тысячных. */
  value: number;
}

/** Строка таблицы 3 Методики: условия текущего уровня зрелости направления. */
export interface LevelRequirement {
  level: TargetLevel;
  /** Минимальное значение Pзн, в тысячных. */
  minTotal: number;
  conditions: DegreeCondition[];
}

export type Tone = 'red' | 'orange' | 'gold' | 'green' | 'teal';

/** Уровень зрелости по таблице 1 Методики. */
export interface MaturityLevel {
  index: MaturityLevelIndex;
  name: string;
  range: string;
  text: string;
  /** Цвет в интерфейсе. В Методике цвета не заданы. */
  tone: Tone;
}

/** Рекомендуемый целевой уровень по п. 11 Методики. */
export interface TargetOption {
  value: TargetLevel;
  text: string;
}
