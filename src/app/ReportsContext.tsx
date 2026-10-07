import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { formatDate } from '../domain/common/format';
import type { Mode } from '../domain/mode';
import { calculateUzi } from '../domain/uzi/calculate';
import { downloadBlob, downloadText } from '../reports/download';
import { buildReminder } from '../reports/ics';
import type { ReportKind } from '../reports';
import { useAppState } from '../state/store';
import { useMessage } from './messages';

interface ReportActions {
  /** Идет формирование отчета: кнопки отчетов недоступны. */
  busy: boolean;
  generate: (kind: ReportKind) => Promise<void>;
  addReminder: (mode: Mode) => void;
}

const ReportsContext = createContext<ReportActions | null>(null);

export function useReports(): ReportActions {
  const value = useContext(ReportsContext);
  if (!value) throw new Error('useReports используется вне ReportsProvider');
  return value;
}

/** Адрес калькулятора для ссылки в напоминании: работает и после переноса на домен УЦСБ. */
const calculatorUrl = (mode: Mode) => `${window.location.origin}${window.location.pathname}#${mode}`;

export function ReportsProvider({ children }: { children: ReactNode }) {
  const state = useAppState();
  const showMessage = useMessage();
  const [busy, setBusy] = useState(false);

  const addReminder = useCallback(
    (mode: Mode) => {
      const reminder = buildReminder({
        mode,
        organization: state.requisites.organization,
        assessedAt: new Date(),
        calculatorUrl: calculatorUrl(mode),
      });
      downloadText(reminder.content, reminder.fileName, 'text/calendar;charset=utf-8');
      showMessage({
        text: `Напоминание о сроке ${formatDate(reminder.dueDate)} скачано. Откройте файл, чтобы добавить его в календарь.`,
        tone: 'ok',
      });
    },
    [showMessage, state.requisites.organization]
  );

  const generate = useCallback(
    async (kind: ReportKind) => {
      setBusy(true);
      try {
        // Генераторы отчетов вместе с библиотекой docx загружаются только при первом нажатии
        const { createReportFile } = await import('../reports');
        const { blob, fileName } = await createReportFile(kind, state);
        downloadBlob(blob, fileName);
        let text = `Отчет сохранен: ${fileName}.`;
        if (kind === 'uziFull' || kind === 'uziCurrent') {
          const result = calculateUzi(state.uzi);
          const missing = result.questions - result.answered;
          if (missing) text += ` Без ответа ${missing} из ${result.questions}, они учтены как 0.`;
        }
        const final = kind === 'kziLetter' || kind === 'uziFull';
        showMessage({
          text,
          tone: 'ok',
          action: final ? { label: 'Напомнить о следующей оценке', onClick: () => addReminder(state.mode) } : undefined,
        });
      } catch (error) {
        console.error(error);
        showMessage({ text: 'Не удалось сформировать отчет. Обновите страницу и попробуйте еще раз.', tone: 'error' });
      } finally {
        setBusy(false);
      }
    },
    [addReminder, showMessage, state]
  );

  const value = useMemo(() => ({ busy, generate, addReminder }), [busy, generate, addReminder]);
  return <ReportsContext.Provider value={value}>{children}</ReportsContext.Provider>;
}
