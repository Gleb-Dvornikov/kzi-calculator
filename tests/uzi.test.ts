import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  calculateDirectionLevel,
  calculateUzi,
  findRequirementGaps,
  normalizeDirectionValues,
} from '../src/domain/uzi/calculate';
import { UZI_DIRECTIONS, UZI_REQUIREMENT_TYPES } from '../src/domain/uzi/methodology';
import type { TargetLevel } from '../src/domain/uzi/types';
import { createUziState } from '../src/state/defaults';

/** Независимая запись таблицы 3 в десятичных дробях, как в тексте Методики. */
const W = [0.15, 0.2, 0.1, 0.1, 0.15, 0.1, 0.1, 0.1];
const eq = (a: number, b: number) => Math.abs(a - b) < 1e-9;
const ge = (a: number, b: number) => a > b - 1e-9;

function referenceLevel(values: number[]): { level: number; total: number } {
  const d = values.map((a, i) => (W[i] ?? 0) * (a / 10));
  const p = d.reduce((s, x) => s + x, 0);
  const [d1 = 0, d2 = 0, d3 = 0, d4 = 0, d5 = 0, d6 = 0, d7 = 0, d8 = 0] = d;
  const l1 = ge(d1, 0.075) && ge(d2, 0.1) && ge(d3, 0.05) && ge(p, 0.225);
  const l2 = l1 && ge(d4, 0.05) && ge(d5, 0.075) && ge(p, 0.35);
  const l3 = eq(d1, 0.15) && eq(d2, 0.2) && ge(d3, 0.05) && ge(d4, 0.05) && eq(d5, 0.15) && ge(d6, 0.05) && ge(p, 0.65);
  const l4 = l3 && eq(d6, 0.1) && eq(d7, 0.1) && eq(d8, 0.1) && ge(p, 0.9);
  return { level: l4 ? 4 : l3 ? 3 : l2 ? 2 : l1 ? 1 : 0, total: p };
}

function allCombinations(): number[][] {
  let combos: number[][] = [[]];
  for (const type of UZI_REQUIREMENT_TYPES) {
    combos = combos.flatMap(combo => type.options.map(option => [...combo, option.value]));
  }
  return combos;
}

describe('Уровень направления по таблице 3', () => {
  const combos = allCombinations();

  test('перебор всех 8748 комбинаций совпадает с независимой записью таблицы 3', () => {
    assert.equal(combos.length, 8748);
    const histogram = [0, 0, 0, 0, 0];
    for (const values of combos) {
      const actual = calculateDirectionLevel(values);
      const expected = referenceLevel(values);
      assert.equal(actual.level, expected.level, `уровень для ${values.join(',')}`);
      assert.ok(Math.abs(actual.total / 1000 - expected.total) < 1e-9, `Pзн для ${values.join(',')}`);
      histogram[actual.level] = (histogram[actual.level] ?? 0) + 1;
    }
    assert.ok(
      histogram.every(count => count > 0),
      'встречаются все уровни'
    );
  });

  test('недостатки до цели: их устранение достаточно, а каждое требуемое значение минимально', () => {
    for (const values of combos) {
      const { level, degrees } = calculateDirectionLevel(values);
      for (let target = level + 1; target <= 4; target++) {
        const gaps = findRequirementGaps(values, degrees, target as TargetLevel);
        assert.ok(gaps.length > 0);
        const fixed = [...values];
        for (const gap of gaps) fixed[gap.type.id - 1] = gap.required;
        assert.ok(referenceLevel(fixed).level >= target, `недостаточно для ${values.join(',')} -> ${target}`);
        for (const gap of gaps) {
          for (const option of gap.type.options.filter(o => o.value < gap.required)) {
            const lower = [...fixed];
            lower[gap.type.id - 1] = option.value;
            assert.ok(referenceLevel(lower).level < target, `не минимально для ${values.join(',')} -> ${target}`);
          }
        }
      }
    }
  });

  test('без ответов уровень 0', () => {
    const result = calculateDirectionLevel(Array(8).fill(null));
    assert.equal(result.level, 0);
    assert.equal(result.total, 0);
  });

  test('недопустимые значения отбрасываются', () => {
    assert.deepEqual(normalizeDirectionValues([3, 5, 10, 7, null, 3, 0]), [null, 5, 10, null, null, 3, 0, null]);
  });
});

describe('Расчет Узи', () => {
  const full = () => {
    const state = createUziState();
    for (const direction of UZI_DIRECTIONS) state.values[direction.id] = [10, 10, 10, 10, 10, 10, 10, 10];
    return state;
  };

  test('все направления на уровне 4', () => {
    const result = calculateUzi(full());
    assert.equal(result.count, 21);
    assert.equal(result.sum, 84);
    assert.equal(result.value, 400);
    assert.equal(result.level?.name, 'Верифицируемый');
    assert.equal(result.reached, 21);
  });

  test('без ответов: Узи = 0, уровень нулевой, вопросов 21 * 8', () => {
    const result = calculateUzi(createUziState());
    assert.equal(result.value, 0);
    assert.equal(result.level?.index, 0);
    assert.equal(result.questions, 168);
    assert.equal(result.answered, 0);
    assert.equal(result.assessed, 0);
  });

  test('исключенные направления не входят в N', () => {
    const state = full();
    state.excluded = { 19: true, 13: true };
    const result = calculateUzi(state);
    assert.equal(result.count, 19);
    assert.equal(result.value, 400);
  });

  test('все направления исключены: уровня нет', () => {
    const state = createUziState();
    state.excluded = Object.fromEntries(UZI_DIRECTIONS.map(d => [d.id, true]));
    const result = calculateUzi(state);
    assert.equal(result.count, 0);
    assert.equal(result.level, null);
    assert.equal(result.value, 0);
  });

  test('Узи округляется до сотых, уровень определяется без округления', () => {
    const state = createUziState();
    // 10 направлений на уровне 2, 11 на уровне 1: S = 31, N = 21, Узи = 1,476...
    const level2 = [5, 5, 5, 5, 5, 0, 0, 0];
    const level1 = [5, 5, 5, 0, 0, 0, 0, 0];
    for (const direction of UZI_DIRECTIONS) state.values[direction.id] = direction.id <= 10 ? level2 : level1;
    const result = calculateUzi(state);
    assert.equal(result.sum, 31);
    assert.equal(result.value, 148);
    assert.equal(result.level?.name, 'Начальный');
  });

  test('недостатки считаются до целевого уровня', () => {
    const state = createUziState();
    state.values[1] = [5, 5, 5, 0, 0, 0, 0, 0];
    state.target = 2;
    const direction = calculateUzi(state).directions[0];
    assert.equal(direction?.level, 1);
    assert.deepEqual(
      direction?.gaps.map(gap => [gap.type.id, gap.required]),
      [
        [4, 5],
        [5, 5],
      ]
    );
  });
});
