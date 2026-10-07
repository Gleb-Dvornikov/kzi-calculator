import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { calculateKzi } from '../src/domain/kzi/calculate';
import { kziOffer, mailtoHref, uziOffer } from '../src/domain/offer';
import { calculateUzi } from '../src/domain/uzi/calculate';
import { UZI_DIRECTIONS } from '../src/domain/uzi/methodology';
import { createDefaultState, createUziState } from '../src/state/defaults';
import { kziAnswers, sampleState, withAnswers } from './helpers';

const decodeBody = (href: string) => decodeURIComponent(href.split('&body=')[1] ?? '');

describe('Предложение помощи', () => {
  const requisites = sampleState().requisites;

  test('Кзи без ответов: консультация без ссылки на письмо', () => {
    const offer = kziOffer(calculateKzi(createDefaultState().kzi), requisites);
    assert.equal(offer.action, undefined);
    assert.match(offer.text, /консультацию/);
  });

  test('Кзи ниже нормы: план повышения со списком показателей', () => {
    const offer = kziOffer(calculateKzi(kziAnswers({ unmet: ['k36', 'k22'] })), requisites);
    assert.equal(offer.text, 'Не выполнено показателей: 2 из 16. Поможем выполнить меры до следующей оценки.');
    assert.equal(offer.action?.label, 'Получить план повышения');
    const href = offer.action?.href ?? '';
    assert.ok(href.startsWith('mailto:cybersec@ussc.ru?subject='));
    assert.equal(decodeURIComponent(href.split('subject=')[1]?.split('&')[0] ?? ''), 'Калькулятор Кзи: ООО «Ромашка»');
    assert.match(decodeBody(href), /Кзи 0,89 \(низкий\), не выполнены показатели: k22, k36\./);
    assert.match(decodeBody(href), /\r\nКонтакт: П\.П\. Петров, \+7 \(343\) 000-00-00, petrov@example\.ru$/);
  });

  test('Кзи обнулен при выполненных показателях', () => {
    const offer = kziOffer(calculateKzi(withAnswers(kziAnswers(), { zeroTests: { accounts: true } })), requisites);
    assert.equal(offer.text, 'Обнулены весовые коэффициенты: R2. Поможем устранить причины до следующей оценки.');
  });

  test('Кзи = 1: помощь с документами', () => {
    const offer = kziOffer(calculateKzi(kziAnswers()), requisites);
    assert.equal(offer.action?.label, 'Написать нам');
  });

  test('Узи ниже цели: два вида требований с наибольшим числом недостатков', () => {
    const uzi = createUziState();
    uzi.target = 2;
    uzi.values[1] = [5, 5, 5, 0, 0, 0, 0, 0];
    uzi.values[2] = [5, 5, 0, 0, 5, 0, 0, 0];
    const offer = uziOffer(calculateUzi(uzi), requisites);
    assert.equal(
      offer.text,
      'Основные недостатки: квалификация и инструменты. Поможем закрыть их до проверки Заказчиком.'
    );
    assert.match(decodeBody(offer.action?.href ?? ''), /ниже цели 21 из 21 направления\./);
  });

  test('Узи на цели по всем направлениям: внешняя оценка', () => {
    const uzi = createUziState();
    for (const direction of UZI_DIRECTIONS) uzi.values[direction.id] = [5, 5, 5, 0, 0, 0, 0, 0];
    const offer = uziOffer(calculateUzi(uzi), requisites);
    assert.equal(offer.action?.label, 'Запросить внешнюю оценку');
  });

  test('письмо: строки через CRLF, пустые пропускаются', () => {
    const href = mailtoHref('Тема', ['Первая', '', 'Вторая']);
    assert.equal(decodeBody(href), 'Первая\r\nВторая');
  });
});
