import { expect, test } from '@playwright/test';
import { checkAllCriteria, expectNoHorizontalScroll, fillRatio } from './helpers';

const WIDTHS = [360, 390, 768, 1024, 1280, 1440, 1920];

for (const width of WIDTHS) {
  test(`нет горизонтальной прокрутки при ширине ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('./#kzi');
    await expectNoHorizontalScroll(page);
    await page.goto('./#uzi');
    await expectNoHorizontalScroll(page);
  });
}

// Панель результата прилипает к верху окна и должна помещаться целиком, вместе с перечнем «Что мешает»
const SCREENS = [
  { width: 1280, height: 640 },
  { width: 1366, height: 657 },
  { width: 1440, height: 760 },
  { width: 1920, height: 1080 },
];

for (const screen of SCREENS) {
  test(`панель результата помещается в окно ${screen.width}x${screen.height}`, async ({ page }) => {
    await page.setViewportSize(screen);
    await page.goto('./');
    await page.evaluate(() => window.localStorage.clear());
    await page.goto('./#kzi');
    await checkAllCriteria(page, ['k36', 'k41']);
    await fillRatio(page, 'k22', '40', '18');
    await expect(page.locator('aside').getByText('Что мешает получить Кзи = 1')).toBeVisible();
    const overflow = await page.locator('aside').evaluate(element => element.scrollHeight - element.clientHeight);
    expect(overflow).toBeLessThanOrEqual(0);
  });
}
