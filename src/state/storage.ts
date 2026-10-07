import { STORAGE_KEYS } from '../config';
import { createDefaultState } from './defaults';
import { migrateFromV2, migrateFromV3, normalizeState } from './normalize';
import type { AppState } from './types';

/** Хранилище браузера. В приватном режиме или при запрете доступа его может не быть, тогда работаем в памяти. */
export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export function browserStorage(): KeyValueStorage | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

export type LoadSource = 'current' | 'v3' | 'v2' | 'empty';

function read(storage: KeyValueStorage, key: string): unknown {
  try {
    const raw = storage.getItem(key);
    return raw ? (JSON.parse(raw) as unknown) : undefined;
  } catch {
    return undefined;
  }
}

/** Загружает ответы. Если их нет, переносит ответы версий 3 и 2. Старые ключи не удаляются. */
export function loadState(storage: KeyValueStorage | null = browserStorage()): { state: AppState; source: LoadSource } {
  if (!storage) return { state: createDefaultState(), source: 'empty' };
  const current = read(storage, STORAGE_KEYS.current);
  if (current !== undefined) return { state: normalizeState(current), source: 'current' };
  const v3 = read(storage, STORAGE_KEYS.legacyV3);
  if (v3 !== undefined) return { state: migrateFromV3(v3), source: 'v3' };
  const v2 = read(storage, STORAGE_KEYS.legacyV2);
  if (v2 !== undefined) return { state: migrateFromV2(v2), source: 'v2' };
  return { state: createDefaultState(), source: 'empty' };
}

export function saveState(state: AppState, storage: KeyValueStorage | null = browserStorage()): void {
  if (!storage) return;
  try {
    storage.setItem(STORAGE_KEYS.current, JSON.stringify(state));
  } catch {
    // Хранилище переполнено или недоступно: ответы останутся в памяти до закрытия страницы
  }
}
