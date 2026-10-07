/**
 * Модель Методики оценки показателя состояния технической защиты информации
 * (утв. ФСТЭК России 11.11.2025). Показатель защищенности Кзи.
 *
 * Единицы:
 *  - весовой коэффициент группы R и значение показателя k хранятся в сотых: 30 означает 0,30
 *  - вклад показателя R * k и сам Кзи хранятся в десятитысячных: 10000 означает 1
 */

export type IndicatorCode = `k${number}`;
export type GroupId = 1 | 2 | 3 | 4;

/** Критерий, который пользователь отмечает галочкой. */
export interface CheckCriterion {
  id: string;
  kind: 'check';
  text: string;
  /** Позиция критерия в версии 3 калькулятора, нужна для переноса старых ответов. */
  legacyIndex?: number;
}

/** Критерий с порогом в процентах: пользователь вводит количество, калькулятор считает долю. */
export interface RatioCriterion {
  id: string;
  kind: 'ratio';
  text: string;
  /** Подпись поля «всего», например «привилегированных пользователей». */
  totalLabel: string;
  /** Подпись поля «из них», например «используют второй фактор». */
  partLabel: string;
  /** Порог в процентах: 50 означает «не менее 50%». */
  thresholdPercent: number;
}

export type Criterion = CheckCriterion | RatioCriterion;

/** Когда документ из приложения № 1 к Методике направляется во ФСТЭК России. */
export type DocumentDelivery = 'withResults' | 'onRequest' | 'firstAssessment' | 'conditional';

export interface MethodologyDocument {
  text: string;
  delivery: DocumentDelivery;
}

export interface NotApplicableRule {
  /** Условие из сноски Методики. */
  text: string;
  /** Ссылка на сноску. */
  source: string;
}

export interface Indicator {
  code: IndicatorCode;
  /** Краткое название для панели результата и списков. В Методике его нет. */
  shortTitle: string;
  /** Значение частного показателя k по таблице 1, в сотых. */
  weight: number;
  /** Формулировка показателя дословно по таблице 1. */
  text: string;
  criteria: Criterion[];
  notApplicable?: NotApplicableRule;
  /** Подтверждающие документы по приложению № 1. */
  documents: MethodologyDocument[];
  /** Подтверждающие документы, если показатель неприменим. */
  notApplicableDocuments?: MethodologyDocument[];
}

export interface IndicatorGroup {
  id: GroupId;
  title: string;
  shortTitle: string;
  /** Весовой коэффициент группы R по таблице 1, в сотых. */
  weight: number;
  indicators: Indicator[];
}

export type ZeroTestKey = 'accounts' | 'vulnerabilities' | 'unacceptableEvents';

/** Примечание к таблице 1: обнуление весовых коэффициентов по результатам тестирования. */
export interface ZeroTestCondition {
  key: ZeroTestKey;
  text: string;
  groups: GroupId[];
}

export type KziLevelId = 'base' | 'low' | 'critical';
export type Tone = 'green' | 'orange' | 'red' | 'gold' | 'teal' | 'muted';

/** Таблица 2 Методики. */
export interface KziLevel {
  id: KziLevelId;
  name: string;
  colorName: string;
  range: string;
  text: string;
  tone: Tone;
}
