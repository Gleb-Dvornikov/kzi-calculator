import { KZI_GROUPS } from '../domain/kzi/methodology';
import type { GroupId } from '../domain/kzi/types';
import { EMPTY_REQUISITES } from '../domain/requisites';
import { UZI_DIRECTIONS, UZI_TYPE_COUNT } from '../domain/uzi/methodology';
import type { AppState, KziState, UiState, UziState } from './types';

export function createKziState(): KziState {
  return {
    checks: {},
    ratios: {},
    notApplicable: {},
    zeroTests: {},
    repeatedFailure: {},
    evidence: {},
    notes: {},
  };
}

export function createUziState(): UziState {
  return {
    values: Object.fromEntries(UZI_DIRECTIONS.map(direction => [direction.id, Array(UZI_TYPE_COUNT).fill(null)])),
    excluded: {},
    evidence: {},
    target: 1,
  };
}

export function createUiState(): UiState {
  return {
    // «Информация о калькуляторе» свернута по умолчанию
    sections: { kziAbout: false, kziZero: false, kziUseful: true, uziAbout: false, uziUseful: true },
    kziGroups: Object.fromEntries(KZI_GROUPS.map(group => [group.id, true])) as Record<GroupId, boolean>,
    uziDirections: { 1: true },
  };
}

export function createDefaultState(): AppState {
  return {
    version: 4,
    mode: 'kzi',
    requisites: { ...EMPTY_REQUISITES },
    kzi: createKziState(),
    uzi: createUziState(),
    ui: createUiState(),
  };
}
