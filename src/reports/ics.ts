/**
 * Напоминание о следующей оценке в формате iCalendar (.ics): открывается в Outlook, Яндекс Календаре,
 * Google Календаре и календаре телефона. Событие на весь день в дату срока, оповещение за 14 дней.
 */
import { buildFileName, organizationShortName } from '../domain/common/fileName';
import { formatDate } from '../domain/common/format';
import { MODE_LABELS, type Mode } from '../domain/mode';
import { PERIOD_TEXT, nextAssessmentDate } from '../domain/schedule';

export interface ReminderInput {
  mode: Mode;
  organization: string;
  /** Дата текущей оценки. */
  assessedAt: Date;
  /** Адрес калькулятора для ссылки в описании события. */
  calculatorUrl: string;
  /** Для повторяемых тестов. */
  now?: Date;
  uid?: string;
}

const pad = (value: number) => String(value).padStart(2, '0');
const icsDate = (date: Date) => `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`;
const icsTimestamp = (date: Date) =>
  `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}T${pad(date.getUTCHours())}${pad(
    date.getUTCMinutes()
  )}${pad(date.getUTCSeconds())}Z`;

/** Экранирование текста по RFC 5545. */
export const escapeIcsText = (text: string): string =>
  text.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

/** Перенос строк длиннее 75 байт: продолжение начинается с пробела. Символы UTF-8 не разрываются. */
export function foldIcsLine(line: string): string {
  const encoder = new TextEncoder();
  const parts: string[] = [];
  let current = '';
  let bytes = 0;
  for (const char of line) {
    const size = encoder.encode(char).length;
    const limit = parts.length === 0 ? 75 : 74;
    if (bytes + size > limit) {
      parts.push(current);
      current = '';
      bytes = 0;
    }
    current += char;
    bytes += size;
  }
  parts.push(current);
  return parts.join('\r\n ');
}

export function buildReminder(input: ReminderInput): { fileName: string; content: string; dueDate: Date } {
  const label = MODE_LABELS[input.mode];
  const dueDate = nextAssessmentDate(input.mode, input.assessedAt);
  const dayAfter = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate() + 1);
  const organization = input.organization.trim();
  const summary = `Срок оценки ${label.short}${organization ? `: ${organization}` : ''}`;
  const basis =
    input.mode === 'kzi'
      ? 'п. 32 Требований, утвержденных приказом ФСТЭК России от 11.04.2025 № 117'
      : 'п. 32 Требований, утвержденных приказом ФСТЭК России от 11.04.2025 № 117, в редакции приказа от 08.05.2026 № 137';
  const description = [
    `${label.full} (${label.short}) оценивается ${PERIOD_TEXT[input.mode]} (${basis}).`,
    `Предыдущая оценка: ${formatDate(input.assessedAt)}. Срок следующей: не позднее ${formatDate(dueDate)}.`,
    `Калькулятор: ${input.calculatorUrl}`,
  ].join('\n');
  const now = input.now ?? new Date();
  const uid = input.uid ?? `${now.getTime().toString(36)}-${Math.random().toString(36).slice(2, 10)}@kzi-calculator`;

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//USSC//CheckU Kzi Uzi Calculator//RU',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${icsTimestamp(now)}`,
    `DTSTART;VALUE=DATE:${icsDate(dueDate)}`,
    `DTEND;VALUE=DATE:${icsDate(dayAfter)}`,
    `SUMMARY:${escapeIcsText(summary)}`,
    `DESCRIPTION:${escapeIcsText(description)}`,
    `URL:${input.calculatorUrl}`,
    'TRANSP:TRANSPARENT',
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    `DESCRIPTION:${escapeIcsText(summary)}`,
    'TRIGGER:-P14D',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return {
    fileName: buildFileName(['Напоминание', label.short, organizationShortName(organization)], dueDate, 'ics'),
    content: `${lines.map(foldIcsLine).join('\r\n')}\r\n`,
    dueDate,
  };
}
