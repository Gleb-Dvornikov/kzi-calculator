/**
 * Модель документа -> файл .docx (библиотека docx).
 * Оформление официальных документов: A4, Times New Roman 12, поля 2 см сверху и снизу, 2,5 см слева, 1,5 см справа.
 */
import {
  AlignmentType,
  BorderStyle,
  Document,
  LevelFormat,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableLayoutType,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
  convertMillimetersToTwip,
} from 'docx';
import { withoutYo } from '../domain/common/format';
import type { Align, Block, CellFill, ReportDocument, Run, TableBlock, TableCell as ModelCell } from './model';

const FONT = 'Times New Roman';
/** Размеры шрифта в половинах пункта. */
const SIZE = { normal: 24, small: 20, tiny: 18 } as const;
const COLORS = { header: 'F2F2F2', achieved: 'F7942E', gap: 'F8C9C9', muted: '7F7F7F' } as const;

const PAGE = {
  width: 11906,
  height: 16838,
  margin: {
    top: convertMillimetersToTwip(20),
    bottom: convertMillimetersToTwip(20),
    left: convertMillimetersToTwip(25),
    right: convertMillimetersToTwip(15),
  },
};
/** Ширина области текста в DXA (1/20 пункта). */
export const CONTENT_WIDTH = PAGE.width - PAGE.margin.left - PAGE.margin.right;

const ALIGN: Record<Align, (typeof AlignmentType)[keyof typeof AlignmentType]> = {
  left: AlignmentType.LEFT,
  center: AlignmentType.CENTER,
  right: AlignmentType.RIGHT,
  justify: AlignmentType.JUSTIFIED,
};

const BULLETS = 'bullets';
const NUMBERS = 'numbers';

/** Весь текст, включая введенный пользователем, проходит через withoutYo: в официальных документах пишется «е». */
function textRuns(runs: readonly Run[], size: number, base: { bold?: boolean } = {}): TextRun[] {
  return runs.map(run => {
    const styled = typeof run === 'string' ? { text: run } : run;
    return new TextRun({
      text: withoutYo(styled.text).replace(/\s*\r?\n\s*/g, ' '),
      bold: styled.bold ?? base.bold,
      italics: styled.italic || styled.placeholder,
      color: styled.placeholder ? COLORS.muted : undefined,
      font: FONT,
      size,
    });
  });
}

/** Ширины колонок в DXA: сумма точно равна ширине таблицы. */
export function columnWidths(relative: readonly number[], total: number = CONTENT_WIDTH): number[] {
  const sum = relative.reduce((a, b) => a + b, 0);
  const widths = relative.map(width => Math.floor((width / sum) * total));
  const rest = total - widths.reduce((a, b) => a + b, 0);
  widths[widths.length - 1] = (widths[widths.length - 1] ?? 0) + rest;
  return widths;
}

const BORDER = { style: BorderStyle.SINGLE, size: 4, color: '000000' };
const CELL_BORDERS = { top: BORDER, bottom: BORDER, left: BORDER, right: BORDER };
const CELL_MARGINS = { top: 40, bottom: 40, left: 80, right: 80 };

function fillColor(fill: CellFill | undefined, header: boolean): string | undefined {
  if (header) return COLORS.header;
  if (fill === 'achieved') return COLORS.achieved;
  if (fill === 'gap') return COLORS.gap;
  return undefined;
}

function renderCell(model: ModelCell, width: number, size: number, options: { header?: boolean; group?: boolean }) {
  const color = fillColor(model.fill, Boolean(options.header || options.group));
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    columnSpan: model.colSpan,
    borders: CELL_BORDERS,
    margins: CELL_MARGINS,
    verticalAlign: VerticalAlign.TOP,
    shading: color ? { type: ShadingType.CLEAR, color: 'auto', fill: color } : undefined,
    children: model.paragraphs.map(
      runs =>
        new Paragraph({
          alignment: model.align === 'center' ? AlignmentType.CENTER : AlignmentType.LEFT,
          spacing: { before: 0, after: 0, line: 240 },
          children: textRuns(
            model.muted ? runs.map(run => (typeof run === 'string' ? { text: run, placeholder: true } : run)) : runs,
            size,
            { bold: options.header || options.group }
          ),
        })
    ),
  });
}

function renderTable(block: TableBlock): Table {
  const size = SIZE[block.size ?? 'small'];
  const widths = columnWidths(block.columns.map(column => column.width));
  const spanWidth = (start: number, span: number) => widths.slice(start, start + span).reduce((a, b) => a + b, 0);

  const header = new TableRow({
    tableHeader: true,
    cantSplit: true,
    children: block.columns.map((column, index) =>
      renderCell({ paragraphs: [[column.title]], align: column.align }, widths[index] ?? 0, size, { header: true })
    ),
  });

  const rows = block.rows.map(row => {
    let column = 0;
    const cells = row.cells.map(model => {
      const span = model.colSpan ?? 1;
      const align = model.align ?? block.columns[column]?.align;
      const rendered = renderCell({ ...model, align }, spanWidth(column, span), size, { group: row.group });
      column += span;
      return rendered;
    });
    return new TableRow({ cantSplit: true, children: cells });
  });

  return new Table({
    width: { size: CONTENT_WIDTH, type: WidthType.DXA },
    columnWidths: widths,
    layout: TableLayoutType.FIXED,
    rows: [header, ...rows],
  });
}

let listInstance = 0;

function renderBlock(block: Block, lineSpacing: number): (Paragraph | Table)[] {
  const line = Math.round(240 * lineSpacing);
  switch (block.type) {
    case 'paragraph': {
      const size = SIZE[block.size ?? 'normal'];
      return [
        new Paragraph({
          alignment: ALIGN[block.align ?? 'justify'],
          keepNext: block.keepNext,
          indent: block.indentLeft ? { left: convertMillimetersToTwip(block.indentLeft * 10) } : undefined,
          spacing: { before: (block.spaceBefore ?? 0) * 20, after: 120, line },
          children: textRuns(block.runs, size),
        }),
      ];
    }
    case 'heading': {
      const centered = block.level === 1;
      const runs = block.lines.map(
        (text, index) =>
          new TextRun({
            text: withoutYo(text),
            bold: true,
            italics: block.level === 3,
            font: FONT,
            size: SIZE.normal,
            break: index > 0 ? 1 : undefined,
          })
      );
      return [
        new Paragraph({
          alignment: centered ? AlignmentType.CENTER : AlignmentType.LEFT,
          keepNext: true,
          spacing: { before: block.level === 1 ? 240 : block.level === 2 ? 280 : 200, after: 120, line },
          children: runs,
        }),
      ];
    }
    case 'list': {
      const size = SIZE[block.size ?? 'normal'];
      listInstance += 1;
      const instance = listInstance;
      return block.items.map(
        runs =>
          new Paragraph({
            alignment: AlignmentType.JUSTIFIED,
            numbering: { reference: block.ordered ? NUMBERS : BULLETS, level: 0, instance },
            spacing: { before: 0, after: 60, line },
            children: textRuns(runs, size),
          })
      );
    }
    case 'table':
      // Пустой абзац после таблицы, иначе следующий текст прилипает к ней
      return [renderTable(block), new Paragraph({ spacing: { before: 0, after: 60 }, children: [] })];
    case 'spacer':
      return Array.from(
        { length: block.lines },
        () => new Paragraph({ spacing: { before: 0, after: 0, line }, children: [] })
      );
    default:
      return [];
  }
}

export function buildDocx(report: ReportDocument): Document {
  return new Document({
    creator: 'Калькулятор Кзи и Узи (CheckU)',
    title: report.title,
    styles: {
      default: {
        document: { run: { font: FONT, size: SIZE.normal } },
      },
    },
    numbering: {
      config: [
        {
          reference: BULLETS,
          levels: [
            {
              level: 0,
              format: LevelFormat.BULLET,
              text: '•',
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 567, hanging: 283 } } },
            },
          ],
        },
        {
          reference: NUMBERS,
          levels: [
            {
              level: 0,
              format: LevelFormat.DECIMAL,
              text: '%1.',
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 567, hanging: 340 } } },
            },
          ],
        },
      ],
    },
    sections: [
      {
        properties: { page: { size: { width: PAGE.width, height: PAGE.height }, margin: PAGE.margin } },
        children: report.blocks.flatMap(block => renderBlock(block, report.lineSpacing)),
      },
    ],
  });
}

export function renderDocxBlob(report: ReportDocument): Promise<Blob> {
  return Packer.toBlob(buildDocx(report));
}
