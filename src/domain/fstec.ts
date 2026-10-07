/**
 * Территориальные органы ФСТЭК России: адресаты письма с результатами расчета Кзи.
 *
 * Данные скоропортящиеся: руководители меняются. Проверено по открытым источникам 07.10.2026,
 * руководитель управления по ДФО подтвержден менее надежно. Перед отправкой письма адресата нужно сверить
 * на fstec.ru, поэтому в форме реквизитов поле «Руководитель управления» можно исправить.
 */
export const FSTEC_OFFICES_CHECKED_AT = '07.10.2026';

export type FstecOfficeId = 'cfo' | 'szfo' | 'yufo' | 'pfo' | 'urfo' | 'sfo' | 'dfo';

export interface FstecOffice {
  id: FstecOfficeId;
  /** Сокращение федерального округа. */
  district: string;
  /** Наименование управления. */
  name: string;
  city: string;
  /** И.О. Фамилия руководителя в дательном падеже: «кому». */
  headDative: string;
}

export const FSTEC_OFFICES: FstecOffice[] = [
  {
    id: 'cfo',
    district: 'ЦФО',
    name: 'Управление ФСТЭК России по Центральному федеральному округу',
    city: 'Москва',
    headDative: 'О.В. Райкову',
  },
  {
    id: 'szfo',
    district: 'СЗФО',
    name: 'Управление ФСТЭК России по Северо-Западному федеральному округу',
    city: 'Санкт-Петербург',
    headDative: 'С.В. Железкову',
  },
  {
    id: 'yufo',
    district: 'ЮФО и СКФО',
    name: 'Управление ФСТЭК России по Южному и Северо-Кавказскому федеральным округам',
    city: 'Ростов-на-Дону',
    headDative: 'К.В. Камынину',
  },
  {
    id: 'pfo',
    district: 'ПФО',
    name: 'Управление ФСТЭК России по Приволжскому федеральному округу',
    city: 'Нижний Новгород',
    headDative: 'П.В. Максякову',
  },
  {
    id: 'urfo',
    district: 'УрФО',
    name: 'Управление ФСТЭК России по Уральскому федеральному округу',
    city: 'Екатеринбург',
    headDative: 'О.П. Чувардину',
  },
  {
    id: 'sfo',
    district: 'СФО',
    name: 'Управление ФСТЭК России по Сибирскому федеральному округу',
    city: 'Новосибирск',
    headDative: 'В.Н. Булгакову',
  },
  {
    id: 'dfo',
    district: 'ДФО',
    name: 'Управление ФСТЭК России по Дальневосточному федеральному округу',
    city: 'Хабаровск',
    headDative: 'В.М. Цалко',
  },
];

export const DEFAULT_FSTEC_OFFICE: FstecOfficeId = 'urfo';

export const isFstecOfficeId = (value: unknown): value is FstecOfficeId =>
  FSTEC_OFFICES.some(office => office.id === value);

export function getFstecOffice(id: FstecOfficeId): FstecOffice {
  return FSTEC_OFFICES.find(office => office.id === id) ?? (FSTEC_OFFICES[4] as FstecOffice);
}

/** «Управления ФСТЭК России по ...» для строки «Руководителю ...». */
export const officeGenitive = (office: FstecOffice): string => office.name.replace(/^Управление/, 'Управления');
