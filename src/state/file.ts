/**
 * «Сохранить в файл» и «Загрузить из файла»: ответы и реквизиты в JSON на компьютере пользователя.
 * Данные никуда не отправляются.
 */
import { FILE_FORMAT } from '../config';
import { buildFileName, organizationShortName } from '../domain/common/fileName';
import { MODE_LABELS } from '../domain/mode';
import { normalizeState } from './normalize';
import type { AppState } from './types';

export interface SavedFile {
  format: typeof FILE_FORMAT.id;
  version: typeof FILE_FORMAT.version;
  savedAt: string;
  state: AppState;
}

export function serializeState(state: AppState, now: Date = new Date()): string {
  const file: SavedFile = { format: FILE_FORMAT.id, version: FILE_FORMAT.version, savedAt: now.toISOString(), state };
  return `${JSON.stringify(file, null, 2)}\n`;
}

/** Кзи_Ромашка_07.10.2026.json */
export function exportFileName(state: AppState, now: Date = new Date()): string {
  return buildFileName(
    [MODE_LABELS[state.mode].short, organizationShortName(state.requisites.organization)],
    now,
    'json'
  );
}

export type ImportResult = { ok: true; state: AppState; savedAt: string | null } | { ok: false; error: string };

export function parseSavedFile(content: string): ImportResult {
  let data: unknown;
  try {
    data = JSON.parse(content);
  } catch {
    return { ok: false, error: 'Файл не читается: это не JSON.' };
  }
  if (typeof data !== 'object' || data === null) return { ok: false, error: 'Это не файл калькулятора.' };
  const file = data as Partial<SavedFile>;
  if (file.format !== FILE_FORMAT.id) return { ok: false, error: 'Это не файл калькулятора.' };
  if (file.version !== FILE_FORMAT.version) {
    return { ok: false, error: 'Файл сохранен в другой версии калькулятора и не может быть загружен.' };
  }
  return {
    ok: true,
    state: normalizeState(file.state),
    savedAt: typeof file.savedAt === 'string' ? file.savedAt : null,
  };
}
