import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { checkAllCriteria, fillAllRatios, fillRatio, resultValue } from './helpers';

test.beforeEach(async ({ page }) => {
  await page.goto('./');
  await page.evaluate(() => window.localStorage.clear());
  await page.goto('./#kzi');
});

test('Кзи: все показатели выполнены, затем порог многофакторной аутентификации не достигнут', async ({ page }) => {
  await expect(resultValue(page)).toHaveText('0,00');
  await checkAllCriteria(page);
  await fillAllRatios(page, '10', '10');
  await expect(resultValue(page)).toHaveText('1,00');
  await expect(page.getByText('Минимальный базовый').first()).toBeVisible();

  // Пример из замечаний: 40 привилегированных, 18 со вторым фактором -> 45%, не выполнено
  await fillRatio(page, 'k22', '40', '18');
  const k22 = page.locator('#indicator-k22');
  await expect(k22.getByText('45%', { exact: true })).toBeVisible();
  await expect(k22.getByText('не выполнено', { exact: true })).toBeVisible();
  await expect(resultValue(page)).toHaveText('0,925');

  const blockers = page.locator('aside').getByText('Что мешает получить Кзи = 1');
  await expect(blockers).toBeVisible();
  await page
    .locator('aside')
    .getByRole('button', { name: /Многофакторная аутентификация/ })
    .click();
  await expect(k22).toBeInViewport();
});

test('значок показателя только показывает состояние и не отмечает критерии', async ({ page }) => {
  const k11 = page.locator('#indicator-k11');
  const status = k11.getByRole('img', { name: 'Не выполнен' });
  await expect(status).toBeVisible();
  await status.click();
  await expect(k11.locator('input[type=checkbox]:checked')).toHaveCount(0);
  await k11.getByRole('checkbox').first().check({ force: true });
  await expect(k11.getByRole('img', { name: 'Выполнен частично' })).toBeVisible();
});

test('«Информация о калькуляторе» свернута по умолчанию', async ({ page }) => {
  await expect(page.getByRole('button', { name: /Информация о калькуляторе/ })).toHaveAttribute(
    'aria-expanded',
    'false'
  );
});

test('реквизиты спрашиваются при формировании отчета, письмо скачивается в .docx', async ({ page }) => {
  await checkAllCriteria(page);
  await fillAllRatios(page, '10', '10');
  await page.locator('aside').getByRole('button', { name: 'Сформировать отчет' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Сформировать письмо' }).click();
  await expect(dialog.getByText('Заполните поле').first()).toBeVisible();

  await dialog.getByLabel('Название организации').fill('ООО «Ромашка»');
  await dialog.getByLabel('Должность руководителя').fill('Директор');
  await dialog.getByLabel('И.О. Фамилия руководителя').fill('И.И. Иванов');
  await dialog.getByLabel('И.О. Фамилия исполнителя').fill('П.П. Петров');
  await dialog.getByLabel('Телефон исполнителя').fill('+7 (343) 000-00-00');
  await dialog.getByLabel('Электронная почта исполнителя').fill('petrov@example.ru');
  await expect(dialog.getByLabel('Руководитель управления (кому)')).toHaveValue('О.П. Чувардину');

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    dialog.getByRole('button', { name: 'Сформировать письмо' }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/^Отчет_Кзи_Ромашка_\d{2}\.\d{2}\.\d{4}\.docx$/);
  const content = await readFile(await download.path());
  expect(content.subarray(0, 2).toString()).toBe('PK');
  await expect(page.getByTestId('toast')).toContainText('Отчет сохранен');
});

test('сохранение в файл и загрузка из файла', async ({ page }) => {
  await checkAllCriteria(page);
  await fillAllRatios(page, '10', '10');
  await expect(resultValue(page)).toHaveText('1,00');

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Сохранить в файл' }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/^Кзи_\d{2}\.\d{2}\.\d{4}\.json$/);
  const file = await download.path();

  await page.locator('aside').getByRole('button', { name: 'Сброс' }).click();
  await expect(resultValue(page)).toHaveText('0,00');

  await page.locator('input[type=file]').setInputFiles(file);
  await expect(resultValue(page)).toHaveText('1,00');
  await expect(page.getByTestId('toast')).toContainText('Данные загружены');
});

test('напоминание о следующей оценке скачивается в формате .ics', async ({ page }) => {
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Добавить в календарь' }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/^Напоминание_Кзи_\d{2}\.\d{2}\.\d{4}\.ics$/);
  const text = (await readFile(await download.path())).toString('utf8');
  expect(text).toContain('BEGIN:VEVENT');
  expect(text).toContain('TRIGGER:-P14D');
});

test('Узи: режим по ссылке, уровень направления и текущий отчет', async ({ page }) => {
  await page.goto('./#uzi');
  await expect(page.getByRole('heading', { name: 'Калькулятор уровня зрелости' })).toBeVisible();
  const direction = page.locator('#direction-1');
  const groups = direction.getByRole('radiogroup');
  for (let index = 0; index < 8; index++) {
    await groups.nth(index).locator('input[type=radio]').last().check({ force: true });
  }
  await expect(direction.getByText('Уровень 4')).toBeVisible();
  await expect(resultValue(page)).toHaveText('0,19');

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.locator('aside').getByRole('button', { name: 'Текущий отчет' }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(/^Текущий_отчет_Узи_\d{2}\.\d{2}\.\d{4}\.docx$/);

  await page.getByRole('tab', { name: /Кзи/ }).click();
  await expect(page).toHaveURL(/#kzi$/);
});

test('ответы версии 3 переносятся из хранилища браузера', async ({ page }) => {
  // Страница без калькулятора: при уходе с нее ответы не сохраняются поверх подготовленных данных
  await page.goto('./favicon.svg');
  await page.evaluate(() => {
    window.localStorage.clear();
    window.localStorage.setItem(
      'checku-kzi-v3',
      JSON.stringify({
        v: 3,
        mode: 'kzi',
        form: { org: 'ООО «Ромашка»', region: 'ufo' },
        kzi: { items: { k11: [true, true] }, na: { k13: true }, zero: {} },
        uzi: {},
      })
    );
  });
  await page.goto('./#kzi');
  const k11 = page.locator('#indicator-k11');
  await expect(k11.getByRole('img', { name: 'Выполнен', exact: true })).toBeVisible();
  await expect(page.locator('#indicator-k13').getByRole('img', { name: 'Не применим' })).toBeVisible();
  // k11 (0,03) + k13 (0,03) = 0,06
  await expect(resultValue(page)).toHaveText('0,06');
});
