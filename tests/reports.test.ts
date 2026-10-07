import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { Packer } from 'docx';
import { calculateKzi } from '../src/domain/kzi/calculate';
import { calculateUzi } from '../src/domain/uzi/calculate';
import { UZI_DIRECTIONS } from '../src/domain/uzi/methodology';
import { buildReminder, foldIcsLine } from '../src/reports/ics';
import { buildReport } from '../src/reports';
import { buildKziLetter, letterAttachments } from '../src/reports/kziReports';
import { documentText, type ReportDocument } from '../src/reports/model';
import { buildDocx, columnWidths, CONTENT_WIDTH } from '../src/reports/renderDocx';
import type { AppState } from '../src/state/types';
import { fixedDate, kziAnswers, sampleState, withAnswers } from './helpers';

function kziState(): AppState {
  const state = sampleState();
  state.kzi = kziAnswers({ unmet: ['k36'] });
  state.kzi.ratios['k22.coverage'] = { total: 40, part: 18 };
  state.kzi.evidence = {
    k11: [
      { id: '1', title: 'Приказ о назначении ответственного № 15.', sheets: 2 },
      { id: '2', title: '   ', sheets: null },
    ],
    k22: [{ id: '3', title: 'Снимок экрана средства аутентификации', sheets: 1 }],
    k43: [{ id: '4', title: 'Регламент реагирования на инциденты', sheets: null }],
  };
  state.kzi.notes = { 2: 'Первая строка\nВторая строка' };
  return state;
}

function uziState(): AppState {
  const state = sampleState();
  state.mode = 'uzi';
  state.uzi.target = 2;
  for (const direction of UZI_DIRECTIONS) state.uzi.values[direction.id] = [10, 10, 5, 5, 5, 5, 0, 0];
  state.uzi.values[4] = [5, 5, 5, 0, 0, 0, 0, null];
  state.uzi.excluded = { 19: true };
  state.uzi.evidence = { 19: 'ИИ не применяется', 1: 'Политика ИБ\nПриказ № 7' };
  return state;
}

const text = (report: ReportDocument) => documentText(report.blocks);

describe('Письмо во ФСТЭК России', () => {
  const state = kziState();
  const result = calculateKzi(state.kzi);
  const letter = buildKziLetter({ result, requisites: state.requisites, kzi: state.kzi, date: fixedDate });
  const content = text(letter);

  test('адресат с полным наименованием округа', () => {
    assert.match(content, /Руководителю\nУправления ФСТЭК России\nпо Уральскому федеральному округу\nО\.П\. Чувардину/);
  });

  test('обозначение Кзи, ссылка на приказ и значение с запятой', () => {
    assert.match(content, /Отчет о расчете показателя защищенности \(Кзи\)/);
    assert.match(content, /пп\. «а» п\. 31 Требований/);
    assert.match(content, /приказом ФСТЭК России от 11 апреля 2025 г\. № 117/);
    assert.match(content, /Показатель защищенности Кзи = 0,89/);
    assert.doesNotMatch(content, /КЗИ|\d{2}\.\d{2}\.\d{4} г\./);
  });

  test('приложение: документы выполненных показателей', () => {
    // k22 не выполнен (18 из 40), поэтому его документ в приложение не попадает
    assert.deepEqual(letterAttachments(result, state.kzi.evidence), [
      { title: 'Приказ о назначении ответственного № 15', sheets: 2 },
      { title: 'Регламент реагирования на инциденты', sheets: null },
    ]);
    assert.match(
      content,
      /Приложение:\nПриказ о назначении ответственного № 15 на 2 л\. в 1 экз\.\nРегламент реагирования на инциденты на __ л\. в 1 экз\./
    );
  });

  test('подпись и исполнитель', () => {
    assert.match(content, /Генеральный директор __________________ \/ И\.И\. Иванов/);
    assert.match(content, /П\.П\. Петров\n\+7 \(343\) 000-00-00\npetrov@example\.ru/);
    assert.equal(letter.fileName, 'Отчет_Кзи_Ромашка_07.10.2026.docx');
  });

  test('в письме нет контактов УЦСБ', () => {
    assert.doesNotMatch(content, /cybersec@ussc\.ru/);
  });
});

describe('Текущий отчет по Кзи', () => {
  const state = kziState();
  state.kzi = withAnswers(state.kzi, { repeatedFailure: { 3: true } });
  const report = buildReport('kziCurrent', state, fixedDate);
  const content = text(report);

  test('расчет, обнуление и формула', () => {
    assert.match(content, /Текущее значение Кзи: 0,575/);
    assert.match(content, /Весовые коэффициенты обнулены: R3 \(показатель группы не выполнен повторно/);
    assert.match(content, /\(0,20 \+ 0,25 \+ 0,15 \+ 0,15 \+ 0,15 \+ 0\) × 0,00 \+/);
  });

  test('что мешает: обнуленная группа, затем показатели по убыванию вклада', () => {
    const order = [...content.matchAll(/^(R3 = 0\.|k\d\d \(вклад [\d,]+\)\.)/gm)].map(match => match[1]);
    assert.deepEqual(order, ['R3 = 0.', 'k22 (вклад 0,075).', 'k36 (вклад 0,035).']);
    assert.match(content, /из них используют второй фактор|45% при требовании не менее 50%/);
  });

  test('документы, заметки, контакты и сокращения', () => {
    assert.match(content, /Указаны в калькуляторе \(войдут в приложение к письму\)/);
    assert.match(content, /Первая строка\nВторая строка/);
    assert.match(content, /cybersec@ussc\.ru/);
    assert.match(content, /Сокращения\nКзи - показатель защищенности/);
    assert.match(content, /ОРД - организационно-распорядительный документ/);
  });
});

describe('Отчет по Узи', () => {
  const state = uziState();
  const full = buildReport('uziFull', state, fixedDate);
  const current = buildReport('uziCurrent', state, fixedDate);
  const fullText = text(full);

  test('состав п. 35: разделы 1-14 и блок утверждения', () => {
    const sections = full.blocks
      .flatMap(block => (block.type === 'heading' && block.level === 2 ? [block.lines[0] ?? ''] : []))
      .filter(title => /^\d+\. /.test(title))
      .map(title => Number.parseInt(title, 10));
    assert.deepEqual(sections, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]);
    assert.match(fullText, /^УТВЕРЖДАЮ/);
    assert.match(fullText, /ОТЧЕТ\nоб оценке уровня зрелости/);
    assert.match(fullText, /Заказчик \(оператор\), для которого проводится оценка: АО «Заказчик»/);
  });

  test('расчет Узи и исключенное направление', () => {
    const result = calculateUzi(state.uzi);
    assert.equal(result.count, 20);
    assert.match(fullText, new RegExp(`Узи = \\(Σ текущих уровней направлений\\) / N = ${result.sum} / 20`));
    assert.match(fullText, /19\. Защита информации при использовании искусственного интеллекта: ИИ не применяется/);
    assert.match(fullText, /По 1 виду требований сведения не представлены/);
  });

  test('рабочий отчет без реквизитов, но с контактами', () => {
    const currentText = text(current);
    assert.doesNotMatch(currentText, /УТВЕРЖДАЮ/);
    assert.match(currentText, /cybersec@ussc\.ru/);
    assert.equal(current.fileName, 'Текущий_отчет_Узи_Ромашка_07.10.2026.docx');
  });
});

describe('Файл .docx', () => {
  test('ширины колонок в сумме равны ширине текста', () => {
    const widths = columnWidths([6, 38, 7, 7, 7, 7, 7, 7, 7, 7]);
    assert.equal(
      widths.reduce((a, b) => a + b, 0),
      CONTENT_WIDTH
    );
  });

  test('все отчеты собираются в .docx', async () => {
    for (const [kind, state] of [
      ['kziLetter', kziState()],
      ['kziCurrent', kziState()],
      ['uziFull', uziState()],
      ['uziCurrent', uziState()],
    ] as const) {
      const buffer = await Packer.toBuffer(buildDocx(buildReport(kind, state, fixedDate)));
      assert.equal(buffer.subarray(0, 2).toString(), 'PK', kind);
      assert.ok(buffer.length > 5000, kind);
    }
  });
});

describe('Напоминание .ics', () => {
  const reminder = buildReminder({
    mode: 'kzi',
    organization: 'ООО «Ромашка», филиал; отдел',
    assessedAt: fixedDate,
    calculatorUrl: 'https://example.ru/kzi/#kzi',
    now: new Date(Date.UTC(2026, 9, 7, 9, 0, 0)),
    uid: 'test@kzi-calculator',
  });

  test('срок через 6 месяцев, оповещение за 14 дней', () => {
    assert.match(reminder.content, /\r\nDTSTART;VALUE=DATE:20270407\r\nDTEND;VALUE=DATE:20270408\r\n/);
    assert.match(reminder.content, /TRIGGER:-P14D/);
    assert.match(reminder.content, /DTSTAMP:20261007T090000Z/);
    assert.equal(reminder.fileName, 'Напоминание_Кзи_Ромашка_07.04.2027.ics');
  });

  test('экранирование и перенос длинных строк', () => {
    const unfolded = reminder.content.replace(/\r\n /g, '');
    assert.match(unfolded, /SUMMARY:Срок оценки Кзи: ООО «Ромашка»\\, филиал\\; отдел\r\n/);
    assert.match(unfolded, /DESCRIPTION:Показатель защищенности \(Кзи\) оценивается не реже одного раза в 6 месяцев/);
    const encoder = new TextEncoder();
    for (const line of reminder.content.split('\r\n')) assert.ok(encoder.encode(line).length <= 75, line);
    assert.ok(reminder.content.endsWith('END:VCALENDAR\r\n'));
  });

  test('Узи: срок через 2 года', () => {
    const uzi = buildReminder({ mode: 'uzi', organization: '', assessedAt: fixedDate, calculatorUrl: 'https://x.ru' });
    assert.equal(uzi.fileName, 'Напоминание_Узи_07.10.2028.ics');
  });

  test('перенос не разрывает символы', () => {
    const folded = foldIcsLine(`DESCRIPTION:${'я'.repeat(100)}`);
    assert.equal(folded.replace(/\r\n /g, ''), `DESCRIPTION:${'я'.repeat(100)}`);
  });
});
