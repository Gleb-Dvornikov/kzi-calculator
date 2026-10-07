/**
 * Простая модель документа. Отчеты описываются этой моделью, а файл .docx строит renderDocx.
 * Так содержание отчетов проверяется тестами без разбора .docx, а оформление задается в одном месте.
 */

export interface StyledText {
  text: string;
  bold?: boolean;
  italic?: boolean;
  /** Серый курсив: поля, которые заполняют в Word. */
  placeholder?: boolean;
}

export type Run = string | StyledText;
export type Align = 'left' | 'center' | 'right' | 'justify';

export interface ParagraphBlock {
  type: 'paragraph';
  runs: Run[];
  align?: Align;
  size?: 'normal' | 'small';
  /** Отступ перед абзацем, в пунктах. */
  spaceBefore?: number;
  /** Отступ слева, в сантиметрах. */
  indentLeft?: number;
  keepNext?: boolean;
}

export interface HeadingBlock {
  type: 'heading';
  level: 1 | 2 | 3;
  /** Несколько строк заголовка выводятся с переносом внутри одного абзаца. */
  lines: string[];
}

export interface ListBlock {
  type: 'list';
  ordered?: boolean;
  items: Run[][];
  size?: 'normal' | 'small';
}

export interface TableColumn {
  title: string;
  /** Относительная ширина: ширины всех колонок пересчитываются в ширину страницы. */
  width: number;
  align?: 'left' | 'center';
}

export type CellFill = 'achieved' | 'gap';

export interface TableCell {
  /** Абзацы ячейки. */
  paragraphs: Run[][];
  colSpan?: number;
  align?: 'left' | 'center';
  fill?: CellFill;
  muted?: boolean;
}

export interface TableRow {
  cells: TableCell[];
  /** Строка-заголовок группы: серый фон и полужирный шрифт. */
  group?: boolean;
}

export interface TableBlock {
  type: 'table';
  columns: TableColumn[];
  rows: TableRow[];
  size?: 'small' | 'tiny';
}

export interface SpacerBlock {
  type: 'spacer';
  lines: number;
}

export type Block = ParagraphBlock | HeadingBlock | ListBlock | TableBlock | SpacerBlock;

export interface ReportDocument {
  title: string;
  fileName: string;
  /** Междустрочный интервал: 1 - одинарный, 1.5 - полуторный. */
  lineSpacing: number;
  blocks: Block[];
}

/* ---------- Конструкторы ---------- */

export const bold = (text: string): StyledText => ({ text, bold: true });
export const placeholder = (text: string): StyledText => ({ text: `[${text}]`, placeholder: true });

export const paragraph = (runs: Run | Run[], options: Omit<ParagraphBlock, 'type' | 'runs'> = {}): ParagraphBlock => ({
  type: 'paragraph',
  runs: Array.isArray(runs) ? runs : [runs],
  ...options,
});

export const heading = (level: 1 | 2 | 3, ...lines: string[]): HeadingBlock => ({ type: 'heading', level, lines });

export const list = (items: Run[][], options: Omit<ListBlock, 'type' | 'items'> = {}): ListBlock => ({
  type: 'list',
  items,
  ...options,
});

export const spacer = (lines = 1): SpacerBlock => ({ type: 'spacer', lines });

/** Ячейка из одного или нескольких абзацев: строка, массив частей или массив абзацев. */
export function cell(content: Run | Run[] | Run[][], options: Omit<TableCell, 'paragraphs'> = {}): TableCell {
  let paragraphs: Run[][];
  if (!Array.isArray(content)) paragraphs = [[content]];
  else if (content.length > 0 && content.every(item => Array.isArray(item))) paragraphs = content as Run[][];
  else paragraphs = [content as Run[]];
  return { paragraphs, ...options };
}

/* ---------- Текст документа ---------- */

export const runText = (run: Run): string => (typeof run === 'string' ? run : run.text);
const runsText = (runs: Run[]): string => runs.map(runText).join('');

/** Весь текст документа: для тестов и для перечня сокращений. */
export function documentText(blocks: readonly Block[]): string {
  return blocks
    .map(block => {
      switch (block.type) {
        case 'paragraph':
          return runsText(block.runs);
        case 'heading':
          return block.lines.join('\n');
        case 'list':
          return block.items.map(runsText).join('\n');
        case 'table':
          return [
            block.columns.map(column => column.title).join(' | '),
            ...block.rows.map(row => row.cells.map(c => c.paragraphs.map(runsText).join(' ')).join(' | ')),
          ].join('\n');
        case 'spacer':
          return '';
        default:
          return '';
      }
    })
    .join('\n');
}
