import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { calculateKzi, evaluateRatio, kziLevelFor, type KziBlocker } from '../src/domain/kzi/calculate';
import { KZI_GROUPS, KZI_INDICATORS } from '../src/domain/kzi/methodology';
import { kziAnswers, withAnswers, withRatio } from './helpers';

const blockerCodes = (blockers: KziBlocker[]) =>
  blockers.map(blocker =>
    blocker.kind === 'zeroedGroup' ? `R${blocker.group.group.id}` : blocker.result.indicator.code
  );

describe('Методика Кзи: данные', () => {
  test('весовые коэффициенты групп и значения показателей дают Кзи = 1', () => {
    assert.equal(
      KZI_GROUPS.reduce((sum, group) => sum + group.weight, 0),
      100
    );
    for (const group of KZI_GROUPS) {
      assert.equal(
        group.indicators.reduce((sum, indicator) => sum + indicator.weight, 0),
        100,
        `группа ${group.id}`
      );
    }
  });

  test('id критериев уникальны и начинаются с кода показателя', () => {
    const ids = new Set<string>();
    for (const { indicator } of KZI_INDICATORS) {
      const legacy = new Set<number>();
      for (const criterion of indicator.criteria) {
        assert.ok(criterion.id.startsWith(`${indicator.code}.`), criterion.id);
        assert.ok(!ids.has(criterion.id), `повтор ${criterion.id}`);
        ids.add(criterion.id);
        if (criterion.kind === 'check' && criterion.legacyIndex !== undefined) {
          assert.ok(!legacy.has(criterion.legacyIndex), `повтор legacyIndex в ${indicator.code}`);
          legacy.add(criterion.legacyIndex);
        }
      }
    }
    assert.equal(KZI_INDICATORS.length, 16);
  });

  test('пороги критериев с числами', () => {
    const thresholds = Object.fromEntries(
      KZI_INDICATORS.flatMap(({ indicator }) =>
        indicator.criteria.flatMap(c => (c.kind === 'ratio' ? [[c.id, c.thresholdPercent]] : []))
      )
    );
    assert.deepEqual(thresholds, {
      'k22.coverage': 50,
      'k31.coverage': 100,
      'k33.coverage': 90,
      'k34.coverage': 80,
      'k35.coverage': 80,
      'k42.coverage': 100,
    });
  });
});

describe('Расчет Кзи', () => {
  test('без ответов Кзи = 0, критический уровень', () => {
    const result = calculateKzi(withAnswers(kziAnswers(), { checks: {}, ratios: {} }));
    assert.equal(result.value, 0);
    assert.equal(result.level.id, 'critical');
    assert.equal(result.hasAnswers, false);
    assert.equal(result.blockers.length, 16);
  });

  test('все показатели выполнены: Кзи = 1', () => {
    const result = calculateKzi(kziAnswers());
    assert.equal(result.value, 10000);
    assert.equal(result.level.id, 'base');
    assert.equal(result.metIndicators, 16);
    assert.deepEqual(result.blockers, []);
  });

  test('не выполнен k36: Кзи = 0,965, низкий уровень', () => {
    const result = calculateKzi(kziAnswers({ unmet: ['k36'] }));
    assert.equal(result.value, 9650);
    assert.equal(result.level.id, 'low');
    assert.deepEqual(blockerCodes(result.blockers), ['k36']);
  });

  test('границы уровней по таблице 2', () => {
    assert.equal(kziLevelFor(10000).id, 'base');
    assert.equal(kziLevelFor(9999).id, 'low');
    assert.equal(kziLevelFor(7501).id, 'low');
    assert.equal(kziLevelFor(7500).id, 'critical');
    assert.equal(calculateKzi(kziAnswers({ unmet: ['k41', 'k21', 'k33'] })).value, 7525);
    assert.equal(calculateKzi(kziAnswers({ unmet: ['k41', 'k21', 'k33'] })).level.id, 'low');
    assert.equal(calculateKzi(kziAnswers({ unmet: ['k41', 'k42', 'k11'] })).value, 7450);
    assert.equal(calculateKzi(kziAnswers({ unmet: ['k41', 'k42', 'k11'] })).level.id, 'critical');
    assert.equal(calculateKzi(kziAnswers({ unmet: ['k21', 'k22', 'k23', 'k24'] })).value, 7500);
    assert.equal(calculateKzi(kziAnswers({ unmet: ['k21', 'k22', 'k23', 'k24'] })).level.id, 'critical');
  });

  test('неприменимый показатель засчитывается со значением по таблице 1', () => {
    const answers = withAnswers(kziAnswers({ unmet: ['k13'] }), { notApplicable: { k13: true } });
    const result = calculateKzi(answers);
    assert.equal(result.value, 10000);
    assert.equal(result.indicators.find(item => item.indicator.code === 'k13')?.status, 'notApplicable');
  });

  test('неприменимость без сноски Методики не учитывается', () => {
    const answers = withAnswers(kziAnswers({ unmet: ['k11'] }), { notApplicable: { k11: true } });
    assert.equal(calculateKzi(answers).value, 10000 - 300);
  });

  test('результаты тестирования обнуляют весовые коэффициенты групп', () => {
    assert.equal(calculateKzi(withAnswers(kziAnswers(), { zeroTests: { accounts: true } })).value, 7500);
    assert.equal(calculateKzi(withAnswers(kziAnswers(), { zeroTests: { vulnerabilities: true } })).value, 6500);
    const both = calculateKzi(withAnswers(kziAnswers(), { zeroTests: { unacceptableEvents: true } }));
    assert.equal(both.value, 4000);
    assert.deepEqual(blockerCodes(both.blockers), ['R2', 'R3']);
  });

  test('п. 35: обнуление действует, только пока в группе есть невыполненный показатель', () => {
    const allMet = calculateKzi(withAnswers(kziAnswers(), { repeatedFailure: { 3: true } }));
    assert.equal(allMet.value, 10000);
    const withGap = calculateKzi(withAnswers(kziAnswers({ unmet: ['k36'] }), { repeatedFailure: { 3: true } }));
    assert.equal(withGap.value, 6500);
    assert.deepEqual(blockerCodes(withGap.blockers), ['R3', 'k36']);
  });

  test('показатели в перечне «что мешает» идут по убыванию R * k, при равенстве по порядку Методики', () => {
    const result = calculateKzi(kziAnswers({ unmet: ['k35', 'k33', 'k41', 'k11', 'k34'] }));
    assert.deepEqual(blockerCodes(result.blockers), ['k41', 'k33', 'k34', 'k35', 'k11']);
    assert.equal(result.blockers[0]?.kind === 'indicator' && result.blockers[0].result.potential, 1200);
  });
});

describe('Критерии с порогом', () => {
  test('пример из замечаний: 40 привилегированных, 18 со вторым фактором -> 45%, не выполнено', () => {
    assert.deepEqual(evaluateRatio({ total: 40, part: 18 }, 50), { status: 'unmet', percentTenths: 450 });
    assert.deepEqual(evaluateRatio({ total: 40, part: 20 }, 50), { status: 'met', percentTenths: 500 });
  });

  test('процент округляется вниз, сравнение точное', () => {
    assert.deepEqual(evaluateRatio({ total: 3, part: 2 }, 90), { status: 'unmet', percentTenths: 666 });
    assert.deepEqual(evaluateRatio({ total: 10, part: 9 }, 90), { status: 'met', percentTenths: 900 });
    assert.deepEqual(evaluateRatio({ total: 2001, part: 2000 }, 100), { status: 'unmet', percentTenths: 999 });
    assert.deepEqual(evaluateRatio({ total: 7, part: 7 }, 100), { status: 'met', percentTenths: 1000 });
    assert.deepEqual(evaluateRatio({ total: 1000, part: 799 }, 80), { status: 'unmet', percentTenths: 799 });
  });

  test('некорректные и пустые значения', () => {
    assert.deepEqual(evaluateRatio(undefined, 50), { status: 'empty', percentTenths: null });
    assert.deepEqual(evaluateRatio({ total: 10, part: null }, 50), { status: 'empty', percentTenths: null });
    assert.deepEqual(evaluateRatio({ total: 0, part: 0 }, 50), {
      status: 'invalid',
      percentTenths: null,
      problem: 'zeroTotal',
    });
    assert.deepEqual(evaluateRatio({ total: 5, part: 6 }, 50), {
      status: 'invalid',
      percentTenths: null,
      problem: 'partExceedsTotal',
    });
    assert.equal(evaluateRatio({ total: 5.5, part: 2 }, 50).status, 'empty');
  });

  test('показатель с порогом засчитывается только при достижении порога', () => {
    const below = calculateKzi(withRatio(kziAnswers(), 'k22.coverage', { total: 40, part: 18 }));
    assert.equal(below.value, 10000 - 750);
    const item = below.indicators.find(i => i.indicator.code === 'k22');
    assert.equal(item?.status, 'partial');
    const reached = calculateKzi(withRatio(kziAnswers(), 'k22.coverage', { total: 40, part: 20 }));
    assert.equal(reached.value, 10000);
  });
});
