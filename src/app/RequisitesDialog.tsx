import { useEffect, useRef, useState } from 'react';
import { Button } from '../components/Button';
import { SelectField, TextField } from '../components/Field';
import { Icon } from '../components/Icon';
import { FSTEC_OFFICES, FSTEC_OFFICES_CHECKED_AT } from '../domain/fstec';
import type { Mode } from '../domain/mode';
import { REQUISITES_LAYOUT, REQUISITE_FIELDS, validateRequisites, type RequisiteErrors } from '../domain/requisites';
import { useAppState, useDispatch } from '../state/store';
import styles from './RequisitesDialog.module.css';

interface RequisitesDialogProps {
  open: boolean;
  mode: Mode;
  busy: boolean;
  onClose: () => void;
  /** Реквизиты заполнены верно: можно формировать отчет. */
  onConfirm: () => void;
}

const TITLES: Record<Mode, { title: string; lead: string; submit: string }> = {
  kzi: {
    title: 'Реквизиты для письма во ФСТЭК России',
    lead: 'Поля нужны для отчета о расчете Кзи. Они сохраняются в этом браузере и в файле с ответами.',
    submit: 'Сформировать письмо',
  },
  uzi: {
    title: 'Реквизиты для отчета об оценке Узи',
    lead: 'Поля нужны для отчета по составу п. 35 Методики. Они сохраняются в этом браузере и в файле с ответами.',
    submit: 'Сформировать отчет',
  },
};

/** Реквизиты спрашиваются при нажатии «Сформировать отчет», а не в начале расчета. */
export function RequisitesDialog({ open, mode, busy, onClose, onConfirm }: RequisitesDialogProps) {
  const { requisites } = useAppState();
  const dispatch = useDispatch();
  const dialog = useRef<HTMLDialogElement>(null);
  const [errors, setErrors] = useState<RequisiteErrors>({});
  const [submitted, setSubmitted] = useState(false);
  const texts = TITLES[mode];

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) {
      setSubmitted(false);
      setErrors({});
      element.showModal();
    }
    if (!open && element.open) element.close();
  }, [open]);

  // После первой попытки ошибки обновляются по мере ввода
  useEffect(() => {
    if (submitted) setErrors(validateRequisites(requisites, mode));
  }, [mode, requisites, submitted]);

  const submit = () => {
    const found = validateRequisites(requisites, mode);
    setSubmitted(true);
    setErrors(found);
    const first = Object.keys(found)[0];
    if (first) {
      dialog.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
      return;
    }
    onConfirm();
  };

  return (
    <dialog ref={dialog} className={styles.dialog} aria-labelledby="requisites-title" onClose={onClose}>
      <form
        method="dialog"
        className={styles.form}
        noValidate
        onSubmit={event => {
          event.preventDefault();
          submit();
        }}
      >
        <div className={styles.header}>
          <h2 id="requisites-title" className={styles.title}>
            {texts.title}
          </h2>
          <button type="button" className={styles.close} aria-label="Закрыть" onClick={onClose}>
            <Icon name="close" size={20} />
          </button>
        </div>
        <p className={styles.lead}>{texts.lead}</p>
        <div className={styles.grid}>
          {REQUISITES_LAYOUT[mode].map(({ field, wide }) => {
            if (field === 'fstecOffice') {
              return (
                <SelectField
                  key={field}
                  wide={wide}
                  label="Управление ФСТЭК России (адресат письма)"
                  value={requisites.fstecOffice}
                  options={FSTEC_OFFICES.map(office => ({
                    value: office.id,
                    label: `${office.name} (${office.city})`,
                  }))}
                  onChange={office => dispatch({ type: 'requisites/office', office })}
                />
              );
            }
            const spec = REQUISITE_FIELDS[field];
            return (
              <TextField
                key={field}
                wide={wide}
                label={spec.label}
                value={requisites[field]}
                placeholder={spec.placeholder}
                type={spec.type}
                autoComplete={spec.autoComplete ?? 'off'}
                maxLength={300}
                error={errors[field]}
                hint={
                  field === 'addresseeHead'
                    ? `И.О. Фамилия в дательном падеже. Руководители указаны по открытым данным на ${FSTEC_OFFICES_CHECKED_AT}, перед отправкой сверьте на fstec.ru.`
                    : undefined
                }
                onChange={value => dispatch({ type: 'requisites/update', patch: { [field]: value } })}
              />
            );
          })}
        </div>
        <div className={styles.actions}>
          <Button variant="light" onClick={onClose}>
            Отмена
          </Button>
          <Button variant="dark" type="submit" disabled={busy}>
            {busy ? 'Формируем...' : texts.submit}
          </Button>
        </div>
      </form>
    </dialog>
  );
}
