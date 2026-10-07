import { useId, useState } from 'react';
import { Button } from '../../components/Button';
import { Icon } from '../../components/Icon';
import type { Indicator } from '../../domain/kzi/types';
import { LIMITS } from '../../state/normalize';
import { useDispatch } from '../../state/store';
import type { EvidenceItem } from '../../state/types';
import { parseCount } from './RatioField';
import styles from './EvidenceEditor.module.css';

interface EvidenceEditorProps {
  indicator: Indicator;
  items: EvidenceItem[];
  notApplicable: boolean;
  met: boolean;
}

/**
 * Необязательный перечень подтверждающих документов по показателю.
 * Документы выполненных показателей попадают в текущий отчет и в приложение к письму во ФСТЭК России.
 */
export function EvidenceEditor({ indicator, items, notApplicable, met }: EvidenceEditorProps) {
  const dispatch = useDispatch();
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const code = indicator.code;
  const sources = notApplicable ? (indicator.notApplicableDocuments ?? []) : indicator.documents;
  const added = new Set(items.map(item => item.title.trim()));
  const suggestions = sources.filter(document => !added.has(document.text));

  return (
    <div className={styles.evidence}>
      <button
        type="button"
        className={styles.toggle}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen(!open)}
      >
        <Icon name="paperclip" size={16} />
        <span>Подтверждающие документы</span>
        {items.length > 0 && <span className={styles.count}>{items.length}</span>}
        <span className={styles.optional}>необязательно</span>
      </button>
      <div id={panelId} hidden={!open} className={styles.panel}>
        {items.length > 0 && (
          <ul className={styles.list}>
            {items.map((item, index) => (
              <li key={item.id} className={styles.item}>
                <textarea
                  className={styles.title}
                  rows={1}
                  value={item.title}
                  maxLength={LIMITS.shortText * 2}
                  aria-label={`Документ ${index + 1}`}
                  placeholder="Наименование документа"
                  autoFocus={!item.title && index === items.length - 1}
                  onChange={event =>
                    dispatch({
                      type: 'kzi/evidenceUpdate',
                      code,
                      id: item.id,
                      // Наименование документа - одна строка, перенос заменяется пробелом
                      patch: { title: event.target.value.replace(/\r?\n/g, ' ') },
                    })
                  }
                />
                <label className={styles.sheets}>
                  <input
                    inputMode="numeric"
                    value={item.sheets ?? ''}
                    aria-label={`Листов в документе ${index + 1}`}
                    placeholder="__"
                    onChange={event =>
                      dispatch({
                        type: 'kzi/evidenceUpdate',
                        code,
                        id: item.id,
                        patch: { sheets: parseCount(event.target.value) },
                      })
                    }
                  />
                  <span>л.</span>
                </label>
                <button
                  type="button"
                  className={styles.remove}
                  aria-label={`Удалить документ ${index + 1}`}
                  onClick={() => dispatch({ type: 'kzi/evidenceRemove', code, id: item.id })}
                >
                  <Icon name="close" size={16} />
                </button>
              </li>
            ))}
          </ul>
        )}
        <Button
          size="sm"
          variant="outline"
          icon={<Icon name="plus" size={16} />}
          onClick={() => dispatch({ type: 'kzi/evidenceAdd', code, title: '' })}
        >
          Добавить документ
        </Button>
        {suggestions.length > 0 && (
          <div className={styles.suggestions}>
            <span className={styles.suggestionsTitle}>Из приложения № 1 к Методике:</span>
            {suggestions.map(document => (
              <button
                key={document.text}
                type="button"
                className={styles.chip}
                onClick={() => dispatch({ type: 'kzi/evidenceAdd', code, title: document.text })}
              >
                <Icon name="plus" size={14} />
                <span>{document.text}</span>
              </button>
            ))}
          </div>
        )}
        <p className={styles.note}>
          {met
            ? 'Документы войдут в текущий отчет и в приложение к письму во ФСТЭК России.'
            : 'Документы войдут в приложение к письму, когда показатель будет выполнен.'}
        </p>
      </div>
    </div>
  );
}
