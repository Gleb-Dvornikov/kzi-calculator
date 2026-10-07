/** Контакты и ссылки, которые можно менять без правки кода компонентов. */
export const CONTACTS = {
  company: 'УЦСБ',
  companyFull: 'Уральский центр систем безопасности',
  email: 'cybersec@ussc.ru',
  phone: '+7 (343) 379-98-34',
  phoneHref: '+73433799834',
  site: 'https://sec.ussc.ru/',
} as const;

/** Ключи хранилища браузера. Старые ключи читаются один раз для переноса ответов. */
export const STORAGE_KEYS = {
  current: 'checku-kzi-v4',
  legacyV3: 'checku-kzi-v3',
  legacyV2: 'checku-kzi-v2',
} as const;

/** Формат файла «Сохранить в файл». */
export const FILE_FORMAT = {
  id: 'checku-kzi-uzi',
  version: 4,
} as const;
