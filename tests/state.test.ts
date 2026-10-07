import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { STORAGE_KEYS } from '../src/config';
import { createDefaultState } from '../src/state/defaults';
import { exportFileName, parseSavedFile, serializeState } from '../src/state/file';
import { migrateFromV2, migrateFromV3, normalizeState } from '../src/state/normalize';
import { reducer } from '../src/state/reducer';
import { loadState, saveState, type KeyValueStorage } from '../src/state/storage';
import { fixedDate, sampleState } from './helpers';

function memoryStorage(initial: Record<string, string> = {}): KeyValueStorage & { data: Record<string, string> } {
  const data = { ...initial };
  return {
    data,
    getItem: key => data[key] ?? null,
    setItem: (key, value) => {
      data[key] = value;
    },
  };
}

/** Сохраненное состояние версии 3 (как в localStorage живого сайта). */
const V3_SAMPLE = {
  v: 3,
  mode: 'uzi',
  form: {
    region: 'ufo',
    org: 'ООО «Ромашка»',
    post: 'Директор',
    head: 'И.И. Иванов',
    executor: 'П.П. Петров',
    executorPost: 'Инженер',
    phone: '+7 343 000-00-00',
    email: 'p@example.ru',
    customer: '',
  },
  info: { about: true, useful: false, zero: true, uabout: true, uuseful: false },
  kzi: {
    items: {
      k11: [true, true],
      k22: [true, true, true],
      k33: [true, true, false],
      k42: [true, false],
      k21: [true, 'yes', true, false],
    },
    na: { k13: true, k11: true },
    notes: { 1: 'Заметка по группе 1', 2: '' },
    open: { 1: false, 2: true, 3: true, 4: false },
    zero: { pa: true, pv: false, pg: false, r1: false, r2: true, r3: false, r4: false },
  },
  uzi: {
    a: { 1: [10, 5, 0, null, 3, 3, 0, 10], 2: [5, 5, 5, 5, 5, 5, 5, 5] },
    na: { 19: true },
    notes: { 1: 'Положение о защите информации', 19: 'ИИ не применяется' },
    open: { 1: false, 2: true },
    target: 2,
  },
};

describe('Перенос данных версии 3', () => {
  const state = migrateFromV3(V3_SAMPLE);

  test('реквизиты и адресат', () => {
    assert.equal(state.mode, 'uzi');
    assert.equal(state.requisites.organization, 'ООО «Ромашка»');
    assert.equal(state.requisites.headPosition, 'Директор');
    assert.equal(state.requisites.executorPosition, 'Инженер');
    assert.equal(state.requisites.fstecOffice, 'urfo');
    assert.equal(state.requisites.addresseeHead, 'О.П. Чувардину');
  });

  test('отметки критериев переносятся по позициям версии 3', () => {
    assert.deepEqual(Object.keys(state.kzi.checks).sort(), [
      'k11.duties',
      'k11.order',
      'k21.policy',
      'k21.settings',
      'k22.tool',
      'k33.scan',
      'k42.events',
    ]);
    assert.deepEqual(state.kzi.ratios, {});
    assert.deepEqual(state.kzi.notApplicable, { k13: true });
    assert.deepEqual(state.kzi.zeroTests, { accounts: true });
    assert.deepEqual(state.kzi.repeatedFailure, { 2: true });
    assert.deepEqual(state.kzi.notes, { 1: 'Заметка по группе 1' });
  });

  test('ответы Узи, исключения, документы и цель', () => {
    assert.deepEqual(state.uzi.values[1], [10, 5, 0, null, null, 3, 0, 10]);
    assert.deepEqual(state.uzi.values[2], [5, 5, 5, 5, 5, 5, 5, 5]);
    assert.deepEqual(state.uzi.values[3], [null, null, null, null, null, null, null, null]);
    assert.deepEqual(state.uzi.excluded, { 19: true });
    assert.equal(state.uzi.evidence[19], 'ИИ не применяется');
    assert.equal(state.uzi.target, 2);
  });

  test('раскрытые блоки: «Информация о калькуляторе» свернута', () => {
    assert.equal(state.ui.sections.kziAbout, false);
    assert.equal(state.ui.sections.uziAbout, false);
    assert.equal(state.ui.sections.kziZero, true);
    assert.equal(state.ui.sections.kziUseful, false);
    assert.equal(state.ui.kziGroups[1], false);
    assert.deepEqual(state.ui.uziDirections, { 2: true });
  });

  test('версия 2: только реквизиты и заметки', () => {
    const v2 = migrateFromV2({ form: { org: 'АО «Север»', region: 'cfo' }, notes: { 3: 'Текст' }, open: { 3: false } });
    assert.equal(v2.requisites.organization, 'АО «Север»');
    assert.equal(v2.requisites.fstecOffice, 'cfo');
    assert.equal(v2.requisites.addresseeHead, 'О.В. Райкову');
    assert.deepEqual(v2.kzi.notes, { 3: 'Текст' });
    assert.deepEqual(v2.kzi.checks, {});
  });
});

describe('Проверка сохраненных данных', () => {
  test('мусор превращается в состояние по умолчанию', () => {
    for (const raw of [null, 42, 'text', [], { mode: 'x', kzi: 'y', uzi: [], requisites: 5 }]) {
      assert.deepEqual(normalizeState(raw), createDefaultState());
    }
  });

  test('отбрасываются неизвестные критерии и некорректные числа', () => {
    const state = normalizeState({
      kzi: {
        checks: { 'k11.order': true, 'k99.fake': true, 'k11.duties': 'true' },
        ratios: {
          'k22.coverage': { total: 40, part: 18 },
          'k31.coverage': { total: -1, part: 2.5 },
          'k11.order': { total: 1, part: 1 },
        },
        notApplicable: { k13: true, k11: true },
        evidence: { k11: [{ id: 'a', title: 'Приказ', sheets: 3 }, { title: 5 }, 'x'] },
      },
    });
    assert.deepEqual(state.kzi.checks, { 'k11.order': true });
    assert.deepEqual(state.kzi.ratios, { 'k22.coverage': { total: 40, part: 18 } });
    assert.deepEqual(state.kzi.notApplicable, { k13: true });
    assert.deepEqual(state.kzi.evidence, { k11: [{ id: 'a', title: 'Приказ', sheets: 3 }] });
  });
});

describe('Хранилище браузера', () => {
  test('актуальная версия важнее старых ключей', () => {
    const current = sampleState();
    current.kzi.checks['k43.order'] = true;
    const storage = memoryStorage({
      [STORAGE_KEYS.current]: JSON.stringify(current),
      [STORAGE_KEYS.legacyV3]: JSON.stringify(V3_SAMPLE),
    });
    const loaded = loadState(storage);
    assert.equal(loaded.source, 'current');
    assert.deepEqual(loaded.state, normalizeState(current));
  });

  test('перенос из версии 3 и поврежденные данные', () => {
    assert.equal(loadState(memoryStorage({ [STORAGE_KEYS.legacyV3]: JSON.stringify(V3_SAMPLE) })).source, 'v3');
    assert.equal(loadState(memoryStorage({ [STORAGE_KEYS.current]: '{oops' })).source, 'empty');
    assert.equal(loadState(null).source, 'empty');
  });

  test('сохранение пишет только новый ключ', () => {
    const storage = memoryStorage({ [STORAGE_KEYS.legacyV3]: 'old' });
    saveState(sampleState(), storage);
    assert.ok(storage.data[STORAGE_KEYS.current]);
    assert.equal(storage.data[STORAGE_KEYS.legacyV3], 'old');
  });
});

describe('Файл с ответами', () => {
  test('сохранение и загрузка возвращают те же данные', () => {
    const state = sampleState();
    state.kzi.checks['k11.order'] = true;
    state.kzi.ratios['k22.coverage'] = { total: 40, part: 18 };
    state.kzi.evidence.k11 = [{ id: 'doc1', title: 'Приказ № 15', sheets: 2 }];
    state.uzi.values[5] = [10, 10, 5, 5, 5, 3, 0, 0];
    const parsed = parseSavedFile(serializeState(state, fixedDate));
    assert.ok(parsed.ok);
    if (parsed.ok) {
      assert.deepEqual(parsed.state, state);
      assert.equal(parsed.savedAt, fixedDate.toISOString());
    }
  });

  test('чужие и поврежденные файлы', () => {
    assert.deepEqual(parseSavedFile('not json'), { ok: false, error: 'Файл не читается: это не JSON.' });
    assert.equal(parseSavedFile('{"a":1}').ok, false);
    assert.equal(parseSavedFile(JSON.stringify({ format: 'checku-kzi-uzi', version: 3, state: {} })).ok, false);
  });

  test('имя файла: режим, организация и дата', () => {
    const state = sampleState();
    assert.equal(exportFileName(state, fixedDate), 'Кзи_Ромашка_07.10.2026.json');
    assert.equal(exportFileName({ ...state, mode: 'uzi' }, fixedDate), 'Узи_Ромашка_07.10.2026.json');
  });
});

describe('Изменения состояния', () => {
  test('отметки и числа', () => {
    let state = createDefaultState();
    state = reducer(state, { type: 'kzi/check', criterionId: 'k11.order', checked: true });
    assert.deepEqual(state.kzi.checks, { 'k11.order': true });
    state = reducer(state, { type: 'kzi/check', criterionId: 'k11.order', checked: false });
    assert.deepEqual(state.kzi.checks, {});
    state = reducer(state, { type: 'kzi/ratio', criterionId: 'k22.coverage', field: 'total', value: 40 });
    assert.deepEqual(state.kzi.ratios['k22.coverage'], { total: 40, part: null });
    state = reducer(state, { type: 'kzi/ratio', criterionId: 'k22.coverage', field: 'total', value: null });
    assert.deepEqual(state.kzi.ratios, {});
  });

  test('документы', () => {
    let state = reducer(createDefaultState(), { type: 'kzi/evidenceAdd', code: 'k11', title: 'Приказ' });
    const id = state.kzi.evidence.k11?.[0]?.id ?? '';
    state = reducer(state, { type: 'kzi/evidenceUpdate', code: 'k11', id, patch: { sheets: 3 } });
    assert.deepEqual(state.kzi.evidence.k11, [{ id, title: 'Приказ', sheets: 3 }]);
    state = reducer(state, { type: 'kzi/evidenceRemove', code: 'k11', id });
    assert.deepEqual(state.kzi.evidence, {});
  });

  test('сброс оставляет документы и заметки', () => {
    let state = sampleState();
    state = reducer(state, { type: 'kzi/check', criterionId: 'k11.order', checked: true });
    state = reducer(state, { type: 'kzi/zeroTest', key: 'accounts', value: true });
    state = reducer(state, { type: 'kzi/note', group: 1, text: 'Заметка' });
    state = reducer(state, { type: 'kzi/evidenceAdd', code: 'k11', title: 'Приказ' });
    state = reducer(state, { type: 'kzi/resetAnswers' });
    assert.deepEqual(state.kzi.checks, {});
    assert.deepEqual(state.kzi.zeroTests, {});
    assert.equal(state.kzi.notes[1], 'Заметка');
    assert.equal(state.kzi.evidence.k11?.length, 1);
  });

  test('смена управления ФСТЭК России подставляет руководителя', () => {
    const state = reducer(createDefaultState(), { type: 'requisites/office', office: 'szfo' });
    assert.equal(state.requisites.addresseeHead, 'С.В. Железкову');
  });

  test('следующее направление', () => {
    const state = reducer(createDefaultState(), { type: 'ui/nextDirection', direction: 1 });
    assert.deepEqual(state.ui.uziDirections, { 2: true });
  });
});
