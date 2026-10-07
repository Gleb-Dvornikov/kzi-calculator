import { formatDate } from './format';

/** Организационно-правовые формы, которые не нужны в имени файла. */
const LEGAL_FORM =
  /^(?:ООО|ОАО|ЗАО|ПАО|НАО|АО|ИП|ФГУП|ГУП|МУП|ФКУ|ФГБУ|ФГАУ|ФГКУ|ГБУ|ГАУ|ГКУ|МБУ|МАУ|МКУ|ОГБУ|КГБУ|ГБУЗ|ФГБОУ|ФГАОУ|ГБОУ|МБОУ|АНО|НКО)\s+/u;

/** «ООО «Ромашка»» -> «Ромашка». Для имен файлов. */
export function organizationShortName(organization: string): string {
  const value = organization.trim();
  const quoted = /[«"„“]([^»"“”]+)[»"“”]/.exec(value)?.[1];
  const name = (quoted ?? value.replace(LEGAL_FORM, '')).trim();
  return name
    .replace(/[\\/:*?"<>|«»„“”'.,;]+/g, ' ')
    .trim()
    .replace(/\s+/g, '_')
    .slice(0, 40)
    .replace(/_+$/, '');
}

/** Отчет_Кзи_Ромашка_07.10.2026.docx: пустые части пропускаются. */
export function buildFileName(parts: readonly string[], date: Date, extension: string): string {
  return `${[...parts, formatDate(date)].filter(Boolean).join('_')}.${extension}`;
}
