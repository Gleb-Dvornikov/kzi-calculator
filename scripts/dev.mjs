// Сервер разработки с пересборкой и перезагрузкой страницы: npm run dev -> http://localhost:5173
import path from 'node:path';
import { context } from 'esbuild';
import { cp, mkdir, rm, writeFile } from 'node:fs/promises';
import { ROOT, esbuildOptions, renderHtml } from './esbuild.config.mjs';

const devDir = path.join(ROOT, 'dev');
await rm(devDir, { recursive: true, force: true });
await mkdir(devDir, { recursive: true });
await cp(path.join(ROOT, 'public'), devDir, { recursive: true });
await writeFile(
  path.join(devDir, 'index.html'),
  await renderHtml({ js: 'assets/app.js', css: 'assets/app.css', devReload: true })
);

const ctx = await context({
  ...esbuildOptions('development'),
  outdir: path.join(devDir, 'assets'),
  entryNames: 'app',
  sourcemap: 'linked',
  logLevel: 'info',
});
await ctx.watch();
const port = Number(process.env.PORT) || 5173;
await ctx.serve({ servedir: devDir, port });
console.log(`Калькулятор: http://localhost:${port}`);
