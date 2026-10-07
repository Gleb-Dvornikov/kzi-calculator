import { CONTACTS } from '../config';
import { formatKzi, formatUzi, pluralRu } from './common/format';
import { KZI_TARGET, type KziResult } from './kzi/calculate';
import { KZI_INDICATORS } from './kzi/methodology';
import type { Requisites } from './requisites';
import type { UziResult } from './uzi/calculate';
import { UZI_REQUIREMENT_TYPES } from './uzi/methodology';

/**
 * Ненавязчивое предложение помощи УЦСБ под результатом расчета.
 * Ссылка открывает письмо в почтовой программе пользователя, отправляет его сам пользователь.
 */
export interface Offer {
  text: string;
  action?: { label: string; href: string };
}

const clean = (value: string | undefined): string => (value ?? '').trim();

export function mailtoHref(subject: string, lines: readonly string[]): string {
  const body = lines.filter(Boolean).join('\r\n');
  return `mailto:${CONTACTS.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function contactLine(requisites: Requisites): string {
  const parts = [requisites.executorName, requisites.executorPhone, requisites.executorEmail]
    .map(clean)
    .filter(Boolean);
  return parts.length ? `Контакт: ${parts.join(', ')}` : '';
}

function subject(name: string, requisites: Requisites): string {
  const organization = clean(requisites.organization);
  return `Калькулятор ${name}${organization ? `: ${organization}` : ''}`;
}

/** «из 21 направления», «из 19 направлений». */
const ofDirections = (count: number): string =>
  `${count} ${pluralRu(count, ['направления', 'направлений', 'направлений'])}`;

export function kziOffer(result: KziResult, requisites: Requisites): Offer {
  if (result.value <= 0) return { text: 'Получить консультацию по экспресс-повышению уровня защищенности:' };
  const head = `Кзи ${formatKzi(result.value)} (${result.level.name.toLowerCase()})`;
  if (result.value >= KZI_TARGET) {
    return {
      text: 'Нормированное значение достигнуто. Поможем подготовить подтверждающие документы по приложению № 1 к Методике.',
      action: {
        label: 'Написать нам',
        href: mailtoHref(subject('Кзи', requisites), [
          'Добрый день.',
          'Прошу проконсультировать по подготовке подтверждающих документов.',
          `${head}.`,
          contactLine(requisites),
        ]),
      },
    };
  }
  const unmet = result.indicators.filter(item => !item.met).map(item => item.indicator.code);
  const zeroed = result.groups.filter(group => group.zeroed).map(group => `R${group.group.id}`);
  const text = unmet.length
    ? `Не выполнено показателей: ${unmet.length} из ${KZI_INDICATORS.length}. Поможем выполнить меры до следующей оценки.`
    : `Обнулены весовые коэффициенты: ${zeroed.join(', ')}. Поможем устранить причины до следующей оценки.`;
  const detail = unmet.length
    ? `, не выполнены показатели: ${unmet.join(', ')}`
    : `, обнулены весовые коэффициенты: ${zeroed.join(', ')}`;
  return {
    text,
    action: {
      label: 'Получить план повышения',
      href: mailtoHref(subject('Кзи', requisites), [
        'Добрый день.',
        'Прошу подготовить план повышения показателя защищенности.',
        `${head}${detail}.`,
        contactLine(requisites),
      ]),
    },
  };
}

export function uziOffer(result: UziResult, requisites: Requisites): Offer {
  const generic: Offer = { text: 'Получить консультацию по экспресс-повышению уровня зрелости:' };
  const assessed = result.included.filter(direction => direction.answered > 0);
  if (!assessed.length || !result.level) return generic;
  const head = `Узи ${formatUzi(result.value)}, уровень «${result.level.name.toLowerCase()}», целевой уровень не ниже ${result.target}`;
  const weak = assessed.filter(direction => direction.level < result.target);
  if (weak.length) {
    const counts = new Map<number, number>();
    for (const direction of weak) {
      for (const gap of direction.gaps) counts.set(gap.type.id, (counts.get(gap.type.id) ?? 0) + 1);
    }
    const top = [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0] - b[0])
      .slice(0, 2)
      .map(([id]) => UZI_REQUIREMENT_TYPES[id - 1]?.name.toLowerCase() ?? '');
    return {
      text: `Основные недостатки: ${top.join(' и ')}. Поможем закрыть их до проверки Заказчиком.`,
      action: {
        label: 'Получить план повышения',
        href: mailtoHref(subject('Узи', requisites), [
          'Добрый день.',
          'Прошу подготовить план повышения уровня зрелости.',
          `${head}, ниже цели ${result.below} из ${ofDirections(result.count)}.`,
          `Основные недостатки по видам требований: ${top.join(', ')}.`,
          contactLine(requisites),
        ]),
      },
    };
  }
  if (assessed.length < result.count) return generic;
  return {
    text: 'Целевой уровень достигнут по всем направлениям. Подтвердить его можно внешней оценкой (п. 6 Методики).',
    action: {
      label: 'Запросить внешнюю оценку',
      href: mailtoHref(subject('Узи', requisites), [
        'Добрый день.',
        'Прошу рассмотреть внешнюю оценку уровня зрелости.',
        `${head}, достигнут по всем направлениям.`,
        contactLine(requisites),
      ]),
    },
  };
}
