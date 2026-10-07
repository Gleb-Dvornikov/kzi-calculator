import { DEFAULT_FSTEC_OFFICE, getFstecOffice, type FstecOfficeId } from './fstec';
import type { Mode } from './mode';

/** Реквизиты для отчетов. Спрашиваются при нажатии «Сформировать отчет» и сохраняются в браузере. */
export interface Requisites {
  organization: string;
  headPosition: string;
  headName: string;
  executorName: string;
  executorPosition: string;
  executorPhone: string;
  executorEmail: string;
  /** Заказчик (оператор), для которого подрядчик проводит оценку Узи. */
  customer: string;
  /** Адресат письма по Кзи. */
  fstecOffice: FstecOfficeId;
  /** Руководитель управления ФСТЭК России в дательном падеже. Заполняется из справочника, можно исправить. */
  addresseeHead: string;
}

export type TextRequisite = Exclude<keyof Requisites, 'fstecOffice'>;

export interface RequisiteFieldSpec {
  label: string;
  placeholder: string;
  type?: 'text' | 'tel' | 'email';
  autoComplete?: string;
  optional?: boolean;
}

export const REQUISITE_FIELDS: Record<TextRequisite, RequisiteFieldSpec> = {
  organization: { label: 'Название организации', placeholder: 'ООО «Ромашка»', autoComplete: 'organization' },
  headPosition: { label: 'Должность руководителя', placeholder: 'Директор' },
  headName: { label: 'И.О. Фамилия руководителя', placeholder: 'И.И. Иванов' },
  executorName: { label: 'И.О. Фамилия исполнителя', placeholder: 'П.П. Петров', autoComplete: 'name' },
  executorPosition: { label: 'Должность исполнителя', placeholder: 'Специалист по защите информации' },
  executorPhone: {
    label: 'Телефон исполнителя',
    placeholder: '+7 (123) 456-78-90',
    type: 'tel',
    autoComplete: 'tel',
  },
  executorEmail: {
    label: 'Электронная почта исполнителя',
    placeholder: 'info@example.ru',
    type: 'email',
    autoComplete: 'email',
  },
  customer: {
    label: 'Заказчик (оператор), для которого проводится оценка',
    placeholder: 'Необязательно',
    optional: true,
  },
  addresseeHead: { label: 'Руководитель управления (кому)', placeholder: 'О.П. Чувардину' },
};

export type RequisiteLayoutItem = { field: TextRequisite | 'fstecOffice'; wide?: boolean };

/** Состав и порядок полей формы в каждом режиме. */
export const REQUISITES_LAYOUT: Record<Mode, RequisiteLayoutItem[]> = {
  kzi: [
    { field: 'organization', wide: true },
    { field: 'headPosition' },
    { field: 'headName' },
    { field: 'executorName' },
    { field: 'executorPhone' },
    { field: 'executorEmail', wide: true },
    { field: 'fstecOffice', wide: true },
    { field: 'addresseeHead', wide: true },
  ],
  uzi: [
    { field: 'organization', wide: true },
    { field: 'headPosition' },
    { field: 'headName' },
    { field: 'executorName' },
    { field: 'executorPosition' },
    { field: 'executorPhone' },
    { field: 'executorEmail' },
    { field: 'customer', wide: true },
  ],
};

export const EMPTY_REQUISITES: Requisites = {
  organization: '',
  headPosition: '',
  headName: '',
  executorName: '',
  executorPosition: '',
  executorPhone: '',
  executorEmail: '',
  customer: '',
  fstecOffice: DEFAULT_FSTEC_OFFICE,
  addresseeHead: getFstecOffice(DEFAULT_FSTEC_OFFICE).headDative,
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export type RequisiteErrors = Partial<Record<TextRequisite, string>>;

/** Проверка полей, нужных для отчета в выбранном режиме. Пустой объект - ошибок нет. */
export function validateRequisites(requisites: Requisites, mode: Mode): RequisiteErrors {
  const errors: RequisiteErrors = {};
  for (const { field } of REQUISITES_LAYOUT[mode]) {
    if (field === 'fstecOffice') continue;
    const value = requisites[field].trim();
    if (!value && !REQUISITE_FIELDS[field].optional) errors[field] = 'Заполните поле';
  }
  const email = requisites.executorEmail.trim();
  if (email && !EMAIL_PATTERN.test(email)) errors.executorEmail = 'Проверьте адрес электронной почты';
  const phone = requisites.executorPhone.trim();
  if (phone && phone.replace(/\D/g, '').length < 6) errors.executorPhone = 'Проверьте номер телефона';
  return errors;
}
