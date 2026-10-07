import { expect, type Page } from '@playwright/test';

export const resultValue = (page: Page) => page.getByTestId('result-value');

/** Отмечает все критерии-галочки Кзи, кроме неприменимости и перечисленных показателей. */
export async function checkAllCriteria(page: Page, skip: string[] = []) {
  const boxes = page.locator('article input[type=checkbox]');
  const count = await boxes.count();
  for (let index = 0; index < count; index++) {
    const box = boxes.nth(index);
    const { article, notApplicable } = await box.evaluate(element => ({
      article: element.closest('article')?.id ?? '',
      notApplicable: (element.closest('label')?.textContent ?? '').startsWith('Не применимо'),
    }));
    if (notApplicable || skip.includes(article.replace('indicator-', ''))) continue;
    await box.check({ force: true });
  }
}

/** Заполняет все критерии с порогом: total из них part. */
export async function fillAllRatios(page: Page, total: string, part: string) {
  const articles = ['k22', 'k31', 'k33', 'k34', 'k35', 'k42'];
  for (const code of articles) await fillRatio(page, code, total, part);
}

export async function fillRatio(page: Page, code: string, total: string, part: string) {
  const inputs = page.locator(`#indicator-${code} input[inputmode=numeric][placeholder="0"]`);
  await inputs.nth(0).fill(total);
  await inputs.nth(1).fill(part);
}

export async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
}
