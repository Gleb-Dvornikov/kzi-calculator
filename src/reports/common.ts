import { CONTACTS } from '../config';
import { abbreviationsIn } from '../domain/abbreviations';
import { bold, documentText, heading, list, paragraph, type Block } from './model';

/** Строка с контактами УЦСБ. Только в текущих (рабочих) отчетах, в письмо и отчет для Заказчика не попадает. */
export const contactsParagraph = (): Block =>
  paragraph(`Консультации по повышению уровня: ${CONTACTS.company}, ${CONTACTS.email}, ${CONTACTS.phone}.`, {
    size: 'small',
    spaceBefore: 6,
  });

/** Раздел «Сокращения» по тем сокращениям, которые есть в тексте документа. */
export function abbreviationsSection(blocks: readonly Block[], title = 'Сокращения'): Block[] {
  const found = abbreviationsIn(documentText(blocks));
  if (!found.length) return [];
  return [
    heading(2, title),
    list(
      found.map(item => [bold(item.short), ` - ${item.full}`]),
      { size: 'small' }
    ),
  ];
}

/** Первая буква строчная: для вставки текста сноски в середину фразы. */
export const lowerFirst = (text: string): string => text.charAt(0).toLowerCase() + text.slice(1);

/** Убирает точку в конце, чтобы не получилось двух точек подряд. */
export const trimPeriod = (text: string): string => text.trim().replace(/[.;,\s]+$/, '');
