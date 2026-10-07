// Production-сборка.
//   npm run build        -> dist/
//   npm run build:pages  -> корень репозитория (index.html, assets/, favicon.svg), его публикует GitHub Pages
import path from 'node:path';
import { build } from 'esbuild';
import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
import { ENTRY, ROOT, esbuildOptions, renderHtml } from './esbuild.config.mjs';

const pages = process.argv.includes('--pages');
const outRoot = pages ? ROOT : path.join(ROOT, 'dist');
const assetsDir = path.join(outRoot, 'assets');

if (!pages) await rm(outRoot, { recursive: true, force: true });
await rm(assetsDir, { recursive: true, force: true });
await mkdir(assetsDir, { recursive: true });

const result = await build({
  ...esbuildOptions('production'),
  outdir: assetsDir,
  entryNames: 'app-[hash]',
  minify: true,
  metafile: true,
});

const relative = file => path.relative(outRoot, path.join(ROOT, file)).split(path.sep).join('/');
const entry = Object.entries(result.metafile.outputs).find(([, output]) => output.entryPoint === ENTRY);
if (!entry) throw new Error('Сборка не создала файл приложения');
const [jsFile, jsOutput] = entry;

await cp(path.join(ROOT, 'public'), outRoot, { recursive: true });
await writeFile(
  path.join(outRoot, 'index.html'),
  await renderHtml({ js: relative(jsFile), css: jsOutput.cssBundle ? relative(jsOutput.cssBundle) : undefined })
);
if (pages) await writeFile(path.join(ROOT, '.nojekyll'), '');

for (const [file, info] of Object.entries(result.metafile.outputs)) {
  if (file.endsWith('.map')) continue;
  console.log(`${relative(file).padEnd(48)} ${(info.bytes / 1024).toFixed(1).padStart(7)} KB`);
}
console.log(`Готово: ${path.relative(process.cwd(), outRoot) || '.'}/index.html`);
