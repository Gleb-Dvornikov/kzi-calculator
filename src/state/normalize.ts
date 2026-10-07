/**
 * Проверка и приведение сохраненных данных к актуальной схеме.
 * Данные приходят из хранилища браузера и из файлов пользователя, поэтому доверять их форме нельзя:
 * неизвестные поля отбрасываются, некорректные значения заменяются значениями по умолчанию.
 */
import type { RatioAnswer } from '../domain/kzi/calculate';
import { KZI_GROUPS, KZI_INDICATORS, KZI_ZERO_TEST_CONDITIONS } from '../domain/kzi/methodology';
import type { GroupId, ZeroTestKey } from '../domain/kzi/types';
import { getFstecOffice, isFstecOfficeId, type FstecOfficeId } from '../domain/fstec';
import { isMode } from '../domain/mode';
import { EMPTY_REQUISITES, type Requisites, type TextRequisite } from '../domain/requisites';
import { normalizeDirectionValues } from '../domain/uzi/calculate';
import { UZI_DIRECTIONS } from '../domain/uzi/methodology';
import type { TargetLevel } from '../domain/uzi/types';
import { createDefaultState, createUiState } from './defaults';
import type { AppState, EvidenceItem, KziState, SectionKey, UiState, UziState } from './types';

type Json = Record<string, unknown>;

export const LIMITS = {
  shortText: 300,
  longText: 5000,
  evidencePerIndicator: 30,
  count: 10_000_000,
  sheets: 9999,
} as const;

const isRecord = (value: unknown): value is Json =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const asRecord = (value: unknown): Json => (isRecord(value) ? value : {});
const text = (value: unknown, max: number): string | null => (typeof value === 'string' ? value.slice(0, max) : null);
const isTrue = (value: unknown): boolean => value === true;

/** Неотрицательное целое число в разумных пределах, иначе null. */
export function toCount(value: unknown, max: number = LIMITS.count): number | null {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= max ? value : null;
}

let idCounter = 0;
/** Уникальный id для элементов списков. */
export function createId(): string {
  idCounter += 1;
  const random = Math.random().toString(36).slice(2, 8);
  return `${Date.now().toString(36)}-${idCounter.toString(36)}-${random}`;
}

const TEXT_REQUISITES: TextRequisite[] = [
  'organization',
  'headPosition',
  'headName',
  'executorName',
  'executorPosition',
  'executorPhone',
  'executorEmail',
  'customer',
  'addresseeHead',
];

export function normalizeRequisites(raw: unknown): Requisites {
  const source = asRecord(raw);
  const result: Requisites = { ...EMPTY_REQUISITES };
  for (const key of TEXT_REQUISITES) {
    const value = text(source[key], LIMITS.shortText);
    if (value !== null) result[key] = value;
  }
  result.fstecOffice = isFstecOfficeId(source.fstecOffice) ? source.fstecOffice : EMPTY_REQUISITES.fstecOffice;
  if (text(source.addresseeHead, LIMITS.shortText) === null) {
    result.addresseeHead = getFstecOffice(result.fstecOffice).headDative;
  }
  return result;
}

function normalizeRatio(raw: unknown): RatioAnswer | null {
  const source = asRecord(raw);
  const answer = { total: toCount(source.total), part: toCount(source.part) };
  return answer.total === null && answer.part === null ? null : answer;
}

function normalizeEvidence(raw: unknown): EvidenceItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.slice(0, LIMITS.evidencePerIndicator).flatMap(item => {
    const source = asRecord(item);
    const title = text(source.title, LIMITS.shortText * 2);
    if (title === null) return [];
    const id = text(source.id, 60);
    return [{ id: id || createId(), title, sheets: toCount(source.sheets, LIMITS.sheets) }];
  });
}

export function normalizeKzi(raw: unknown): KziState {
  const source = asRecord(raw);
  const checks = asRecord(source.checks);
  const ratios = asRecord(source.ratios);
  const notApplicable = asRecord(source.notApplicable);
  const evidence = asRecord(source.evidence);
  const notes = asRecord(source.notes);
  const zeroTests = asRecord(source.zeroTests);
  const repeated = asRecord(source.repeatedFailure);
  const state: KziState = {
    checks: {},
    ratios: {},
    notApplicable: {},
    zeroTests: {},
    repeatedFailure: {},
    evidence: {},
    notes: {},
  };
  for (const { indicator } of KZI_INDICATORS) {
    for (const criterion of indicator.criteria) {
      if (criterion.kind === 'check' && isTrue(checks[criterion.id])) state.checks[criterion.id] = true;
      if (criterion.kind === 'ratio') {
        const ratio = normalizeRatio(ratios[criterion.id]);
        if (ratio) state.ratios[criterion.id] = ratio;
      }
    }
    if (indicator.notApplicable && isTrue(notApplicable[indicator.code])) state.notApplicable[indicator.code] = true;
    const items = normalizeEvidence(evidence[indicator.code]);
    if (items.length) state.evidence[indicator.code] = items;
  }
  for (const condition of KZI_ZERO_TEST_CONDITIONS) {
    if (isTrue(zeroTests[condition.key])) state.zeroTests[condition.key] = true;
  }
  for (const group of KZI_GROUPS) {
    if (isTrue(repeated[group.id])) state.repeatedFailure[group.id] = true;
    const note = text(notes[group.id], LIMITS.longText);
    if (note) state.notes[group.id] = note;
  }
  return state;
}

const isTarget = (value: unknown): value is TargetLevel => value === 1 || value === 2 || value === 3 || value === 4;

export function normalizeUzi(raw: unknown): UziState {
  const source = asRecord(raw);
  const values = asRecord(source.values);
  const excluded = asRecord(source.excluded);
  const evidence = asRecord(source.evidence);
  const state: UziState = {
    values: {},
    excluded: {},
    evidence: {},
    target: isTarget(source.target) ? source.target : 1,
  };
  for (const direction of UZI_DIRECTIONS) {
    const list = values[direction.id];
    state.values[direction.id] = normalizeDirectionValues(Array.isArray(list) ? list : undefined);
    if (isTrue(excluded[direction.id])) state.excluded[direction.id] = true;
    const note = text(evidence[direction.id], LIMITS.longText);
    if (note) state.evidence[direction.id] = note;
  }
  return state;
}

const SECTION_KEYS: SectionKey[] = ['kziAbout', 'kziZero', 'kziUseful', 'uziAbout', 'uziUseful'];

export function normalizeUi(raw: unknown): UiState {
  const source = asRecord(raw);
  const ui = createUiState();
  const sections = asRecord(source.sections);
  for (const key of SECTION_KEYS) if (typeof sections[key] === 'boolean') ui.sections[key] = sections[key];
  const groups = asRecord(source.kziGroups);
  for (const group of KZI_GROUPS)
    if (typeof groups[group.id] === 'boolean') ui.kziGroups[group.id] = groups[group.id] as boolean;
  if (isRecord(source.uziDirections)) {
    const directions = source.uziDirections;
    ui.uziDirections = {};
    for (const direction of UZI_DIRECTIONS) {
      if (directions[direction.id] === true) ui.uziDirections[direction.id] = true;
    }
  }
  return ui;
}

/** Состояние актуальной версии 4. */
export function normalizeState(raw: unknown): AppState {
  const source = asRecord(raw);
  const base = createDefaultState();
  return {
    version: 4,
    mode: isMode(source.mode) ? source.mode : base.mode,
    requisites: normalizeRequisites(source.requisites),
    kzi: normalizeKzi(source.kzi),
    uzi: normalizeUzi(source.uzi),
    ui: normalizeUi(source.ui),
  };
}

/* ---------- Перенос ответов из версий 2 и 3 ---------- */

const LEGACY_ZERO_KEYS: Record<string, ZeroTestKey> = {
  pa: 'accounts',
  pv: 'vulnerabilities',
  pg: 'unacceptableEvents',
};
const LEGACY_REGIONS: Record<string, FstecOfficeId> = { ufo: 'urfo' };

function legacyRequisites(raw: unknown): Requisites {
  const form = asRecord(raw);
  const region = typeof form.region === 'string' ? (LEGACY_REGIONS[form.region] ?? form.region) : undefined;
  return normalizeRequisites({
    organization: form.org,
    headPosition: form.post,
    headName: form.head,
    executorName: form.executor,
    executorPosition: form.executorPost,
    executorPhone: form.phone,
    executorEmail: form.email,
    customer: form.customer,
    fstecOffice: region,
  });
}

function legacyNotes(raw: unknown): Partial<Record<GroupId, string>> {
  const notes = asRecord(raw);
  const result: Partial<Record<GroupId, string>> = {};
  for (const group of KZI_GROUPS) {
    const note = text(notes[group.id], LIMITS.longText);
    if (note) result[group.id] = note;
  }
  return result;
}

function legacyGroupsOpen(raw: unknown, ui: UiState): void {
  const open = asRecord(raw);
  for (const group of KZI_GROUPS)
    if (typeof open[group.id] === 'boolean') ui.kziGroups[group.id] = open[group.id] as boolean;
}

/**
 * Версия 3: отметки критериев хранились массивами по показателям, их позиции переносятся по legacyIndex.
 * Критерии с порогом в процентах в версии 4 заполняются числами, поэтому их старые отметки не переносятся.
 */
export function migrateFromV3(raw: unknown): AppState {
  const source = asRecord(raw);
  const state = createDefaultState();
  if (isMode(source.mode)) state.mode = source.mode;
  state.requisites = legacyRequisites(source.form);

  const kzi = asRecord(source.kzi);
  const items = asRecord(kzi.items);
  const na = asRecord(kzi.na);
  for (const { indicator } of KZI_INDICATORS) {
    const marks = Array.isArray(items[indicator.code]) ? (items[indicator.code] as unknown[]) : [];
    for (const criterion of indicator.criteria) {
      if (criterion.kind === 'check' && criterion.legacyIndex !== undefined && marks[criterion.legacyIndex] === true) {
        state.kzi.checks[criterion.id] = true;
      }
    }
    if (indicator.notApplicable && isTrue(na[indicator.code])) state.kzi.notApplicable[indicator.code] = true;
  }
  const zero = asRecord(kzi.zero);
  for (const [legacyKey, key] of Object.entries(LEGACY_ZERO_KEYS))
    if (isTrue(zero[legacyKey])) state.kzi.zeroTests[key] = true;
  for (const group of KZI_GROUPS) if (isTrue(zero[`r${group.id}`])) state.kzi.repeatedFailure[group.id] = true;
  state.kzi.notes = legacyNotes(kzi.notes);
  legacyGroupsOpen(kzi.open, state.ui);

  const uzi = asRecord(source.uzi);
  state.uzi = normalizeUzi({ values: uzi.a, excluded: uzi.na, evidence: uzi.notes, target: uzi.target });
  const dirOpen = asRecord(uzi.open);
  if (Object.keys(dirOpen).length) {
    state.ui.uziDirections = {};
    for (const direction of UZI_DIRECTIONS)
      if (dirOpen[direction.id] === true) state.ui.uziDirections[direction.id] = true;
  }

  const info = asRecord(source.info);
  if (typeof info.zero === 'boolean') state.ui.sections.kziZero = info.zero;
  if (typeof info.useful === 'boolean') state.ui.sections.kziUseful = info.useful;
  if (typeof info.uuseful === 'boolean') state.ui.sections.uziUseful = info.uuseful;
  return state;
}

/** Версия 2: критерии были другими, переносятся только реквизиты, заметки и раскрытые группы. */
export function migrateFromV2(raw: unknown): AppState {
  const source = asRecord(raw);
  const state = createDefaultState();
  state.requisites = legacyRequisites(source.form);
  state.kzi.notes = legacyNotes(source.notes);
  legacyGroupsOpen(source.open, state.ui);
  return state;
}
