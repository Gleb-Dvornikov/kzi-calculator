import { buildFileName, organizationShortName } from '../domain/common/fileName';
import { formatDateLong, formatKzi, formatPercent, formatWeight } from '../domain/common/format';
import { getFstecOffice, officeGenitive } from '../domain/fstec';
import type { IndicatorResult, KziResult, RatioEvaluation, ZeroReason } from '../domain/kzi/calculate';
import { KZI_METHODOLOGY } from '../domain/kzi/methodology';
import type { DocumentDelivery, RatioCriterion } from '../domain/kzi/types';
import type { Requisites } from '../domain/requisites';
import type { KziState } from '../state/types';
import { abbreviationsSection, contactsParagraph, lowerFirst, trimPeriod } from './common';
import {
  bold,
  cell,
  heading,
  list,
  paragraph,
  spacer,
  type Block,
  type ReportDocument,
  type Run,
  type TableRow,
} from './model';

export interface KziReportInput {
  result: KziResult;
  requisites: Requisites;
  kzi: KziState;
  date: Date;
}

/** Приложение к письму: документы, указанные пользователем по выполненным (или неприменимым) показателям. */
export interface LetterAttachment {
  title: string;
  sheets: number | null;
}

export function letterAttachments(result: KziResult, evidence: KziState['evidence']): LetterAttachment[] {
  return result.indicators
    .filter(item => item.met)
    .flatMap(item => evidence[item.indicator.code] ?? [])
    .map(item => ({ title: trimPeriod(item.title), sheets: item.sheets }))
    .filter(item => item.title.length > 0);
}

export const attachmentLine = (item: LetterAttachment): string => `${item.title} на ${item.sheets ?? '__'} л. в 1 экз.`;

/**
 * Письмо во ФСТЭК России по шаблону исходного калькулятора.
 * Правки по замечаниям: обозначение «Кзи», дата приказа без смешения форматов, полное наименование адресата,
 * перечень приложений из указанных документов.
 */
export function buildKziLetter({ result, requisites, kzi, date }: KziReportInput): ReportDocument {
  const office = getFstecOffice(requisites.fstecOffice);
  const addressee = officeGenitive(office).replace(/^Управления ФСТЭК России /, '');
  const attachments = letterAttachments(result, kzi.evidence);
  const right = { align: 'right' as const };
  const blocks: Block[] = [
    paragraph('На бланке организации', { align: 'left' }),
    paragraph(bold(requisites.organization.trim()), { align: 'left' }),
    spacer(1),
    paragraph('Руководителю', right),
    paragraph('Управления ФСТЭК России', right),
    paragraph(addressee, right),
    paragraph(requisites.addresseeHead.trim(), right),
    heading(1, 'Отчет о расчете показателя защищенности (Кзи)'),
    paragraph(
      'В соответствии с пп. «а» п. 31 Требований о защите информации, содержащейся в государственных информационных системах, иных информационных системах государственных органов, государственных унитарных предприятий, государственных учреждений, утвержденных приказом ФСТЭК России от 11 апреля 2025 г. № 117, направляем сведения о рассчитанном показателе защищенности.'
    ),
    paragraph(bold(`Показатель защищенности Кзи = ${formatKzi(result.value)}`)),
    paragraph(
      'Документы и материалы, подтверждающие результаты расчета значения показателя защищенности Кзи, в приложении.'
    ),
  ];
  if (attachments.length) {
    blocks.push(paragraph('Приложение:', { align: 'left', keepNext: true }));
    blocks.push(
      list(
        attachments.map(item => [attachmentLine(item)]),
        { ordered: true }
      )
    );
  }
  blocks.push(
    paragraph('С уважением,', { align: 'left', spaceBefore: 36 }),
    paragraph([bold(requisites.headPosition.trim()), ' __________________ / ', bold(requisites.headName.trim())], {
      align: 'left',
    }),
    spacer(5),
    paragraph(bold(requisites.executorName.trim()), { align: 'left' }),
    paragraph(bold(requisites.executorPhone.trim()), { align: 'left' }),
    paragraph(bold(requisites.executorEmail.trim()), { align: 'left' })
  );
  return {
    title: 'Отчет о расчете показателя защищенности (Кзи)',
    fileName: buildFileName(['Отчет', 'Кзи', organizationShortName(requisites.organization)], date, 'docx'),
    lineSpacing: 1.5,
    blocks,
  };
}

/* ---------- Текущий отчет ---------- */

const DELIVERY_TITLES: Record<DocumentDelivery, string> = {
  withResults: 'Направляются с результатами оценки',
  firstAssessment: 'Направляются при первичной оценке (сноска 16 Методики)',
  onRequest: 'Представляются по запросу ФСТЭК России',
  conditional: 'При соответствующем условии, форма определяется организацией',
};
const DELIVERY_ORDER: DocumentDelivery[] = ['withResults', 'firstAssessment', 'onRequest', 'conditional'];

export function zeroReasonText(reason: ZeroReason): string {
  return reason.kind === 'test'
    ? `${reason.condition.text} (примечание к таблице 1 Методики)`
    : 'показатель группы не выполнен повторно в течение 12 месяцев (п. 35 Методики)';
}

export function ratioSummary(criterion: RatioCriterion, ratio: RatioEvaluation | undefined): string {
  const threshold = `не менее ${criterion.thresholdPercent}%`;
  if (!ratio || ratio.status === 'empty') return `количество не указано, требуется ${threshold}`;
  if (ratio.status === 'invalid') {
    return ratio.problem === 'zeroTotal' ? 'общее количество равно 0' : 'количество «из них» больше общего количества';
  }
  return `${formatPercent(ratio.percentTenths ?? 0)} при требовании ${threshold}`;
}

function indicatorBasis(item: IndicatorResult): string {
  const rule = item.indicator.notApplicable;
  if (item.notApplicable && rule) return `Не применимо (${rule.source}): ${lowerFirst(rule.text)}`;
  if (item.met) return 'Выполнен';
  const done = item.metCriteria ? `, выполнено критериев: ${item.metCriteria} из ${item.criteria.length}` : '';
  return `Не выполнен${done}`;
}

function unmetCriteria(item: IndicatorResult): string[] {
  return item.criteria
    .filter(criterion => !criterion.met)
    .map(criterion =>
      criterion.criterion.kind === 'ratio'
        ? `${trimPeriod(criterion.criterion.text)}: ${ratioSummary(criterion.criterion, criterion.ratio)}`
        : trimPeriod(criterion.criterion.text)
    );
}

export function buildKziCurrentReport({ result, requisites, kzi, date }: KziReportInput): ReportDocument {
  const blocks: Block[] = [heading(1, 'Текущий отчет о показателе защищенности (Кзи)')];
  const organization = requisites.organization.trim();
  if (organization) blocks.push(paragraph(['Организация: ', organization], { align: 'left' }));
  blocks.push(
    paragraph(`Дата формирования: ${formatDateLong(date)}`, { align: 'left' }),
    paragraph(bold(`Текущее значение Кзи: ${formatKzi(result.value)}`), { align: 'left' }),
    paragraph(
      `Состояние защищенности: ${result.level.name.toLowerCase()} («${result.level.colorName}»). ${trimPeriod(result.level.text)}.`
    )
  );

  const formula = result.groups
    .map(
      group =>
        `(${group.indicators.map(item => (item.met ? formatWeight(item.indicator.weight) : '0')).join(' + ')}) × ${formatWeight(group.effectiveWeight)}`
    )
    .join(' + ');
  blocks.push(paragraph(`Расчет по п. 34 Методики: Кзи = ${formula} = ${formatKzi(result.value)}.`, { size: 'small' }));
  const zeroed = result.groups.filter(group => group.zeroed);
  if (zeroed.length) {
    blocks.push(
      paragraph(
        `Весовые коэффициенты обнулены: ${zeroed
          .map(group => `R${group.group.id} (${group.zeroReasons.map(zeroReasonText).join(', ')})`)
          .join(', ')}.`,
        { size: 'small' }
      )
    );
  }

  // Значения частных показателей
  const rows: TableRow[] = [];
  for (const group of result.groups) {
    rows.push({
      group: true,
      cells: [
        cell(
          `Группа ${group.group.id}. ${group.group.title}, R${group.group.id} = ${formatWeight(group.group.weight)}${
            group.zeroed ? ', весовой коэффициент обнулен' : ''
          }`,
          { colSpan: 4 }
        ),
      ],
    });
    for (const item of group.indicators) {
      rows.push({
        cells: [
          cell([bold(`${item.indicator.code}. `), item.indicator.text]),
          cell(formatWeight(item.indicator.weight)),
          cell(item.met ? formatWeight(item.indicator.weight) : '0'),
          cell(indicatorBasis(item)),
        ],
      });
    }
  }
  blocks.push(heading(2, 'Значения частных показателей'), {
    type: 'table',
    columns: [
      { title: 'Частный показатель безопасности', width: 52 },
      { title: 'Значение по табл. 1', width: 12, align: 'center' },
      { title: 'Присвоено', width: 12, align: 'center' },
      { title: 'Основание', width: 24 },
    ],
    rows,
  });

  // Что мешает получить Кзи = 1
  blocks.push(heading(2, 'Что мешает получить Кзи = 1'));
  if (!result.blockers.length) {
    blocks.push(paragraph('Все показатели выполнены, весовые коэффициенты групп не обнулены.'));
  } else {
    blocks.push(
      paragraph(
        'Сначала указаны обнуленные весовые коэффициенты групп, затем невыполненные показатели по убыванию вклада в Кзи (Rj × kji).',
        { size: 'small' }
      )
    );
    blocks.push(
      list(
        result.blockers.map((blocker): Run[] => {
          if (blocker.kind === 'zeroedGroup') {
            return [
              bold(`R${blocker.group.group.id} = 0. `),
              `Группа ${blocker.group.group.id} «${blocker.group.group.title}»: ${blocker.group.zeroReasons
                .map(zeroReasonText)
                .join(', ')}.`,
            ];
          }
          const item = blocker.result;
          const missing = unmetCriteria(item);
          return [
            bold(`${item.indicator.code} (вклад ${formatKzi(item.potential)}). `),
            `${trimPeriod(item.indicator.text)}.`,
            ...(missing.length ? [` Не выполнено: ${missing.join('. ')}.`] : []),
          ];
        })
      )
    );
  }

  // Подтверждающие документы
  blocks.push(heading(2, 'Подтверждающие документы и материалы'));
  const met = result.indicators.filter(item => item.met);
  const entered = met.flatMap(item =>
    (kzi.evidence[item.indicator.code] ?? [])
      .filter(doc => doc.title.trim())
      .map((doc): Run[] => [
        bold(`${item.indicator.code}. `),
        `${trimPeriod(doc.title)}${doc.sheets ? `, ${doc.sheets} л.` : ''}`,
      ])
  );
  if (entered.length) {
    blocks.push(heading(3, 'Указаны в калькуляторе (войдут в приложение к письму)'), list(entered));
  }
  const byDelivery = new Map<DocumentDelivery, Run[][]>();
  for (const item of met) {
    const documents = item.notApplicable ? (item.indicator.notApplicableDocuments ?? []) : item.indicator.documents;
    for (const document of documents) {
      const items = byDelivery.get(document.delivery) ?? [];
      items.push([bold(`${item.indicator.code}. `), document.text]);
      byDelivery.set(document.delivery, items);
    }
  }
  if (byDelivery.size) {
    blocks.push(paragraph('Перечень по приложению № 1 к Методике для выполненных показателей:', { size: 'small' }));
    for (const delivery of DELIVERY_ORDER) {
      const items = byDelivery.get(delivery);
      if (items?.length) blocks.push(heading(3, DELIVERY_TITLES[delivery]), list(items, { size: 'small' }));
    }
  } else if (!entered.length) {
    blocks.push(paragraph('Выполненных показателей нет, документы для направления не требуются.'));
  }

  // Заметки
  const notes = result.groups
    .map(group => ({ group: group.group, text: (kzi.notes[group.group.id] ?? '').trim() }))
    .filter(note => note.text);
  if (notes.length) {
    blocks.push(heading(2, 'Заметки по группам'));
    for (const note of notes) {
      const [first, ...rest] = note.text.split(/\r?\n/);
      blocks.push(paragraph([bold(`Группа ${note.group.id}. ${note.group.title}: `), first ?? '']));
      for (const line of rest) if (line.trim()) blocks.push(paragraph(line));
    }
  }

  blocks.push(
    paragraph(`Расчет выполнен по Методике ФСТЭК России от ${KZI_METHODOLOGY.approvedAt}.`, {
      size: 'small',
      spaceBefore: 6,
    }),
    contactsParagraph()
  );
  blocks.push(...abbreviationsSection(blocks));

  return {
    title: 'Текущий отчет о показателе защищенности (Кзи)',
    fileName: buildFileName(['Текущий_отчет', 'Кзи', organizationShortName(requisites.organization)], date, 'docx'),
    lineSpacing: 1.15,
    blocks,
  };
}
