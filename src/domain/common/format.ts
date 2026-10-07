/**
 * Форматирование чисел и дат.
 * Значения в расчетах хранятся целыми числами в долях (например, 10000 = 1),
 * чтобы не было ошибок округления двоичной арифметики.
 */

/** Целое число в долях 10^-digits в строку с не менее чем minDecimals знаками после запятой. */
export function formatFraction(units: number, digits: number, minDecimals = 0, separator = ','): string {
  const value = Math.max(0, Math.round(units));
  const base = 10 ** digits;
  let fraction = String(value % base)
    .padStart(digits, '0')
    .replace(/0+$/, '');
  if (fraction.length < minDecimals) fraction = fraction.padEnd(minDecimals, '0');
  const integer = Math.floor(value / base);
  return fraction ? `${integer}${separator}${fraction}` : String(integer);
}

/** Кзи и вклады показателей: 10000 = 1. Пример: 7525 -> «0,7525». */
export const formatKzi = (units: number): string => formatFraction(units, 4, 2);

/** Весовые коэффициенты и значения показателей Кзи: 100 = 1. Пример: 30 -> «0,30». */
export const formatWeight = (hundredths: number): string => formatFraction(hundredths, 2, 2);

/** Значение выполнения требования a для Узи: 10 = 1. Пример: 5 -> «0,5». */
export const formatA = (tenths: number): string => formatFraction(tenths, 1, 0);

/** Степень выполнения Dij: 1000 = 1. Пример: 75 -> «0,075». */
export const formatD = (thousandths: number): string => formatFraction(thousandths, 3, 0);

/** Значение Pзн: 1000 = 1. Пример: 450 -> «0,45». */
export const formatP = (thousandths: number): string => formatFraction(thousandths, 3, 2);

/** Узи в сотых: 174 -> «1,74». */
export const formatUzi = (hundredths: number): string => formatFraction(hundredths, 2, 2);

/** Процент в десятых долях: 455 -> «45,5%», 450 -> «45%». */
export const formatPercent = (tenths: number): string => `${formatFraction(tenths, 1, 0)}%`;

/** Склонение по числу: pluralRu(5, ['направление', 'направления', 'направлений']). */
export function pluralRu(n: number, forms: readonly [string, string, string]): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return forms[0];
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return forms[1];
  return forms[2];
}

const pad2 = (n: number): string => String(n).padStart(2, '0');

/** 07.10.2026 */
export function formatDate(date: Date): string {
  return `${pad2(date.getDate())}.${pad2(date.getMonth() + 1)}.${date.getFullYear()}`;
}

const MONTHS_GENITIVE = [
  'января',
  'февраля',
  'марта',
  'апреля',
  'мая',
  'июня',
  'июля',
  'августа',
  'сентября',
  'октября',
  'ноября',
  'декабря',
] as const;

/** 7 октября 2026 г. */
export function formatDateLong(date: Date): string {
  return `${date.getDate()} ${MONTHS_GENITIVE[date.getMonth()]} ${date.getFullYear()} г.`;
}

/** Дата через заданное число месяцев (с поправкой на конец месяца). */
export function addMonths(date: Date, months: number): Date {
  const result = new Date(date.getFullYear(), date.getMonth() + months, 1);
  const lastDay = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
  result.setDate(Math.min(date.getDate(), lastDay));
  return result;
}

/** Заменяет «е» с двумя точками (U+0451, U+0401) на «е»: в официальных документах ее не используют. */
export function withoutYo(text: string): string {
  return text.replace(/\u0451/g, 'е').replace(/\u0401/g, 'Е');
}
