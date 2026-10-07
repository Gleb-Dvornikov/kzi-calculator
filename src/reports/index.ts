/**
 * Точка входа генераторов отчетов. Интерфейс загружает этот модуль динамически (import()),
 * чтобы библиотека docx не увеличивала время первой загрузки страницы.
 */
import { calculateKzi } from '../domain/kzi/calculate';
import { calculateUzi } from '../domain/uzi/calculate';
import type { AppState } from '../state/types';
import { buildKziCurrentReport, buildKziLetter } from './kziReports';
import type { ReportDocument } from './model';
import { renderDocxBlob } from './renderDocx';
import { buildUziReport } from './uziReports';

export type ReportKind = 'kziLetter' | 'kziCurrent' | 'uziFull' | 'uziCurrent';

export function buildReport(kind: ReportKind, state: AppState, date: Date): ReportDocument {
  switch (kind) {
    case 'kziLetter':
    case 'kziCurrent': {
      const input = { result: calculateKzi(state.kzi), requisites: state.requisites, kzi: state.kzi, date };
      return kind === 'kziLetter' ? buildKziLetter(input) : buildKziCurrentReport(input);
    }
    case 'uziFull':
    case 'uziCurrent':
      return buildUziReport({
        result: calculateUzi(state.uzi),
        requisites: state.requisites,
        uzi: state.uzi,
        date,
        full: kind === 'uziFull',
      });
    default:
      throw new Error(`Неизвестный отчет: ${String(kind)}`);
  }
}

export async function createReportFile(kind: ReportKind, state: AppState, date: Date = new Date()) {
  const report = buildReport(kind, state, date);
  return { fileName: report.fileName, blob: await renderDocxBlob(report) };
}
