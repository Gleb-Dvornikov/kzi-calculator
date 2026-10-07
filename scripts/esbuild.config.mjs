// Общие настройки сборки для build.mjs и dev.mjs
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const ENTRY = 'src/main.tsx';

/** @param {'development' | 'production'} mode */
export function esbuildOptions(mode) {
  return {
    absWorkingDir: ROOT,
    entryPoints: [ENTRY],
    bundle: true,
    format: 'esm',
    // Генераторы отчетов (библиотека docx) выносятся в отдельные файлы и грузятся по нажатию кнопки
    splitting: true,
    chunkNames: 'chunks/[name]-[hash]',
    assetNames: '[name]-[hash]',
    platform: 'browser',
    target: ['es2020', 'chrome100', 'edge100', 'firefox100', 'safari15'],
    jsx: 'automatic',
    loader: { '.svg': 'dataurl', '.woff': 'file', '.woff2': 'file' },
    define: { 'process.env.NODE_ENV': JSON.stringify(mode) },
    legalComments: 'none',
    logLevel: 'warning',
  };
}

/**
 * Подставляет пути к собранным файлам в шаблон src/index.html.
 * @param {{ js: string, css?: string, devReload?: boolean }} files
 */
export async function renderHtml(files) {
  const template = await readFile(path.join(ROOT, 'src/index.html'), 'utf8');
  const css = files.css ? `<link rel="stylesheet" href="${files.css}">` : '';
  const reload = files.devReload
    ? `<script>new EventSource('/esbuild').addEventListener('change', () => location.reload());</script>`
    : '';
  return template
    .replace('<!--app-css-->', css)
    .replace('<!--app-js-->', `<script type="module" src="${files.js}"></script>${reload}`);
}
