import { useCallback } from 'react';
import { downloadText } from '../reports/download';
import { exportFileName, parseSavedFile, serializeState } from '../state/file';
import { useAppState, useDispatch } from '../state/store';
import { useMessage } from './messages';

const MAX_FILE_SIZE = 2 * 1024 * 1024;

/** «Сохранить в файл» и «Загрузить из файла». */
export function useStateFile() {
  const state = useAppState();
  const dispatch = useDispatch();
  const showMessage = useMessage();

  const save = useCallback(() => {
    const fileName = exportFileName(state);
    downloadText(serializeState(state), fileName, 'application/json;charset=utf-8');
    showMessage({ text: `Файл ${fileName} сохранен на ваш компьютер.`, tone: 'ok' });
  }, [showMessage, state]);

  const load = useCallback(
    async (file: File) => {
      if (file.size > MAX_FILE_SIZE) {
        showMessage({ text: 'Файл слишком большой для файла калькулятора.', tone: 'error' });
        return;
      }
      const result = parseSavedFile(await file.text());
      if (!result.ok) {
        showMessage({ text: result.error, tone: 'error' });
        return;
      }
      const previous = state;
      dispatch({ type: 'state/replace', state: result.state });
      showMessage({
        text: `Данные загружены из файла ${file.name}.`,
        tone: 'ok',
        action: { label: 'Вернуть', onClick: () => dispatch({ type: 'state/replace', state: previous }) },
      });
    },
    [dispatch, showMessage, state]
  );

  return { save, load };
}
