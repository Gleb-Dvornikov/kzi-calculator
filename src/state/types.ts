import type { KziAnswers, RatioAnswer } from '../domain/kzi/calculate';
import type { GroupId, IndicatorCode, ZeroTestKey } from '../domain/kzi/types';
import type { Mode } from '../domain/mode';
import type { Requisites } from '../domain/requisites';
import type { UziAnswers } from '../domain/uzi/calculate';
import type { TargetLevel } from '../domain/uzi/types';

/** Подтверждающий документ: попадает в отчет и в приложение к письму. */
export interface EvidenceItem {
  id: string;
  title: string;
  /** Количество листов для строки «на N л. в 1 экз.». null - не указано. */
  sheets: number | null;
}

export interface KziState extends KziAnswers {
  checks: Record<string, boolean>;
  ratios: Record<string, RatioAnswer>;
  notApplicable: Partial<Record<IndicatorCode, boolean>>;
  zeroTests: Partial<Record<ZeroTestKey, boolean>>;
  repeatedFailure: Partial<Record<GroupId, boolean>>;
  /** Подтверждающие документы по показателям. */
  evidence: Partial<Record<IndicatorCode, EvidenceItem[]>>;
  /** Заметки по группам показателей. */
  notes: Partial<Record<GroupId, string>>;
}

export interface UziState extends UziAnswers {
  values: Record<number, (number | null)[]>;
  excluded: Record<number, boolean>;
  target: TargetLevel;
  /** Подтверждающие документы, инструменты, результаты мероприятий по направлениям. */
  evidence: Record<number, string>;
}

/** Сворачиваемые справочные блоки. */
export type SectionKey = 'kziAbout' | 'kziZero' | 'kziUseful' | 'uziAbout' | 'uziUseful';

export interface UiState {
  sections: Record<SectionKey, boolean>;
  /** Раскрытые группы показателей Кзи. */
  kziGroups: Partial<Record<GroupId, boolean>>;
  /** Раскрытые направления Узи. */
  uziDirections: Record<number, boolean>;
}

export interface AppState {
  version: 4;
  mode: Mode;
  requisites: Requisites;
  kzi: KziState;
  uzi: UziState;
  ui: UiState;
}
