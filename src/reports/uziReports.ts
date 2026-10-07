import { buildFileName, organizationShortName } from '../domain/common/fileName';
import {
  formatA,
  formatD,
  formatDate,
  formatDateLong,
  formatFraction,
  formatP,
  formatUzi,
  pluralRu,
} from '../domain/common/format';
import type { Requisites } from '../domain/requisites';
import type { DirectionResult, RequirementGap, UziResult } from '../domain/uzi/calculate';
import { UZI_DIRECTIONS, UZI_REQUIREMENT_TYPES } from '../domain/uzi/methodology';
import type { UziState } from '../state/types';
import { abbreviationsSection, contactsParagraph, trimPeriod } from './common';
import {
  bold,
  cell,
  heading,
  list,
  paragraph,
  placeholder,
  spacer,
  type Block,
  type ReportDocument,
  type Run,
  type TableBlock,
  type TableCell,
} from './model';

export interface UziReportInput {
  result: UziResult;
  requisites: Requisites;
  uzi: UziState;
  date: Date;
  /** true - отчет по составу п. 35 Методики для Заказчика, false - текущий рабочий отчет. */
  full: boolean;
}

const TYPES = UZI_REQUIREMENT_TYPES.map(type => type.id);
const value = (a: number | null) => (a === null ? '-' : formatA(a));
/** «не менее 0,5» или «1». */
const requiredText = (gap: RequirementGap) => (gap.required === 10 ? '1' : `не менее ${formatA(gap.required)}`);
const recommendation = (gap: RequirementGap) =>
  gap.required === 10 ? gap.type.recommendations.full : gap.type.recommendations.partial;

const numberCell = (direction: DirectionResult): TableCell => cell(String(direction.direction.id), { align: 'center' });
const nameCell = (direction: DirectionResult): TableCell => cell(direction.direction.title);

function evidenceLines(text: string | undefined): Run[][] {
  return (text ?? '')
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => [line]);
}

export function buildUziReport({ result, requisites, uzi, date, full }: UziReportInput): ReportDocument {
  const blocks: Block[] = [];
  const organization = requisites.organization.trim();
  const target = result.target;
  const total = result.count ? formatUzi(result.value) : '-';
  const missing = result.questions - result.answered;
  const excluded = result.directions.filter(direction => direction.excluded);
  let section = 0;
  const h = (title: string) => heading(2, `${++section}. ${title}`);
  const fill = (text: string) => placeholder(text);

  if (full) {
    const approve = { align: 'left' as const, indentLeft: 9 };
    blocks.push(
      paragraph('УТВЕРЖДАЮ', approve),
      paragraph(requisites.headPosition.trim(), approve),
      paragraph(organization, approve),
      spacer(1),
      paragraph(`__________________ ${requisites.headName.trim()}`, approve),
      paragraph('«___» ______________ 20___ г.', approve),
      heading(
        1,
        'ОТЧЕТ',
        'об оценке уровня зрелости деятельности в области технической защиты информации',
        organization
      )
    );
  } else {
    blocks.push(heading(1, 'Текущий отчет об оценке уровня зрелости (Узи)'));
    if (organization) blocks.push(paragraph(['Организация: ', organization], { align: 'left' }));
  }

  blocks.push(
    paragraph(
      `Оценка проведена по Методике оценки уровня зрелости деятельности в области технической защиты информации в информационных системах и обеспечения безопасности значимых объектов критической информационной инфраструктуры Российской Федерации, утвержденной ФСТЭК России 7 августа 2026 г. (далее - Методика).${
        full ? ' Состав отчета соответствует пункту 35 Методики.' : ''
      }`
    ),
    paragraph([
      bold(`Уровень зрелости Узи = ${total}`),
      result.level ? `, ${result.level.name.toLowerCase()}. ${trimPeriod(result.level.text)}.` : '',
    ]),
    paragraph(
      `Целевой уровень зрелости направлений: не ниже ${target}. Достигнут по ${result.reached} из ${result.count} ${pluralRu(
        result.count,
        ['оцениваемого направления', 'оцениваемых направлений', 'оцениваемых направлений']
      )}.`
    )
  );

  if (full) {
    const customer = requisites.customer.trim();
    blocks.push(
      h('Сведения об организации'),
      paragraph(`Наименование: ${organization}`),
      paragraph([
        'Заказчик (оператор), для которого проводится оценка: ',
        customer ? customer : fill('указать при необходимости'),
      ]),
      paragraph([
        'Действующие в организации требования по защите информации: ',
        fill('нормативные правовые акты, стандарты и внутренние документы организации'),
      ]),
      h('Дата проведения оценки'),
      paragraph(formatDate(date)),
      h('Лица, проводившие оценку'),
      paragraph(
        [
          requisites.executorName.trim(),
          requisites.executorPosition.trim(),
          organization,
          requisites.executorPhone.trim() ? `тел. ${requisites.executorPhone.trim()}` : '',
          requisites.executorEmail.trim(),
        ]
          .filter(Boolean)
          .join(', ')
      ),
      h('Лица, участвовавшие в оценке, в том числе предоставлявшие исходные данные'),
      paragraph(fill('фамилия и инициалы, должность, наименование организации, контактная информация')),
      h('Результаты предыдущей оценки'),
      paragraph(fill('дата и значения предыдущей оценки или «оценка проводится впервые»')),
      h('Исходные данные'),
      paragraph(
        `Значения выполнения видов требований a, определенные по таблице 2 Методики для каждого направления, приведены в разделе 9. Подтверждающие документы и материалы указаны в разделе 11.${
          missing
            ? ` По ${missing} ${pluralRu(missing, ['виду', 'видам', 'видам'])} требований сведения не представлены, им присвоено значение 0 (п. 24 Методики).`
            : ''
        }`
      ),
      h('Методы и инструменты оценки'),
      paragraph(
        'Внутренняя оценка уровня зрелости (п. 6 Методики). Степень выполнения вида требований Dij = wj · aj (п. 29), значение уровня зрелости направления Pзн = ΣDij (п. 30), текущий уровень зрелости направления по нормированным значениям таблицы 3 (п. 31), уровень зрелости Узи как среднее арифметическое текущих уровней направлений (п. 10) с интерпретацией по таблице 1. Инструмент: калькулятор уровня зрелости CheckU (УЦСБ).'
      )
    );
  }

  // Направления деятельности
  blocks.push(
    h('Направления деятельности (области оценки)'),
    paragraph(
      `В область оценки включено направлений: ${result.count} из ${UZI_DIRECTIONS.length} (перечень п. 12 Методики, номера направлений сохранены в таблицах отчета).${
        excluded.length ? ' Исключены как неприменимые (п. 13 Методики):' : ' Неприменимых направлений нет.'
      }`
    )
  );
  if (excluded.length) {
    blocks.push(
      list(
        excluded.map(direction => {
          const reason = (uzi.evidence[direction.direction.id] ?? '').trim().replace(/\s*\r?\n\s*/g, ' ');
          return [`${direction.direction.id}. ${direction.direction.title}${reason ? `: ${reason}` : ''}`];
        })
      )
    );
  }

  // Исходные значения a
  const valuesTable: TableBlock = {
    type: 'table',
    size: 'tiny',
    columns: [
      { title: '№', width: 6, align: 'center' },
      { title: 'Направление', width: 38 },
      ...TYPES.map(j => ({ title: `a${j}`, width: 7, align: 'center' as const })),
    ],
    rows: result.directions.map(direction => ({
      cells: direction.excluded
        ? [numberCell(direction), nameCell(direction), cell('исключено', { colSpan: 8, align: 'center', muted: true })]
        : [numberCell(direction), nameCell(direction), ...direction.values.map(a => cell(value(a)))],
    })),
  };
  blocks.push(
    h('Исходные значения a по видам требований (таблица 2 Методики)'),
    valuesTable,
    paragraph(
      `${UZI_REQUIREMENT_TYPES.map(type => `a${type.id}: ${type.name.toLowerCase()}`).join(', ')}.${
        missing ? ' Прочерк: ответа нет, значение принято равным 0.' : ''
      }`,
      { size: 'small' }
    )
  );

  // Dij и Pзн
  blocks.push(h('Степень выполнения видов требований Dij и значения Pзн'), {
    type: 'table',
    size: 'tiny',
    columns: [
      { title: '№', width: 6, align: 'center' },
      { title: 'Направление', width: 31 },
      ...TYPES.map(j => ({ title: `D${j}`, width: 7, align: 'center' as const })),
      { title: 'Pзн', width: 7, align: 'center' },
    ],
    rows: result.included.map(direction => ({
      cells: [
        numberCell(direction),
        nameCell(direction),
        ...direction.degrees.map(d => cell(formatD(d))),
        cell(bold(formatP(direction.total))),
      ],
    })),
  });
  blocks.push(
    paragraph(
      `Dij = wj · aj, Pзн = ΣDij. Весовые коэффициенты w: ${UZI_REQUIREMENT_TYPES.map(
        type => `D${type.id} ${formatFraction(type.weight, 2)}`
      ).join(', ')}.`,
      { size: 'small' }
    )
  );

  // Текущие уровни и расчет Узи
  const verdict = (direction: DirectionResult) =>
    `${direction.level > 0 ? `Уровень ${direction.level} достигнут` : 'Условия уровня 1 не выполнены'}${
      direction.level >= target ? ', целевой уровень достигнут' : ', целевой уровень не достигнут'
    }`;
  blocks.push(h('Текущие уровни зрелости направлений и расчет Узи'), {
    type: 'table',
    columns: [
      { title: '№', width: 6, align: 'center' },
      { title: 'Направление', width: 30 },
      { title: 'Текущий уровень', width: 10, align: 'center' },
      { title: 'Целевой уровень', width: 10, align: 'center' },
      { title: 'Заключение', width: 19 },
      { title: 'Подтверждающие документы, инструменты, результаты мероприятий', width: 25 },
    ],
    rows: result.included.map(direction => {
      const evidence = evidenceLines(uzi.evidence[direction.direction.id]);
      return {
        cells: [
          numberCell(direction),
          nameCell(direction),
          cell(bold(String(direction.level))),
          cell(String(target)),
          cell(verdict(direction)),
          evidence.length ? cell(evidence) : cell(full ? [placeholder('указать')] : ''),
        ],
      };
    }),
  });
  blocks.push(
    paragraph(
      `Узи = (Σ текущих уровней направлений) / N = ${result.sum} / ${result.count} = ${total} (п. 10 Методики).`
    )
  );
  if (result.level) {
    blocks.push(
      paragraph([
        'Уровень зрелости по таблице 1 Методики: ',
        bold(result.level.name.toLowerCase()),
        ` (${result.level.range}).`,
      ])
    );
  }

  // Профиль
  blocks.push(h('Профиль уровней зрелости'), {
    type: 'table',
    columns: [
      { title: '№', width: 6, align: 'center' },
      { title: 'Направление', width: 54 },
      ...[1, 2, 3, 4].map(level => ({ title: `Уровень ${level}`, width: 10, align: 'center' as const })),
    ],
    rows: result.directions.map(direction => ({
      cells: direction.excluded
        ? [numberCell(direction), nameCell(direction), cell('исключено', { colSpan: 4, align: 'center', muted: true })]
        : [
            numberCell(direction),
            nameCell(direction),
            ...[1, 2, 3, 4].map(level =>
              cell('', { fill: level <= direction.level ? 'achieved' : level <= target ? 'gap' : undefined })
            ),
          ],
    })),
  });
  blocks.push(
    paragraph(`Оранжевым отмечены достигнутые уровни, розовым разрыв до целевого уровня «не ниже ${target}».`, {
      size: 'small',
    })
  );

  // Направления ниже цели
  const below = result.included.filter(direction => direction.level < target);
  blocks.push(h('Направления, по которым не достигнуты целевые значения'));
  if (below.length) {
    blocks.push({
      type: 'table',
      columns: [
        { title: '№', width: 6, align: 'center' },
        { title: 'Направление', width: 34 },
        { title: 'Уровень', width: 12, align: 'center' },
        { title: 'Виды требований с недостатками: текущее и требуемое значение a', width: 48 },
      ],
      rows: below.map(direction => ({
        cells: [
          numberCell(direction),
          nameCell(direction),
          cell(`${direction.level} из ${target}`),
          cell([
            ...(direction.answered ? [] : [['Сведения не представлены (п. 24 Методики).']]),
            ...direction.gaps.map(gap => [`${gap.type.name}: ${value(gap.current)}, требуется ${requiredText(gap)}`]),
          ]),
        ],
      })),
    });
  } else {
    blocks.push(paragraph('Целевой уровень достигнут по всем оцениваемым направлениям.'));
  }

  // Рекомендации
  blocks.push(h('Рекомендации по совершенствованию защиты информации'));
  if (below.length) {
    blocks.push({
      type: 'table',
      columns: [
        { title: '№', width: 6, align: 'center' },
        { title: 'Направление', width: 24 },
        { title: 'Мероприятия', width: 40 },
        { title: 'Срок выполнения', width: 13, align: 'center' },
        { title: 'Ответственный', width: 17, align: 'center' },
      ],
      rows: below.map(direction => ({
        cells: [
          numberCell(direction),
          nameCell(direction),
          cell(direction.gaps.map(gap => [`- ${recommendation(gap)}`])),
          cell(full ? [placeholder('срок')] : ''),
          cell(full ? [placeholder('подразделение, работник')] : ''),
        ],
      })),
    });
  } else {
    blocks.push(
      paragraph(
        'Мероприятия для достижения целевого уровня не требуются. Для дальнейшего повышения зрелости используйте условия следующего уровня по таблице 3 Методики.'
      )
    );
  }

  if (full) {
    blocks.push(
      spacer(1),
      paragraph('Оценку провели:', { align: 'left' }),
      paragraph(`${requisites.executorPosition.trim()} __________________ ${requisites.executorName.trim()}`, {
        align: 'left',
      }),
      spacer(1),
      paragraph(`Дата составления отчета: ${formatDateLong(date)}`, { align: 'left' })
    );
  } else {
    blocks.push(
      paragraph(`Дата формирования: ${formatDateLong(date)}`, { align: 'left', spaceBefore: 6 }),
      contactsParagraph()
    );
  }
  blocks.push(...abbreviationsSection(blocks));

  const prefix = full ? 'Отчет' : 'Текущий_отчет';
  return {
    title: full ? 'Отчет об оценке уровня зрелости' : 'Текущий отчет об оценке уровня зрелости (Узи)',
    fileName: buildFileName([prefix, 'Узи', organizationShortName(requisites.organization)], date, 'docx'),
    lineSpacing: 1.15,
    blocks,
  };
}
