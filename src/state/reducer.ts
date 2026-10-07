import { getFstecOffice, type FstecOfficeId } from '../domain/fstec';
import type { GroupId, IndicatorCode, ZeroTestKey } from '../domain/kzi/types';
import type { Mode } from '../domain/mode';
import type { Requisites } from '../domain/requisites';
import { UZI_DIRECTIONS } from '../domain/uzi/methodology';
import type { TargetLevel } from '../domain/uzi/types';
import { createKziState, createUziState } from './defaults';
import { createId } from './normalize';
import type { AppState, EvidenceItem, KziState, SectionKey, UziState } from './types';

export type Action =
  | { type: 'mode/set'; mode: Mode }
  | { type: 'kzi/check'; criterionId: string; checked: boolean }
  | { type: 'kzi/ratio'; criterionId: string; field: 'total' | 'part'; value: number | null }
  | { type: 'kzi/notApplicable'; code: IndicatorCode; value: boolean }
  | { type: 'kzi/zeroTest'; key: ZeroTestKey; value: boolean }
  | { type: 'kzi/repeatedFailure'; group: GroupId; value: boolean }
  | { type: 'kzi/note'; group: GroupId; text: string }
  | { type: 'kzi/evidenceAdd'; code: IndicatorCode; title: string }
  | { type: 'kzi/evidenceUpdate'; code: IndicatorCode; id: string; patch: Partial<Omit<EvidenceItem, 'id'>> }
  | { type: 'kzi/evidenceRemove'; code: IndicatorCode; id: string }
  | { type: 'kzi/resetAnswers' }
  | { type: 'kzi/restore'; kzi: KziState }
  | { type: 'uzi/value'; direction: number; requirement: number; value: number }
  | { type: 'uzi/excluded'; direction: number; value: boolean }
  | { type: 'uzi/evidence'; direction: number; text: string }
  | { type: 'uzi/target'; value: TargetLevel }
  | { type: 'uzi/resetAnswers' }
  | { type: 'uzi/restore'; uzi: UziState }
  | { type: 'requisites/update'; patch: Partial<Requisites> }
  | { type: 'requisites/office'; office: FstecOfficeId }
  | { type: 'ui/section'; key: SectionKey; open: boolean }
  | { type: 'ui/group'; group: GroupId; open: boolean }
  | { type: 'ui/direction'; direction: number; open: boolean }
  | { type: 'ui/nextDirection'; direction: number }
  | { type: 'state/replace'; state: AppState };

function updateKzi(state: AppState, patch: Partial<KziState>): AppState {
  return { ...state, kzi: { ...state.kzi, ...patch } };
}

function updateUzi(state: AppState, patch: Partial<UziState>): AppState {
  return { ...state, uzi: { ...state.uzi, ...patch } };
}

/** Ставит флаг или убирает ключ со значением «нет», чтобы сохраненные данные оставались компактными. */
function setFlag<T extends object>(record: T, key: string | number, value: boolean): T {
  const next = { ...record } as Record<string | number, unknown>;
  if (value) next[key] = true;
  else delete next[key];
  return next as T;
}

function updateEvidence(state: AppState, code: IndicatorCode, update: (items: EvidenceItem[]) => EvidenceItem[]) {
  const items = update(state.kzi.evidence[code] ?? []);
  const evidence = { ...state.kzi.evidence };
  if (items.length) evidence[code] = items;
  else delete evidence[code];
  return updateKzi(state, { evidence });
}

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'mode/set':
      return state.mode === action.mode ? state : { ...state, mode: action.mode };

    case 'kzi/check':
      return updateKzi(state, { checks: setFlag(state.kzi.checks, action.criterionId, action.checked) });

    case 'kzi/ratio': {
      const current = state.kzi.ratios[action.criterionId] ?? { total: null, part: null };
      const next = { ...current, [action.field]: action.value };
      const ratios = { ...state.kzi.ratios };
      if (next.total === null && next.part === null) delete ratios[action.criterionId];
      else ratios[action.criterionId] = next;
      return updateKzi(state, { ratios });
    }

    case 'kzi/notApplicable':
      return updateKzi(state, { notApplicable: setFlag(state.kzi.notApplicable, action.code, action.value) });

    case 'kzi/zeroTest':
      return updateKzi(state, { zeroTests: setFlag(state.kzi.zeroTests, action.key, action.value) });

    case 'kzi/repeatedFailure':
      return updateKzi(state, { repeatedFailure: setFlag(state.kzi.repeatedFailure, action.group, action.value) });

    case 'kzi/note': {
      const notes = { ...state.kzi.notes };
      if (action.text) notes[action.group] = action.text;
      else delete notes[action.group];
      return updateKzi(state, { notes });
    }

    case 'kzi/evidenceAdd':
      return updateEvidence(state, action.code, items => [
        ...items,
        { id: createId(), title: action.title, sheets: null },
      ]);

    case 'kzi/evidenceUpdate':
      return updateEvidence(state, action.code, items =>
        items.map(item => (item.id === action.id ? { ...item, ...action.patch } : item))
      );

    case 'kzi/evidenceRemove':
      return updateEvidence(state, action.code, items => items.filter(item => item.id !== action.id));

    case 'kzi/resetAnswers': {
      // Сбрасываются отметки, числа и условия обнуления. Документы и заметки остаются.
      const empty = createKziState();
      return updateKzi(state, {
        checks: empty.checks,
        ratios: empty.ratios,
        notApplicable: empty.notApplicable,
        zeroTests: empty.zeroTests,
        repeatedFailure: empty.repeatedFailure,
      });
    }

    case 'kzi/restore':
      return { ...state, kzi: action.kzi };

    case 'uzi/value': {
      const list = [...(state.uzi.values[action.direction] ?? [])];
      list[action.requirement - 1] = action.value;
      return updateUzi(state, { values: { ...state.uzi.values, [action.direction]: list } });
    }

    case 'uzi/excluded':
      return updateUzi(state, { excluded: setFlag(state.uzi.excluded, action.direction, action.value) });

    case 'uzi/evidence': {
      const evidence = { ...state.uzi.evidence };
      if (action.text) evidence[action.direction] = action.text;
      else delete evidence[action.direction];
      return updateUzi(state, { evidence });
    }

    case 'uzi/target':
      return updateUzi(state, { target: action.value });

    case 'uzi/resetAnswers': {
      const empty = createUziState();
      return updateUzi(state, { values: empty.values, excluded: empty.excluded });
    }

    case 'uzi/restore':
      return { ...state, uzi: action.uzi };

    case 'requisites/update':
      return { ...state, requisites: { ...state.requisites, ...action.patch } };

    case 'requisites/office':
      return {
        ...state,
        requisites: {
          ...state.requisites,
          fstecOffice: action.office,
          addresseeHead: getFstecOffice(action.office).headDative,
        },
      };

    case 'ui/section':
      return { ...state, ui: { ...state.ui, sections: { ...state.ui.sections, [action.key]: action.open } } };

    case 'ui/group':
      return { ...state, ui: { ...state.ui, kziGroups: { ...state.ui.kziGroups, [action.group]: action.open } } };

    case 'ui/direction':
      return {
        ...state,
        ui: { ...state.ui, uziDirections: setFlag(state.ui.uziDirections, action.direction, action.open) },
      };

    case 'ui/nextDirection': {
      const next = UZI_DIRECTIONS.find(direction => direction.id === action.direction + 1);
      let directions = setFlag(state.ui.uziDirections, action.direction, false);
      if (next) directions = setFlag(directions, next.id, true);
      return { ...state, ui: { ...state.ui, uziDirections: directions } };
    }

    case 'state/replace':
      return action.state;

    default:
      return state;
  }
}
