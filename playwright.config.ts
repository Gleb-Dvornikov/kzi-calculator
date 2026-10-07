import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;

/** Сквозные тесты: собирают сайт в dist/ и проверяют его в Chromium. */
export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : 'list',
  use: {
    baseURL: `http://localhost:${PORT}/`,
    locale: 'ru-RU',
    acceptDownloads: true,
    trace: 'retain-on-failure',
    // Имена скачанных файлов на кириллице требуют UTF-8 в окружении браузера
    launchOptions: { env: { ...process.env, LANG: process.env.LANG || 'C.UTF-8' } },
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run build && node scripts/preview.mjs',
    url: `http://localhost:${PORT}/`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
