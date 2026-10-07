import { addMonths } from './common/format';
import type { Mode } from './mode';

/**
 * Периодичность оценки:
 *  - Кзи не реже одного раза в 6 месяцев (п. 32 Требований № 117, п. 12 Методики от 11.11.2025)
 *  - Узи подрядчика до получения доступа и далее не реже одного раза в 2 года
 *    (п. 32 Требований № 117 в редакции приказа ФСТЭК России от 08.05.2026 № 137)
 */
export const ASSESSMENT_PERIOD_MONTHS: Record<Mode, number> = { kzi: 6, uzi: 24 };

export const PERIOD_TEXT: Record<Mode, string> = {
  kzi: 'не реже одного раза в 6 месяцев',
  uzi: 'не реже одного раза в 2 года',
};

/** Срок следующей оценки, если текущая проведена в дату from. */
export function nextAssessmentDate(mode: Mode, from: Date): Date {
  return addMonths(from, ASSESSMENT_PERIOD_MONTHS[mode]);
}
