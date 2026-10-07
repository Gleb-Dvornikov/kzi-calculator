/** Режим калькулятора: показатель защищенности (Кзи) или уровень зрелости (Узи). */
export type Mode = 'kzi' | 'uzi';

export const MODES: readonly Mode[] = ['kzi', 'uzi'];

export const isMode = (value: unknown): value is Mode => value === 'kzi' || value === 'uzi';

export const MODE_LABELS: Record<Mode, { short: string; full: string }> = {
  kzi: { short: 'Кзи', full: 'Показатель защищенности' },
  uzi: { short: 'Узи', full: 'Уровень зрелости' },
};
