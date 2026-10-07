import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { describe, test } from 'node:test';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap(name => {
    const file = path.join(dir, name);
    if (statSync(file).isDirectory()) return sourceFiles(file);
    return /\.(tsx?|css|html)$/.test(name) ? [file] : [];
  });
}

const files = sourceFiles(path.join(ROOT, 'src')).map(file => ({
  file: path.relative(ROOT, file),
  text: readFileSync(file, 'utf8'),
}));

describe('Тексты интерфейса и отчетов', () => {
  test('нет буквы «е» с двумя точками', () => {
    const found = files.filter(({ text }) => /[\u0401\u0451]/.test(text)).map(({ file }) => file);
    assert.deepEqual(found, []);
  });

  test('обозначения Кзи и Узи как в приказе, без «КЗИ» и «УЗИ»', () => {
    const found = files.filter(({ text }) => /КЗИ|УЗИ/.test(text)).map(({ file }) => file);
    assert.deepEqual(found, []);
  });

  test('нет длинных и средних тире', () => {
    const found = files.filter(({ text }) => /[—–]/.test(text)).map(({ file }) => file);
    assert.deepEqual(found, []);
  });

  test('нет сокращения «УФО»: Уральский федеральный округ обозначается «УрФО»', () => {
    const found = files.filter(({ text }) => /УФО/.test(text)).map(({ file }) => file);
    assert.deepEqual(found, []);
  });

  test('шрифты не загружаются с Google Fonts', () => {
    const found = files.filter(({ text }) => /fonts\.(googleapis|gstatic)\.com/.test(text)).map(({ file }) => file);
    assert.deepEqual(found, []);
  });
});
