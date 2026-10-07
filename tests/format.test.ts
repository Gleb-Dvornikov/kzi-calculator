import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { buildFileName, organizationShortName } from '../src/domain/common/fileName';
import {
  addMonths,
  formatD,
  formatDate,
  formatDateLong,
  formatFraction,
  formatKzi,
  formatP,
  formatUzi,
  formatWeight,
  pluralRu,
  withoutYo,
} from '../src/domain/common/format';

describe('Форматирование', () => {
  test('числа в долях', () => {
    assert.equal(formatKzi(10000), '1,00');
    assert.equal(formatKzi(9650), '0,965');
    assert.equal(formatKzi(7525), '0,7525');
    assert.equal(formatKzi(0), '0,00');
    assert.equal(formatWeight(30), '0,30');
    assert.equal(formatD(75), '0,075');
    assert.equal(formatP(450), '0,45');
    assert.equal(formatUzi(148), '1,48');
    assert.equal(formatFraction(455, 1), '45,5');
    assert.equal(formatFraction(450, 1), '45');
  });

  test('склонение', () => {
    const forms = ['направление', 'направления', 'направлений'] as const;
    assert.equal(pluralRu(1, forms), 'направление');
    assert.equal(pluralRu(3, forms), 'направления');
    assert.equal(pluralRu(11, forms), 'направлений');
    assert.equal(pluralRu(21, forms), 'направление');
    assert.equal(pluralRu(112, forms), 'направлений');
  });

  test('даты', () => {
    const date = new Date(2026, 9, 7);
    assert.equal(formatDate(date), '07.10.2026');
    assert.equal(formatDateLong(date), '7 октября 2026 г.');
    assert.equal(formatDate(addMonths(date, 6)), '07.04.2027');
    assert.equal(formatDate(addMonths(new Date(2026, 7, 31), 6)), '28.02.2027');
    assert.equal(formatDate(addMonths(new Date(2027, 7, 31), 6)), '29.02.2028');
    assert.equal(formatDate(addMonths(date, 24)), '07.10.2028');
  });

  test('буква ё', () => {
    assert.equal(withoutYo('Отчёт, ЁЛКА'), 'Отчет, ЕЛКА');
  });

  test('имена файлов', () => {
    assert.equal(organizationShortName('ООО «Ромашка»'), 'Ромашка');
    assert.equal(organizationShortName('АО "Северная звезда"'), 'Северная_звезда');
    assert.equal(organizationShortName('ФГБУ ЦНИИ связи'), 'ЦНИИ_связи');
    assert.equal(organizationShortName('  '), '');
    assert.equal(buildFileName(['Кзи', 'Ромашка'], new Date(2026, 9, 7), 'json'), 'Кзи_Ромашка_07.10.2026.json');
    assert.equal(buildFileName(['Кзи', ''], new Date(2026, 9, 7), 'json'), 'Кзи_07.10.2026.json');
  });
});
