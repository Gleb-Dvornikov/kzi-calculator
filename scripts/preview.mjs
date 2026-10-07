// Просмотр собранного сайта: npm run build && npm run preview -> http://localhost:4173
// Этот же сервер поднимают e2e-тесты Playwright.
import http from 'node:http';
import path from 'node:path';
import { readFile } from 'node:fs/promises';
import { ROOT } from './esbuild.config.mjs';

const dir = path.join(ROOT, process.env.PREVIEW_DIR || 'dist');
const port = Number(process.env.PORT) || 4173;
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.json': 'application/json',
};

http
  .createServer(async (request, response) => {
    const url = new URL(request.url || '/', 'http://localhost');
    const file = path.normalize(path.join(dir, decodeURIComponent(url.pathname)));
    if (!file.startsWith(dir)) {
      response.writeHead(403).end();
      return;
    }
    const target = url.pathname.endsWith('/') ? path.join(file, 'index.html') : file;
    try {
      const body = await readFile(target);
      response.writeHead(200, { 'Content-Type': TYPES[path.extname(target)] || 'application/octet-stream' });
      response.end(body);
    } catch {
      response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Не найдено');
    }
  })
  .listen(port, () => console.log(`Сайт: http://localhost:${port}`));
